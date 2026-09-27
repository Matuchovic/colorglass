"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { getDictionary } from "@/i18n";
import { getStore, storePath } from "@/lib/store";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ store?: string }>();
  const store = getStore(params?.store);
  const t = getDictionary(store.locale);
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page grid min-h-[55vh] place-items-center py-16 text-center">
      <div className="max-w-lg">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t.errors.serverTitle}</h1>
        <p className="mt-3 text-ink-600">{t.errors.serverText}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-ink-400">{error.digest}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={reset} className="h-12 rounded-btn bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">
            {t.common.retry}
          </button>
          <a href={storePath(store.code, "/")} className="inline-flex h-12 items-center rounded-btn bg-surface px-6 font-semibold text-ink-900 hover:bg-surface-strong">
            {t.errors.backHome}
          </a>
        </div>
      </div>
    </div>
  );
}
