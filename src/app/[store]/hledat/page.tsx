import type { Metadata } from "next";
import { Listing } from "@/components/catalog/listing";
import { resolveStore, type PageArgs } from "@/components/catalog/collection-page";
import { fmt } from "@/i18n";
import { storePath } from "@/lib/store";

export async function generateMetadata(args: PageArgs): Promise<Metadata> {
  const { t } = await resolveStore(args.params);
  return { title: t.search.title, robots: { index: false, follow: true } };
}

export default async function SearchPage(args: PageArgs) {
  const { store, t } = await resolveStore(args.params);
  const sp = await args.searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  return (
    <div className="container-page py-6 lg:py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {q ? fmt(t.search.resultsFor, { query: q }) : t.search.title}
      </h1>
      {q.length >= 2 ? (
        <Listing store={store} t={t} path={storePath(store.code, "/hledat")} base={{ query: q }} searchParams={sp} keep={[["q", q]]} />
      ) : (
        <p className="rounded-card bg-surface px-6 py-10 text-center text-ink-600">{t.listing.searchEmpty}</p>
      )}
    </div>
  );
}
