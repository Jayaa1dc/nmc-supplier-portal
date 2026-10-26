import type { ReactNode } from 'react';

export const inputCls = 'field';

export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="card p-6 sm:p-7">
      <h2 className="text-base font-bold tracking-tight text-zinc-900">{title}</h2>
      {note && <p className="mt-1 text-sm text-zinc-500">{note}</p>}
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
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
