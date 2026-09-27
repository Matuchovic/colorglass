"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeartIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/product-card";
import { useShop } from "@/components/providers/shop-provider";
import { btnPrimary } from "@/components/ui/styles";
import type { Dictionary } from "@/i18n";
import { STORES, storePath } from "@/lib/store";
import type { ProductCardData } from "@/types/catalog";

export function WishlistView({ t, showAltPrice }: { t: Dictionary; showAltPrice: boolean }) {
  const { store, wishlist } = useShop();
  const [cards, setCards] = useState<ProductCardData[] | null>(null);
  const key = wishlist.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch("/api/products/cards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ store, ids: key.split(",") }) })
      .then((r) => (r.ok ? (r.json() as Promise<{ products: ProductCardData[] }>) : { products: [] }))
      .then((d) => { if (!cancelled) setCards(d.products); })
      .catch(() => { if (!cancelled) setCards([]); });
    return () => { cancelled = true; };
  }, [key, store]);

  if (!wishlist.length) {
    return (
      <div className="rounded-card bg-surface px-6 py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-white text-danger-500 shadow-card"><HeartIcon size={30} /></span>
        <h2 className="mt-5 text-xl font-bold">{t.wishlist.empty}</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-600">{t.wishlist.emptyText}</p>
        <Link href={storePath(store, "/")} className={`${btnPrimary} mt-6`}>{t.cart.continueShopping}</Link>
      </div>
    );
  }
  const visible = (cards ?? []).filter((c) => wishlist.includes(c.id));
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" aria-busy={cards === null}>
      {cards === null
        ? wishlist.slice(0, 8).map((id) => <div key={id} className="skeleton aspect-[3/4] rounded-card" />)
        : visible.map((p) => <ProductCard key={p.id} product={p} store={STORES[store]} t={t} showAltPrice={showAltPrice} />)}
    </div>
  );
}
