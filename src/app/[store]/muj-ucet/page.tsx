import Link from "next/link";
import { resolveStore } from "@/components/catalog/collection-page";
import { PREVIEW_MODE } from "@/lib/preview";
import { OrdersTable } from "@/components/account/orders-table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storePath } from "@/lib/store";

type Args = { params: Promise<{ store: string }>; searchParams: Promise<{ heslo?: string; potvrzeno?: string }> };

export default async function AccountOverview({ params, searchParams }: Args) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) return null;
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: orders } = await supabase.from("orders").select("number, created_at, status, grand_total, currency").order("created_at", { ascending: false }).limit(3);
  const tiles = [
    { href: "/muj-ucet/objednavky", label: t.account.nav.orders },
    { href: "/muj-ucet/adresy", label: t.account.nav.addresses },
    { href: "/muj-ucet/profil", label: t.account.nav.profile },
    { href: "/oblibene", label: t.account.nav.wishlist },
  ];
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.account.nav.overview}</h1>
      {(sp.heslo || sp.potvrzeno) && (
        <p role="status" className="rounded-field bg-success-50 px-4 py-3 text-sm font-medium text-success-600">{sp.heslo ? t.auth.passwordUpdated : t.auth.emailConfirmed}</p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.href}>
            <Link href={storePath(store.code, tile.href)} className="block rounded-card bg-surface p-4 font-semibold text-ink-900 transition hover:bg-surface-strong">{tile.label} →</Link>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="mb-4 text-xl font-bold">{t.account.recentOrders}</h2>
        <OrdersTable orders={orders ?? []} store={store} t={t} />
      </section>
    </div>
  );
}
