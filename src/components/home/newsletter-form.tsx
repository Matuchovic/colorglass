"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { CheckIcon, MailIcon } from "@/components/icons";
import { useShop } from "@/components/providers/shop-provider";
import { subscribeNewsletterAction, type NewsletterState } from "@/actions/shop";
import { storePath } from "@/lib/store";

export function NewsletterForm() {
  const { store, labels } = useShop();
  const [state, formAction, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletterAction, { status: "idle" });
  const startedRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // čas zobrazení formuláře (anti-spam: boti odesílají okamžitě)
    if (startedRef.current) startedRef.current.value = String(Date.now());
  }, []);

  const t = labels.newsletter;
  const message: Record<NewsletterState["status"], { text: string; ok: boolean } | null> = {
    idle: null,
    success: { text: t.success, ok: true },
    already: { text: t.already, ok: true },
    invalid: { text: labels.errors.email, ok: false },
    consent: { text: t.consentRequired, ok: false },
    rate_limited: { text: labels.errors.rateLimited, ok: false },
    preview: { text: labels.preview.newsletter, ok: false },
    error: { text: labels.errors.generic, ok: false },
  };
  const feedback = message[state.status];
  const [consentBefore, consentAfter] = t.consent.split("{link}");

  if (state.status === "success") {
    return (
      <p role="status" className="flex items-start gap-3 rounded-field bg-white p-4 text-sm font-medium text-ink-800 ring-1 ring-success-500/30">
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-500 text-white"><CheckIcon size={13} strokeWidth={3} /></span>
        {t.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="w-full" noValidate={false}>
      <input type="hidden" name="store" value={store} />
      <input ref={startedRef} type="hidden" name="started_at" defaultValue="0" />
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>Web<input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0 sm:rounded-field sm:bg-white sm:p-1.5 sm:ring-1 sm:ring-ink-200 sm:focus-within:ring-brand-600">
        <label className="flex h-12 flex-1 items-center gap-2.5 rounded-field bg-white px-4 ring-1 ring-ink-200 focus-within:ring-brand-600 sm:ring-0">
          <MailIcon size={20} className="shrink-0 text-ink-500" />
          <span className="sr-only">{t.placeholder}</span>
          <input type="email" name="email" required autoComplete="email" placeholder={t.placeholder} maxLength={200}
            className="h-full w-full bg-transparent text-[15px] text-ink-900 placeholder:text-ink-500 focus:outline-none" />
        </label>
        <button type="submit" disabled={pending}
          className="h-12 shrink-0 rounded-btn bg-gradient-to-r from-brand-600 to-[#2e6cff] px-7 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
          {t.submit}
        </button>
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] text-ink-700">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 rounded accent-brand-600" />
        <span>
          {consentBefore}
          <Link href={storePath(store, "/ochrana-osobnich-udaju")} className="font-medium text-brand-700 underline underline-offset-2">{t.consentLink}</Link>
          {consentAfter}
        </span>
      </label>
      {feedback && (
        <p role="alert" className={`mt-2 text-sm font-medium ${feedback.ok ? "text-success-600" : "text-danger-600"}`}>{feedback.text}</p>
      )}
    </form>
  );
}
