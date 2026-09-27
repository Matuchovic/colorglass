import "server-only";
import type { CurrencyCode } from "@/lib/store";
import { PaymentProviderError, type PaymentProvider, type PaymentStatus } from "./types";

// Comgate API v1.0 (application/x-www-form-urlencoded). Dokumentace: https://help.comgate.cz/docs/api-protokol
const BASE = "https://payments.comgate.cz/v1.0";

function config() {
  return {
    merchant: process.env.COMGATE_MERCHANT_ID ?? "",
    secret: process.env.COMGATE_SECRET ?? "",
    test: process.env.COMGATE_TEST !== "false",
  };
}

async function call(path: string, params: Record<string, string>): Promise<URLSearchParams> {
  const { merchant, secret } = config();
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ merchant, secret, ...params }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const out = new URLSearchParams(await res.text());
  if (!res.ok || out.get("code") !== "0") {
    throw new PaymentProviderError("comgate", `${path} selhalo: ${out.get("code") ?? res.status} ${out.get("message") ?? ""}`);
  }
  return out;
}

const STATUS: Record<string, PaymentStatus> = {
  PAID: "paid",
  AUTHORIZED: "authorized",
  PENDING: "pending",
  CANCELLED: "failed", // zákazník může platbu zopakovat
};

export const comgate: PaymentProvider = {
  id: "comgate",
  isConfigured: () => Boolean(config().merchant && config().secret),
  async create(input) {
    const out = await call("create", {
      price: String(input.amount),
      curr: input.currency,
      label: `COLOR ${input.orderNumber}`.slice(0, 16),
      refId: input.paymentId,
      method: "ALL",
      email: input.email,
      ...(input.phone ? { phone: input.phone.replace(/\s/g, "") } : {}),
      country: input.country,
      lang: input.locale === "sk" ? "sk" : "cs",
      prepareOnly: "true",
      test: config().test ? "true" : "false",
    });
    const transId = out.get("transId");
    const redirect = out.get("redirect");
    if (!transId || !redirect) throw new PaymentProviderError("comgate", "Chybí transId/redirect v odpovědi");
    return { providerPaymentId: transId, redirectUrl: redirect };
  },
  async status(transId) {
    const out = await call("status", { transId });
    const raw = out.get("status") ?? "PENDING";
    return {
      providerPaymentId: transId,
      paymentId: out.get("refId"),
      status: STATUS[raw] ?? "pending",
      amount: out.get("price") ? Number(out.get("price")) : null,
      currency: (out.get("curr") as CurrencyCode | null) ?? null,
      rawStatus: raw,
    };
  },
  async refund(transId, amount, currency) {
    try {
      await call("refund", { transId, amount: String(amount), curr: currency, test: config().test ? "true" : "false" });
      return { ok: true, providerRefundId: null };
    } catch (error) {
      return { ok: false, providerRefundId: null, error: (error as Error).message };
    }
  },
};
