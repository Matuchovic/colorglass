import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { absoluteUrl, siteUrl, storeByMarket, type CurrencyCode, type Locale, type MarketCode } from "@/lib/store";
import { logger } from "@/lib/logger";
import { comgate } from "./comgate";
import { gopay } from "./gopay";
import { stripeProvider } from "./stripe";
import type { OnlineProviderId, PaymentProvider, PaymentStatus } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type StaffClient = SupabaseClient<Database>;

export * from "./types";

const PROVIDERS: Record<OnlineProviderId, PaymentProvider> = { comgate, gopay, stripe: stripeProvider };

export function getProvider(id: string | null | undefined): PaymentProvider | null {
  return id && id in PROVIDERS ? PROVIDERS[id as OnlineProviderId] : null;
}

/** Online platbu nabízíme jen tehdy, když je brána nakonfigurovaná (klíče v prostředí). */
export function isPaymentProviderReady(provider: string): boolean {
  if (provider === "bank_transfer" || provider === "cod") return true;
  return getProvider(provider)?.isConfigured() ?? false;
}

async function loadPayment(paymentId: string) {
  const { data, error } = await supabaseAdmin()
    .from("payments")
    .select("id, order_id, provider, status, amount, currency, provider_payment_id, orders!inner(id, number, email, phone, market, locale, status)")
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Založí transakci u brány a vrátí URL pro přesměrování zákazníka. */
export async function startPayment(paymentId: string): Promise<string> {
  const payment = await loadPayment(paymentId);
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  const order = payment.orders;
  const provider = getProvider(payment.provider);
  if (!provider || !provider.isConfigured()) throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
  if (!["pending", "failed"].includes(payment.status) || order.status !== "awaiting_payment") throw new Error("PAYMENT_NOT_PAYABLE");

  const store = storeByMarket(order.market as MarketCode);
  const result = await provider.create({
    paymentId: payment.id,
    orderNumber: order.number,
    amount: payment.amount,
    currency: payment.currency as CurrencyCode,
    email: order.email,
    phone: order.phone,
    locale: order.locale as Locale,
    country: order.market as MarketCode,
    returnUrl: absoluteUrl(store.code, `/platba/navrat?payment=${payment.id}`),
    notifyUrl: `${siteUrl("cz")}/api/webhooks/payments/${provider.id}`,
  });
  const { error } = await supabaseAdmin().rpc("payment_attach_provider", {
    p_payment_id: payment.id,
    p_provider_payment_id: result.providerPaymentId,
    p_redirect_url: result.redirectUrl,
  });
  if (error) throw new Error(error.message);
  logger.info("payment.started", { paymentId, provider: provider.id, order: order.number });
  return result.redirectUrl;
}

export interface SyncResult {
  status: PaymentStatus;
  orderId: string;
  orderNumber: string;
  market: MarketCode;
}

/**
 * Stav platby vždy ověříme přímo u brány (nevěříme parametrům z URL ani tělu notifikace)
 * a zapíšeme idempotentně přes payment_apply_event.
 */
export async function syncPayment(paymentId: string, source: string, providerPaymentId?: string | null): Promise<SyncResult | null> {
  const payment = await loadPayment(paymentId);
  if (!payment) return null;
  const provider = getProvider(payment.provider);
  const transactionId = providerPaymentId ?? payment.provider_payment_id;
  const base = { orderId: payment.order_id, orderNumber: payment.orders.number, market: payment.orders.market as MarketCode };
  if (!provider || !transactionId) return { status: payment.status, ...base };
  if (providerPaymentId && payment.provider_payment_id && providerPaymentId !== payment.provider_payment_id) {
    logger.warn("payment.sync.foreign_transaction", { paymentId, providerPaymentId });
  }

  const state = await provider.status(transactionId);
  if (state.paymentId && state.paymentId !== payment.id) {
    logger.error("payment.sync.mismatch", { paymentId, reported: state.paymentId });
    return { status: payment.status, ...base };
  }
  const { data, error } = await supabaseAdmin().rpc("payment_apply_event", {
    p_provider: provider.id,
    p_event_id: `${source}:${state.providerPaymentId}:${state.rawStatus}`,
    p_event_type: state.rawStatus,
    p_payment_id: payment.id,
    p_provider_payment_id: state.providerPaymentId,
    p_status: state.status,
    p_amount: state.amount,
    p_currency: state.currency,
    p_payload: { source, raw_status: state.rawStatus },
  });
  if (error) throw new Error(error.message);
  logger.info("payment.synced", { paymentId, status: state.status, result: data });
  const fresh = await loadPayment(paymentId);
  return { status: fresh?.status ?? state.status, ...base };
}

/**
 * Refundace z administrace. Volá se klientem přihlášeného pracovníka → DB ověří právo payments.refund
 * a zapíše autora. Převod/dobírka = „manual“ (peníze vrací účetní, poté potvrzení v administraci).
 */
export async function refundPayment(
  client: StaffClient,
  paymentId: string,
  amount: number,
  reason: string,
  idempotencyKey: string,
) {
  const { data: refund, error } = await client.rpc("refund_create", {
    p_payment_id: paymentId,
    p_amount: amount,
    p_reason: reason,
    p_idempotency_key: idempotencyKey,
  });
  if (error || !refund) throw new Error(error?.message ?? "REFUND_FAILED");
  if (refund.status !== "pending") return refund;
  const payment = await loadPayment(paymentId);
  const provider = getProvider(payment?.provider);
  if (!payment || !provider || !payment.provider_payment_id) return refund;
  const result = await provider.refund(payment.provider_payment_id, amount, payment.currency as CurrencyCode, idempotencyKey);
  const { error: completeError } = await client.rpc("refund_complete", {
    p_refund_id: refund.id,
    p_succeeded: result.ok,
    p_provider_refund_id: result.providerRefundId,
  });
  if (completeError) throw new Error(completeError.message);
  if (!result.ok) logger.error("payment.refund.failed", { paymentId, error: result.error });
  return { ...refund, status: result.ok ? "succeeded" : "failed" };
}
