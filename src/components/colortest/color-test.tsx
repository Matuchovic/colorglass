"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { ArrowLongRight } from "@/components/color/icons";
import { drawPlate, evaluate, PLATES, type ResultType } from "./plates";
import { fmt, type Dictionary } from "@/i18n";
import type { StoreConfig } from "@/lib/store";
import type { ProductCardData } from "@/types/catalog";

function PlateCanvas({ index, label }: { index: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-montserrat").trim() || "sans-serif";
    const render = () => {
      if (cancelled) return;
      const size = Math.min(360, canvas.parentElement?.clientWidth ?? 320);
      drawPlate(canvas, PLATES[index]!, size, family);
    };
    document.fonts.load(`800 100px ${family}`).then(render, render);
    window.addEventListener("resize", render);
    return () => { cancelled = true; window.removeEventListener("resize", render); };
  }, [index]);
  return <canvas ref={ref} role="img" aria-label={label} className="mx-auto block rounded-full shadow-[0_18px_40px_-20px_rgb(20_40_80/0.45)]" />;
}

export function ColorTest({ t, store, showAltPrice, recommendations, links }: {
  t: Dictionary;
  store: StoreConfig;
  showAltPrice: boolean;
  recommendations: Record<"protan" | "deutan" | "redgreen" | "tritan" | "all", ProductCardData[]>;
  links: { all: string; how: string };
}) {
  const c = t.color.colortest;
  const [step, setStep] = useState<"intro" | "test" | "result">("intro");
  const [answers, setAnswers] = useState<Array<string | null>>([]);
  const [result, setResult] = useState<ResultType>("normal");
  const index = answers.length;
  const total = PLATES.length;

  const answer = (value: string | null) => {
    const next = [...answers, value];
    if (next.length >= total) {
      setResult(evaluate(next));
      setStep("result");
    }
    setAnswers(next);
  };
  const restart = () => { setAnswers([]); setStep("test"); };
  const recs = result === "normal" || result === "unclear" ? recommendations.all : recommendations[result];

  if (step === "intro") {
    return (
      <div className="grid items-center gap-10 rounded-[24px] border border-[#e3e9f6] bg-[#f1f5fe] p-6 sm:p-10 lg:grid-cols-[1fr_380px]">
        <div>
          <ol className="space-y-4">
            {c.tips.map((tip, i) => (
              <li key={tip} className="flex items-start gap-4 text-[15px] text-ink-800">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-display text-sm font-bold text-brand-600 ring-1 ring-brand-100">{i + 1}</span>
                <span className="pt-1">{tip}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 rounded-field bg-white/70 px-4 py-3 text-[13.5px] leading-relaxed text-ink-600 ring-1 ring-[#e3e9f6]">{c.disclaimer}</p>
          <button type="button" onClick={() => setStep("test")} className="btn-hero mt-7 inline-flex h-[52px] items-center gap-3 rounded-[12px] px-8 text-[15px] font-semibold text-white">
            {c.start}<ArrowLongRight size={18} />
          </button>
        </div>
        <div aria-hidden="true" className="mx-auto w-full max-w-[340px]"><PlateCanvas index={0} label="" /></div>
      </div>
    );
  }

  if (step === "test") {
    const plate = PLATES[index]!;
    return (
      <div className="grid items-center gap-8 rounded-[24px] border border-[#e3e9f6] bg-[#f1f5fe] p-6 sm:p-10 lg:grid-cols-[400px_1fr] lg:gap-14">
        <div className="mx-auto w-full max-w-[360px]"><PlateCanvas index={index} label={fmt(c.plateLabel, { n: index + 1 })} /></div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-700" aria-live="polite">{fmt(c.progress, { n: index + 1, total })}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-[#e3e9f6]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#01a2ff] to-[#f458fd] transition-[width] duration-300" style={{ width: `${(index / total) * 100}%` }} />
          </div>
          <h2 className="mt-7 font-display text-[26px] font-extrabold text-ink-950">{c.question}</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {plate.options.map((o) => (
              <button key={o} type="button" onClick={() => answer(o)}
                className="h-16 rounded-[14px] bg-white font-display text-[26px] font-bold text-ink-900 ring-1 ring-[#dfe6f3] transition hover:-translate-y-0.5 hover:ring-2 hover:ring-brand-500">
                {o}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => answer(null)} className="mt-3 h-14 w-full rounded-[14px] bg-white text-[15px] font-semibold text-ink-700 ring-1 ring-[#dfe6f3] transition hover:ring-2 hover:ring-brand-500">
            {c.nothing}
          </button>
          {index > 0 && (
            <button type="button" onClick={() => setAnswers(answers.slice(0, -1))} className="mt-5 text-sm font-semibold text-ink-600 underline-offset-4 hover:text-brand-700 hover:underline">
              ← {c.back}
            </button>
          )}
        </div>
      </div>
    );
  }

  const r = c.results[result];
  return (
    <div className="space-y-10">
      <div className="rounded-[24px] border border-[#e3e9f6] bg-[#f1f5fe] p-6 sm:p-10" aria-live="polite">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-700">{c.resultTitle}</p>
        <h2 className="mt-3 font-display text-[30px] font-extrabold leading-tight text-ink-950">{r.title}</h2>
        <p className="mt-3 max-w-[680px] text-[16px] leading-relaxed text-ink-700">{r.text}</p>
        <p className="mt-4 max-w-[680px] text-[13px] text-ink-500">{c.disclaimer}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={restart} className="inline-flex h-12 items-center rounded-[12px] bg-white px-6 text-[15px] font-semibold text-ink-900 ring-1 ring-[#dfe6f3] hover:ring-brand-500">{c.restart}</button>
          <Link href={links.all} className="btn-hero inline-flex h-12 items-center gap-3 rounded-[12px] px-6 text-[15px] font-semibold text-white">{c.showAll}<ArrowLongRight size={17} /></Link>
          <Link href={links.how} className="inline-flex h-12 items-center rounded-[12px] px-4 text-[15px] font-semibold text-brand-700 hover:underline">{c.howItWorks}</Link>
        </div>
      </div>
      {recs.length > 0 && (
        <section>
          <h2 className="font-display text-[24px] font-extrabold text-ink-950">{c.recommended}</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4">
            {recs.map((p) => <li key={p.id}><ProductCard product={p} store={store} t={t} showAltPrice={showAltPrice} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
