import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { createOrder, getOrder, type Order } from "@/lib/orders";
import { POST } from "./route";

const secret = "whsec_test_secret";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = secret;

// Real signature handling from the Stripe SDK; no network calls are made.
const stripe = new Stripe("sk_test_dummy");

let order: Order;
let eventCounter = 0;

function checkoutEvent(
  type: string,
  session: Partial<Stripe.Checkout.Session> = {},
) {
  eventCounter += 1;
  return {
    id: `evt_test_${eventCounter}`,
    object: "event",
    type,
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        metadata: { orderId: order.id },
        client_reference_id: order.id,
        payment_status: "paid",
        amount_total: order.amount,
        currency: order.currency,
        customer_details: { email: "buyer@example.com" },
        ...session,
      },
    },
  };
}

function signedRequest(event: object, signingSecret = secret) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: signingSecret,
  });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

async function send(event: object, signingSecret?: string) {
  const response = await POST(signedRequest(event, signingSecret));
  const body = response.ok ? await response.json() : null;
  return { status: response.status, result: body?.result };
}

describe("Stripe webhook", () => {
  beforeEach(async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "orders-"));
    process.env.ORDERS_FILE = path.join(dir, "orders.json");
    order = await createOrder({
      productId: "intro-workshop",
      amount: 4900,
      currency: "eur",
    });
  });

  it("marks the order as paid after a completed checkout", async () => {
    const { status, result } = await send(
      checkoutEvent("checkout.session.completed"),
    );

    expect(status).toBe(200);
    expect(result).toBe("fulfilled");
    const saved = await getOrder(order.id);
    expect(saved?.status).toBe("paid");
    expect(saved?.customerEmail).toBe("buyer@example.com");
  });

  it("rejects requests with a wrong signature", async () => {
    const { status } = await send(
      checkoutEvent("checkout.session.completed"),
      "whsec_wrong",
    );

    expect(status).toBe(400);
    expect((await getOrder(order.id))?.status).toBe("pending");
  });

  it("rejects requests without a signature", async () => {
    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("handles a retried event only once", async () => {
    const event = checkoutEvent("checkout.session.completed");

    expect((await send(event)).result).toBe("fulfilled");
    expect((await send(event)).result).toBe("duplicate");
  });

  it("waits for delayed payment methods before fulfilling", async () => {
    const completed = await send(
      checkoutEvent("checkout.session.completed", { payment_status: "unpaid" }),
    );
    expect(completed.result).toBe("pending");
    expect((await getOrder(order.id))?.status).toBe("pending");

    const succeeded = await send(
      checkoutEvent("checkout.session.async_payment_succeeded"),
    );
    expect(succeeded.result).toBe("fulfilled");
    expect((await getOrder(order.id))?.status).toBe("paid");
  });

  it("marks the order as failed when a delayed payment fails", async () => {
    const { result } = await send(
      checkoutEvent("checkout.session.async_payment_failed", {
        payment_status: "unpaid",
      }),
    );

    expect(result).toBe("failed");
    expect((await getOrder(order.id))?.status).toBe("failed");
  });

  it("does not fulfil when the paid amount differs from the order", async () => {
    const { result } = await send(
      checkoutEvent("checkout.session.completed", { amount_total: 100 }),
    );

    expect(result).toBe("mismatch");
    expect((await getOrder(order.id))?.status).toBe("pending");
  });

  it("expires abandoned checkouts", async () => {
    const { result } = await send(
      checkoutEvent("checkout.session.expired", { payment_status: "unpaid" }),
    );

    expect(result).toBe("expired");
    expect((await getOrder(order.id))?.status).toBe("expired");
  });

  it("ignores unrelated events", async () => {
    const { status, result } = await send({
      id: "evt_other",
      object: "event",
      type: "customer.created",
      data: { object: {} },
    });

    expect(status).toBe(200);
    expect(result).toBe("ignored");
  });
});
