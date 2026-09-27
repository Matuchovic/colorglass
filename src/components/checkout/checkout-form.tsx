"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { LockIcon, TruckIcon } from "./checkout-icons";
import { useShop } from "@/components/providers/shop-provider";
import { checkoutQuoteAction, placeOrderAction } from "@/actions/checkout";
import { btnPrimary, inputClass, labelClass } from "@/components/ui/styles";
import { formatMoney } from "@/lib/format";
import { fmt, plural, type Dictionary } from "@/i18n";
import { STORES, storePath } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { FieldErrors } from "@/lib/validation";
import type { Quote } from "@/types/catalog";

type Address = { first_name: string; last_name: string; street: string; city: string; postal_code: string; company: string; company_id: string; vat_id: string };
type Pickup = { id: string; name: string; street?: string; city?: string; zip?: string; carrier?: string };
type PacketaPoint = { id: number | string; name: string; street?: string; city?: string; zip?: string } | null;

declare global {
  interface Window {
    Packeta?: { Widget: { pick: (apiKey: string, cb: (point: PacketaPoint) => void, options?: Record<string, unknown>) => void } };
  }
}

const emptyAddress: Address = { first_name: "", last_name: "", street: "", city: "", postal_code: "", company: "", company_id: "", vat_id: "" };

function loadPacketa(): Promise<void> {
  if (window.Packeta) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://widget.packeta.com/v6/www/js/library.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("packeta"));
    document.head.appendChild(s);
  });
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-card p-5 ring-1 ring-ink-100 sm:p-6">
      <h2 className="flex items-center gap-3 text-lg font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{n}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export type CheckoutPrefill = { email: string; phone: string; address: Partial<Address>; loggedIn: boolean };

