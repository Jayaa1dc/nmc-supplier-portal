import type { ReactNode } from 'react';

export const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-gold/40';

export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      {note && <p className="mt-1 text-sm text-slate-500">{note}</p>}
      <div className="mt-5 grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
