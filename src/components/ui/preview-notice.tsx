import { btnSecondary } from "./styles";
import Link from "next/link";

/** Stránka vyžadující databázi v náhledovém režimu. */
export function PreviewNotice({ title, text, homeHref, homeLabel }: { title: string; text: string; homeHref: string; homeLabel: string }) {
  return (
    <div className="rounded-card bg-surface px-6 py-14 text-center">
      <p className="mx-auto inline-flex rounded-full bg-ink-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">Náhled</p>
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-600">{text}</p>
      <Link href={homeHref} className={`${btnSecondary} mt-6`}>{homeLabel}</Link>
    </div>
  );
}
