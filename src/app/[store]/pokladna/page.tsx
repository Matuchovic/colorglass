import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveStore } from "@/components/catalog/collection-page";
import { CheckoutForm, type CheckoutPrefill } from "@/components/checkout/checkout-form";
import { PreviewNotice } from "@/components/ui/preview-notice";
import { PREVIEW_MODE } from "@/lib/preview";
import { storePath } from "@/lib/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCart, quoteCart } from "@/server/cart";
import { getProfile } from "@/server/auth";
import { checkoutQuote } from "@/server/checkout";

type Args = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { t } = await resolveStore(params);
  return { title: t.checkout.title, robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: Args) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) {
    return (
      <div className="container-page py-10">
        <PreviewNotice title={t.checkout.title} text={t.preview.cart} homeHref={storePath(store.code, "/")} homeLabel={t.errors.backHome} />
      </div>
    );
  }
  const cart = await getCart(store.market);
  if (!cart) redirect(storePath(store.code, "/kosik"));
  let quote = checkoutQuote(await quoteCart(cart.id, store.market, cart.discount_code));
  if (!quote.lines.length || quote.issues.some((i) => i.item_id)) redirect(storePath(store.code, "/kosik"));
  // výchozí doprava = první dostupná, aby souhrn i očekávaná cena odpovídaly výběru
  const firstShipping = quote.shipping_methods.find((m) => m.available);
  if (firstShipping) quote = checkoutQuote(await quoteCart(cart.id, store.market, cart.discount_code, { shippingMethodId: firstShipping.id }));

  const profile = await getProfile();
  let prefill: CheckoutPrefill = { email: "", phone: "", address: {}, loggedIn: false };
  if (profile) {
    const supabase = await createSupabaseServerClient();
    const { data: addr } = await supabase.from("addresses").select("*").eq("is_default_shipping", true).maybeSingle();
    prefill = {
      email: profile.email,
      phone: profile.phone ?? addr?.phone ?? "",
      loggedIn: true,
      address: {
        first_name: addr?.first_name ?? profile.first_name ?? "",
        last_name: addr?.last_name ?? profile.last_name ?? "",
        street: addr?.street ?? "",
        city: addr?.city ?? "",
        postal_code: addr?.postal_code ?? "",
        company: profile.company_name ?? "",
        company_id: profile.company_id ?? "",
        vat_id: profile.vat_id ?? "",
      },
    };
  }

  return (
    <div className="container-page py-6 lg:py-10">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.checkout.title}</h1>
      <CheckoutForm initialQuote={quote} prefill={prefill} packetaKey={process.env.NEXT_PUBLIC_PACKETA_API_KEY || null}
        t={{ checkout: t.checkout, errors: t.errors, cart: t.cart, order: t.order, common: t.common }} />
    </div>
  );
}
