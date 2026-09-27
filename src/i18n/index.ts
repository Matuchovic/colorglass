import cs, { type Dictionary, type Plural } from "./cs";
import sk from "./sk";
import type { Locale } from "@/lib/store";

export type { Dictionary, Plural };

const dictionaries: Record<Locale, Dictionary> = { cs, sk };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Dosadí proměnné do textu: fmt("Zbývá {amount}", { amount: "120 Kč" }) */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

const pluralRules: Record<Locale, Intl.PluralRules> = {
  cs: new Intl.PluralRules("cs-CZ"),
  sk: new Intl.PluralRules("sk-SK"),
};

/** Správný tvar množného čísla (1 kus, 2 kusy, 5 kusů) */
export function plural(locale: Locale, forms: Plural, n: number, vars: Record<string, string | number> = {}): string {
  const category = pluralRules[locale].select(n) as keyof Plural;
  return fmt(forms[category] ?? forms.other, { n, ...vars });
}
