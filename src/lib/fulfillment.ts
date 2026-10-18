import type Stripe from "stripe";
import { getOrder, markEventProcessed, updateOrder } from "./orders";

export type FulfillmentResult =
  | "fulfilled"
  | "pending"
  | "failed"
  | "expired"
  | "duplicate"
  | "ignored"
  | "mismatch";

const handledEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

export async function handleStripeEvent(
  event: Stripe.Event,
): Promise<FulfillmentResult> {
  if (!handledEvents.has(event.type)) return "ignored";
  if (!(await markEventProcessed(event.id))) return "duplicate";

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  const order = orderId ? await getOrder(orderId) : null;
  if (!order) return "ignored";

  if (event.type === "checkout.session.expired") {
    if (order.status === "pending") {
      await updateOrder(order.id, { status: "expired" });
    }
    return "expired";
  }

  if (event.type === "checkout.session.async_payment_failed") {
    await updateOrder(order.id, { status: "failed" });
    return "failed";
  }

  // Delayed methods (e.g. SEPA Direct Debit) complete the session before the
  // money arrives; they are fulfilled later by async_payment_succeeded.
  if (session.payment_status !== "paid") return "pending";

  if (
    session.amount_total !== order.amount ||
    session.currency !== order.currency
  ) {
    return "mismatch";
  }

  await updateOrder(order.id, {
    status: "paid",
    checkoutSessionId: session.id,
    customerEmail: session.customer_details?.email ?? undefined,
  });
  return "fulfilled";
}
