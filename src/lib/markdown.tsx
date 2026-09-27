import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Bezpečný renderer podmnožiny Markdownu (nadpisy ##/###, odstavce, odrážky -, číslované seznamy,
 * citace >, **tučně**, [odkaz](/cesta)). Nikdy nevkládá HTML → žádné XSS z obsahu v databázi.
 * Odkazy: pouze relativní cesty, https a mailto/tel.
 */
function safeHref(href: string): string | null {
  if (/^\/(?!\/)/.test(href)) return href;
  if (/^https:\/\/[^\s]+$/i.test(href)) return href;
  if (/^(mailto|tel):[^\s]+$/i.test(href)) return href;
  return null;
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(!\[([^\]]*)\]\((\/images\/[^)\s]+)\))|(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)\s]+)\))|(`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${i++}`;
    if (match[1] && match[3]) nodes.push(<Image key={key} src={match[3]} alt={match[2] ?? ""} width={1200} height={800} sizes="(min-width: 768px) 760px, 100vw" className="my-6 h-auto w-full rounded-card" />);
    else if (match[5]) nodes.push(<strong key={key}>{match[5]}</strong>);
    else if (match[7] && match[8]) {
      const href = safeHref(match[8]);
      const external = href?.startsWith("https://");
      nodes.push(
        href ? (
          <a key={key} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {match[7]}
          </a>
        ) : (
          match[7]
        ),
      );
    } else if (match[10]) nodes.push(<code key={key}>{match[10]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source: raw, className, basePath = "" }: { source: string | null | undefined; className?: string; basePath?: string }) {
  if (!raw) return null;
  // Interní odkazy v obsahu jsou psané pro CZ; v SK obchodě dostanou prefix /sk
  const source = basePath ? raw.replace(/\]\((\/(?!images\/)[^)\s]*)\)/g, (_m, p: string) => `](${basePath}${p === "/" ? "" : p})`) : raw;
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i]!.trimEnd();
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("### ")) { blocks.push(<h3 key={k++}>{inline(line.slice(4), `h${k}`)}</h3>); i++; continue; }
    if (line.startsWith("## ")) { blocks.push(<h2 key={k++}>{inline(line.slice(3), `h${k}`)}</h2>); i++; continue; }
    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*[-*] /, ""));
      const key = k++;
      blocks.push(<ul key={key}>{items.map((it, j) => <li key={j}>{inline(it, `u${key}-${j}`)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*\d+\. /, ""));
      const key = k++;
      blocks.push(<ol key={key}>{items.map((it, j) => <li key={j}>{inline(it, `o${key}-${j}`)}</li>)}</ol>);
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) quote.push(lines[i++]!.replace(/^>\s?/, ""));
      const key = k++;
      blocks.push(<blockquote key={key}>{inline(quote.join(" "), `q${key}`)}</blockquote>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(##|>|\s*[-*] |\s*\d+\. )/.test(lines[i]!)) para.push(lines[i++]!.trim());
    const key = k++;
    blocks.push(<p key={key}>{inline(para.join(" "), `p${key}`)}</p>);
  }
  return <div className={className ?? "prose-color"}>{blocks}</div>;
}

/** Prostý text z markdownu (meta popisky). */
export function plainText(source: string | null | undefined, max = 160): string {
  if (!source) return "";
  const text = source.replace(/[#>*`_[\]]/g, "").replace(/\((\/|https:)[^)]*\)/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
