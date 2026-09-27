"use client";

import { useMemo, useState, useTransition } from "react";
import { CartIcon, CheckIcon, TruckIcon } from "@/components/icons";
import { WishlistButton } from "./product-actions";
import { useShop } from "@/components/providers/shop-provider";
import { addToCartAction } from "@/actions/shop";
import { discountPercent, formatDate, formatMoney } from "@/lib/format";
import { fmt } from "@/i18n";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/lib/store";
import type { ProductVariant } from "@/types/catalog";

export type PurchaseLabels = {
  addToCart: string; outOfStock: string; inStock: string; inStockQty: string; inStockMany: string; lowStock: string;
  backorder: string; restock: string; deliveryEstimate: string; orderToday: string; quantity: string; decrease: string;
  increase: string; lowest30d: string; sku: string; vat: string; sale: string;
};

/** Výběr varianty, cena (Omnibus), dostupnost, doručení, množství a přidání do košíku. */
export function PurchasePanel({ productId, variants, currency, altCurrency, intl, showAlt, delivery, labels }: {
  productId: string;
  variants: ProductVariant[];
  currency: CurrencyCode;
  altCurrency: CurrencyCode | null;
  intl: string;
  showAlt: boolean;
  delivery: { date: string; cutoff: string | null } | null;
  labels: PurchaseLabels;
}) {
  const { store, labels: shopLabels, toast, setCartCount } = useShop();
  const initial = variants.find((v) => v.is_default && v.stock !== "out_of_stock") ?? variants.find((v) => v.stock !== "out_of_stock") ?? variants[0]!;
  const [variantId, setVariantId] = useState(initial.id);
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const variant = variants.find((v) => v.id === variantId) ?? initial;

  const optionGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const v of variants) for (const [k, val] of Object.entries(v.options ?? {})) {
      const list = groups.get(k) ?? [];
      if (!list.includes(val)) list.push(val);
      groups.set(k, list);
    }
    return [...groups.entries()];
  }, [variants]);

  const pick = (key: string, value: string) => {
    const wanted = { ...variant.options, [key]: value };
    const match = variants.find((v) => Object.entries(wanted).every(([k, val]) => v.options?.[k] === val)) ?? variants.find((v) => v.options?.[key] === value);
    if (match) {
      setVariantId(match.id);
      setQty(1);
    }
  };

  const reference = variant.lowest_30d && variant.lowest_30d > variant.price ? variant.lowest_30d : null;
  const percent = discountPercent(variant.price, reference);
  const available = variant.available;
  const maxQty = variant.stock === "backorder" ? 99 : Math.max(1, Math.min(99, available));
  const soldOut = variant.stock === "out_of_stock";

  const stockText = soldOut
    ? variant.restock_date ? fmt(labels.restock, { date: formatDate(variant.restock_date, intl) }) : labels.outOfStock
    : variant.stock === "backorder" ? labels.backorder
    : variant.stock === "low_stock" ? fmt(labels.lowStock, { count: available })
    : available > 20 ? fmt(labels.inStockMany, { count: 20 }) : fmt(labels.inStockQty, { count: available });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[2rem] font-extrabold leading-none tracking-tight text-ink-900 tabular-nums">{formatMoney(variant.price, currency, intl)}</p>
          {reference && <p className="text-lg text-ink-500 line-through tabular-nums">{formatMoney(reference, currency, intl)}</p>}
          {percent && <span className="rounded-full bg-danger-500 px-2.5 py-1 text-sm font-bold text-white">{fmt(labels.sale, { percent })}</span>}
        </div>
        <p className="mt-2 text-sm text-ink-500">
          {labels.vat}
          {showAlt && variant.alt_price && altCurrency ? ` · ${formatMoney(variant.alt_price, altCurrency, intl)}` : ""}
        </p>
        {reference && <p className="mt-1 text-sm text-ink-600">{fmt(labels.lowest30d, { price: formatMoney(reference, currency, intl) })}</p>}
      </div>

      {optionGroups.map(([key, values]) => (
        <fieldset key={key}>
          <legend className="mb-2 text-sm font-semibold text-ink-900">{key}: <span className="font-normal text-ink-600">{variant.options?.[key]}</span></legend>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => {
              const candidate = variants.find((v) => v.options?.[key] === value);
              const selected = variant.options?.[key] === value;
              return (
                <button key={value} type="button" onClick={() => pick(key, value)} aria-pressed={selected}
                  className={cn("rounded-field px-4 py-2.5 text-sm font-semibold ring-1 transition",
                    selected ? "bg-brand-50 text-brand-800 ring-2 ring-brand-600" : "bg-white text-ink-800 ring-ink-200 hover:ring-ink-400",
                    candidate?.stock === "out_of_stock" && !selected && "text-ink-400 line-through decoration-ink-300")}>
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="space-y-2 rounded-card bg-surface p-4 text-sm">
        <p className={cn("flex items-center gap-2 font-semibold", soldOut ? "text-danger-600" : "text-success-600")}>
          <span className={cn("size-2.5 rounded-full", soldOut ? "bg-danger-500" : variant.stock === "low_stock" ? "bg-warning-500" : "bg-success-500")} />
          {stockText}
        </p>
        {!soldOut && delivery && (
          <p className="flex items-center gap-2 text-ink-700">
            <TruckIcon size={18} className="text-brand-600" />
            <span>{fmt(labels.deliveryEstimate, { date: delivery.date })}{delivery.cutoff ? ` · ${delivery.cutoff}` : ""}</span>
          </p>
        )}
        <p className="text-xs text-ink-500">{labels.sku}: {variant.sku}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 items-center rounded-btn ring-1 ring-ink-200" role="group" aria-label={labels.quantity}>
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || soldOut} aria-label={labels.decrease}
            className="grid h-full w-11 place-items-center text-lg font-bold text-ink-700 disabled:text-ink-300">−</button>
          <input type="number" value={qty} min={1} max={maxQty} aria-label={labels.quantity} disabled={soldOut}
            onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
            className="h-full w-12 bg-transparent text-center font-semibold tabular-nums focus:outline-none" />
          <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty || soldOut} aria-label={labels.increase}
            className="grid h-full w-11 place-items-center text-lg font-bold text-ink-700 disabled:text-ink-300">+</button>
        </div>
        <button type="button" disabled={soldOut || pending}
          onClick={() => startTransition(async () => {
            const res = await addToCartAction(store, variant.id, qty);
            if (res.ok) {
              setCartCount(res.count);
              toast(res.capped ? shopLabels.cart.maxQuantity : shopLabels.cart.added, res.capped ? "info" : "success");
            } else if (res.error === "PREVIEW") toast(shopLabels.preview.cart, "info");
            else if (res.error === "RATE_LIMITED") toast(shopLabels.errors.rateLimited, "error");
            else if (res.error === "UNAVAILABLE") toast(labels.outOfStock, "error");
            else toast(shopLabels.cart.error, "error");
          })}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2.5 rounded-btn bg-gradient-to-r from-brand-600 to-[#2e6cff] px-6 font-semibold text-white shadow-[0_10px_24px_-12px_rgb(31_79_245/0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-none disabled:bg-ink-300 disabled:shadow-none sm:flex-none sm:px-10">
          {pending ? <CheckIcon size={20} className="animate-pulse" /> : <CartIcon size={20} />}
          {soldOut ? labels.outOfStock : labels.addToCart}
        </button>
        <WishlistButton productId={productId} className="size-12 ring-1 ring-ink-200" />
      </div>
    </div>
  );
}
