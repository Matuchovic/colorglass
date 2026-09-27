import type { Metadata } from "next";
import { CollectionPage, listingMetadata, resolveStore, type PageArgs } from "@/components/catalog/collection-page";

export async function generateMetadata(args: PageArgs): Promise<Metadata> {
  const { store, t } = await resolveStore(args.params);
  return listingMetadata(store, "/akce", t.listing.dealsTitle, t.listing.dealsText, await args.searchParams, "discount");
}

export default async function DealsPage(args: PageArgs) {
  const { t } = await resolveStore(args.params);
  return <CollectionPage args={args} path="/akce" title={t.listing.dealsTitle} text={t.listing.dealsText} base={{ onSale: true }} defaultSort="discount" />;
}
