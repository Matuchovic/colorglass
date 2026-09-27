import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveStore } from "@/components/catalog/collection-page";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/auth-forms";
import { PREVIEW_MODE } from "@/lib/preview";
import { storePath } from "@/lib/store";
import { getSessionUser } from "@/server/auth";

type Args = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { t } = await resolveStore(params);
  return { title: t.auth.registerTitle, robots: { index: false, follow: true } };
}

export default async function RegisterPage({ params }: Args) {
  const { store, t } = await resolveStore(params);
  if (!PREVIEW_MODE && (await getSessionUser())) redirect(storePath(store.code, "/muj-ucet"));
  return (
    <AuthCard title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      {PREVIEW_MODE && <p className="mb-5 rounded-field bg-surface px-4 py-3 text-sm text-ink-600">{t.auth.previewNote}</p>}
      <RegisterForm store={store.code} t={t} />
    </AuthCard>
  );
}
