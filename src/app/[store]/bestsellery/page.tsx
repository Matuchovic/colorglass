import type { Metadata } from "next";
import { CollectionPage, listingMetadata, resolveStore, type PageArgs } from "@/components/catalog/collection-page";

export async function generateMetadata(args: PageArgs): Promise<Metadata> {
  const { store, t } = await resolveStore(args.params);
  return listingMetadata(store, "/bestsellery", t.listing.bestsellersTitle, t.listing.bestsellersText, await args.searchParams, "bestselling");
}

export default async function BestsellersPage(args: PageArgs) {
  const { t } = await resolveStore(args.params);
  return <CollectionPage args={args} path="/bestsellery" title={t.listing.bestsellersTitle} text={t.listing.bestsellersText} base={{}} defaultSort="bestselling" />;
}
