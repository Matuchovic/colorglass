import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Listing } from "@/components/catalog/listing";
import { listingMetadata, resolveStore } from "@/components/catalog/collection-page";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { siteUrl, storePath } from "@/lib/store";
import type { SearchParams } from "@/lib/listing-params";
import { getCategoryByPath } from "@/server/catalog";

type Args = { params: Promise<{ store: string; path: string[] }>; searchParams: Promise<SearchParams> };

async function load(args: Args) {
  const { path } = await args.params;
  const { store, t } = await resolveStore(args.params);
  const joined = path.map((p) => decodeURIComponent(p)).join("/");
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(joined)) notFound();
  const found = await getCategoryByPath(store.market, joined);
  if (!found) notFound();
  return { store, t, ...found };
}

export async function generateMetadata(args: Args): Promise<Metadata> {
  const { store, category } = await load(args);
  return listingMetadata(store, `/kategorie/${category.path}`, category.seo_title ?? category.name, category.seo_description ?? category.description ?? undefined, await args.searchParams, "recommended");
}

export default async function CategoryPage(args: Args) {
  const { store, t, category, ancestors } = await load(args);
  const path = storePath(store.code, `/kategorie/${category.path}`);
  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs baseUrl={siteUrl(store.code)} items={[
        { name: t.common.home, href: storePath(store.code, "/") },
        ...ancestors.map((a) => ({ name: a.name, href: storePath(store.code, `/kategorie/${a.path}`) })),
        { name: category.name },
      ]} />
      <header className="mb-6 mt-4 lg:mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{category.name}</h1>
        {category.description && <p className="mt-2 max-w-2xl text-ink-600">{category.description}</p>}
        {category.children.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={t.listing.subcategories}>
            {category.children.map((ch) => (
              <li key={ch.id}>
                <Link href={storePath(store.code, `/kategorie/${ch.path}`)}
                  className="inline-flex rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink-800 ring-1 ring-ink-100 transition hover:bg-brand-50 hover:text-brand-700">
                  {ch.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>
      <Listing store={store} t={t} path={path} base={{ categoryPath: category.path }} searchParams={await args.searchParams} />
    </div>
  );
}
