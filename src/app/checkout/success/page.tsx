import Link from "next/link";
import { findProduct } from "@/lib/catalog";
import { getOrderBySession } from "@/lib/orders";

export const dynamic = "force-dynamic";

// The redirect back from Stripe proves nothing; only the webhook marks an
// order as paid. This page shows what the webhook has recorded so far.
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const order = session_id ? await getOrderBySession(session_id) : null;
  const product = order ? findProduct(order.productId) : null;

  return (
    <main className="mx-auto max-w-xl p-8">
      {!order && <h1 className="text-2xl font-semibold">Order not found</h1>}
      {order?.status === "paid" && (
        <>
          <h1 className="mb-2 text-2xl font-semibold">Payment received</h1>
          <p>
            Your ticket for <strong>{product?.name}</strong> is confirmed.
          </p>
        </>
      )}
      {order?.status === "pending" && (
        <>
          <meta httpEquiv="refresh" content="3" />
          <h1 className="mb-2 text-2xl font-semibold">Processing payment…</h1>
          <p>This page refreshes until the payment is confirmed.</p>
        </>
      )}
      {(order?.status === "failed" || order?.status === "expired") && (
        <h1 className="text-2xl font-semibold">Payment was not completed</h1>
      )}
      <Link href="/" className="mt-6 inline-block underline">
        Back to workshops
      </Link>
    </main>
  );
}
