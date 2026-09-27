import { resolveStore } from "@/components/catalog/collection-page";
import { PREVIEW_MODE } from "@/lib/preview";
import { ProfileForm } from "@/components/account/forms";
import { getProfile } from "@/server/auth";

export default async function AccountProfile({ params }: { params: Promise<{ store: string }> }) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) return null;
  const p = await getProfile();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.account.nav.profile}</h1>
      <p className="text-sm text-ink-600">{t.checkout.email}: <strong className="text-ink-900">{p?.email}</strong></p>
      <ProfileForm t={t} values={{
        first_name: p?.first_name ?? "", last_name: p?.last_name ?? "", phone: p?.phone ?? "", company_name: p?.company_name ?? "",
        company_id: p?.company_id ?? "", vat_id: p?.vat_id ?? "", preferred_market: p?.preferred_market ?? store.market,
      }} />
      <section className="max-w-2xl rounded-card bg-surface p-5 text-sm">
        <h2 className="font-bold text-ink-900">{t.account.deleteAccountTitle}</h2>
        <p className="mt-1 text-ink-700">{t.account.deleteAccountText}</p>
      </section>
    </div>
  );
}
