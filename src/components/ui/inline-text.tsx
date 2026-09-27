import { Fragment } from "react";
import { storePath, type StoreCode } from "@/lib/store";

/** Text z administrace s podporou **tučného** zvýraznění (bez HTML → žádné XSS). */
export function InlineBold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-ink-900">{part}</strong> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

/** Odkaz z CMS: interní cesta dostane prefix obchodu, externí musí být https. */
export function resolveHref(store: StoreCode, href: string | null | undefined): string | null {
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return storePath(store, href);
  if (/^https:\/\//.test(href)) return href;
  return null;
}
