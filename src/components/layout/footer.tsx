import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { FlagCZ, FlagSK } from "@/components/ui/flags";
import { fmt, type Dictionary } from "@/i18n";
import { storePath, type Locale, type StoreCode } from "@/lib/store";
import { translated, type PublicSettings } from "@/server/catalog";
import type { Json } from "@/types/database";

type FooterPage = { slug: string; title: string; footer_group: string | null; translations: Json };

const PAYMENT_METHODS = ["Visa", "Mastercard", "Apple Pay", "Google Pay"];

function Column({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  if (!links.length) return null;
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-white/70 transition-colors hover:text-white">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer({ store, locale, t, pages, settings }: {
  store: StoreCode;
  locale: Locale;
  t: Dictionary;
  pages: FooterPage[];
  settings: PublicSettings;
}) {
  const byGroup = (group: string) =>
    pages
      .filter((p) => p.footer_group === group)
      .map((p) => ({ href: storePath(store, `/${p.slug}`), label: translated(p.translations, locale, "title", p.title) }));
  const shopping = [
    { href: storePath(store, "/kategorie"), label: t.header.allCategories },
    { href: storePath(store, "/akce"), label: t.header.deals },
    { href: storePath(store, "/bestsellery"), label: t.header.bestsellers },
    { href: storePath(store, "/novinky"), label: t.header.newArrivals },
  ];
  const social = Object.entries(settings.social).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].startsWith("https://"));
  const company = settings.company.name && !settings.company.name.includes("[") ? settings.company : null;

  return (
    <footer className="mt-16 bg-footer text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.25fr] lg:gap-8 lg:py-14">
        <div>
          <Logo href={storePath(store, "/")} label={t.header.home} variant="white" tagline={t.color.tagline} className="text-[38px]" />
          <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-white/70">{t.footer.tagline}</p>
          {social.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label={t.footer.social}>
              {social.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium capitalize text-white/85 transition-colors hover:bg-white/20">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {settings.contact.phone && (
            <p className="mt-5 text-sm text-white/70">
              <a href={`tel:${settings.contact.phone.replace(/\s/g, "")}`} className="font-semibold text-white hover:underline">{settings.contact.phone}</a>
              {settings.contact.hours && <span className="block text-white/55">{settings.contact.hours}</span>}
            </p>
          )}
        </div>
        <Column title={t.footer.shopping} links={shopping} />
        <Column title={t.footer.service} links={byGroup("service")} />
        <Column title={t.footer.about} links={byGroup("about")} />
        <div className="lg:border-l lg:border-white/10 lg:pl-8">
          <h2 className="text-[15px] font-semibold text-white">{t.footer.deliverTo}</h2>
          <p className="mt-4 flex items-center gap-3 text-sm text-white/80">
            <FlagCZ className="h-6 w-9 shrink-0" />
            <span>{t.footer.countries}</span>
            <FlagSK className="h-6 w-9 shrink-0" />
          </p>
          <h2 className="mt-7 text-[15px] font-semibold text-white">{t.footer.payments}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <li key={m} className="rounded-md bg-white px-2.5 py-1 text-xs font-bold tracking-tight text-ink-900">{m}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
          <p>
            {fmt(t.footer.rights, { year: new Date().getFullYear() })}
            {company && <span> · {company.name}, {company.company_id}</span>}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {byGroup("legal").map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
