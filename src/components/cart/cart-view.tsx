"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowRightIcon, CartIcon, CloseIcon, TruckIcon } from "@/components/icons";
import { QuantityStepper } from "./quantity";
import { useShop } from "@/components/providers/shop-provider";
import { applyDiscountAction, updateCartItemAction } from "@/actions/cart";
import { btnPrimary, inputClass } from "@/components/ui/styles";
import { formatMoney } from "@/lib/format";
import { fmt, plural } from "@/i18n";
import { STORES, storePath } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Quote } from "@/types/catalog";

export type CartViewLabels = { quantity: string; decrease: string; increase: string; checkoutTitle: string };

export function CartView({ initialQuote, labels }: { initialQuote: Quote | null; labels: CartViewLabels }) {
  const { store, labels: l, toast, setCartCount } = useShop();
  const cfg = STORES[store];
  const [quote, setQuote] = useState(initialQuote);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const money = (v: number) => formatMoney(v, cfg.currency, cfg.intl);

  const update = (itemId: string, quantity: number) =>
    startTransition(async () => {
      const res = await updateCartItemAction(store, itemId, quantity);
      if (!res.ok) return toast(res.error === "RATE_LIMITED" ? l.errors.rateLimited : l.cart.error, "error");
      setQuote(res.quote);
      setCartCount(res.count);
      if (quantity === 0) toast(l.cart.removed, "info");
      else if (res.capped) toast(l.cart.maxQuantity, "info");
    });

  const applyCode = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await applyDiscountAction(store, code);
      if (!res.ok) return toast(l.cart.error, "error");
      if (res.status === "APPLIED") {
        setQuote(res.quote);
        setCode("");
        setCodeError(null);
      } else if (res.status) {
        setCodeError(fmt(l.cart.codeErrors[res.status], { amount: res.minSubtotal ? money(res.minSubtotal) : "" }));
      }
    });
  };

  const removeCode = () =>
    startTransition(async () => {
      const res = await applyDiscountAction(store, null);
      if (res.ok) setQuote(res.quote);
    });

  if (!quote || quote.lines.length === 0) {
    return (
      <div className="rounded-card bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-brand-600 shadow-card"><CartIcon size={30} /></span>
        <h2 className="mt-5 text-xl font-bold">{l.cart.empty}</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-600">{l.cart.emptyText}</p>
        <Link href={storePath(store, "/")} className={`${btnPrimary} mt-6`}>{l.cart.emptyCta}</Link>
      </div>
    );
  }

  const issueFor = (itemId: string) => quote.issues.find((i) => i.item_id === itemId);
  const blocking = quote.issues.some((i) => i.item_id);
  const cheapestShipping = quote.shipping_methods.filter((m) => m.available).reduce<number | null>((min, m) => (min === null || m.price < min ? m.price : min), null);
  const progress = quote.free_shipping_threshold ? Math.min(100, Math.round((quote.goods_total / quote.free_shipping_threshold) * 100)) : 0;

  return (
    <div className={cn("grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start", pending && "opacity-80")}>
      <ul className="divide-y divide-ink-100 rounded-card ring-1 ring-ink-100">
        {quote.lines.map((line) => {
          const issue = issueFor(line.item_id);
          return (
            <li key={line.item_id} className="flex gap-4 p-4 sm:p-5">
              <Link href={storePath(store, `/produkt/${line.slug}`)} className="relative size-20 shrink-0 overflow-hidden rounded-field bg-surface sm:size-24">
                {line.image && <Image src={line.image} alt="" fill sizes="96px" className="object-contain p-2" />}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={storePath(store, `/produkt/${line.slug}`)} className="font-semibold text-ink-900 hover:text-brand-700">{line.name}</Link>
                    {line.variant_name && <p className="text-sm text-ink-600">{line.variant_name}</p>}
                    <p className="mt-0.5 text-sm text-ink-500">{fmt(l.cart.perPiece, { price: money(line.unit_price) })}</p>
                  </div>
                  <button type="button" onClick={() => update(line.item_id, 0)} disabled={pending} aria-label={fmt(l.cart.remove, { name: line.name })}
                    className="-mr-2 -mt-1 rounded-btn p-2 text-ink-400 hover:bg-ink-50 hover:text-danger-600">
                    <CloseIcon size={18} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <QuantityStepper value={line.quantity} max={line.max_quantity} disabled={pending} labels={labels}
                    onChange={(next) => update(line.item_id, Math.max(0, next))} />
                  <div className="text-right">
                    <p className="font-bold text-ink-900 tabular-nums">{money(line.line_total)}</p>
                    {line.discount_amount > 0 && <p className="text-xs text-success-600 tabular-nums">−{money(line.discount_amount)}</p>}
                  </div>
                </div>
                {issue && (
                  <p className="mt-2 text-sm font-medium text-danger-600">
                    {issue.code === "INSUFFICIENT_STOCK" ? fmt(l.cart.issues.INSUFFICIENT_STOCK, { count: issue.available ?? 0 })
                      : issue.code === "OUT_OF_STOCK" ? l.cart.issues.OUT_OF_STOCK : l.cart.issues.UNAVAILABLE}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="space-y-4 lg:sticky lg:top-28">
        {quote.free_shipping_threshold !== null && (
          <div className="rounded-card bg-surface p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <TruckIcon size={20} className="text-brand-600" />
              {quote.free_shipping_remaining > 0 ? fmt(l.cart.freeShippingRemaining, { amount: money(quote.free_shipping_remaining) }) : l.cart.freeShippingReached}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-sky-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="rounded-card p-5 ring-1 ring-ink-100">
          <h2 className="text-lg font-bold">{l.cart.summary}</h2>
          {quote.discount?.status === "APPLIED" ? (
            <p className="mt-4 flex items-center justify-between rounded-field bg-success-50 px-3 py-2 text-sm font-medium text-success-600">
              {fmt(l.cart.codeApplied, { code: quote.discount.code })}
              <button type="button" onClick={removeCode} className="font-semibold underline">{l.cart.removeCode}</button>
            </p>
          ) : (
            <form onSubmit={applyCode} className="mt-4">
              <label htmlFor="discount-code" className="mb-1.5 block text-sm font-medium text-ink-800">{l.cart.discountCode}</label>
              <div className="flex gap-2">
                <input id="discount-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={l.cart.discountPlaceholder}
                  autoComplete="off" maxLength={40} aria-invalid={Boolean(codeError)} className={`${inputClass} h-11 uppercase`} />
                <button type="submit" disabled={pending || code.trim().length < 2} className="h-11 shrink-0 rounded-btn bg-ink-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
                  {l.cart.apply}
                </button>
              </div>
              {codeError && <p role="alert" className="mt-1.5 text-sm text-danger-600">{codeError}</p>}
            </form>
          )}
          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">{l.cart.subtotal}</dt><dd className="font-medium tabular-nums">{money(quote.subtotal)}</dd></div>
            {quote.discount_total > 0 && (
              <div className="flex justify-between text-success-600"><dt>{l.cart.discount}</dt><dd className="font-medium tabular-nums">−{money(quote.discount_total)}</dd></div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-600">{l.cart.shipping}</dt>
              <dd className="font-medium">{quote.free_shipping_remaining === 0 && quote.free_shipping_threshold !== null ? l.cart.shippingFree
                : cheapestShipping !== null ? fmt(l.cart.shippingFrom, { price: money(cheapestShipping) }) : "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
              <dt className="font-bold text-ink-900">{l.cart.total}</dt>
              <dd className="text-2xl font-extrabold tracking-tight tabular-nums">{money(quote.goods_total)}</dd>
            </div>
            <p className="text-right text-xs text-ink-500">{l.common.vatIncluded} · {plural(cfg.locale, l.cart.items, quote.item_count)}</p>
          </dl>
          {blocking && <p className="mt-4 text-sm font-medium text-danger-600">{l.cart.checkoutDisabled}</p>}
          <Link href={storePath(store, "/pokladna")} aria-disabled={blocking}
            className={cn(btnPrimary, "mt-5 w-full", blocking && "pointer-events-none opacity-50")}>
            {labels.checkoutTitle}
            <ArrowRightIcon size={18} />
          </Link>
          <Link href={storePath(store, "/")} className="mt-3 block text-center text-sm font-semibold text-ink-600 hover:text-brand-700">{l.cart.continueShopping}</Link>
        </div>
      </aside>
    </div>
  );
}
