import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import type { Dictionary } from "@/i18n";
import { storePath, type CurrencyCode, type StoreConfig } from "@/lib/store";

export type OrderRow = { number: string; created_at: string; status: string; grand_total: number; currency: string };

export function OrdersTable({ orders, store, t }: { orders: OrderRow[]; store: StoreConfig; t: Dictionary }) {
  if (!orders.length) return <p className="rounded-card bg-surface px-6 py-10 text-center text-ink-600">{t.account.noOrders}</p>;
  return (
    <div className="overflow-x-auto rounded-card ring-1 ring-ink-100">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-surface text-left text-ink-600">
          <tr><th className="px-4 py-3 font-medium">{t.order.number}</th><th className="px-4 py-3 font-medium">{t.order.date}</th><th className="px-4 py-3 font-medium">{t.order.status}</th><th className="px-4 py-3 text-right font-medium">{t.order.total}</th></tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {orders.map((o) => (
            <tr key={o.number} className="hover:bg-ink-50/60">
              <td className="px-4 py-3"><Link href={storePath(store.code, `/muj-ucet/objednavky/${o.number}`)} className="font-semibold text-brand-700 hover:underline">{o.number}</Link></td>
              <td className="px-4 py-3 text-ink-700">{formatDate(o.created_at, store.intl)}</td>
              <td className="px-4 py-3"><StatusBadge status={o.status} label={t.order.statuses[o.status as keyof typeof t.order.statuses] ?? o.status} /></td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(o.grand_total, o.currency as CurrencyCode, store.intl)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
