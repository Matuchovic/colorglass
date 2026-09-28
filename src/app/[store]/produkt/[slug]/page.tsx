import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoxIcon, ShieldCheckIcon, TruckIcon } from "@/components/icons";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ProductGallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ProductCard } from "@/components/product/product-card";
import { Markdown, plainText } from "@/lib/markdown";
import { estimateDelivery } from "@/lib/delivery";
import { formatDayLong, formatMoney } from "@/lib/format";
import { fmt, getDictionary } from "@/i18n";
import { absoluteUrl, isStoreCode, siteUrl, storePath, STORES } from "@/lib/store";
import { getProduct, getProductSlugs, getPublicSettings } from "@/server/catalog";
import type { ProductCardData } from "@/types/catalog";

export const revalidate = 300;
type Args = { params: Promise<{ store: string; slug: string }> };

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

async function load(params: Args["params"]) {
  const { store: code, slug } = await params;
  if (!isStoreCode(code) || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const store = STORES[code];
  const data = await getProduct(slug, store.market);
  return data ? { code, store, data } : null;
}

/** YouTube / Vimeo → bezpečná embed URL (bez cookies u YouTube). */
function videoEmbed(url: string | null): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,20})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d{5,12})/);
  return vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null;
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const loaded = await load(params);
  if (!loaded) return {};
  const { code, data } = loaded;
  const p = data.product;
  const path = `/produkt/${p.slug}`;
  return {
    title: p.seo_title ?? p.name,
    description: p.seo_description ?? p.short_description ?? plainText(p.description),
    alternates: { canonical: absoluteUrl(code, path), languages: { "cs-CZ": absoluteUrl("cz", path), "sk-SK": absoluteUrl("sk", path) } },
    openGraph: { type: "website", title: p.name, url: absoluteUrl(code, path), images: data.images[0] ? [{ url: data.images[0].url, width: 1200, height: 1200 }] : [] },
  };
}

function Related({ title, items, store, t, showAlt }: { title: string; items: ProductCardData[]; store: (typeof STORES)["cz"]; t: ReturnType<typeof getDictionary>; showAlt: boolean }) {
  if (!items.length) return null;
  return (
    <section className="mt-14">
      <h2 className="mb-5 text-2xl font-extrabold tracking-tight">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} store={store} t={t} showAltPrice={showAlt} />)}
      </div>
    </section>
  );
}

