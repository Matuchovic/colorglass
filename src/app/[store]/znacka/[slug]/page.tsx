import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/catalog/listing";
import { listingMetadata, resolveStore } from "@/components/catalog/collection-page";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { siteUrl, storePath } from "@/lib/store";
import type { SearchParams } from "@/lib/listing-params";
import { getBrand, translated } from "@/server/catalog";

type Args = { params: Promise<{ store: string; slug: string }>; searchParams: Promise<SearchParams> };

async function load(args: Args) {
  const { slug } = await args.params;
  const { store, t } = await resolveStore(args.params);
  const brand = /^[a-z0-9-]{1,80}$/.test(slug) ? await getBrand(slug) : null;
  if (!brand) notFound();
  return { store, t, brand, description: translated(brand.translations, store.locale, "description", brand.description) };
}

export async function generateMetadata(args: Args): Promise<Metadata> {
  const { store, brand, description } = await load(args);
  return listingMetadata(store, `/znacka/${brand.slug}`, brand.seo_title ?? brand.name, brand.seo_description ?? description ?? undefined, await args.searchParams, "recommended");
}

export default async function BrandPage(args: Args) {
  const { store, t, brand, description } = await load(args);
  const path = storePath(store.code, `/znacka/${brand.slug}`);
  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs baseUrl={siteUrl(store.code)} items={[{ name: t.common.home, href: storePath(store.code, "/") }, { name: brand.name }]} />
      <header className="mb-6 mt-4 lg:mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{brand.name}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-600">{description}</p>}
      </header>
      <Listing store={store} t={t} path={path} base={{ brandSlug: brand.slug }} searchParams={await args.searchParams} />
    </div>
  );
}
