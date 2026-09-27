"use client";

import { useActionState } from "react";
import { changePasswordAction, createReturnAction, saveAddressAction, updateProfileAction, type FormState } from "@/actions/account";
import { btnPrimary, inputClass, labelClass } from "@/components/ui/styles";
import type { Dictionary } from "@/i18n";
import type { StoreCode } from "@/lib/store";

type T = Pick<Dictionary, "account" | "checkout" | "auth" | "errors" | "common">;
const init: FormState = { status: "idle" };

function useField(state: FormState, t: T) {
  return (name: string) => {
    const code = state.fieldErrors?.[name];
    return code ? ((t.errors as Record<string, string>)[code] ?? t.errors.validation) : null;
  };
}

function Input({ label, name, error, ...props }: { label: string; name: string; error: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label}</label>
      <input id={name} name={name} aria-invalid={Boolean(error)} className={inputClass} {...props} />
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}

function Feedback({ state, ok, t }: { state: FormState; ok: string; t: T }) {
  if (state.status === "ok") return <p role="status" className="rounded-field bg-success-50 px-4 py-3 text-sm font-medium text-success-600">{ok}</p>;
  if (state.status !== "error") return null;
  const map: Record<string, string> = {
    validation: t.errors.validation, rateLimited: t.errors.rateLimited, invalidCredentials: t.auth.invalidCredentials,
    passwordMismatch: t.auth.passwordMismatch, auth: t.auth.required, window: t.account.noEligibleOrders,
  };
  return <p role="alert" className="rounded-field bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600">{map[state.code ?? ""] ?? t.errors.generic}</p>;
}

export type ProfileValues = { first_name: string; last_name: string; phone: string; company_name: string; company_id: string; vat_id: string; preferred_market: "CZ" | "SK" };

export function ProfileForm({ values, t }: { values: ProfileValues; t: T }) {
  const [state, action, pending] = useActionState(updateProfileAction, init);
  const err = useField(state, t);
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <Feedback state={state} ok={t.account.profileSaved} t={t} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t.checkout.firstName} name="first_name" defaultValue={values.first_name} error={err("first_name")} autoComplete="given-name" required />
        <Input label={t.checkout.lastName} name="last_name" defaultValue={values.last_name} error={err("last_name")} autoComplete="family-name" required />
        <Input label={t.checkout.phone} name="phone" type="tel" defaultValue={values.phone} error={err("phone")} autoComplete="tel" />
        <div>
          <label htmlFor="preferred_market" className={labelClass}>{t.account.marketDefault}</label>
          <select id="preferred_market" name="preferred_market" defaultValue={values.preferred_market} className={inputClass}>
            <option value="CZ">Česko</option>
            <option value="SK">Slovensko</option>
          </select>
        </div>
      </div>
      <fieldset className="grid gap-4 border-t border-ink-100 pt-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold text-ink-900">{t.checkout.companyTitle}</legend>
        <div className="sm:col-span-3"><Input label={t.checkout.company} name="company_name" defaultValue={values.company_name} error={err("company_name")} /></div>
        <Input label={t.checkout.companyId} name="company_id" defaultValue={values.company_id} error={err("company_id")} inputMode="numeric" />
        <Input label={t.checkout.vatId} name="vat_id" defaultValue={values.vat_id} error={err("vat_id")} />
      </fieldset>
      <button type="submit" disabled={pending} className={btnPrimary}>{t.common.save}</button>
    </form>
  );
}

export function PasswordForm({ t }: { t: T }) {
  const [state, action, pending] = useActionState(changePasswordAction, init);
  const err = useField(state, t);
  return (
    <form action={action} className="max-w-md space-y-4">
      <Feedback state={state} ok={t.account.passwordChanged} t={t} />
      <Input label={t.account.currentPassword} name="current" type="password" autoComplete="current-password" required error={err("current")} />
      <Input label={t.account.newPassword} name="password" type="password" autoComplete="new-password" minLength={10} required error={err("password")} />
      <p className="-mt-2 text-xs text-ink-500">{t.auth.passwordRules}</p>
      <Input label={t.auth.passwordAgain} name="password_again" type="password" autoComplete="new-password" required error={err("password_again")} />
      <button type="submit" disabled={pending} className={btnPrimary}>{t.common.save}</button>
    </form>
  );
}

export type AddressValues = { id?: string; label?: string | null; first_name: string; last_name: string; company?: string | null; street: string; city: string; postal_code: string; country: "CZ" | "SK"; phone?: string | null; is_default_shipping?: boolean; is_default_billing?: boolean };

