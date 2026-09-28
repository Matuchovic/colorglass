import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "./rating-stars";
import { AddToCartButton, WishlistButton } from "./product-actions";
import { discountPercent, formatMoney, formatRating } from "@/lib/format";
import { fmt, type Dictionary } from "@/i18n";
import { storePath, type StoreConfig } from "@/lib/store";
import type { ProductCardData } from "@/types/catalog";

const BADGE_STYLE = {
  sale: "bg-danger-500",
  bestseller: "bg-success-500",
  new: "bg-[#2f7bff]",
  tip: "bg-ink-900",
} as const;

/** Produktová karta COLOR: světlá plocha s fotkou, bílý panel s názvem, hodnocením, cenou a košíkem. */
export function ProductCard({ product, store, t, showAltPrice, priority = false }: {
  product: ProductCardData;
  store: StoreConfig;
  t: Dictionary;
  showAltPrice: boolean;
  priority?: boolean;
}) {
  const href = storePath(store.code, `/produkt/${product.slug}`);
  const percent = discountPercent(product.price, product.compare_at);
  const badge = percent
    ? { style: BADGE_STYLE.sale, label: fmt(t.product.badges.sale, { percent }) }
    : product.badge
      ? { style: BADGE_STYLE[product.badge], label: t.product.badges[product.badge] }
      : null;
  const outOfStock = product.stock === "out_of_stock";

  return (
    <article className="group relative flex h-full flex-col rounded-[16px] bg-[#f4f7fb] ring-1 ring-[#e8edf5] transition duration-300 hover:-translate-y-1.5 hover:ring-brand-200 hover:shadow-[0_22px_44px_-22px_rgb(12_60_160/0.45)]">
      <div className="relative px-3 pt-3">
        <div className="relative z-10 flex h-7 items-start justify-between">
          {badge ? (
            <span className={`${badge.style} rounded-full px-2.5 py-[5px] text-[11.5px] font-bold leading-none text-white`}>{badge.label}</span>
          ) : (
            <span />
          )}
          <WishlistButton productId={product.id} className="-mr-1.5 -mt-1.5 size-8" />
        </div>
        <Link href={href} className="block focus-visible:outline-offset-4" tabIndex={-1} aria-hidden="true">
          <div className="relative -mt-3 aspect-[4/3] w-full overflow-hidden" style={{ viewTransitionName: `p-${product.slug}` }}>
            {product.image && (
              <Image src={product.image.url} alt="" fill sizes="(min-width: 1280px) 220px, (min-width: 768px) 30vw, 45vw"
                preload={priority} className="object-contain transition duration-500 ease-out group-hover:-rotate-3 group-hover:scale-[1.08]" />
            )}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_38%,rgb(255_255_255/0.7)_50%,transparent_62%)] transition-transform duration-700 ease-out group-hover:translate-x-full" />
          </div>
        </Link>
      </div>
      <div className="m-1.5 mt-0 flex flex-1 flex-col rounded-[12px] bg-white px-3 pb-3 pt-2.5 shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
        <h3 className="font-display text-[15px] font-semibold leading-snug text-ink-900">
          <Link href={href} className="line-clamp-2 after:absolute after:inset-0 after:content-[''] hover:text-brand-700">
            {product.name}
          </Link>
        </h3>
        <div className="mt-1.5 flex h-5 items-center gap-1.5 text-[13px]">
          {product.rating_count > 0 && (
            <>
              <RatingStars size={17} value={product.rating_avg} label={fmt(t.product.rating, { rating: formatRating(product.rating_avg, store.intl) })} />
              <span className="font-semibold text-ink-800">{formatRating(product.rating_avg, store.intl)}</span>
              <span className="text-ink-500">({product.rating_count})</span>
            </>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
          <div className="min-w-0">
            <p className="font-display text-[19px] font-bold tracking-tight text-ink-950 tabular-nums">
              {formatMoney(product.price, product.currency, store.intl)}
            </p>
            {product.compare_at ? (
              <p className="text-[12.5px] text-ink-500 line-through tabular-nums">{formatMoney(product.compare_at, product.currency, store.intl)}</p>
            ) : showAltPrice && product.alt_price && product.alt_currency ? (
              <p className="text-[12.5px] text-ink-500 tabular-nums">{formatMoney(product.alt_price, product.alt_currency, store.intl)}</p>
            ) : null}
          </div>
          <div className="relative z-10">
            <AddToCartButton variantId={product.variant_id} slug={product.slug} variantCount={product.variant_count} disabled={outOfStock} />
          </div>
        </div>
      </div>
    </article>
  );
}
