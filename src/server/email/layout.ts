import "server-only";
import { siteUrl } from "@/lib/store";

// Minimalistická, e-mailově bezpečná šablona (tabulky + inline CSS), funguje i v Outlooku a tmavém režimu.
export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function button(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0"><tr><td style="border-radius:10px;background:#1f4ff5">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;font:600 15px/1.2 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(label)}</a>
</td></tr></table>`;
}

export function infoBox(html: string): string {
  return `<div style="margin:20px 0;padding:16px 18px;border-radius:12px;background:#f3f6fb;border:1px solid #dde3ee">${html}</div>`;
}

export function layout(opts: { preheader: string; title: string; body: string; footer: string }): string {
  const logo = `${siteUrl("cz")}/brand/logo-email.png`;
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#eef2f8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f8"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
<tr><td style="padding:4px 8px 20px"><img src="${logo}" width="120" height="40" alt="COLOR" style="display:block;border:0"></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:32px 28px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#2b3654">
<h1 style="margin:0 0 16px;font:700 24px/1.25 Arial,Helvetica,sans-serif;color:#0b1533">${escapeHtml(opts.title)}</h1>
${opts.body}
</td></tr>
<tr><td style="padding:20px 8px;font:12px/1.6 Arial,Helvetica,sans-serif;color:#5f6b86">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Textová verze pro klienty bez HTML a lepší doručitelnost. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<(br|\/p|\/tr|\/h1|\/h2|\/div|\/li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
