import type { Metadata } from "next";
import { resolveStore } from "@/components/catalog/collection-page";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/auth-forms";

type Args = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { t } = await resolveStore(params);
  return { title: t.auth.forgotTitle, robots: { index: false, follow: false } };
}

export default async function ForgotPage({ params }: Args) {
  const { store, t } = await resolveStore(params);
  return (
    <AuthCard title={t.auth.forgotTitle} subtitle={t.auth.forgotText}>
      <ForgotForm store={store.code} t={t} />
    </AuthCard>
  );
}
