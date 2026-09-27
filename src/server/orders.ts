import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { orderAccessToken, safeEqual, sha256Hex } from "@/lib/security/crypto";
import { serverEnv } from "@/lib/env";
import { getSessionUser } from "./auth";
import type { Tables } from "@/types/database";

export type OrderFull = {
  order: Tables<"orders">;
  items: Tables<"order_items">[];
  billing: Tables<"order_addresses"> | null;
  shipping: Tables<"order_addresses"> | null;
  shipments: Tables<"shipments">[];
  payment: Tables<"payments"> | null;
  history: Tables<"order_status_history">[];
  documents: Tables<"order_documents">[];
};

/** Kompletní objednávka (service role) – jen pro server: e-maily, webhooky, ověřený přístup. */
export async function loadOrderFull(orderId: string): Promise<OrderFull | null> {
  const admin = supabaseAdmin();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;
  const [items, addresses, shipments, payments, history, documents] = await Promise.all([
    admin.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
    admin.from("order_addresses").select("*").eq("order_id", orderId),
    admin.from("shipments").select("*").eq("order_id", orderId).order("created_at"),
    admin.from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1),
    admin.from("order_status_history").select("*").eq("order_id", orderId).order("created_at"),
    admin.from("order_documents").select("*").eq("order_id", orderId).order("issued_at"),
  ]);
  return {
    order,
    items: items.data ?? [],
    billing: addresses.data?.find((a) => a.type === "billing") ?? null,
    shipping: addresses.data?.find((a) => a.type === "shipping") ?? null,
    shipments: shipments.data ?? [],
    payment: payments.data?.[0] ?? null,
    history: history.data ?? [],
    documents: documents.data ?? [],
  };
}

export function orderLinkToken(order: Pick<Tables<"orders">, "idempotency_key">): string {
  return orderAccessToken(serverEnv().APP_SECRET, order.idempotency_key);
}

/**
 * Přístup k objednávce: vlastník (RLS přes relaci) NEBO platný přístupový token z e-mailu/děkovné stránky.
 * Porovnání hashe v konstantním čase; nenalezeno i „cizí“ vrací stejně null (nevyzrazujeme existenci).
 */
export async function getOrderForViewer(number: string, token: string | undefined): Promise<OrderFull | null> {
  if (!/^\d{10}$/.test(number)) return null;
  if (token && /^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    const { data } = await supabaseAdmin().from("orders").select("id, access_token_hash").eq("number", number).maybeSingle();
    if (data && safeEqual(data.access_token_hash, sha256Hex(token))) return loadOrderFull(data.id);
  }
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("orders").select("id").eq("number", number).maybeSingle(); // RLS: jen vlastní
  return data ? loadOrderFull(data.id) : null;
}
