import { notFound } from "next/navigation";
import { resolveStore } from "@/components/catalog/collection-page";
import { PREVIEW_MODE } from "@/lib/preview";
import { OrderDetail } from "@/components/checkout/order-detail";
import { cancelOrderAction } from "@/actions/account";
import { fmt } from "@/i18n";
import { formatDate } from "@/lib/format";
import { getOrderForViewer } from "@/server/orders";
import { getPublicSettings } from "@/server/catalog";
import { bankInfoFor } from "@/server/bank";

type Args = { params: Promise<{ store: string; number: string }>; searchParams: Promise<{ zruseni?: string }> };

export default async function AccountOrderDetail({ params, searchParams }: Args) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) return null;
  const { number } = await params;
  const sp = await searchParams;
  const data = await getOrderForViewer(number, undefined);
  if (!data) notFound();
  const bank = await bankInfoFor(data.order, await getPublicSettings());
  const cancellable = ["new", "awaiting_payment"].includes(data.order.status) && data.order.payment_status !== "paid";
  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{fmt(t.account.orderDetail, { number })}</h1>
      {sp.zruseni && (
        <p role="status" className={`mb-6 rounded-field px-4 py-3 text-sm font-medium ${sp.zruseni === "ok" ? "bg-success-50 text-success-600" : "bg-danger-50 text-danger-600"}`}>
          {sp.zruseni === "ok" ? t.order.cancelled : t.errors.generic}
        </p>
      )}
      <OrderDetail data={data} store={store} t={t} bank={bank} actions={
        <>
          {data.documents.length > 0 && (
            <section className="rounded-card p-5 text-sm ring-1 ring-ink-100">
              <h2 className="font-bold">{t.order.documents}</h2>
              <ul className="mt-2 space-y-1">
                {data.documents.map((d) => <li key={d.id}>{d.number ?? d.type} · {formatDate(d.issued_at, store.intl)}</li>)}
              </ul>
            </section>
          )}
          {cancellable && (
            <form action={cancelOrderAction}>
              <input type="hidden" name="store" value={store.code} />
              <input type="hidden" name="order_id" value={data.order.id} />
              <input type="hidden" name="number" value={number} />
              <button type="submit" className="w-full rounded-btn px-4 py-3 text-sm font-semibold text-danger-600 ring-1 ring-danger-500/40 hover:bg-danger-50">{t.order.cancel}</button>
            </form>
          )}
        </>
      } />
    </div>
  );
}
