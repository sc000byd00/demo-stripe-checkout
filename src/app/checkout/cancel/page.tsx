import Link from "next/link";

export default function CancelPage() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-2 text-2xl font-semibold">Checkout cancelled</h1>
      <p>No payment was taken.</p>
      <Link href="/" className="mt-6 inline-block underline">
        Back to workshops
      </Link>
    </main>
  );
}
