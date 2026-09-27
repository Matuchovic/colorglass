import type { Metadata } from "next";
import { resolveStore } from "@/components/catalog/collection-page";
import { CartView } from "@/components/cart/cart-view";
import { PreviewNotice } from "@/components/ui/preview-notice";
import { PREVIEW_MODE } from "@/lib/preview";
import { storePath } from "@/lib/store";
import { getCartQuote } from "@/server/cart";

type Args = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { t } = await resolveStore(params);
  return { title: t.cart.title, robots: { index: false, follow: false } };
}

export default async function CartPage({ params }: Args) {
  const { store, t } = await resolveStore(params);
  const quote = PREVIEW_MODE ? null : (await getCartQuote(store.market)).quote;
  return (
    <div className="container-page py-6 lg:py-10">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.cart.title}</h1>
      {PREVIEW_MODE ? (
        <PreviewNotice title={t.cart.title} text={t.preview.cart} homeHref={storePath(store.code, "/")} homeLabel={t.errors.backHome} />
      ) : (
        <CartView initialQuote={quote} labels={{ quantity: t.product.quantity, decrease: t.product.decrease, increase: t.product.increase, checkoutTitle: t.cart.checkout }} />
      )}
    </div>
  );
}
