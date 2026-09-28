import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Listing } from "@/components/catalog/listing";
import { resolveStore, type PageArgs } from "@/components/catalog/collection-page";
import { PageIcon } from "@/components/color/icons";
import { ProductCard } from "@/components/product/product-card";
import { fmt } from "@/i18n";
import { search } from "@/lib/smart-search";
import { storePath } from "@/lib/store";
import { getPublicSettings, listProducts, productCards } from "@/server/catalog";
import { buildSearchIndex } from "@/server/search-index";

export async function generateMetadata(args: PageArgs): Promise<Metadata> {
  const { t } = await resolveStore(args.params);
  return { title: t.search.title, robots: { index: false, follow: true } };
}

const LIMITS = { products: 48, categories: 6, pages: 4 };

/**
 * Výsledky hledání. Fulltext v databázi doplňuje chytré hledání:
 * překlep se opraví („deutn“ → deutan) a slovo se najde i podle významu („červená“ → brýle pro protany).
 */
export default async function SearchPage(args: PageArgs) {
  const { store, t } = await resolveStore(args.params);
  const sp = await args.searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const exact = sp.exact === "1";
  const path = storePath(store.code, "/hledat");
  if (q.length < 2) {
    return (
      <div className="container-page py-6 lg:py-8">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.search.title}</h1>
        <p className="rounded-card bg-surface px-6 py-10 text-center text-ink-600">{t.listing.searchEmpty}</p>
      </div>
    );
  }
  const s = t.color.search;
  const index = await buildSearchIndex(store.code);
  const first = search(index, q, LIMITS);
  const probe = await listProducts({ market: store.market, query: q, page: 1, perPage: 1 });
  const corrected = !exact && probe.total === 0 && first.corrected ? first.corrected : null;
  const effective = corrected ?? q;
  const smart = corrected ? search(index, corrected, LIMITS) : first;
  const dbTotal = corrected ? (await listProducts({ market: store.market, query: corrected, page: 1, perPage: 1 })).total : probe.total;
  const bySense = dbTotal === 0 && smart.products.length > 0;
  const [cards, settings] = bySense
    ? await Promise.all([productCards(smart.products.map((h) => h.doc.id), store.market), getPublicSettings()])
    : [[], null];
  const chips = [...smart.categories, ...smart.pages];
  const keep: Array<[string, string]> = exact ? [["q", q], ["exact", "1"]] : [["q", q]];
  return (
    <div className="container-page py-6 lg:py-8">
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{fmt(t.search.resultsFor, { query: effective })}</h1>
      {corrected && (
        <p className="mb-5 text-[15px] text-ink-600">
          {fmt(s.showingFor, { corrected })}{" "}
          <Link href={`${path}?q=${encodeURIComponent(q)}&exact=1`} className="font-semibold text-brand-700 hover:underline">{fmt(s.searchInstead, { query: q })}</Link>
        </p>
      )}
      {chips.length > 0 && (
        <div className="mb-7 flex flex-wrap gap-2">
          {chips.map((h) => (
            <Link key={h.doc.id} href={storePath(store.code, h.doc.href)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-ink-100 bg-white pl-2 pr-4 text-[14px] font-semibold text-ink-800 transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 hover:shadow-md">
              <span className="relative grid size-8 place-items-center overflow-hidden rounded-full bg-tile text-brand-600">
                {h.doc.image ? <Image src={h.doc.image} alt="" fill sizes="32px" className="object-contain" /> : <PageIcon size={16} />}
              </span>
              {h.doc.title}
            </Link>
          ))}
        </div>
      )}
      {bySense && settings ? (
        <>
          <p className="mb-5 rounded-2xl bg-[#f1f5fe] px-4 py-3 text-[14px] text-ink-700">{fmt(s.smartMatches, { query: q })}</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {cards.map((p, i) => (
              <div key={p.id} data-reveal="" className="h-full" style={{ "--rd": `${(i % 4) * 70}ms` } as CSSProperties}>
                <ProductCard product={p} store={store} t={t} showAltPrice={settings.showSecondaryCurrency} priority={i < 4} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <Listing store={store} t={t} path={path} base={{ query: effective }} searchParams={sp} keep={keep} />
      )}
    </div>
  );
}
