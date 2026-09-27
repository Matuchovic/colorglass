import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Listing } from "./listing";
import { getDictionary, type Dictionary } from "@/i18n";
import { absoluteUrl, isStoreCode, siteUrl, storePath, STORES, type StoreConfig } from "@/lib/store";
import { parseListing, type SearchParams, type SortKey } from "@/lib/listing-params";
import type { ListParams } from "@/server/catalog";

export type PageArgs = { params: Promise<{ store: string }>; searchParams: Promise<SearchParams> };

export async function resolveStore(params: Promise<{ store: string }>): Promise<{ store: StoreConfig; t: Dictionary }> {
  const { store: code } = await params;
  if (!isStoreCode(code)) notFound();
  const store = STORES[code];
  return { store, t: getDictionary(store.locale) };
}

/** Meta pro výpisy: kanonická URL bez filtrů, filtrované varianty noindex. */
export function listingMetadata(store: StoreConfig, path: string, title: string, description: string | undefined, sp: SearchParams, defaultSort: SortKey): Metadata {
  const { hasUserFilters } = parseListing(sp, { sort: defaultSort });
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(store.code, path), languages: { "cs-CZ": absoluteUrl("cz", path), "sk-SK": absoluteUrl("sk", path) } },
    robots: hasUserFilters ? { index: false, follow: true } : undefined,
  };
}

/** Kolekce (akce, bestsellery, novinky): nadpis, popis a výpis s pevným základem. */
export async function CollectionPage({ args, path, title, text, base, defaultSort }: {
  args: PageArgs;
  path: string;
  title: string;
  text: string;
  base: Omit<ListParams, "market">;
  defaultSort: SortKey;
}) {
  const { store, t } = await resolveStore(args.params);
  const sp = await args.searchParams;
  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs baseUrl={siteUrl(store.code)} items={[{ name: t.common.home, href: storePath(store.code, "/") }, { name: title }]} />
      <header className="mb-6 mt-4 lg:mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-ink-600">{text}</p>
      </header>
      <Listing store={store} t={t} path={storePath(store.code, path)} base={base} searchParams={sp} defaultSort={defaultSort} />
    </div>
  );
}
