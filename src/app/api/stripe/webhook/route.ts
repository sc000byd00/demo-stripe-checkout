import type Stripe from "stripe";
import { handleStripeEvent } from "@/lib/fulfillment";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret missing", { status: 500 });

  // The signature covers the raw body, so read it as text, not as JSON.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const result = await handleStripeEvent(event);
  return Response.json({ received: true, result });
}
