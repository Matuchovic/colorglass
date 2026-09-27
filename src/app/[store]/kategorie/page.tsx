import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getDictionary } from "@/i18n";
import { absoluteUrl, isStoreCode, siteUrl, storePath, STORES } from "@/lib/store";
import { getCategoryTree } from "@/server/catalog";

export const revalidate = 3600;
type Args = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { store: code } = await params;
  if (!isStoreCode(code)) return {};
  const t = getDictionary(STORES[code].locale);
  return { title: t.listing.allCategoriesTitle, alternates: { canonical: absoluteUrl(code, "/kategorie") } };
}

export default async function CategoriesPage({ params }: Args) {
  const { store: code } = await params;
  if (!isStoreCode(code)) notFound();
  const store = STORES[code];
  const t = getDictionary(store.locale);
  const tree = await getCategoryTree(store.market);
  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs baseUrl={siteUrl(code)} items={[{ name: t.common.home, href: storePath(code, "/") }, { name: t.listing.allCategoriesTitle }]} />
      <h1 className="mb-8 mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.listing.allCategoriesTitle}</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tree.map((c) => (
          <li key={c.id} className="flex gap-4 rounded-card bg-surface p-5">
            <Link href={storePath(code, `/kategorie/${c.path}`)} className="relative size-20 shrink-0" aria-hidden="true" tabIndex={-1}>
              {c.image_url && <Image src={c.image_url} alt="" fill sizes="80px" className="object-contain" />}
            </Link>
            <div className="min-w-0">
              <h2 className="text-lg font-bold">
                <Link href={storePath(code, `/kategorie/${c.path}`)} className="hover:text-brand-700">{c.name}</Link>
              </h2>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                {c.children.map((ch) => (
                  <li key={ch.id}><Link href={storePath(code, `/kategorie/${ch.path}`)} className="text-ink-600 hover:text-brand-700">{ch.name}</Link></li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
