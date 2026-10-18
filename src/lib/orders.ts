import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type OrderStatus = "pending" | "paid" | "failed" | "expired";

export type Order = {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  checkoutSessionId?: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt: string;
};

type Store = { orders: Order[]; processedEventIds: string[] };

// A JSON file keeps the demo free of a database. In a real app this is a
// table with unique indexes on checkoutSessionId and on processed event ids.
function storePath() {
  return (
    process.env.ORDERS_FILE ?? path.join(process.cwd(), ".data", "orders.json")
  );
}

async function load(): Promise<Store> {
  try {
    return JSON.parse(await readFile(storePath(), "utf8")) as Store;
  } catch {
    return { orders: [], processedEventIds: [] };
  }
}

async function save(store: Store) {
  await mkdir(path.dirname(storePath()), { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2));
}

export async function createOrder(input: {
  productId: string;
  amount: number;
  currency: string;
}) {
  const store = await load();
  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    ...input,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  store.orders.push(order);
  await save(store);
  return order;
}

export async function getOrder(id: string) {
  return (await load()).orders.find((order) => order.id === id) ?? null;
}

export async function getOrderBySession(checkoutSessionId: string) {
  return (
    (await load()).orders.find(
      (order) => order.checkoutSessionId === checkoutSessionId,
    ) ?? null
  );
}

export async function updateOrder(id: string, changes: Partial<Order>) {
  const store = await load();
  const order = store.orders.find((o) => o.id === id);
  if (!order) return null;
  Object.assign(order, changes, { updatedAt: new Date().toISOString() });
  await save(store);
  return order;
}

/** Returns false if the event was already handled (Stripe retries webhooks). */
export async function markEventProcessed(eventId: string) {
  const store = await load();
  if (store.processedEventIds.includes(eventId)) return false;
  store.processedEventIds.push(eventId);
  await save(store);
  return true;
}