export default async function ProductPage({ params }: Args) {
  const loaded = await load(params);
  if (!loaded) notFound();
  const { code, store, data } = loaded;
  const t = getDictionary(store.locale);
  const settings = await getPublicSettings();
  const p = data.product;
  const base = siteUrl(code);

  const now = new Date();
  const days = Math.max(1, data.delivery?.days_min ?? 1);
  const deliveryDate = formatDayLong(estimateDelivery(now, days, store.market, settings.cutoffHour), store.intl);
  const pragueHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", hour: "2-digit", hourCycle: "h23" }).format(now));
  const cutoff = pragueHour < settings.cutoffHour ? fmt(t.product.orderToday, { time: `${settings.cutoffHour}:00` }) : null;
  const freeFrom = settings.freeShipping[store.market];
  const defaultVariant = data.variants.find((v) => v.is_default) ?? data.variants[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: plainText(p.short_description ?? p.description, 300),
    image: data.images.map((i) => `${base}${i.url}`),
    sku: defaultVariant?.sku,
    ...(defaultVariant?.ean ? { gtin13: defaultVariant.ean } : {}),
    ...(data.brand ? { brand: { "@type": "Brand", name: data.brand.name } } : {}),
    offers: data.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      price: (v.price / 100).toFixed(2),
      priceCurrency: data.currency,
      availability: v.stock === "out_of_stock" ? "https://schema.org/OutOfStock" : v.stock === "backorder" ? "https://schema.org/BackOrder" : "https://schema.org/InStock",
      url: absoluteUrl(code, `/produkt/${p.slug}`),
      itemCondition: "https://schema.org/NewCondition",
    })),
  };

  return (
    <div className="container-page py-6 lg:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs baseUrl={base} items={[
        { name: t.common.home, href: storePath(code, "/") },
        ...data.breadcrumbs.map((b) => ({ name: b.name, href: storePath(code, `/kategorie/${b.path}`) })),
        { name: p.name },
      ]} />
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <ProductGallery images={data.images} videoEmbed={videoEmbed(p.video_url)} transitionName={`p-${p.slug}`}
          labels={{ zoom: t.product.zoom, prev: t.product.galleryPrev, next: t.product.galleryNext, image: t.product.image, video: t.product.video, close: t.common.close }} />
        <div>
          {data.brand && (
            <Link href={storePath(code, `/znacka/${data.brand.slug}`)} className="text-sm font-semibold uppercase tracking-wider text-brand-700 hover:text-brand-800">
              {data.brand.name}
            </Link>
          )}
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{p.name}</h1>
          {p.subtitle && <p className="mt-2 text-lg text-ink-600">{p.subtitle}</p>}
          {p.short_description && <p className="mt-4 leading-relaxed text-ink-700">{p.short_description}</p>}
          <div className="mt-6">
            <PurchasePanel productId={p.id} variants={data.variants} currency={data.currency} altCurrency={data.alt_currency} intl={store.intl}
              showAlt={settings.showSecondaryCurrency} delivery={{ date: deliveryDate, cutoff }}
              labels={{
                addToCart: t.product.addToCartLong, outOfStock: t.product.outOfStock, inStock: t.product.inStock, inStockQty: t.product.inStockQty,
                inStockMany: t.product.inStockMany, lowStock: t.product.lowStock, backorder: t.product.backorder, restock: t.product.restock,
                deliveryEstimate: t.product.deliveryEstimate, orderToday: t.product.orderToday, quantity: t.product.quantity,
                decrease: t.product.decrease, increase: t.product.increase, lowest30d: t.product.lowest30d, sku: t.product.sku,
                vat: t.common.vatIncluded, sale: t.product.badges.sale,
              }} />
          </div>
          <ul className="mt-6 grid gap-3 text-sm text-ink-700 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {freeFrom && (
              <li className="flex items-center gap-2.5"><TruckIcon size={22} className="shrink-0 text-brand-600" />{fmt(t.product.freeFrom, { amount: formatMoney(freeFrom, store.currency, store.intl) })}</li>
            )}
            <li className="flex items-center gap-2.5"><BoxIcon size={22} className="shrink-0 text-brand-600" />{t.product.returns}</li>
            {p.warranty_months && (
              <li className="flex items-center gap-2.5"><ShieldCheckIcon size={22} className="shrink-0 text-brand-600" />{fmt(t.product.warranty, { months: p.warranty_months })}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <section>
          <h2 className="text-2xl font-extrabold tracking-tight">{t.product.description}</h2>
          <Markdown source={p.description} className="prose-color mt-4" />
          {p.package_contents && (
            <>
              <h3 className="mt-8 text-lg font-bold">{t.product.packageContents}</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-700">
                {p.package_contents.split("\n").filter(Boolean).map((line) => <li key={line}>{line}</li>)}
              </ul>
            </>
          )}
        </section>
        <aside className="space-y-8">
          <section>
            <h2 className="text-2xl font-extrabold tracking-tight">{t.product.specs}</h2>
            {data.attributes.length ? (
              <dl className="mt-4 divide-y divide-ink-100 overflow-hidden rounded-card ring-1 ring-ink-100">
                {data.attributes.map((a) => (
                  <div key={a.code} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm odd:bg-surface">
                    <dt className="text-ink-600">{a.name}</dt>
                    <dd className="font-medium text-ink-900">{a.value}{a.unit ? ` ${a.unit}` : ""}</dd>
                  </div>
                ))}
                {defaultVariant?.ean && (
                  <div className="grid grid-cols-2 gap-4 px-4 py-3 text-sm odd:bg-surface"><dt className="text-ink-600">{t.product.ean}</dt><dd className="font-medium text-ink-900">{defaultVariant.ean}</dd></div>
                )}
              </dl>
            ) : (
              <p className="mt-3 text-ink-600">{t.product.specsEmpty}</p>
            )}
          </section>
          <section className="rounded-card bg-surface p-5">
            <h2 className="font-bold text-ink-900">{t.product.shippingReturns}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              {fmt(t.product.shippingReturnsText, {
                price: formatMoney(data.delivery?.price_from ?? 0, store.currency, store.intl),
                free: freeFrom ? formatMoney(freeFrom, store.currency, store.intl) : "—",
              })}
            </p>
            <Link href={storePath(code, "/doprava-a-platba")} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
              {t.footer.service} →
            </Link>
          </section>
        </aside>
      </div>

      <Related title={t.product.accessories} items={data.relations.accessory} store={store} t={t} showAlt={settings.showSecondaryCurrency} />
      <Related title={t.product.alternatives} items={data.relations.alternative} store={store} t={t} showAlt={settings.showSecondaryCurrency} />
      <Related title={t.product.boughtTogether} items={data.relations.bought_together} store={store} t={t} showAlt={settings.showSecondaryCurrency} />
      <Related title={t.product.related} items={data.relations.related} store={store} t={t} showAlt={settings.showSecondaryCurrency} />
    </div>
  );
}
