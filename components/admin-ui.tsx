import type { ReactNode } from 'react';

export const field =
  'w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/30';
export const btn =
  'rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110';
export const btnGhost =
  'rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10';
export const card =
  'rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/20 backdrop-blur-xl';

export function Kpi({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: 'default' | 'warn' | 'bad';
}) {
  const ring =
    tone === 'bad'
      ? 'from-rose-500 to-orange-400'
      : tone === 'warn'
        ? 'from-amber-400 to-pink-500'
        : 'from-fuchsia-500 to-cyan-400';
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${ring} p-[1px]`}>
      <div className="h-full rounded-2xl bg-slate-950 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const badgeStyle = {
  pending: 'bg-amber-400/15 text-amber-300 ring-amber-400/30',
  approved: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30',
  rejected: 'bg-rose-400/15 text-rose-300 ring-rose-400/30',
} as const;

export function Badge({ status }: { status: keyof typeof badgeStyle }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${badgeStyle[status]}`}>
      {status}
    </span>
  );
}

export function Banner({ tone, children }: { tone: 'ok' | 'err'; children: ReactNode }) {
  const s =
    tone === 'ok'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      : 'border-rose-400/30 bg-rose-400/10 text-rose-200';
  return <div role={tone === 'err' ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${s}`}>{children}</div>;
}
