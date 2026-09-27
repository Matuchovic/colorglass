import { resolveStore } from "@/components/catalog/collection-page";
import { PREVIEW_MODE } from "@/lib/preview";
import { PasswordForm } from "@/components/account/forms";

export default async function AccountPassword({ params }: { params: Promise<{ store: string }> }) {
  const { t } = await resolveStore(params);
  if (PREVIEW_MODE) return null;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.account.nav.password}</h1>
      <PasswordForm t={t} />
    </div>
  );
}
