import "server-only";
import { hmacSha256Hex, safeEqual } from "@/lib/security/crypto";
import type { CurrencyCode } from "@/lib/store";
import { PaymentProviderError, type PaymentProvider } from "./types";

// Stripe Checkout přes REST API (bez SDK). Dokumentace: https://docs.stripe.com/api
const BASE = "https://api.stripe.com/v1";

async function stripe<T>(path: string, method: "GET" | "POST", params?: Record<string, string>, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new PaymentProviderError("stripe", "Chybí STRIPE_SECRET_KEY");
  const res = await fetch(`${BASE}${path}${method === "GET" && params ? `?${new URLSearchParams(params)}` : ""}`, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      ...(method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body: method === "POST" && params ? new URLSearchParams(params) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new PaymentProviderError("stripe", `${path}: ${res.status} ${body.error?.message ?? ""}`);
  return body;
}

type Session = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | null;
  metadata: Record<string, string> | null;
};

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  isConfigured: () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
  async create(input) {
    const session = await stripe<Session>(
      "/checkout/sessions",
      "POST",
      {
        mode: "payment",
        success_url: `${input.returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.returnUrl}&cancelled=1`,
        customer_email: input.email,
        client_reference_id: input.paymentId,
        locale: input.locale === "sk" ? "sk" : "cs",
        "metadata[payment_id]": input.paymentId,
        "metadata[order_number]": input.orderNumber,
        "payment_intent_data[metadata][payment_id]": input.paymentId,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": input.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": String(input.amount),
        "line_items[0][price_data][product_data][name]": `Objednávka ${input.orderNumber}`,
        expires_at: String(Math.floor(Date.now() / 1000) + 60 * 60),
      },
      `session-${input.paymentId}-${Date.now()}`,
    );
    if (!session.url) throw new PaymentProviderError("stripe", "Chybí URL Checkout Session");
    return { providerPaymentId: session.id, redirectUrl: session.url };
  },
  async status(sessionId) {
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new PaymentProviderError("stripe", "Neplatné ID session");
    const s = await stripe<Session>(`/checkout/sessions/${sessionId}`, "GET");
    return {
      providerPaymentId: s.id,
      paymentId: s.metadata?.payment_id ?? null,
      status: s.payment_status === "paid" ? "paid" : s.status === "expired" ? "failed" : "pending",
      amount: s.amount_total,
      currency: (s.currency?.toUpperCase() as CurrencyCode | undefined) ?? null,
      rawStatus: `${s.status}/${s.payment_status}`,
    };
  },
  async refund(sessionId, amount, _currency, idempotencyKey) {
    try {
      const s = await stripe<Session>(`/checkout/sessions/${sessionId}`, "GET");
      if (!s.payment_intent) return { ok: false, providerRefundId: null, error: "Platba nemá payment_intent" };
      const r = await stripe<{ id: string; status: string }>("/refunds", "POST", { payment_intent: s.payment_intent, amount: String(amount) }, idempotencyKey);
      return { ok: r.status === "succeeded" || r.status === "pending", providerRefundId: r.id };
    } catch (error) {
      return { ok: false, providerRefundId: null, error: (error as Error).message };
    }
  },
};

/** Ověření podpisu webhooku (Stripe-Signature: t=…,v1=…), tolerance 5 minut proti replay. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !signatures.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > toleranceSec) return false;
  const expected = hmacSha256Hex(secret, `${t}.${rawBody}`);
  return signatures.some((s) => safeEqual(s, expected));
}
