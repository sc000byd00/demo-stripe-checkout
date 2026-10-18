import { formatPrice, products } from "@/lib/catalog";
import { buyAction } from "./actions";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-semibold">Workshops</h1>
      <p className="mb-8 text-gray-500">Demo shop in Stripe test mode.</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <li key={product.id} className="rounded border p-4">
            <h2 className="font-medium">{product.name}</h2>
            <p className="mb-4 text-sm text-gray-500">{product.description}</p>
            <form
              action={buyAction}
              className="flex items-center justify-between"
            >
              <input type="hidden" name="productId" value={product.id} />
              <span>{formatPrice(product.amount, product.currency)}</span>
              <button className="rounded bg-black px-3 py-2 text-white">
                Buy ticket
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
