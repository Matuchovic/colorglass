"use server";

import { z } from "zod";
import { isStoreCode, STORES, type MarketCode } from "@/lib/store";
import { PREVIEW_MODE } from "@/lib/preview";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import { getCartQuote, setDiscountCode, setItemQuantity } from "@/server/cart";
import type { DiscountStatus, Quote } from "@/types/catalog";

export type CartActionResult =
  | { ok: true; quote: Quote | null; count: number; capped?: boolean }
  | { ok: false; error: "PREVIEW" | "INVALID" | "RATE_LIMITED" | "ERROR" };

type Guard = { ok: false; error: "PREVIEW" | "INVALID" | "RATE_LIMITED" } | { ok: true; market: MarketCode };

async function guard(storeCode: string): Promise<Guard> {
  if (PREVIEW_MODE) return { ok: false, error: "PREVIEW" };
  if (!isStoreCode(storeCode)) return { ok: false, error: "INVALID" };
  if (!(await rateLimit("cart"))) return { ok: false, error: "RATE_LIMITED" };
  return { ok: true, market: STORES[storeCode].market };
}

export async function updateCartItemAction(storeCode: string, itemId: string, quantity: number): Promise<CartActionResult> {
  const g = await guard(storeCode);
  if (!g.ok) return { ok: false, error: g.error };
  if (!z.uuid().safeParse(itemId).success || !Number.isInteger(quantity) || quantity < 0 || quantity > 99) return { ok: false, error: "INVALID" };
  try {
    const res = await setItemQuantity(g.market, itemId, quantity);
    const { quote } = await getCartQuote(g.market);
    return { ok: true, quote, count: quote?.item_count ?? 0, capped: res.ok && Boolean(res.capped) };
  } catch (error) {
    logger.error("cart.update_failed", { error });
    return { ok: false, error: "ERROR" };
  }
}

export type DiscountActionResult =
  | { ok: true; quote: Quote | null; status: DiscountStatus | null; minSubtotal: number | null }
  | { ok: false; error: "PREVIEW" | "INVALID" | "RATE_LIMITED" | "ERROR" };

export async function applyDiscountAction(storeCode: string, code: string | null): Promise<DiscountActionResult> {
  const g = await guard(storeCode);
  if (!g.ok) return { ok: false, error: g.error };
  const normalized = code?.trim() ?? "";
  if (code !== null && !/^[A-Za-z0-9_-]{2,40}$/.test(normalized)) return { ok: true, quote: null, status: "NOT_FOUND", minSubtotal: null };
  try {
    const { quote: tested } = await setDiscountCode(g.market, code === null ? null : normalized);
    const { quote } = await getCartQuote(g.market);
    return { ok: true, quote, status: code === null ? null : (tested?.discount?.status ?? "NOT_FOUND"), minSubtotal: tested?.discount?.min_subtotal ?? null };
  } catch (error) {
    logger.error("cart.discount_failed", { error });
    return { ok: false, error: "ERROR" };
  }
}
