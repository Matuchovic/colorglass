"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightIcon, SearchIcon } from "@/components/icons";

type Texts = { title: string; text: string; home: string; homeHref: string; categories: string; categoriesHref: string };

/** 404 bez dynamických API (stránky obchodu tak zůstanou statické); jazyk podle URL. */
export function NotFoundContent({ texts }: { texts: { cz: Texts; sk: Texts } }) {
  const pathname = usePathname() ?? "/";
  const t = pathname === "/sk" || pathname.startsWith("/sk/") ? texts.sk : texts.cz;
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="max-w-lg">
        <p className="bg-gradient-to-r from-brand-600 to-sky-accent bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{t.title}</h1>
        <p className="mt-3 text-ink-600">{t.text}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={t.homeHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-btn bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">
            {t.home}
            <ArrowRightIcon size={18} />
          </Link>
          <Link href={t.categoriesHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-btn bg-surface px-6 font-semibold text-ink-900 hover:bg-surface-strong">
            <SearchIcon size={18} />
            {t.categories}
          </Link>
        </div>
      </div>
    </div>
  );
}
