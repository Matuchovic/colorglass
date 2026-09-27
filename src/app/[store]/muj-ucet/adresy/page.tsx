import { resolveStore } from "@/components/catalog/collection-page";
import { PREVIEW_MODE } from "@/lib/preview";
import { AddressForm, type AddressValues } from "@/components/account/forms";
import { deleteAddressAction } from "@/actions/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountAddresses({ params }: { params: Promise<{ store: string }> }) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) return null;
  const supabase = await createSupabaseServerClient();
  const { data: addresses } = await supabase.from("addresses").select("*").order("created_at");
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.account.addresses}</h1>
      {addresses?.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-card p-5 text-sm ring-1 ring-ink-100">
              <p className="font-bold text-ink-900">{a.label ?? `${a.first_name} ${a.last_name}`}</p>
              <p className="mt-1 whitespace-pre-line text-ink-700">{[a.company, `${a.first_name} ${a.last_name}`, a.street, `${a.postal_code} ${a.city}`, a.phone].filter(Boolean).join("\n")}</p>
              <p className="mt-2 flex flex-wrap gap-2">
                {a.is_default_shipping && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">{t.account.defaultShipping}</span>}
                {a.is_default_billing && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">{t.account.defaultBilling}</span>}
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer font-semibold text-brand-700">{t.account.editAddress}</summary>
                <div className="mt-4"><AddressForm store={store.code} values={a as AddressValues} t={t} /></div>
              </details>
              <form action={deleteAddressAction} className="mt-3">
                <input type="hidden" name="store" value={store.code} />
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-sm font-semibold text-danger-600 hover:underline">{t.account.deleteAddress}</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card bg-surface px-6 py-8 text-center text-ink-600">{t.account.noAddresses}</p>
      )}
      <section className="rounded-card p-5 ring-1 ring-ink-100 sm:p-6">
        <h2 className="mb-5 text-xl font-bold">{t.account.addAddress}</h2>
        <AddressForm store={store.code} t={t} />
      </section>
    </div>
  );
}
