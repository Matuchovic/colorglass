import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/color/hero";
import { ColorTestTeaser } from "@/components/color/colortest-teaser";
import { CategoryTiles } from "@/components/color/category-tiles";
import { TechBanner } from "@/components/color/tech-banner";
import { Benefits } from "@/components/color/benefits";
import { ProductTabs } from "@/components/color/product-tabs";
import { Stories } from "@/components/color/stories";
import { RevealObserver } from "@/components/color/reveal";
import type { CSSProperties } from "react";
import { ProductCard } from "@/components/product/product-card";
import { getDictionary } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { absoluteUrl, isStoreCode, siteUrl, storePath, STORES } from "@/lib/store";
import { getPublicSettings, listProducts } from "@/server/catalog";

export const revalidate = 300;
type Props = { params: Promise<{ store: string }> };

// Záložky „Naše nejoblíbenější brýle“: Bestsellery + kategorie podle návrhu
const TAB_CATEGORIES = [null, "protan", "deutan", "tritan", "outdoor", "indoor", "detske"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: code } = await params;
  if (!isStoreCode(code)) return {};
  const t = getDictionary(STORES[code].locale);
  return {
    title: { absolute: t.meta.title },
    description: t.meta.description,
    alternates: { canonical: absoluteUrl(code, "/"), languages: { "cs-CZ": absoluteUrl("cz", "/"), "sk-SK": absoluteUrl("sk", "/") } },
    openGraph: { title: t.meta.title, description: t.meta.description, url: absoluteUrl(code, "/"), images: [{ url: "/images/color/hero-color.webp", width: 1672, height: 941 }] },
  };
}

export default async function HomePage({ params }: Props) {
  const { store: code } = await params;
  if (!isStoreCode(code)) notFound();
  const store = STORES[code];
  const t = getDictionary(store.locale);
  const settings = await getPublicSettings();
  const lists = await Promise.all(
    TAB_CATEGORIES.map((c) => listProducts({ market: store.market, categoryPath: c ? `bryle/${c}` : "bryle", sort: "bestselling", page: 1, perPage: 6 })),
  );
  const threshold = settings.freeShipping[store.market];
  const freeShipping = threshold ? formatMoney(threshold, store.currency, store.intl) : "";
  const base = siteUrl(code);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${base}/#org`, name: "COLOR", url: absoluteUrl(code, "/"), logo: `${base}/brand/logo.png` },
      { "@type": "WebSite", "@id": `${base}/#website`, url: absoluteUrl(code, "/"), name: "COLOR", inLanguage: store.intl, publisher: { "@id": `${base}/#org` },
        potentialAction: { "@type": "SearchAction", target: `${absoluteUrl(code, "/hledat")}?q={search_term_string}`, "query-input": "required name=search_term_string" } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <RevealObserver />
      <Hero store={code} t={t} freeShipping={freeShipping} />
      <div className="relative z-20 -mt-10 rounded-t-[36px] bg-white pt-7 lg:-mt-[46px] lg:rounded-t-[44px] lg:pt-[34px]">
        <div className="container-page space-y-6 lg:space-y-[18px]">
          <ColorTestTeaser store={code} t={t} />
          <CategoryTiles store={code} t={t} />
        </div>
      </div>
      <div className="container-page mt-3.5 space-y-3.5">
        <TechBanner store={code} t={t} />
        <Benefits t={t} freeShipping={freeShipping} />
      </div>
      <section className="container-page mt-12 lg:mt-[54px]">
        <ProductTabs title={t.color.products.title} tabs={[...t.color.products.tabs]} panels={lists.map((list, i) =>
          list.items.length ? (
            <ul key={i} className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-[14px]">
              {list.items.map((p, j) => (
                <li key={p.id} data-reveal="" style={{ "--rd": `${j * 70}ms` } as CSSProperties}><ProductCard product={p} store={store} t={t} showAltPrice={settings.showSecondaryCurrency} priority={i === 0} /></li>
              ))}
            </ul>
          ) : (
            <p key={i} className="rounded-card bg-surface px-6 py-10 text-center text-ink-600">{t.color.products.empty}</p>
          ))} />
      </section>
      <div className="mt-12 lg:mt-[50px]">
        <Stories title={t.color.stories.title} items={[...t.color.stories.items]} href={storePath(code, "/pribehy")} bgAlt={t.color.stories.bgAlt}
          labels={{ prev: t.color.stories.prev, next: t.color.stories.next, play: t.color.stories.play }} />
      </div>
    </>
  );
}
