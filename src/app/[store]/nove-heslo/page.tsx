import type { Metadata } from "next";
import Link from "next/link";
import { resolveStore } from "@/components/catalog/collection-page";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/auth-forms";
import { btnPrimary } from "@/components/ui/styles";
import { PREVIEW_MODE } from "@/lib/preview";
import { storePath } from "@/lib/store";
import { getSessionUser } from "@/server/auth";

type Args = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { t } = await resolveStore(params);
  return { title: t.auth.resetTitle, robots: { index: false, follow: false } };
}

export default async function ResetPasswordPage({ params }: Args) {
  const { store, t } = await resolveStore(params);
  const user = PREVIEW_MODE ? null : await getSessionUser();
  return (
    <AuthCard title={t.auth.resetTitle} subtitle={user ? t.auth.resetText : undefined}>
      {user ? (
        <ResetForm store={store.code} t={t} />
      ) : (
        <div className="space-y-5">
          <p className="text-ink-700">{t.auth.linkInvalid}</p>
          <Link href={storePath(store.code, "/zapomenute-heslo")} className={`${btnPrimary} w-full`}>{t.auth.sendLink}</Link>
        </div>
      )}
    </AuthCard>
  );
}
