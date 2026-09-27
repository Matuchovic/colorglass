"use client";

export function QuantityStepper({ value, max, disabled, onChange, labels }: {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  labels: { quantity: string; decrease: string; increase: string };
}) {
  return (
    <div className="flex h-10 items-center rounded-btn ring-1 ring-ink-200" role="group" aria-label={labels.quantity}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={disabled} aria-label={labels.decrease}
        className="grid h-full w-9 place-items-center text-lg font-bold text-ink-700 disabled:text-ink-300">−</button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={labels.increase}
        className="grid h-full w-9 place-items-center text-lg font-bold text-ink-700 disabled:text-ink-300">+</button>
    </div>
  );
}
