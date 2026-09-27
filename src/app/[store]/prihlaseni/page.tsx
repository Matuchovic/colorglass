import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveStore } from "@/components/catalog/collection-page";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/auth-forms";
import { PREVIEW_MODE } from "@/lib/preview";
import { storePath } from "@/lib/store";
import { safeRedirectPath } from "@/lib/utils";
import { getSessionUser } from "@/server/auth";

type Args = { params: Promise<{ store: string }>; searchParams: Promise<{ next?: string; chyba?: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { t } = await resolveStore(params);
  return { title: t.auth.loginTitle, robots: { index: false, follow: true } };
}

export default async function LoginPage({ params, searchParams }: Args) {
  const { store, t } = await resolveStore(params);
  const sp = await searchParams;
  const next = safeRedirectPath(sp.next, storePath(store.code, "/muj-ucet"));
  if (!PREVIEW_MODE && (await getSessionUser())) redirect(next);
  const notice = sp.chyba === "odkaz" ? t.auth.linkInvalid : sp.chyba ? t.errors.generic : PREVIEW_MODE ? t.auth.previewNote : null;
  return (
    <AuthCard title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <LoginForm store={store.code} next={next} t={t} google={process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true"} notice={notice} />
    </AuthCard>
  );
}
