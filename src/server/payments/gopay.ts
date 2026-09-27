import "server-only";
import type { CurrencyCode } from "@/lib/store";
import { PaymentProviderError, type PaymentProvider, type PaymentStatus } from "./types";

// GoPay REST API (OAuth2 client credentials). Dokumentace: https://doc.gopay.com
function config() {
  const sandbox = process.env.GOPAY_SANDBOX !== "false";
  return {
    goid: process.env.GOPAY_GOID ?? "",
    clientId: process.env.GOPAY_CLIENT_ID ?? "",
    clientSecret: process.env.GOPAY_CLIENT_SECRET ?? "",
    base: sandbox ? "https://gw.sandbox.gopay.com/api" : "https://gate.gopay.cz/api",
  };
}

const tokenCache = new Map<string, { token: string; expires: number }>();

async function token(scope: "payment-create" | "payment-all"): Promise<string> {
  const cached = tokenCache.get(scope);
  if (cached && cached.expires > Date.now() + 30_000) return cached.token;
  const { clientId, clientSecret, base } = config();
  const res = await fetch(`${base}/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new PaymentProviderError("gopay", `OAuth selhalo (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(scope, { token: data.access_token, expires: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}

async function api<T>(path: string, init: RequestInit & { scope: "payment-create" | "payment-all" }): Promise<T> {
  const { base } = config();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${await token(init.scope)}`, accept: "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => null)) as T & { errors?: Array<{ message?: string; error_name?: string }> };
  if (!res.ok || body?.errors?.length) {
    throw new PaymentProviderError("gopay", `${path}: ${res.status} ${body?.errors?.map((e) => e.error_name ?? e.message).join(", ") ?? ""}`);
  }
  return body;
}

const STATUS: Record<string, PaymentStatus> = {
  CREATED: "pending",
  PAYMENT_METHOD_CHOSEN: "pending",
  AUTHORIZED: "authorized",
  PAID: "paid",
  CANCELED: "failed",
  TIMEOUTED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
};

type GopayPayment = {
  id: number;
  state: string;
  amount: number;
  currency: CurrencyCode;
  order_number: string;
  gw_url?: string;
  additional_params?: Array<{ name: string; value: string }>;
};

export const gopay: PaymentProvider = {
  id: "gopay",
  isConfigured: () => Boolean(config().goid && config().clientId && config().clientSecret),
  async create(input) {
    const payment = await api<GopayPayment>("/payments/payment", {
      method: "POST",
      scope: "payment-create",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        payer: { contact: { email: input.email, ...(input.phone ? { phone_number: input.phone.replace(/\s/g, "") } : {}), country_code: input.country === "SK" ? "SVK" : "CZE" } },
        target: { type: "ACCOUNT", goid: Number(config().goid) },
        amount: input.amount,
        currency: input.currency,
        order_number: input.orderNumber,
        order_description: `Objednávka ${input.orderNumber}`,
        items: [{ type: "ITEM", name: `Objednávka ${input.orderNumber}`, amount: input.amount, count: 1 }],
        additional_params: [{ name: "payment_id", value: input.paymentId }],
        callback: { return_url: input.returnUrl, notification_url: input.notifyUrl },
        lang: input.locale === "sk" ? "SK" : "CS",
      }),
    });
    if (!payment.gw_url) throw new PaymentProviderError("gopay", "Chybí gw_url v odpovědi");
    return { providerPaymentId: String(payment.id), redirectUrl: payment.gw_url };
  },
  async status(id) {
    if (!/^\d{1,20}$/.test(id)) throw new PaymentProviderError("gopay", "Neplatné ID platby");
    const p = await api<GopayPayment>(`/payments/payment/${id}`, { method: "GET", scope: "payment-all" });
    return {
      providerPaymentId: String(p.id),
      paymentId: p.additional_params?.find((a) => a.name === "payment_id")?.value ?? null,
      status: STATUS[p.state] ?? "pending",
      amount: p.amount,
      currency: p.currency,
      rawStatus: p.state,
    };
  },
  async refund(id, amount) {
    try {
      const r = await api<{ result: string }>(`/payments/payment/${id}/refund`, {
        method: "POST",
        scope: "payment-all",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ amount: String(amount) }),
      });
      return { ok: r.result === "FINISHED" || r.result === "ACCEPTED", providerRefundId: null };
    } catch (error) {
      return { ok: false, providerRefundId: null, error: (error as Error).message };
    }
  },
};
