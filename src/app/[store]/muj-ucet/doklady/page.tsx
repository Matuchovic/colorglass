import Link from "next/link";
import { resolveStore } from "@/components/catalog/collection-page";
import { PREVIEW_MODE } from "@/lib/preview";
import { formatDate } from "@/lib/format";
import { storePath } from "@/lib/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountDocuments({ params }: { params: Promise<{ store: string }> }) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) return null;
  const supabase = await createSupabaseServerClient();
  const { data: docs } = await supabase.from("order_documents").select("id, type, number, issued_at, orders(number)").order("issued_at", { ascending: false });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.account.nav.documents}</h1>
      {docs?.length ? (
        <ul className="divide-y divide-ink-100 rounded-card ring-1 ring-ink-100">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-semibold text-ink-900">{d.number ?? d.type}</span>
              <Link href={storePath(store.code, `/muj-ucet/objednavky/${d.orders?.number}`)} className="text-brand-700 hover:underline">{d.orders?.number}</Link>
              <span className="text-ink-600">{formatDate(d.issued_at, store.intl)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card bg-surface px-6 py-10 text-center text-ink-600">{t.order.noDocuments}</p>
      )}
    </div>
  );
}
