import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="container-page grid place-items-center py-10 lg:py-16">
      <div className="w-full max-w-md rounded-hero bg-white p-6 shadow-card ring-1 ring-ink-100 sm:p-9">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-600">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}
