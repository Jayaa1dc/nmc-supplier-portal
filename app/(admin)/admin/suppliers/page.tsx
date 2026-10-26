import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { Badge, Kpi, btn, card, field } from '@/components/admin-ui';

const STATUSES = ['pending', 'approved', 'rejected'] as const;

export default async function Directory({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = '', status = '' } = await searchParams;
  const supabase = await createClient();
  const term = q.replace(/[%,()*]/g, '').trim();

  let query = supabase
    .from('suppliers')
    .select('id, supplier_code, application_ref, company_name, status, source, categories, branches, contact_person')
    .order('company_name')
    .limit(500);
  if (term) query = query.or(`supplier_code.ilike.%${term}%,company_name.ilike.%${term}%`);
  if ((STATUSES as readonly string[]).includes(status)) query = query.eq('status', status);

  const [{ data: list }, { data: all }, { data: items }] = await Promise.all([
    query,
    supabase.from('suppliers').select('id, status, categories'),
    supabase.from('supplier_items').select('supplier_id'),
  ]);

  const itemCounts = new Map<string, number>();
  items?.forEach((i) => itemCounts.set(i.supplier_id, (itemCounts.get(i.supplier_id) ?? 0) + 1));

  const total = all?.length ?? 0;
  const approved = all?.filter((s) => s.status === 'approved').length ?? 0;
  const pending = all?.filter((s) => s.status === 'pending').length ?? 0;
  const withPrices = all?.filter((s) => (itemCounts.get(s.id) ?? 0) > 0).length ?? 0;

  // Categories with at most one approved supplier = single-source exposure
  const coverage = new Map<string, number>(SUPPLIER_CATEGORIES.map((c) => [c, 0]));
  all?.forEach((s) => {
    if (s.status !== 'approved') return;
    (s.categories as string[]).forEach((c) => coverage.set(c, (coverage.get(c) ?? 0) + 1));
  });
  const thin = [...coverage].filter(([, n]) => n <= 1).length;

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Procurement overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Supplier directory</h1>
          <p className="mt-1 text-sm text-slate-500">Review supplier records, qualification status and price-list coverage.</p>
        </div>
        <Link href="/admin/import" className={btn}>+ Import data</Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total suppliers" value={total} />
        <Kpi label="Approved" value={approved} />
        <Kpi label="Pending review" value={pending} tone={pending > 0 ? 'warn' : 'default'} />
        <Kpi label="With price list" value={`${withPrices}/${total}`} sub={`${total - withPrices} missing prices`} />
        <Kpi label="Single-source" value={thin} sub="categories at risk" tone={thin > 0 ? 'bad' : 'default'} />
      </section>

      <form method="get" className={`${card} flex flex-wrap items-end gap-3`}>
        <label className="min-w-[260px] flex-1 space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Search</span>
          <input name="q" defaultValue={q} placeholder="HIS code or company name" className={field} />
        </label>
        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</span>
          <select name="status" defaultValue={status} className={field}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s} className="bg-white capitalize">{s}</option>)}
          </select>
        </label>
        <button type="submit" className={btn}>Apply</button>
        <Link href="/admin" className="px-2 py-2 text-sm text-slate-500 hover:text-slate-900">Reset</Link>
      </form>

      <section className={`${card} overflow-x-auto p-0`}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-4">HIS code</th>
              <th className="px-5 py-4">Company</th>
              <th className="px-5 py-4">Branches</th>
              <th className="px-5 py-4 text-right">Price items</th>
              <th className="px-5 py-4">Categories</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list?.map((s) => (
              <tr key={s.id} className="transition hover:bg-slate-50">
                <td className="px-5 py-4 font-mono">
                  <Link href={`/admin/suppliers/${s.id}`} className="font-bold text-sky-700 hover:underline">
                    {s.supplier_code ?? 'Pending HIS code'}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <Link href={`/admin/suppliers/${s.id}`} className="font-semibold text-slate-900 hover:text-sky-700">
                    {s.company_name}
                  </Link>
                  <p className="text-xs text-slate-500">{s.contact_person ?? ''}</p>
                </td>
                <td className="px-5 py-4 text-slate-600">{(s.branches as string[])?.join(', ') || '—'}</td>
                <td className="px-5 py-4 text-right tabular-nums">{itemCounts.get(s.id) ?? 0}</td>
                <td className="px-5 py-4 text-slate-500">{(s.categories as string[]).length || '—'}</td>
                <td className="px-5 py-4"><Badge status={s.status as 'pending' | 'approved' | 'rejected'} /></td>
              </tr>
            ))}
            {list?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-500">No suppliers match. Import a branch list to get started.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
