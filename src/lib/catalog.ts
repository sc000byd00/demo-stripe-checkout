export type Product = {
  id: string;
  name: string;
  description: string;
  amount: number; // in cents
  currency: "eur";
};

// Prices live on the server. The browser only ever sends a product id.
export const products: Product[] = [
  {
    id: "intro-workshop",
    name: "Intro workshop",
    description: "Two-hour online session, recording included.",
    amount: 4900,
    currency: "eur",
  },
  {
    id: "full-day",
    name: "Full-day workshop",
    description: "Six hours, small group, with exercises.",
    amount: 19900,
    currency: "eur",
  },
];

export function findProduct(id: string) {
  return products.find((product) => product.id === id);
}

export function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
  }).format(amount / 100);
}
