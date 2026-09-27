"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, UserIcon } from "@/components/icons";
import { useShop } from "@/components/providers/shop-provider";
import { googleSignInAction, loginAction, logoutAction, type AuthState } from "@/actions/auth";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/ui/styles";
import { fmt } from "@/i18n";
import { storePath } from "@/lib/store";

export type AccountMenuLabels = {
  account: string; close: string; loginTitle: string; email: string; password: string; login: string; forgot: string;
  noAccount: string; registerCta: string; panelRegisterText: string; loginSuccess: string; previewNote: string; hello: string;
  google: string; invalidCredentials: string; emailNotConfirmed: string; rateLimited: string; validation: string; generic: string;
  nav: { overview: string; orders: string; addresses: string; wishlist: string; logout: string };
};

function PanelLogin({ labels, google, onSuccess }: { labels: AccountMenuLabels; google: boolean; onSuccess: () => void }) {
  const { store, preview } = useShop();
  const [state, action, pending] = useActionState(async (prev: AuthState, fd: FormData) => {
    const res = await loginAction(prev, fd);
    if (res.status === "success") onSuccess();
    return res;
  }, { status: "idle" } as AuthState);
  const errors: Record<string, string> = {
    invalidCredentials: labels.invalidCredentials, emailNotConfirmed: labels.emailNotConfirmed, rateLimited: labels.rateLimited,
    validation: labels.validation, preview: labels.previewNote,
  };
  const error = state.status === "error" ? (errors[state.code ?? ""] ?? labels.generic) : null;
  return (
    <div className="space-y-4">
      {preview && <p className="rounded-field bg-surface px-3 py-2.5 text-xs text-ink-600">{labels.previewNote}</p>}
      <form action={action} className="space-y-3">
        <input type="hidden" name="store" value={store} />
        <input type="hidden" name="mode" value="panel" />
        {error && <p role="alert" className="rounded-field bg-danger-50 px-3 py-2.5 text-sm font-medium text-danger-600">{error}</p>}
        <div>
          <label htmlFor="panel-email" className={labelClass}>{labels.email}</label>
          <input id="panel-email" name="email" type="email" autoComplete="email" required className={`${inputClass} h-11`} />
        </div>
        <div>
          <label htmlFor="panel-password" className={labelClass}>{labels.password}</label>
          <input id="panel-password" name="password" type="password" autoComplete="current-password" required className={`${inputClass} h-11`} />
        </div>
        <div className="text-right">
          <Link href={storePath(store, "/zapomenute-heslo")} className="text-sm font-medium text-brand-700 hover:underline">{labels.forgot}</Link>
        </div>
        <button type="submit" disabled={pending} className={`${btnPrimary} h-11 w-full`}>{labels.login}</button>
      </form>
      {google && (
        <form action={googleSignInAction}>
          <input type="hidden" name="store" value={store} />
          <button type="submit" className={`${btnSecondary} h-11 w-full`}>{labels.google}</button>
        </form>
      )}
      <div className="border-t border-ink-100 pt-4">
        <p className="text-sm font-semibold text-ink-900">{labels.noAccount}</p>
        <p className="mt-0.5 text-sm text-ink-600">{labels.panelRegisterText}</p>
        <Link href={storePath(store, "/registrace")} className={`${btnSecondary} mt-3 h-11 w-full`}>{labels.registerCta}</Link>
      </div>
    </div>
  );
}

/** Ikona Účet v hlavičce: panel s přihlášením a registrací, po přihlášení menu účtu. */
export function AccountMenu({ labels, google }: { labels: AccountMenuLabels; google: boolean }) {
  const { store, user, setUser, refreshSession, toast } = useShop();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 90, right: 16 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("input:not([type=hidden]),a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const trigger = buttonRef.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      trigger?.focus();
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setPos({ top: Math.round(r.bottom + 12), right: Math.max(12, Math.round(window.innerWidth - r.right - 12)) });
    setOpen(true);
  };
  const close = () => setOpen(false);
  const link = "block rounded-field px-3 py-2.5 text-[15px] font-medium text-ink-800 hover:bg-surface hover:text-ink-900";

  return (
    <>
      <button ref={buttonRef} type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? panelId : undefined}
        className="group flex flex-col items-center gap-1 rounded-btn px-1.5 py-1 text-ink-800 transition-colors hover:text-brand-700 sm:px-2">
        <span className="relative">
          <UserIcon size={26} />
          {user && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-success-500 ring-2 ring-white" aria-hidden="true" />}
        </span>
        <span className="hidden max-w-[90px] truncate text-[13px] font-medium md:block">{user?.name || labels.account}</span>
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[65] animate-fade-in bg-ink-950/30 sm:bg-transparent" onClick={close} aria-hidden="true" />
          <div ref={panelRef} id={panelId} role="dialog" aria-label={user ? labels.account : labels.loginTitle}
            style={{ "--panel-top": `${pos.top}px`, "--panel-right": `${pos.right}px` } as CSSProperties}
            className="fixed inset-x-3 top-3 z-[66] max-h-[calc(100dvh-24px)] animate-fade-in overflow-y-auto rounded-card bg-white p-5 shadow-[0_24px_60px_-20px_rgb(9_14_33/0.45)] ring-1 ring-ink-100 sm:inset-x-auto sm:top-(--panel-top) sm:right-(--panel-right) sm:w-[360px]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-bold text-ink-900">{user ? fmt(labels.hello, { name: user.name }) : labels.loginTitle}</p>
              <button type="button" onClick={close} aria-label={labels.close} className="-mr-2 rounded-btn p-2 text-ink-500 hover:bg-ink-50">
                <CloseIcon size={20} />
              </button>
            </div>
            {user ? (
              <nav aria-label={labels.account}>
                <Link href={storePath(store, "/muj-ucet")} onClick={close} className={link}>{labels.nav.overview}</Link>
                <Link href={storePath(store, "/muj-ucet/objednavky")} onClick={close} className={link}>{labels.nav.orders}</Link>
                <Link href={storePath(store, "/muj-ucet/adresy")} onClick={close} className={link}>{labels.nav.addresses}</Link>
                <Link href={storePath(store, "/oblibene")} onClick={close} className={link}>{labels.nav.wishlist}</Link>
                <form action={logoutAction} onSubmit={() => { setUser(null); close(); }} className="mt-2 border-t border-ink-100 pt-2">
                  <input type="hidden" name="store" value={store} />
                  <button type="submit" className={`${link} w-full text-left text-danger-600 hover:text-danger-600`}>{labels.nav.logout}</button>
                </form>
              </nav>
            ) : (
              <PanelLogin labels={labels} google={google} onSuccess={() => {
                close();
                refreshSession();
                router.refresh();
                toast(labels.loginSuccess);
              }} />
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