export function CheckoutForm({ initialQuote, prefill, packetaKey, t }: {
  initialQuote: Quote;
  prefill: CheckoutPrefill;
  packetaKey: string | null;
  t: Pick<Dictionary, "checkout" | "errors" | "cart" | "order" | "common">;
}) {
  const { store, setCartCount } = useShop();
  const cfg = STORES[store];
  const money = (v: number) => formatMoney(v, cfg.currency, cfg.intl);
  const [quote, setQuote] = useState(initialQuote);
  const firstShipping = initialQuote.shipping_methods.find((m) => m.available);
  const [shippingId, setShippingId] = useState<string | null>(firstShipping?.id ?? null);
  const [paymentCode, setPaymentCode] = useState<string | null>(null);
  const [email, setEmail] = useState(prefill.email);
  const [phone, setPhone] = useState(prefill.phone);
  const [address, setAddress] = useState<Address>({ ...emptyAddress, ...prefill.address });
  const [billing, setBilling] = useState<Address>({ ...emptyAddress, ...prefill.address });
  const [billingSame, setBillingSame] = useState(true);
  const [business, setBusiness] = useState(Boolean(prefill.address.company));
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [note, setNote] = useState("");
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [recalc, startRecalc] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const keyRef = useRef<string | null>(null);

  const shipping = quote.shipping_methods.find((m) => m.id === shippingId) ?? null;
  const payment = quote.payment_methods.find((m) => m.code === paymentCode && m.available) ?? null;
  const shippingType = shipping?.type ?? "address";
  const showBillingFields = shippingType !== "address" || !billingSame;

  const refresh = (nextShipping: string | null, nextPayment: string | null) =>
    startRecalc(async () => {
      const q = await checkoutQuoteAction(store, nextShipping, nextPayment);
      if (!q) return;
      setQuote(q);
      if (nextPayment && !q.payment_methods.find((m) => m.code === nextPayment && m.available)) setPaymentCode(null);
    });

  const choosePickup = async () => {
    if (!packetaKey) return;
    try {
      await loadPacketa();
      window.Packeta?.Widget.pick(packetaKey, (point) => {
        if (point) setPickup({ id: String(point.id), name: point.name, street: point.street, city: point.city, zip: point.zip, carrier: "packeta" });
      }, { country: cfg.market.toLowerCase(), language: cfg.locale, view: "modal" });
    } catch {
      setFormError(t.checkout.pickupUnavailable);
    }
  };

  const err = (key: string) => {
    const code = errors[key];
    return code ? (t.errors[code as keyof typeof t.errors] as string) ?? t.errors.validation : null;
  };

  const field = (label: string, key: string, value: string, onChange: (v: string) => void, props: Record<string, unknown> = {}) => (
    <div>
      <label htmlFor={key} className={labelClass}>{label}</label>
      <input id={key} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(err(key))}
        aria-describedby={err(key) ? `${key}-err` : undefined} className={inputClass} {...props} />
      {err(key) && <p id={`${key}-err`} className="mt-1 text-sm text-danger-600">{err(key)}</p>}
    </div>
  );

  const addressFields = (prefix: "shipping_address" | "billing", value: Address, set: (a: Address) => void) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {field(t.checkout.firstName, `${prefix}.first_name`, value.first_name, (v) => set({ ...value, first_name: v }), { autoComplete: "given-name", required: true })}
      {field(t.checkout.lastName, `${prefix}.last_name`, value.last_name, (v) => set({ ...value, last_name: v }), { autoComplete: "family-name", required: true })}
      <div className="sm:col-span-2">
        {field(t.checkout.street, `${prefix}.street`, value.street, (v) => set({ ...value, street: v }), { autoComplete: "street-address", required: true })}
      </div>
      {field(t.checkout.city, `${prefix}.city`, value.city, (v) => set({ ...value, city: v }), { autoComplete: "address-level2", required: true })}
      {field(t.checkout.postalCode, `${prefix}.postal_code`, value.postal_code, (v) => set({ ...value, postal_code: v }), { autoComplete: "postal-code", inputMode: "numeric", required: true })}
    </div>
  );

  const submit = () => {
    setFormError(null);
    setErrors({});
    if (!shipping) return setFormError(t.checkout.errors.SHIPPING_INVALID);
    if (!payment) return setFormError(t.checkout.errors.PAYMENT_INVALID);
    keyRef.current ??= crypto.randomUUID().replace(/-/g, "");
    const shippingAddress = shippingType === "address" ? { ...address, country: cfg.market, phone } : null;
    const billingSource = showBillingFields ? billing : address;
    const payload = {
      idempotency_key: keyRef.current,
      email,
      phone,
      shipping_method_id: shipping.id,
      shipping_type: shippingType,
      payment_method_code: payment.code,
      pickup_point: shippingType === "pickup_point" ? pickup : null,
      shipping_address: shippingAddress,
      billing_same: !showBillingFields,
      billing: { ...billingSource, company: business ? billing.company : "", company_id: business ? billing.company_id : "", vat_id: business ? billing.vat_id : "", country: cfg.market },
      is_business: business,
      customer_note: note || undefined,
      terms,
      marketing_consent: marketing,
      expected_total: quote.grand_total,
    };
    startSubmit(async () => {
      const res = await placeOrderAction(store, payload);
      if (!res) return; // přesměrování
      if (res.quote) setQuote(res.quote);
      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        setFormError(t.errors.validation);
      } else if (res.error === "TOTAL_CHANGED" && res.quote) {
        setFormError(fmt(t.checkout.totalChanged, { amount: money(res.quote.grand_total) }));
      } else if (res.error === "PREVIEW") {
        setFormError(t.checkout.errors.generic);
      } else {
        setFormError((t.checkout.errors as Record<string, string>)[res.error] ?? t.checkout.errors.generic);
      }
      if (res.error === "CART_EMPTY") setCartCount(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const radio = "flex cursor-pointer items-start gap-3 rounded-field p-4 ring-1 transition has-[:checked]:bg-brand-50/60 has-[:checked]:ring-2 has-[:checked]:ring-brand-600";

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
      <div className="space-y-5">
        {formError && <p role="alert" className="rounded-field bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600 ring-1 ring-danger-500/30">{formError}</p>}

        <Section n={1} title={t.checkout.stepContact}>
          {!prefill.loggedIn && (
            <p className="mb-4 text-sm text-ink-600">
              {t.checkout.loginHint}{" "}
              <Link href={`${storePath(store, "/prihlaseni")}?next=${encodeURIComponent(storePath(store, "/pokladna"))}`} className="font-semibold text-brand-700 hover:underline">{t.checkout.loginLink}</Link>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              {field(t.checkout.email, "email", email, setEmail, { type: "email", autoComplete: "email", required: true })}
              <p className="mt-1 text-xs text-ink-500">{t.checkout.emailHint}</p>
            </div>
            {field(t.checkout.phone, "phone", phone, setPhone, { type: "tel", autoComplete: "tel", required: true })}
          </div>
        </Section>

        <Section n={2} title={t.checkout.stepShipping}>
          <div className="space-y-2.5" role="radiogroup" aria-label={t.checkout.stepShipping}>
            {quote.shipping_methods.map((m) => (
              <label key={m.id} className={cn(radio, m.available ? "ring-ink-200" : "cursor-not-allowed opacity-50 ring-ink-100")}>
                <input type="radio" name="shipping" value={m.id} checked={shippingId === m.id} disabled={!m.available}
                  onChange={() => { setShippingId(m.id); refresh(m.id, paymentCode); }} className="mt-1 size-4 accent-brand-600" />
                <span className="flex-1">
                  <span className="block font-semibold text-ink-900">{m.name}</span>
                  <span className="block text-sm text-ink-600">
                    {fmt(t.checkout.delivery, { range: m.delivery_days_min === m.delivery_days_max
                      ? plural(cfg.locale, t.checkout.deliveryDays, m.delivery_days_max)
                      : `${m.delivery_days_min}–${plural(cfg.locale, t.checkout.deliveryDays, m.delivery_days_max)}` })}
                  </span>
                </span>
                <span className="font-semibold text-ink-900 tabular-nums">{m.available ? (m.price === 0 ? t.cart.shippingFree : money(m.price)) : t.checkout.unavailable}</span>
              </label>
            ))}
          </div>
          {shippingType === "pickup_point" && (
            <div className="mt-4 rounded-field bg-surface p-4">
              {pickup ? (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm"><span className="font-semibold text-ink-900">{pickup.name}</span><br />{[pickup.street, pickup.city].filter(Boolean).join(", ")}</p>
                  <button type="button" onClick={choosePickup} className="text-sm font-semibold text-brand-700 hover:underline">{t.checkout.pickupChange}</button>
                </div>
              ) : (
                <button type="button" onClick={choosePickup} className={`${btnPrimary} h-11 w-full`}>
                  <TruckIcon /> {t.checkout.pickupChoose}
                </button>
              )}
              {err("pickup_point") && <p className="mt-2 text-sm text-danger-600">{t.checkout.pickupMissing}</p>}
            </div>
          )}
          {shippingType === "store_pickup" && <p className="mt-3 text-sm text-ink-600">{t.checkout.storePickupNote}</p>}
        </Section>

        <Section n={3} title={shippingType === "address" ? t.checkout.shippingAddress : t.checkout.billingAddress}>
          {shippingType === "address" && addressFields("shipping_address", address, setAddress)}
          {shippingType === "address" && (
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-ink-800">
              <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} className="size-4 accent-brand-600" />
              {t.checkout.billingSame}
            </label>
          )}
          {showBillingFields && (
            <div className={shippingType === "address" ? "mt-5 border-t border-ink-100 pt-5" : ""}>
              {shippingType === "address" && <h3 className="mb-4 font-semibold text-ink-900">{t.checkout.billingAddress}</h3>}
              {addressFields("billing", billing, setBilling)}
            </div>
          )}
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-ink-800">
            <input type="checkbox" checked={business} onChange={(e) => setBusiness(e.target.checked)} className="size-4 accent-brand-600" />
            {t.checkout.businessPurchase}
          </label>
          {business && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">{field(t.checkout.company, "billing.company", billing.company, (v) => setBilling({ ...billing, company: v }), { autoComplete: "organization" })}</div>
              {field(t.checkout.companyId, "billing.company_id", billing.company_id, (v) => setBilling({ ...billing, company_id: v }), { inputMode: "numeric" })}
              {field(t.checkout.vatId, "billing.vat_id", billing.vat_id, (v) => setBilling({ ...billing, vat_id: v }))}
            </div>
          )}
        </Section>

        <Section n={4} title={t.checkout.stepPayment}>
          <div className="space-y-2.5" role="radiogroup" aria-label={t.checkout.stepPayment}>
            {quote.payment_methods.map((m) => (
              <label key={m.code} className={cn(radio, m.available ? "ring-ink-200" : "cursor-not-allowed opacity-50 ring-ink-100")}>
                <input type="radio" name="payment" value={m.code} checked={paymentCode === m.code} disabled={!m.available}
                  onChange={() => { setPaymentCode(m.code); refresh(shippingId, m.code); }} className="mt-1 size-4 accent-brand-600" />
                <span className="flex-1">
                  <span className="block font-semibold text-ink-900">{m.name}</span>
                  {m.description && <span className="block text-sm text-ink-600">{m.description}</span>}
                </span>
                <span className="font-semibold text-ink-900 tabular-nums">{m.available ? (m.fee ? money(m.fee) : t.cart.shippingFree) : t.checkout.unavailable}</span>
              </label>
            ))}
          </div>
          <div className="mt-5">
            <label htmlFor="note" className={labelClass}>{t.checkout.note} <span className="font-normal text-ink-500">({t.common.optional})</span></label>
            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} placeholder={t.checkout.notePlaceholder}
              className={`${inputClass} h-auto py-3`} />
          </div>
        </Section>
      </div>

      <aside className="rounded-card p-5 ring-1 ring-ink-100 sm:p-6 lg:sticky lg:top-28">
        <h2 className="text-lg font-bold">{t.checkout.stepSummary}</h2>
        <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
          {quote.lines.map((l) => (
            <li key={l.item_id} className="flex items-center gap-3 text-sm">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-field bg-surface">
                {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-contain p-1" />}
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-ink-900 text-[11px] font-bold text-white">{l.quantity}</span>
              </span>
              <span className="min-w-0 flex-1"><span className="line-clamp-2 font-medium text-ink-900">{l.name}</span>{l.variant_name && <span className="text-ink-500">{l.variant_name}</span>}</span>
              <span className="font-semibold tabular-nums">{money(l.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className={cn("mt-5 space-y-2 border-t border-ink-100 pt-4 text-sm", recalc && "opacity-60")}>
          <div className="flex justify-between"><dt className="text-ink-600">{t.cart.subtotal}</dt><dd className="tabular-nums">{money(quote.subtotal)}</dd></div>
          {quote.discount_total > 0 && <div className="flex justify-between text-success-600"><dt>{t.cart.discount}</dt><dd className="tabular-nums">−{money(quote.discount_total)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-600">{t.cart.shipping}</dt><dd className="tabular-nums">{shipping ? (quote.shipping_total === 0 ? t.cart.shippingFree : money(quote.shipping_total)) : "—"}</dd></div>
          {quote.payment_fee_total > 0 && <div className="flex justify-between"><dt className="text-ink-600">{t.cart.paymentFee}</dt><dd className="tabular-nums">{money(quote.payment_fee_total)}</dd></div>}
          <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
            <dt className="font-bold text-ink-900">{t.cart.total}</dt>
            <dd className="text-2xl font-extrabold tracking-tight tabular-nums">{money(quote.grand_total)}</dd>
          </div>
          {quote.vat_breakdown.map((v) => (
            <div key={v.rate_bps} className="flex justify-between text-xs text-ink-500">
              <dt>{fmt(t.cart.vat, { rate: v.rate_bps / 100 })}</dt><dd className="tabular-nums">{money(v.tax)}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 space-y-3 text-sm">
          <label className="flex cursor-pointer items-start gap-2.5 text-ink-800">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} aria-invalid={Boolean(err("terms"))} className="mt-0.5 size-4 shrink-0 accent-brand-600" />
            <span>
              {t.checkout.termsConsent.split(/\{terms\}|\{privacy\}/)[0]}
              <Link href={storePath(store, "/obchodni-podminky")} target="_blank" className="font-medium text-brand-700 underline">{t.checkout.termsLink}</Link>
              {t.checkout.termsConsent.split(/\{terms\}|\{privacy\}/)[1]}
              <Link href={storePath(store, "/ochrana-osobnich-udaju")} target="_blank" className="font-medium text-brand-700 underline">{t.checkout.privacyLink}</Link>
              {t.checkout.termsConsent.split(/\{terms\}|\{privacy\}/)[2]}
            </span>
          </label>
          {err("terms") && <p className="text-danger-600">{t.errors.required}</p>}
          <label className="flex cursor-pointer items-start gap-2.5 text-ink-700">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-brand-600" />
            {t.checkout.newsletterConsent}
          </label>
        </div>
        <button type="submit" disabled={submitting || recalc} className={`${btnPrimary} mt-5 h-14 w-full text-base`}>
          {submitting ? t.checkout.placingOrder : t.checkout.placeOrder}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500"><LockIcon /> {t.checkout.secure}</p>
        <Link href={storePath(store, "/kosik")} className="mt-3 block text-center text-sm font-semibold text-ink-600 hover:text-brand-700">{t.checkout.backToCart}</Link>
      </aside>
    </form>
  );
}
