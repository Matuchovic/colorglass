import { resolveStore } from "@/components/catalog/collection-page";
import { PREVIEW_MODE } from "@/lib/preview";
import { ReturnForm, type ReturnOrder } from "@/components/account/forms";
import { StatusBadge } from "@/components/account/status-badge";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { daysAgoIso } from "@/lib/time";

export default async function AccountReturns({ params }: { params: Promise<{ store: string }> }) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) return null;
  const supabase = await createSupabaseServerClient();
  const since = daysAgoIso(2 * 365);
  const [{ data: requests }, { data: orders }] = await Promise.all([
    supabase.from("return_requests").select("id, type, status, reason, created_at, orders(number)").order("created_at", { ascending: false }),
    supabase.from("orders").select("id, number, order_items(id, name, variant_name, quantity)").eq("status", "delivered").gte("delivered_at", since).order("created_at", { ascending: false }).limit(20),
  ]);
  const eligible: ReturnOrder[] = (orders ?? []).map((o) => ({ id: o.id, number: o.number, items: o.order_items }));
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t.account.nav.returns} / {t.account.nav.complaints}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">{t.account.returnsIntro} {t.account.complaintsIntro}</p>
      </div>
      {requests?.length ? (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card p-4 text-sm ring-1 ring-ink-100">
              <span>
                <strong className="text-ink-900">{r.type === "return" ? t.account.typeReturn : t.account.typeComplaint}</strong>
                <span className="text-ink-600"> · {r.orders?.number} · {formatDate(r.created_at, store.intl)}</span>
              </span>
              <StatusBadge status={r.status} label={t.account.requestStatuses[r.status]} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card bg-surface px-6 py-6 text-center text-ink-600">{t.account.noRequests}</p>
      )}
      <section className="rounded-card p-5 ring-1 ring-ink-100 sm:p-6">
        <h2 className="mb-5 text-xl font-bold">{t.account.newRequest}</h2>
        {eligible.length ? <ReturnForm orders={eligible} t={t} /> : <p className="text-ink-600">{t.account.noEligibleOrders}</p>}
      </section>
    </div>
  );
}
