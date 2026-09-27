import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveStore } from "@/components/catalog/collection-page";
import { OrderDetail } from "@/components/checkout/order-detail";
import { VerifiedIcon } from "@/components/icons";
import { fmt } from "@/i18n";
import { PREVIEW_MODE } from "@/lib/preview";
import { getOrderForViewer } from "@/server/orders";
import { getPublicSettings } from "@/server/catalog";
import { bankInfoFor } from "@/server/bank";
import { isWithinMinutes } from "@/lib/time";

type Args = { params: Promise<{ store: string; number: string }>; searchParams: Promise<{ t?: string; platba?: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { t } = await resolveStore(params);
  return { title: t.order.thankYou, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function OrderPage({ params, searchParams }: Args) {
  const { store, t } = await resolveStore(params);
  const { number } = await params;
  const sp = await searchParams;
  if (PREVIEW_MODE) notFound();
  const data = await getOrderForViewer(number, sp.t);
  if (!data) notFound();
  const settings = await getPublicSettings();
  const bank = await bankInfoFor(data.order, settings);
  const fresh = isWithinMinutes(data.order.created_at, 30);
  return (
    <div className="container-page py-6 lg:py-10">
      <header className="mb-8 flex items-start gap-4">
        {fresh && <VerifiedIcon size={44} className="shrink-0 text-success-500" />}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{fresh ? t.order.thankYou : fmt(t.account.orderDetail, { number: data.order.number })}</h1>
          {fresh && <p className="mt-2 text-ink-600">{fmt(t.order.received, { number: data.order.number, email: data.order.email })}</p>}
          {sp.platba === "chyba" && <p className="mt-3 rounded-field bg-warning-50 px-4 py-3 text-sm font-medium text-ink-800">{t.checkout.errors.PAYMENT_START}</p>}
        </div>
      </header>
      <OrderDetail data={data} store={store} t={t} bank={bank} />
    </div>
  );
}
