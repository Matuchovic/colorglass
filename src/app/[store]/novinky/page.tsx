import type { Metadata } from "next";
import { CollectionPage, listingMetadata, resolveStore, type PageArgs } from "@/components/catalog/collection-page";

export async function generateMetadata(args: PageArgs): Promise<Metadata> {
  const { store, t } = await resolveStore(args.params);
  return listingMetadata(store, "/novinky", t.listing.newTitle, t.listing.newText, await args.searchParams, "newest");
}

export default async function NewArrivalsPage(args: PageArgs) {
  const { t } = await resolveStore(args.params);
  return <CollectionPage args={args} path="/novinky" title={t.listing.newTitle} text={t.listing.newText} base={{}} defaultSort="newest" />;
}
