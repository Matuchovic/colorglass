import "server-only";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { randomToken, sha256Hex } from "@/lib/security/crypto";
import { CART_COOKIE, CART_COOKIE_MAX_AGE } from "@/lib/cookies";
import { isProduction } from "@/lib/env";
import { getSessionUser } from "./auth";
import type { MarketCode } from "@/lib/store";
import type { Quote } from "@/types/catalog";
import type { Json } from "@/types/database";

// Košík: anonymně přes náhodný token v httpOnly cookie (v DB jen jeho SHA-256), po přihlášení přes user_id.
// Klient nikdy neposílá ID košíku → nelze přistoupit k cizímu košíku (IDOR).

type CartRow = { id: string; discount_code: string | null; market: MarketCode; user_id: string | null };
const MAX_QTY = 99;

async function readToken(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return value && /^[A-Za-z0-9_-]{32,64}$/.test(value) ? value : null;
}

async function writeToken(token: string) {
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: CART_COOKIE_MAX_AGE,
  });
}

async function cartByToken(token: string): Promise<CartRow | null> {
  const { data } = await supabaseAdmin()
    .from("carts")
    .select("id, discount_code, market, user_id")
    .eq("token_hash", sha256Hex(token))
    .eq("status", "active")
    .maybeSingle();
  return data;
}

