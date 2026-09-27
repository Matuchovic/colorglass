import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown, plainText } from "@/lib/markdown";
import { getDictionary } from "@/i18n";
import { absoluteUrl, isStoreCode, STORES, storePath } from "@/lib/store";
import { formatDate } from "@/lib/format";
import { getContentPage, getContentPageSlugs, translated } from "@/server/catalog";

// Informační a právní stránky z CMS (/obchodni-podminky, /kontakt, …). Ostatní neznámé cesty → 404.
export const revalidate = 3600;

type Props = { params: Promise<{ store: string; rest: string[] }> };

export async function generateStaticParams() {
  return (await getContentPageSlugs()).map((slug) => ({ rest: [slug] }));
}

async function load(params: Props["params"]) {
  const { store: code, rest } = await params;
  if (!isStoreCode(code) || rest.length !== 1 || !/^[a-z0-9-]{1,80}$/.test(rest[0]!)) return null;
  const page = await getContentPage(rest[0]!);
  if (!page) return null;
  const store = STORES[code];
  return {
    code,
    store,
    page,
    title: translated(page.translations, store.locale, "title", page.title),
    body: translated(page.translations, store.locale, "body", page.body),
    description: translated(page.translations, store.locale, "seo_description", page.seo_description),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  return {
    title: data.title,
    description: data.description ?? plainText(data.body),
    alternates: {
      canonical: absoluteUrl(data.code, `/${data.page.slug}`),
      languages: { "cs-CZ": absoluteUrl("cz", `/${data.page.slug}`), "sk-SK": absoluteUrl("sk", `/${data.page.slug}`) },
    },
  };
}

export default async function ContentPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const t = getDictionary(data.store.locale);
  return (
    <article className="container-page max-w-3xl py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
        <Link href={storePath(data.code, "/")} className="hover:text-brand-700">{t.common.home}</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span className="text-ink-700">{data.title}</span>
      </nav>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{data.title}</h1>
      <p className="mt-2 text-sm text-ink-500">{formatDate(data.page.updated_at, data.store.intl)}</p>
      <Markdown source={data.body} className="prose-color mt-8" basePath={data.store.code === "sk" ? "/sk" : ""} />
    </article>
  );
}
