"use server";

import { redirect } from "next/navigation";
import { isStoreCode, storePath, STORES } from "@/lib/store";
import { PREVIEW_MODE } from "@/lib/preview";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestIpHash } from "@/lib/security/request";
import { orderAccessToken, sha256Hex } from "@/lib/security/crypto";
import { checkoutSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clearCartCookie, getCart, quoteCart } from "@/server/cart";
import { getSessionUser } from "@/server/auth";
import { getPublicSettings } from "@/server/catalog";
import { checkoutQuote } from "@/server/checkout";
import { getProvider, isPaymentProviderReady, startPayment } from "@/server/payments";
import type { Quote } from "@/types/catalog";

export async function checkoutQuoteAction(storeCode: string, shippingMethodId: string | null, paymentMethodCode: string | null): Promise<Quote | null> {
  if (PREVIEW_MODE || !isStoreCode(storeCode)) return null;
  const market = STORES[storeCode].market;
  const cart = await getCart(market);
  if (!cart) return null;
  const quote = await quoteCart(cart.id, market, cart.discount_code, { shippingMethodId, paymentMethodCode });
  return checkoutQuote(quote);
}

export type PlaceOrderResult = {
  ok: false;
  error: string;
  fieldErrors?: FieldErrors;
  quote?: Quote | null;
};

const KNOWN = ["CART_EMPTY", "OUT_OF_STOCK", "INSUFFICIENT_STOCK", "UNAVAILABLE", "SHIPPING_INVALID", "PAYMENT_INVALID",
  "PICKUP_POINT_REQUIRED", "ADDRESS_REQUIRED", "BILLING_REQUIRED", "CUSTOMER_BLOCKED", "TOTAL_CHANGED"] as const;

export async function placeOrderAction(storeCode: string, input: unknown): Promise<PlaceOrderResult> {
  if (PREVIEW_MODE) return { ok: false, error: "PREVIEW" };
  if (!isStoreCode(storeCode)) return { ok: false, error: "generic" };
  const store = STORES[storeCode];

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: toFieldErrors(parsed.error) };
  const data = parsed.data;
  if (!(await rateLimit("checkout"))) return { ok: false, error: "RATE_LIMITED" };

  const cart = await getCart(store.market);
  if (!cart) return { ok: false, error: "CART_EMPTY" };
  const [user, settings] = await Promise.all([getSessionUser(), getPublicSettings()]);

  // platební metodu musí jít skutečně použít (brána nakonfigurovaná)
  const { data: method } = await supabaseAdmin().from("payment_methods").select("provider, is_online").eq("code", data.payment_method_code).maybeSingle();
  if (!method || (method.is_online && !isPaymentProviderReady(method.provider))) return { ok: false, error: "PAYMENT_INVALID" };

  const address = data.shipping_type === "address" ? data.shipping_address : null;
  const billingBase = data.billing_same && address ? { ...address } : data.billing;
  const billing = billingBase
    ? {
        ...billingBase,
        company: data.is_business ? (data.billing?.company ?? billingBase.company) : undefined,
        company_id: data.is_business ? data.billing?.company_id : undefined,
        vat_id: data.is_business ? data.billing?.vat_id : undefined,
      }
    : null;
  const token = orderAccessToken(serverEnv().APP_SECRET, data.idempotency_key);

  let order: { order_id: string; number: string; status: string; payment_id: string | null; provider: string | null };
  try {
    const { data: result, error } = await supabaseAdmin().rpc("create_order", {
      p: {
        idempotency_key: data.idempotency_key,
        cart_id: cart.id,
        user_id: user?.id ?? null,
        email: data.email,
        phone: data.phone,
        market: store.market,
        locale: store.locale,
        shipping_method_id: data.shipping_method_id,
        payment_method_code: data.payment_method_code,
        discount_code: cart.discount_code,
        pickup_point: data.shipping_type === "pickup_point" ? data.pickup_point : null,
        billing,
        shipping_address: address,
        customer_note: data.customer_note ?? null,
        is_business: data.is_business,
        terms_version: settings.termsVersion,
        marketing_consent: data.marketing_consent,
        ip_hash: await requestIpHash(),
        access_token_hash: sha256Hex(token),
        expected_total: data.expected_total,
      },
    });
    if (error) {
      const code = KNOWN.find((k) => error.message.includes(k)) ?? (error.message.includes("DISCOUNT") ? "DISCOUNT" : null);
      if (!code) logger.error("checkout.create_order_failed", { message: error.message });
      const quote = await quoteCart(cart.id, store.market, cart.discount_code, { shippingMethodId: data.shipping_method_id, paymentMethodCode: data.payment_method_code });
      return { ok: false, error: code ?? "generic", quote: checkoutQuote(quote) };
    }
    order = result as unknown as typeof order;
  } catch (error) {
    logger.error("checkout.failed", { error });
    return { ok: false, error: "generic" };
  }

  await clearCartCookie();
  logger.info("checkout.order_created", { number: order.number, market: store.market });

  const orderUrl = `${storePath(store.code, `/objednavka/${order.number}`)}?t=${token}`;
  let target = orderUrl;
  if (order.payment_id && getProvider(order.provider)?.isConfigured()) {
    try {
      target = await startPayment(order.payment_id);
    } catch (error) {
      logger.error("checkout.payment_start_failed", { error, number: order.number });
      target = `${orderUrl}&platba=chyba`;
    }
  }
  redirect(target);
}