async function cartByUser(userId: string): Promise<CartRow | null> {
  const { data } = await supabaseAdmin()
    .from("carts")
    .select("id, discount_code, market, user_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** Přesune položky anonymního košíku do košíku uživatele (po přihlášení). */
async function mergeCarts(from: CartRow, into: CartRow) {
  const admin = supabaseAdmin();
  const [{ data: fromItems }, { data: intoItems }] = await Promise.all([
    admin.from("cart_items").select("variant_id, quantity").eq("cart_id", from.id),
    admin.from("cart_items").select("id, variant_id, quantity").eq("cart_id", into.id),
  ]);
  for (const item of fromItems ?? []) {
    const existing = intoItems?.find((i) => i.variant_id === item.variant_id);
    if (existing) {
      await admin.from("cart_items").update({ quantity: Math.min(MAX_QTY, Math.max(existing.quantity, item.quantity)) }).eq("id", existing.id);
    } else {
      await admin.from("cart_items").insert({ cart_id: into.id, variant_id: item.variant_id, quantity: item.quantity });
    }
  }
  if (from.discount_code && !into.discount_code) await admin.from("carts").update({ discount_code: from.discount_code }).eq("id", into.id);
  await admin.from("carts").update({ status: "merged" }).eq("id", from.id);
}

/**
 * Najde aktivní košík. create=true (jen v Server Action / Route Handleru) ho případně založí a nastaví cookie.
 */
export async function getCart(market: MarketCode, opts: { create?: boolean } = {}): Promise<CartRow | null> {
  const admin = supabaseAdmin();
  const [user, token] = await Promise.all([getSessionUser(), readToken()]);
  let tokenCart = token ? await cartByToken(token) : null;
  if (tokenCart?.user_id && tokenCart.user_id !== user?.id) tokenCart = null; // cizí přihlášený košík přes token nepovolíme

  let cart: CartRow | null = null;
  if (user) {
    const userCart = await cartByUser(user.id);
    if (userCart && tokenCart && userCart.id !== tokenCart.id) {
      await mergeCarts(tokenCart, userCart);
      cart = userCart;
    } else if (userCart) {
      cart = userCart;
    } else if (tokenCart) {
      await admin.from("carts").update({ user_id: user.id }).eq("id", tokenCart.id);
      cart = { ...tokenCart, user_id: user.id };
    }
  } else {
    cart = tokenCart;
  }

  if (!cart && opts.create) {
    const newToken = randomToken(32);
    const { data, error } = await admin
      .from("carts")
      .insert({ token_hash: sha256Hex(newToken), market, user_id: user?.id ?? null })
      .select("id, discount_code, market, user_id")
      .single();
    if (error) throw new Error(`Košík nelze založit: ${error.message}`);
    await writeToken(newToken);
    cart = data;
  }
  if (cart && cart.market !== market) {
    await admin.from("carts").update({ market }).eq("id", cart.id);
    cart = { ...cart, market };
  }
  return cart;
}

export interface QuoteOptions {
  shippingMethodId?: string | null;
  paymentMethodCode?: string | null;
  email?: string | null;
  discountCode?: string | null;
}

/** Cenová kalkulace výhradně v databázi (pricing_quote) – klient ceny nikdy neurčuje. */
export async function quoteCart(cartId: string, market: MarketCode, discountCode: string | null, opts: QuoteOptions = {}): Promise<Quote> {
  const user = await getSessionUser();
  const { data, error } = await supabaseAdmin().rpc("pricing_quote", {
    p_cart_id: cartId,
    p_market: market,
    p_shipping_method_id: opts.shippingMethodId ?? null,
    p_payment_method_code: opts.paymentMethodCode ?? null,
    p_discount_code: opts.discountCode !== undefined ? opts.discountCode : discountCode,
    p_email: opts.email ?? user?.email ?? null,
    p_user_id: user?.id ?? null,
  });
  if (error) throw new Error(`Kalkulace košíku selhala: ${error.message}`);
  return data as unknown as Quote;
}

export async function getCartQuote(market: MarketCode, opts: QuoteOptions = {}): Promise<{ cartId: string | null; quote: Quote | null }> {
  const cart = await getCart(market);
  if (!cart) return { cartId: null, quote: null };
  return { cartId: cart.id, quote: await quoteCart(cart.id, market, cart.discount_code, opts) };
}

export type CartMutation = { ok: true; capped?: boolean } | { ok: false; error: "UNAVAILABLE" | "LIMIT" | "NOT_FOUND" };

export async function addItem(market: MarketCode, variantId: string, quantity: number): Promise<CartMutation> {
  const admin = supabaseAdmin();
  const [{ data: variant }, { data: price }, { data: inv }] = await Promise.all([
    admin.from("product_variants").select("id, is_active, product_id").eq("id", variantId).maybeSingle(),
    admin.from("product_prices").select("price").eq("variant_id", variantId).eq("market", market).maybeSingle(),
    admin.from("inventory").select("quantity_on_hand, quantity_reserved, allow_backorder").eq("variant_id", variantId).maybeSingle(),
  ]);
  if (!variant || !variant.is_active || !price) return { ok: false, error: "UNAVAILABLE" };
  const { data: product } = await admin.from("products").select("is_active").eq("id", variant.product_id).maybeSingle();
  if (!product?.is_active) return { ok: false, error: "UNAVAILABLE" };
  const available = inv ? inv.quantity_on_hand - inv.quantity_reserved : 0;
  const backorder = Boolean(inv?.allow_backorder);
  if (available <= 0 && !backorder) return { ok: false, error: "UNAVAILABLE" };

  const cart = await getCart(market, { create: true });
  if (!cart) return { ok: false, error: "NOT_FOUND" };
  const { data: existing } = await admin.from("cart_items").select("id, quantity").eq("cart_id", cart.id).eq("variant_id", variantId).maybeSingle();
  const wanted = Math.min(MAX_QTY, (existing?.quantity ?? 0) + Math.max(1, Math.trunc(quantity)));
  const allowed = backorder ? wanted : Math.min(wanted, available);
  const { error } = existing
    ? await admin.from("cart_items").update({ quantity: allowed }).eq("id", existing.id)
    : await admin.from("cart_items").insert({ cart_id: cart.id, variant_id: variantId, quantity: allowed });
  if (error) {
    if (error.message.includes("CART_LIMIT")) return { ok: false, error: "LIMIT" };
    throw new Error(error.message);
  }
  await admin.from("carts").update({ updated_at: new Date().toISOString() }).eq("id", cart.id);
  return { ok: true, capped: allowed < wanted };
}

export async function setItemQuantity(market: MarketCode, itemId: string, quantity: number): Promise<CartMutation> {
  const cart = await getCart(market);
  if (!cart) return { ok: false, error: "NOT_FOUND" };
  const admin = supabaseAdmin();
  const q = Math.trunc(quantity);
  if (q <= 0) {
    await admin.from("cart_items").delete().eq("id", itemId).eq("cart_id", cart.id);
    return { ok: true };
  }
  const { data: item } = await admin.from("cart_items").select("id, variant_id").eq("id", itemId).eq("cart_id", cart.id).maybeSingle();
  if (!item) return { ok: false, error: "NOT_FOUND" };
  const { data: inv } = await admin.from("inventory").select("quantity_on_hand, quantity_reserved, allow_backorder").eq("variant_id", item.variant_id).maybeSingle();
  const available = inv ? inv.quantity_on_hand - inv.quantity_reserved : 0;
  const wanted = Math.min(MAX_QTY, q);
  const allowed = inv?.allow_backorder ? wanted : Math.max(1, Math.min(wanted, available));
  await admin.from("cart_items").update({ quantity: allowed }).eq("id", item.id).eq("cart_id", cart.id);
  return { ok: true, capped: allowed < wanted };
}

export async function setDiscountCode(market: MarketCode, code: string | null): Promise<{ quote: Quote | null }> {
  const cart = await getCart(market);
  if (!cart) return { quote: null };
  const normalized = code ? code.trim().toUpperCase().slice(0, 40) : null;
  const quote = await quoteCart(cart.id, market, normalized);
  if (!normalized || quote.discount?.status === "APPLIED") {
    await supabaseAdmin().from("carts").update({ discount_code: normalized }).eq("id", cart.id);
  }
  return { quote };
}

/** Po odeslání objednávky (create_order košík uzavře) už token nepotřebujeme. */
export async function clearCartCookie() {
  (await cookies()).delete(CART_COOKIE);
}

export function asJson(value: unknown): Json {
  return value as Json;
}

/** Počet kusů v košíku (hlavička). */
export async function cartCount(market: MarketCode): Promise<number> {
  const cart = await getCart(market);
  if (!cart) return 0;
  const { data } = await supabaseAdmin().from("cart_items").select("quantity").eq("cart_id", cart.id);
  return (data ?? []).reduce((sum, item) => sum + item.quantity, 0);
}
