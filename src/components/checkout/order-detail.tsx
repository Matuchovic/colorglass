import Image from "next/image";
import Link from "next/link";
import { formatDate, formatMoney } from "@/lib/format";
import { fmt, type Dictionary } from "@/i18n";
import { storePath, type CurrencyCode, type StoreConfig } from "@/lib/store";
import type { OrderFull } from "@/server/orders";

export type BankInfo = { account: string | null; iban: string | null; qrSvg: string | null } | null;

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-ink-600">{label}</dt>
      <dd className={strong ? "font-extrabold text-ink-900" : "font-medium text-ink-900"}>{value}</dd>
    </div>
  );
}

/** Detail objednávky – sdílený pro děkovnou stránku i účet zákazníka. */
export function OrderDetail({ data, store, t, bank, actions }: { data: OrderFull; store: StoreConfig; t: Dictionary; bank: BankInfo; actions?: React.ReactNode }) {
  const o = data.order;
  const currency = o.currency as CurrencyCode;
  const money = (v: number) => formatMoney(v, currency, store.intl);
  const pickup = o.pickup_point as { name?: string; street?: string; city?: string } | null;
  const awaitingTransfer = o.payment_method_code === "bank_transfer" && o.payment_status === "pending" && o.status === "awaiting_payment";
  const address = (a: typeof data.billing) =>
    a ? [a.company, `${a.first_name} ${a.last_name}`, a.street, `${a.postal_code} ${a.city}`, a.company_id && `${t.checkout.companyId}: ${a.company_id}`, a.vat_id && `${t.checkout.vatId}: ${a.vat_id}`].filter(Boolean) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-6">
        {awaitingTransfer && (
          <section className="rounded-card bg-brand-50/70 p-5 ring-1 ring-brand-100 sm:p-6">
            <h2 className="text-lg font-bold">{t.order.bankTitle}</h2>
            {bank && (bank.account || bank.iban) ? (
              <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
                <dl className="flex-1 space-y-2.5">
                  {bank.account && <Row label={t.order.bankAccount} value={bank.account} />}
                  {bank.iban && <Row label={t.order.bankIban} value={bank.iban.replace(/(.{4})/g, "$1 ").trim()} />}
                  <Row label={t.order.bankAmount} value={money(o.grand_total)} strong />
                  <Row label={t.order.bankVs} value={o.number} strong />
                </dl>
                {bank.qrSvg && (
                  <figure className="shrink-0 text-center">
                    <div className="size-40 rounded-field bg-white p-2 ring-1 ring-ink-100 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: bank.qrSvg }} />
                    <figcaption className="mt-2 max-w-40 text-xs text-ink-600">{t.order.bankQr}</figcaption>
                  </figure>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-700">{t.order.bankMissing}</p>
            )}
            {o.reservation_expires_at && <p className="mt-4 text-sm text-ink-700">{fmt(t.order.bankDeadline, { date: formatDate(o.reservation_expires_at, store.intl) })}</p>}
          </section>
        )}
        {o.payment_method_code === "cod" && o.status !== "cancelled" && o.payment_status !== "paid" && (
          <p className="rounded-card bg-surface p-4 text-sm font-medium text-ink-800">{t.order.cod} {money(o.grand_total)}</p>
        )}

        <section className="rounded-card ring-1 ring-ink-100">
          <h2 className="border-b border-ink-100 px-5 py-4 text-lg font-bold">{t.order.items}</h2>
          <ul className="divide-y divide-ink-100">
            {data.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-field bg-surface">
                  {item.image_url && <Image src={item.image_url} alt="" fill sizes="64px" className="object-contain p-1.5" />}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-ink-900">{item.name}</p>
                  {item.variant_name && <p className="text-ink-600">{item.variant_name}</p>}
                  <p className="text-ink-500">{item.quantity} × {money(item.unit_price)}</p>
                </div>
                <p className="font-semibold tabular-nums">{money(item.line_total)}</p>
              </li>
            ))}
          </ul>
        </section>

        {data.history.length > 0 && (
          <section className="rounded-card p-5 ring-1 ring-ink-100">
            <h2 className="text-lg font-bold">{t.order.history}</h2>
            <ol className="mt-4 space-y-3 border-l-2 border-brand-100 pl-5">
              {data.history.map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute -left-[27px] top-1 size-3 rounded-full bg-brand-600 ring-4 ring-white" />
                  <p className="font-semibold text-ink-900">{t.order.statuses[h.to_status]}</p>
                  <p className="text-ink-500">{formatDate(h.created_at, store.intl, true)}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28">
        <section className="rounded-card p-5 ring-1 ring-ink-100">
          <dl className="space-y-2.5">
            <Row label={t.order.number} value={o.number} />
            <Row label={t.order.date} value={formatDate(o.created_at, store.intl, true)} />
            <Row label={t.order.status} value={t.order.statuses[o.status]} />
            <Row label={t.order.payment} value={`${o.payment_method_name} · ${t.order.paymentStatuses[o.payment_status]}`} />
            <Row label={t.order.shipping} value={o.shipping_method_name} />
          </dl>
          {pickup?.name && <p className="mt-3 rounded-field bg-surface p-3 text-sm">{fmt(t.order.pickupAt, { name: pickup.name })}{pickup.city ? `, ${pickup.city}` : ""}</p>}
          {data.shipments.filter((s) => s.tracking_url).map((s) => (
            <a key={s.id} href={s.tracking_url!} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">{t.order.track} →</a>
          ))}
          <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4">
            <Row label={t.cart.subtotal} value={money(o.subtotal)} />
            {o.discount_total > 0 && <Row label={t.cart.discount} value={`−${money(o.discount_total)}`} />}
            <Row label={t.cart.shipping} value={o.shipping_total ? money(o.shipping_total) : t.cart.shippingFree} />
            {o.payment_fee_total > 0 && <Row label={t.cart.paymentFee} value={money(o.payment_fee_total)} />}
            <Row label={t.order.total} value={money(o.grand_total)} strong />
            <p className="text-right text-xs text-ink-500">{t.common.vatIncluded} ({money(o.tax_total)})</p>
          </dl>
        </section>
        {(data.shipping || data.billing) && (
          <section className="grid gap-4 rounded-card p-5 text-sm ring-1 ring-ink-100">
            {data.shipping && <div><h3 className="font-bold">{t.checkout.shippingAddress}</h3><p className="mt-1 whitespace-pre-line text-ink-700">{address(data.shipping).join("\n")}</p></div>}
            {data.billing && <div><h3 className="font-bold">{t.checkout.billingAddress}</h3><p className="mt-1 whitespace-pre-line text-ink-700">{address(data.billing).join("\n")}</p></div>}
          </section>
        )}
        {actions}
        <Link href={storePath(store.code, "/kontakt")} className="block text-center text-sm font-semibold text-ink-600 hover:text-brand-700">{t.contact.title}</Link>
      </aside>
    </div>
  );
}