export function AddressForm({ store, values, t }: { store: StoreCode; values?: AddressValues; t: T }) {
  const [state, action, pending] = useActionState(saveAddressAction, init);
  const err = useField(state, t);
  const v = values;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="store" value={store} />
      {v?.id && <input type="hidden" name="id" value={v.id} />}
      <Feedback state={state} ok={t.common.saved} t={t} />
      <Input label={t.account.addressLabel} name="label" defaultValue={v?.label ?? ""} error={null} maxLength={60} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t.checkout.firstName} name="first_name" defaultValue={v?.first_name} error={err("first_name")} required />
        <Input label={t.checkout.lastName} name="last_name" defaultValue={v?.last_name} error={err("last_name")} required />
        <div className="sm:col-span-2"><Input label={t.checkout.street} name="street" defaultValue={v?.street} error={err("street")} required /></div>
        <Input label={t.checkout.city} name="city" defaultValue={v?.city} error={err("city")} required />
        <Input label={t.checkout.postalCode} name="postal_code" defaultValue={v?.postal_code} error={err("postal_code")} required />
        <div>
          <label htmlFor={`country-${v?.id ?? "new"}`} className={labelClass}>{t.checkout.country}</label>
          <select id={`country-${v?.id ?? "new"}`} name="country" defaultValue={v?.country ?? (store === "sk" ? "SK" : "CZ")} className={inputClass}>
            <option value="CZ">Česko</option>
            <option value="SK">Slovensko</option>
          </select>
        </div>
        <Input label={t.checkout.phone} name="phone" type="tel" defaultValue={v?.phone ?? ""} error={err("phone")} />
        <div className="sm:col-span-2"><Input label={t.checkout.company} name="company" defaultValue={v?.company ?? ""} error={null} /></div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_default_shipping" defaultChecked={v?.is_default_shipping} className="size-4 accent-brand-600" />{t.account.defaultShipping}</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_default_billing" defaultChecked={v?.is_default_billing} className="size-4 accent-brand-600" />{t.account.defaultBilling}</label>
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>{t.common.save}</button>
    </form>
  );
}

export type ReturnOrder = { id: string; number: string; items: Array<{ id: string; name: string; variant_name: string | null; quantity: number }> };

export function ReturnForm({ orders, t }: { orders: ReturnOrder[]; t: T }) {
  const [state, action, pending] = useActionState(createReturnAction, init);
  if (state.status === "ok") return <p role="status" className="rounded-field bg-success-50 px-4 py-3 text-sm font-medium text-success-600">{t.account.requestSent}</p>;
  return (
    <form action={action} className="space-y-5">
      <Feedback state={state} ok="" t={t} />
      <fieldset>
        <legend className={labelClass}>{t.account.requestType}</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="type" value="return" defaultChecked className="size-4 accent-brand-600" />{t.account.typeReturn}</label>
          <label className="flex items-center gap-2"><input type="radio" name="type" value="complaint" className="size-4 accent-brand-600" />{t.account.typeComplaint}</label>
        </div>
      </fieldset>
      {orders.map((o) => (
        <fieldset key={o.id} className="rounded-field p-4 ring-1 ring-ink-100">
          <label className="flex items-center gap-2 font-semibold text-ink-900">
            <input type="radio" name="order_id" value={o.id} className="size-4 accent-brand-600" required />
            {t.account.selectOrder} {o.number}
          </label>
          <ul className="mt-3 space-y-2 pl-6 text-sm">
            {o.items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3">
                <label className="flex flex-1 items-center gap-2"><input type="checkbox" name="item" value={i.id} className="size-4 accent-brand-600" />{i.name}{i.variant_name ? ` (${i.variant_name})` : ""}</label>
                <label className="flex items-center gap-2 text-ink-600">{t.account.requestQuantity}
                  <input type="number" name={`qty_${i.id}`} min={1} max={i.quantity} defaultValue={1} className="h-9 w-16 rounded-md px-2 ring-1 ring-ink-200" />
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
      <div>
        <label htmlFor="reason" className={labelClass}>{t.account.reason}</label>
        <textarea id="reason" name="reason" rows={4} required minLength={5} maxLength={2000} className={`${inputClass} h-auto py-3`} />
      </div>
      <Input label={t.account.bankAccount} name="bank_account" error={null} maxLength={64} />
      <button type="submit" disabled={pending} className={btnPrimary}>{t.account.submitRequest}</button>
    </form>
  );
}
