import type Stripe from "stripe";
import { findProduct } from "./catalog";
import { createOrder, updateOrder } from "./orders";

export async function startCheckout(
  stripe: Stripe,
  productId: string,
  origin: string,
) {
  const product = findProduct(productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);

  const order = await createOrder({
    productId: product.id,
    amount: product.amount,
    currency: product.currency,
  });

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: product.currency,
            unit_amount: product.amount,
            product_data: { name: product.name },
          },
        },
      ],
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
    },
    // A retried request must not create a second session for the same order.
    { idempotencyKey: `checkout-${order.id}` },
  );

  await updateOrder(order.id, { checkoutSessionId: session.id });
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return session.url;
}
