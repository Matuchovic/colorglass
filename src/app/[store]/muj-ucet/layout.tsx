import type { Metadata } from "next";
import type { ReactNode } from "react";
import { resolveStore } from "@/components/catalog/collection-page";
import { AccountNav } from "@/components/account/account-nav";
import { redirect } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { fmt } from "@/i18n";
import { PREVIEW_MODE } from "@/lib/preview";
import { storePath } from "@/lib/store";
import { getProfile, requireUser } from "@/server/auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children, params }: { children: ReactNode; params: Promise<{ store: string }> }) {
  const { store, t } = await resolveStore(params);
  if (PREVIEW_MODE) redirect(storePath(store.code, "/prihlaseni"));
  await requireUser(store.code, storePath(store.code, "/muj-ucet"));
  const profile = await getProfile();
  const p = (path: string) => storePath(store.code, `/muj-ucet${path}`);
  const items = [
    { href: p(""), label: t.account.nav.overview },
    { href: p("/objednavky"), label: t.account.nav.orders },
    { href: p("/vraceni"), label: `${t.account.nav.returns} / ${t.account.nav.complaints}` },
    { href: p("/doklady"), label: t.account.nav.documents },
    { href: storePath(store.code, "/oblibene"), label: t.account.nav.wishlist },
    { href: p("/adresy"), label: t.account.nav.addresses },
    { href: p("/profil"), label: t.account.nav.profile },
    { href: p("/heslo"), label: t.account.nav.password },
    { href: p("/newsletter"), label: t.account.nav.newsletter },
  ];
  return (
    <div className="container-page py-6 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[250px_1fr] lg:gap-10">
        <aside className="space-y-4">
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm text-ink-600">{t.account.title}</p>
            <p className="font-bold text-ink-900">{fmt(t.account.greeting, { name: profile?.first_name || profile?.email || "" })}</p>
          </div>
          <AccountNav items={items} />
          <form action={logoutAction}>
            <input type="hidden" name="store" value={store.code} />
            <button type="submit" className="w-full rounded-field px-4 py-2.5 text-left text-sm font-medium text-danger-600 hover:bg-danger-50">{t.account.nav.logout}</button>
          </form>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
