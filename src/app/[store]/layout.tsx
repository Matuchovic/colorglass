import "../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { caveat, jakarta, montserrat } from "../fonts";
import { TopBar } from "@/components/layout/top-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ShopProvider, type ClientLabels } from "@/components/providers/shop-provider";
import { NewsletterStatusToast } from "@/components/home/newsletter-status-toast";
import { getDictionary } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { PREVIEW_MODE } from "@/lib/preview";
import { isStoreCode, siteUrl, STORE_CODES, STORES } from "@/lib/store";
import { getCategoryTree, getFooterPages, getPublicSettings } from "@/server/catalog";

export function generateStaticParams() {
  return STORE_CODES.map((store) => ({ store }));
}

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ store: string }> }): Promise<Metadata> {
  const { store: code } = await params;
  if (!isStoreCode(code)) return {};
  const store = STORES[code];
  const t = getDictionary(store.locale);
  return {
    metadataBase: new URL(siteUrl(code)),
    title: { default: t.meta.title, template: t.meta.titleTemplate },
    description: t.meta.description,
    applicationName: "COLOR",
    icons: {
      icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" }],
      apple: "/brand/apple-touch-icon.png",
    },
    openGraph: { siteName: "COLOR", locale: store.intl.replace("-", "_"), type: "website" },
    formatDetection: { telephone: false },
    // náhled s ukázkovými daty nesmí do vyhledávačů
    robots: PREVIEW_MODE ? { index: false, follow: false } : undefined,
  };
}

export default async function StoreLayout({ children, params }: { children: ReactNode; params: Promise<{ store: string }> }) {
  const { store: code } = await params;
  if (!isStoreCode(code)) notFound();
  const store = STORES[code];
  const t = getDictionary(store.locale);
  const [categories, settings, pages] = await Promise.all([getCategoryTree(store.market), getPublicSettings(), getFooterPages()]);
  const threshold = settings.freeShipping[store.market];
  const labels: ClientLabels = {
    cart: t.cart,
    wishlist: t.wishlist,
    preview: t.preview,
    errors: t.errors,
    newsletter: t.newsletter,
    search: t.search,
    common: t.common,
    product: {
      addToCart: t.product.addToCart,
      chooseVariant: t.product.chooseVariant,
      outOfStock: t.product.outOfStock,
      wishlistAdd: t.product.wishlistAdd,
      wishlistRemove: t.product.wishlistRemove,
    },
  };

  return (
    <html lang={store.locale} className={`${jakarta.variable} ${caveat.variable} ${montserrat.variable}`}>
      <body className="min-h-dvh bg-white font-sans text-ink-800 antialiased">
        <a href="#obsah" className="sr-only z-[80] rounded-btn bg-brand-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          {t.header.skipToContent}
        </a>
        <ShopProvider store={code} preview={PREVIEW_MODE} labels={labels}>
          <TopBar store={code} t={t} freeShipping={threshold ? formatMoney(threshold, store.currency, store.intl) : null} />
          <Header store={code} t={t} categories={categories} />
          <main id="obsah" className="min-h-[50vh]">{children}</main>
          <Footer store={code} locale={store.locale} t={t} pages={pages} settings={settings} />
          <Suspense fallback={null}>
            <NewsletterStatusToast />
          </Suspense>
        </ShopProvider>
      </body>
    </html>
  );
}
