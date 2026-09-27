import { resolveStore } from "@/components/catalog/collection-page";
import { PREVIEW_MODE } from "@/lib/preview";
import { OrdersTable } from "@/components/account/orders-table";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountOrders({ params }: { params: Promise<{ store: string }> }) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) return null;
  const supabase = await createSupabaseServerClient();
  const { data: orders } = await supabase.from("orders").select("number, created_at, status, grand_total, currency").order("created_at", { ascending: false }).limit(100);
  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{t.account.nav.orders}</h1>
      <OrdersTable orders={orders ?? []} store={store} t={t} />
    </div>
  );
}
