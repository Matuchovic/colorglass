import { FastTruckIcon, ShieldOkIcon, VerifiedUsersIcon } from "@/components/color/icons";
import { StoreSwitch } from "./store-switch";
import { fmt, type Dictionary } from "@/i18n";
import { SK_ENABLED, type StoreCode } from "@/lib/store";

/** Horní lišta podle návrhu: 4 výhody + jazyk a země. */
export function TopBar({ store, t, freeShipping }: { store: StoreCode; t: Dictionary; freeShipping: string | null }) {
  const c = t.color.topbar;
  const items = [
    { icon: <FastTruckIcon size={19} />, text: c.delivery },
    ...(freeShipping ? [{ icon: <ShieldOkIcon size={17} />, text: fmt(c.freeShipping, { amount: freeShipping }) }] : []),
    { icon: <ShieldOkIcon size={17} />, text: c.trial },
    { icon: <VerifiedUsersIcon size={18} />, text: c.verified },
  ];
  return (
    <div className="border-b border-ink-100/80 bg-[#f8fafd]">
      <div className="mx-auto flex h-9 max-w-[1300px] items-center justify-between gap-6 px-4 lg:px-7">
        <ul className="flex min-w-0 items-center text-[12.5px] font-medium text-ink-800">
          {items.map((item, i) => (
            <li key={item.text} className={`${i > 1 ? "hidden lg:flex" : i > 0 ? "hidden sm:flex" : "flex"} items-center`}>
              {i > 0 && <span aria-hidden="true" className="mx-6 h-3.5 w-px bg-ink-200" />}
              <span className="flex items-center gap-2 whitespace-nowrap">{item.icon}{item.text}</span>
            </li>
          ))}
        </ul>
        <StoreSwitch store={store} skEnabled={SK_ENABLED} skDomain={process.env.NEXT_PUBLIC_SITE_URL_SK || undefined}
          czDomain={process.env.NEXT_PUBLIC_SITE_URL || undefined} labels={{ language: c.language, switchTo: c.switchTo, switchLabel: c.switchLabel }} />
      </div>
    </div>
  );
}
