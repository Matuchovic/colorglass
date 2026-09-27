"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { CheckIcon } from "@/components/icons";
import { forgotPasswordAction, googleSignInAction, loginAction, registerAction, resetPasswordAction, type AuthState } from "@/actions/auth";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/ui/styles";
import { fmt, type Dictionary } from "@/i18n";
import { storePath, type StoreCode } from "@/lib/store";

type T = Pick<Dictionary, "auth" | "errors" | "preview" | "checkout" | "account">;
const initial: AuthState = { status: "idle" };

function message(t: T, code: string | undefined): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    validation: t.errors.validation, rateLimited: t.errors.rateLimited, invalidCredentials: t.auth.invalidCredentials,
    emailNotConfirmed: t.auth.emailNotConfirmed, passwordMismatch: t.auth.passwordMismatch, linkInvalid: t.auth.linkInvalid,
    preview: t.auth.previewNote, generic: t.errors.generic,
  };
  return map[code] ?? t.errors.generic;
}

function Field({ label, name, state, t, hint, ...props }: { label: string; name: string; state: AuthState; t: T; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const code = state.fieldErrors?.[name];
  const error = code ? ((t.errors as Record<string, string>)[code] ?? t.errors.validation) : null;
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label}</label>
      <input id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-e` : hint ? `${name}-h` : undefined} className={inputClass} {...props} />
      {error ? <p id={`${name}-e`} className="mt-1 text-sm text-danger-600">{error}</p> : hint ? <p id={`${name}-h`} className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

function Alert({ children, ok }: { children: ReactNode; ok?: boolean }) {
  return (
    <p role={ok ? "status" : "alert"} className={`flex gap-2.5 rounded-field px-4 py-3 text-sm font-medium ${ok ? "bg-success-50 text-success-600" : "bg-danger-50 text-danger-600"}`}>
      {ok && <CheckIcon size={18} className="shrink-0" />}
      {children}
    </p>
  );
}

export function LoginForm({ store, next, t, google, notice }: { store: StoreCode; next: string; t: T; google: boolean; notice: string | null }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const err = message(t, state.code);
  return (
    <div className="space-y-5">
      {notice && <Alert>{notice}</Alert>}
      <form action={action} className="space-y-4">
        <input type="hidden" name="store" value={store} />
        <input type="hidden" name="next" value={next} />
        {err && <Alert>{err}</Alert>}
        <Field label={t.auth.email} name="email" type="email" autoComplete="email" required state={state} t={t} />
        <Field label={t.auth.password} name="password" type="password" autoComplete="current-password" required state={state} t={t} />
        <div className="text-right text-sm">
          <Link href={storePath(store, "/zapomenute-heslo")} className="font-medium text-brand-700 hover:underline">{t.auth.forgot}</Link>
        </div>
        <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>{t.auth.login}</button>
      </form>
      {google && (
        <form action={googleSignInAction}>
          <input type="hidden" name="store" value={store} />
          <input type="hidden" name="next" value={next} />
          <button type="submit" className={`${btnSecondary} w-full`}>{t.auth.google}</button>
        </form>
      )}
      <p className="text-center text-sm text-ink-600">
        {t.auth.noAccount} <Link href={storePath(store, "/registrace")} className="font-semibold text-brand-700 hover:underline">{t.auth.register}</Link>
      </p>
    </div>
  );
}

export function RegisterForm({ store, t }: { store: StoreCode; t: T }) {
  const [state, action, pending] = useActionState(registerAction, initial);
  if (state.status === "success") return <Alert ok>{fmt(t.auth.checkEmail, { email: state.email ?? "" })}</Alert>;
  const err = message(t, state.code);
  const [before, after] = t.auth.termsNote.split("{terms}");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="store" value={store} />
      {err && <Alert>{err}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.auth.firstName} name="first_name" autoComplete="given-name" required state={state} t={t} />
        <Field label={t.auth.lastName} name="last_name" autoComplete="family-name" required state={state} t={t} />
      </div>
      <Field label={t.auth.email} name="email" type="email" autoComplete="email" required state={state} t={t} />
      <Field label={t.auth.password} name="password" type="password" autoComplete="new-password" required minLength={10} state={state} t={t} hint={t.auth.passwordRules} />
      <Field label={t.auth.passwordAgain} name="password_again" type="password" autoComplete="new-password" required state={state} t={t} />
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-700">
        <input type="checkbox" name="marketing" className="mt-0.5 size-4 shrink-0 accent-brand-600" />
        {t.auth.marketingConsent}
      </label>
      <p className="text-xs text-ink-500">
        {before}<Link href={storePath(store, "/obchodni-podminky")} className="underline">{t.checkout.termsLink}</Link>{after}
      </p>
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>{t.auth.register}</button>
      <p className="text-center text-sm text-ink-600">
        {t.auth.haveAccount} <Link href={storePath(store, "/prihlaseni")} className="font-semibold text-brand-700 hover:underline">{t.auth.login}</Link>
      </p>
    </form>
  );
}

export function ForgotForm({ store, t }: { store: StoreCode; t: T }) {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);
  if (state.status === "success") return <Alert ok>{t.auth.resetSent}</Alert>;
  const err = message(t, state.code);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="store" value={store} />
      {err && <Alert>{err}</Alert>}
      <Field label={t.auth.email} name="email" type="email" autoComplete="email" required state={state} t={t} />
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>{t.auth.sendLink}</button>
      <p className="text-center text-sm"><Link href={storePath(store, "/prihlaseni")} className="font-semibold text-brand-700 hover:underline">{t.auth.login}</Link></p>
    </form>
  );
}

export function ResetForm({ store, t }: { store: StoreCode; t: T }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  const err = message(t, state.code);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="store" value={store} />
      {err && <Alert>{err}</Alert>}
      <Field label={t.account.newPassword} name="password" type="password" autoComplete="new-password" required minLength={10} state={state} t={t} hint={t.auth.passwordRules} />
      <Field label={t.auth.passwordAgain} name="password_again" type="password" autoComplete="new-password" required state={state} t={t} />
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>{t.auth.setPassword}</button>
    </form>
  );
}
