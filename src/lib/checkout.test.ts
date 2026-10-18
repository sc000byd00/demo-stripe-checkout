import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { startCheckout } from "./checkout";
import { getOrder } from "./orders";

function fakeStripe() {
  const create = vi.fn().mockResolvedValue({
    id: "cs_test_1",
    url: "https://checkout.stripe.com/c/pay/cs_test_1",
  });
  return {
    stripe: { checkout: { sessions: { create } } } as unknown as Stripe,
    create,
  };
}

describe("startCheckout", () => {
  beforeEach(async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "orders-"));
    process.env.ORDERS_FILE = path.join(dir, "orders.json");
  });

  it("charges the server-side price and links the session to an order", async () => {
    const { stripe, create } = fakeStripe();

    const url = await startCheckout(stripe, "full-day", "https://shop.test");

    expect(url).toBe("https://checkout.stripe.com/c/pay/cs_test_1");
    const [params, options] = create.mock.calls[0];
    expect(params.line_items[0].price_data.unit_amount).toBe(19900);
    expect(params.success_url).toBe(
      "https://shop.test/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(options.idempotencyKey).toBe(`checkout-${params.metadata.orderId}`);

    const order = await getOrder(params.metadata.orderId);
    expect(order).toMatchObject({
      status: "pending",
      amount: 19900,
      checkoutSessionId: "cs_test_1",
    });
  });

  it("refuses unknown products", async () => {
    const { stripe, create } = fakeStripe();

    await expect(
      startCheckout(stripe, "free-stuff", "https://shop.test"),
    ).rejects.toThrow("Unknown product");
    expect(create).not.toHaveBeenCalled();
  });
});
