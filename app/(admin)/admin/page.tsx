import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import GroupTabs from '@/components/GroupTabs';
import { CATEGORY_GROUPS, findGroup, groupsOf } from '@/components/categoryGroups';

const STATUSES = ['pending', 'approved', 'rejected'] as const;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; group?: string }>;
}) {
  const { q = '', status = '', group = '' } = await searchParams;
  const supabase = await createClient();
  const activeGroup = findGroup(group);

  // Strip characters that have special meaning inside PostgREST .or() filters.
  const term = q.replace(/[%,()*]/g, '').trim();

  let query = supabase
    .from('suppliers')
    .select('id, supplier_code, company_name, status, source, categories, submitted_at, contact_person, email')
    .order('submitted_at', { ascending: false })
    .limit(200);

  if (term) query = query.or(`supplier_code.ilike.%${term}%,company_name.ilike.%${term}%`);
  if ((STATUSES as readonly string[]).includes(status)) query = query.eq('status', status);

  const [{ data: found, error }, { data: all }] = await Promise.all([
    query,
    supabase.from('suppliers').select('status, categories'),
  ]);

  // Category names contain commas and brackets, so the group filter is applied here rather than in PostgREST.
  const suppliers = activeGroup
    ? found?.filter((s) => (s.categories as string[]).some((c) => activeGroup.categories.includes(c as never)))
    : found;

  const counts = { pending: 0, approved: 0, rejected: 0 };
  const coverage = new Map<string, number>(CATEGORY_GROUPS.flatMap((g) => g.categories).map((c) => [c, 0]));
  const groupStats = new Map(CATEGORY_GROUPS.map((g) => [g.key, { total: 0, approved: 0 }]));
  all?.forEach((s) => {
    counts[s.status as keyof typeof counts]++;
    const cats = s.categories as string[];
    groupsOf(cats).forEach((g) => {
      const stat = groupStats.get(g.key)!;
      stat.total++;
      if (s.status === 'approved') stat.approved++;
    });
    if (s.status === 'approved') {
      cats.forEach((c) => coverage.set(c, (coverage.get(c) ?? 0) + 1));
    }
  });

  // Procurement risk rule: a category with at most one approved supplier is single-source exposure.
  const thinCount = [...coverage].filter(([, n]) => n <= 1).length;

  const href = (next: { status?: string; group?: string }) => {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const g = next.group ?? group;
    if (q) params.set('q', q);
    if (s) params.set('status', s);
    if (g) params.set('group', g);
    const qs = params.toString();
    return qs ? `/admin?${qs}` : '/admin';
  };

  const tabs = [
    { key: '', label: 'All', href: href({ group: '' }) || '/admin' },
    ...CATEGORY_GROUPS.map((g) => ({ key: g.key, label: g.label, href: href({ group: g.key }) })),
  ];

  return (
    <div className="space-y-10">
      <header>
        <p className="label">Overview</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Suppliers</h1>
      </header>

      <section className="stagger grid gap-4 sm:grid-cols-3">
        {STATUSES.map((s) => (
          <Link key={s} href={href({ status: s })} className="lift card block p-5">
            <p className="label">{s}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{counts[s]}</p>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="label mb-4">Groups</h2>
        <div className="stagger grid gap-4 md:grid-cols-3">
          {CATEGORY_GROUPS.map((g) => {
            const stat = groupStats.get(g.key)!;
            return (
              <Link key={g.key} href={href({ group: g.key })} className="lift card block p-5">
                <p className="font-bold">{g.label}</p>
                <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{stat.total}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {stat.approved} approved · {g.categories.length} categories
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <GroupTabs tabs={tabs} active={activeGroup?.key ?? ''} />
          <p className="text-sm text-zinc-500">{suppliers?.length ?? 0} suppliers shown</p>
        </div>

        <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
          {activeGroup && <input type="hidden" name="group" value={activeGroup.key} />}
          <label className="min-w-[260px] flex-1 text-sm">
            <span className="mb-1.5 block font-medium text-zinc-700">Search by HIS code or company</span>
            <input name="q" defaultValue={q} placeholder="e.g. SP00000108" className="field font-mono" />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-zinc-700">Status</span>
            <select name="status" defaultValue={status} className="field">
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn">Filter</button>
          <Link href="/admin" className="btn-ghost">Reset</Link>
        </form>

        {error && <p className="text-sm text-red-700">Could not load suppliers: {error.message}</p>}

        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr className="label">
                <th className="px-4 py-3 font-semibold">HIS code</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Groups</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {suppliers?.map((s) => (
                <tr key={s.id} className="row">
                  <td className="px-4 py-3 font-mono">
                    <Link href={`/admin/suppliers/${s.id}`} className="font-semibold text-zinc-900 hover:underline">{s.supplier_code}</Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{s.company_name}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.contact_person ?? '—'}<br /><span className="text-xs text-zinc-500">{s.email ?? ''}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {groupsOf(s.categories as string[]).map((g) => (
                        <span key={g.key} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">{g.label}</span>
                      ))}
                      {(s.categories as string[]).length === 0 && <span className="text-zinc-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{s.source === 'legacy_import' ? 'HIS import' : 'Application'}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-GB') : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status as 'pending' | 'approved' | 'rejected'} /></td>
                </tr>
              ))}
              {suppliers?.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No suppliers match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6 sm:p-7">
        <h2 className="font-bold">Category coverage (approved suppliers)</h2>
        <p className="mt-1 text-xs text-zinc-500">Categories with one or zero approved suppliers are single-source exposure and need a second supplier or a documented contingency plan.</p>
        <div className="mt-6 space-y-6">
          {CATEGORY_GROUPS.map((g) => (
            <div key={g.key}>
              <h3 className="label">{g.label}</h3>
              <ul className="mt-2 grid gap-x-8 text-sm sm:grid-cols-2">
                {g.categories.map((cat) => {
                  const n = coverage.get(cat) ?? 0;
                  return (
                    <li key={cat} className="flex items-center justify-between gap-4 border-b border-zinc-100 py-2">
                      <span className="text-zinc-700">{cat}</span>
                      <span className={n <= 1 ? 'font-semibold text-red-600' : 'tabular-nums text-zinc-600'}>{n}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-zinc-500">{thinCount} categories flagged for single-source exposure.</p>
      </section>
    </div>
  );
}
