"use client";

/** Řazení: GET formulář, který se po změně sám odešle (bez JS funguje tlačítkem). */
export function SortSelect({ action, label, current, options, hidden, applyLabel }: {
  action: string;
  label: string;
  current: string;
  options: Array<{ value: string; label: string }>;
  hidden: Array<[string, string]>;
  applyLabel: string;
}) {
  return (
    <form method="get" action={action} className="flex items-center gap-2">
      {hidden.map(([name, value], i) => <input key={`${name}-${i}`} type="hidden" name={name} value={value} />)}
      <label className="text-sm text-ink-600" htmlFor="razeni">{label}</label>
      <select id="razeni" name="razeni" defaultValue={current} onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-field bg-white pl-3 pr-8 text-sm font-medium text-ink-900 ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-600">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <noscript><button type="submit" className="text-sm font-semibold text-brand-700">{applyLabel}</button></noscript>
    </form>
  );
}
