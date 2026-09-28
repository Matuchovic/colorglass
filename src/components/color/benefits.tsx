import type { CSSProperties } from "react";
import { FastTruckIcon, ShieldOkIcon, SupportIcon, TrialIcon } from "./icons";
import { fmt, type Dictionary } from "@/i18n";

export function Benefits({ t, freeShipping }: { t: Dictionary; freeShipping: string }) {
  const icons = [<TrialIcon key="a" size={27} />, <FastTruckIcon key="b" size={27} />, <ShieldOkIcon key="c" size={25} />, <SupportIcon key="d" size={25} />];
  return (
    <ul className="grid grid-cols-1 gap-4 rounded-[20px] border border-[#e9edf5] bg-white px-6 py-5 shadow-[0_8px_30px_-22px_rgb(16_24_40/0.25)] sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-8">
      {t.color.benefits.map((b, i) => (
        <li key={b.text} data-reveal="" style={{ "--rd": `${i * 90}ms` } as CSSProperties} className={`group flex items-center gap-4 ${i > 0 ? "lg:border-l lg:border-[#e9edf5] lg:pl-9" : ""}`}>
          <span className="grid size-[54px] shrink-0 place-items-center rounded-full bg-[#f2f5ff] text-brand-600 transition duration-300 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-[0_10px_24px_-10px_rgb(12_96_254/0.8)]">{icons[i]}</span>
          <span>
            <span className="block text-[15px] font-semibold text-ink-900">{fmt(b.title, { amount: freeShipping })}</span>
            <span className="mt-0.5 block text-[13.5px] text-ink-600">{b.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
