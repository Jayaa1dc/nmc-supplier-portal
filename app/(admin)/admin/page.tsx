import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';

const STATUSES = ['pending', 'approved', 'rejected'] as const;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = '', status = '' } = await searchParams;
  const supabase = await createClient();

  // Strip characters that have special meaning inside PostgREST .or() filters.
  const term = q.replace(/[%,()*]/g, '').trim();

  let query = supabase
    .from('suppliers')
    .select('id, supplier_code, company_name, status, source, categories, submitted_at, contact_person, email')
    .order('submitted_at', { ascending: false })
    .limit(200);

  if (term) query = query.or(`supplier_code.ilike.%${term}%,company_name.ilike.%${term}%`);
  if ((STATUSES as readonly string[]).includes(status)) query = query.eq('status', status);

  const [{ data: suppliers, error }, { data: all }] = await Promise.all([
    query,
    supabase.from('suppliers').select('status, categories'),
  ]);

  const counts = { pending: 0, approved: 0, rejected: 0 };
  const coverage = new Map<string, number>(SUPPLIER_CATEGORIES.map((c) => [c, 0]));
  all?.forEach((s) => {
    counts[s.status as keyof typeof counts]++;
    if (s.status === 'approved') {
      (s.categories as string[]).forEach((c) => coverage.set(c, (coverage.get(c) ?? 0) + 1));
    }
  });

  // Procurement risk rule: a category with at most one approved supplier is single-source exposure.
  const thin = [...coverage].filter(([, n]) => n <= 1);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin?status=${s}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-gold">
            <p className="text-xs uppercase tracking-wide text-slate-500">{s}</p>
            <p className="mt-1 text-3xl font-semibold text-navy">{counts[s]}</p>
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex-1 min-w-[260px] text-sm">
          <span className="mb-1 block font-medium text-slate-700">Search by HIS code or company</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="e.g. SP00000108"
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Status</span>
          <select name="status" defaultValue={status} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700">Filter</button>
        <Link href="/admin" className="px-2 py-2 text-sm text-slate-600 hover:underline">Reset</Link>
      </form>

      {error && <p className="text-sm text-rose-700">Could not load suppliers: {error.message}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">HIS code</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers?.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">
                  <Link href={`/admin/suppliers/${s.id}`} className="font-semibold text-navy hover:underline">{s.supplier_code}</Link>
                </td>
                <td className="px-4 py-3">{s.company_name}</td>
                <td className="px-4 py-3 text-slate-600">{s.contact_person ?? '—'}<br /><span className="text-xs">{s.email ?? ''}</span></td>
                <td className="px-4 py-3 text-slate-600">{(s.categories as string[]).length || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{s.source === 'legacy_import' ? 'HIS import' : 'Application'}</td>
                <td className="px-4 py-3 text-slate-600">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-GB') : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status as 'pending' | 'approved' | 'rejected'} /></td>
              </tr>
            ))}
            {suppliers?.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No suppliers match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-navy">Category coverage (approved suppliers)</h2>
        <p className="mt-1 text-xs text-slate-500">Categories with one or zero approved suppliers are single-source exposure and need a second supplier or a documented contingency plan.</p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {[...coverage].map(([cat, n]) => (
            <li key={cat} className="flex items-center justify-between gap-4 border-b border-slate-100 py-1">
              <span className="text-slate-700">{cat}</span>
              <span className={n <= 1 ? 'font-semibold text-rose-700' : 'text-slate-600'}>{n}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">{thin.length} categories flagged for single-source exposure.</p>
      </section>
    </div>
  );
}
