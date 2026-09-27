import type { Database } from "@/types/database";
import type { CurrencyCode, Locale, MarketCode } from "@/lib/store";

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type OnlineProviderId = "comgate" | "gopay" | "stripe";

export interface CreatePaymentInput {
  paymentId: string;
  orderNumber: string;
  amount: number;
  currency: CurrencyCode;
  email: string;
  phone: string | null;
  locale: Locale;
  country: MarketCode;
  returnUrl: string;
  notifyUrl: string;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  redirectUrl: string;
}

export interface ProviderPaymentState {
  providerPaymentId: string;
  /** Naše ID platby (refId / metadata), pokud ho brána vrací */
  paymentId: string | null;
  status: PaymentStatus;
  amount: number | null;
  currency: CurrencyCode | null;
  rawStatus: string;
}

export interface RefundResult {
  ok: boolean;
  providerRefundId: string | null;
  error?: string;
}

export interface PaymentProvider {
  id: OnlineProviderId;
  isConfigured(): boolean;
  create(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  status(providerPaymentId: string): Promise<ProviderPaymentState>;
  refund(providerPaymentId: string, amount: number, currency: CurrencyCode, idempotencyKey: string): Promise<RefundResult>;
}

export class PaymentProviderError extends Error {
  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`);
    this.name = "PaymentProviderError";
  }
}
