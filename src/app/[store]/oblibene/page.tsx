import type { Metadata } from "next";
import { resolveStore } from "@/components/catalog/collection-page";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { getPublicSettings } from "@/server/catalog";

type Args = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { t } = await resolveStore(params);
  return { title: t.wishlist.title, robots: { index: false, follow: true } };
}

export default async function WishlistPage({ params }: Args) {
  const { t } = await resolveStore(params);
  const settings = await getPublicSettings();
  return (
    <div className="container-page py-6 lg:py-10">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.wishlist.title}</h1>
      <WishlistView t={t} showAltPrice={settings.showSecondaryCurrency} />
    </div>
  );
}
