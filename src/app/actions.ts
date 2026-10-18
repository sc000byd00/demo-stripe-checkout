"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { startCheckout } from "@/lib/checkout";
import { getStripe } from "@/lib/stripe";

export async function buyAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const url = await startCheckout(getStripe(), productId, origin);
  redirect(url);
}
