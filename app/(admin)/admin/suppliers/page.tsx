import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge, PageHeader, card, field, btn, EmptyState } from '@/components/admin-ui';
import { CATEGORY_KEYS, CATEGORY_LABEL, isCategory, isUuid } from '@/lib/centres';

const STATUSES = ['pending', 'under_review', 'changes_requested', 'approved', 'rejected'] as const;

type SP = { centre?: string; cat?: string; status?: string; q?: string };

export default async function SupplierDirectory({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const term = (sp.q ?? '').replace(/[%,()*]/g, '').trim();
  const cat = sp.cat && isCategory(sp.cat) ? sp.cat : '';
  const centreId = sp.centre && isUuid(sp.centre) ? sp.centre : '';
  const status = (STATUSES as readonly string[]).includes(sp.status ?? '') ? (sp.status as string) : '';

  let query = supabase
    .from('suppliers')
    .select('id, supplier_code, application_ref, company_name, status, is_active, contact_person, telephone, email')
    .order('company_name')
    .limit(1000);
  if (term) query = query.or(`company_name.ilike.%${term}%,supplier_code.ilike.%${term}%,contact_person.ilike.%${term}%`);
  if (status) query = query.eq('status', status);

  const [{ data: suppliers }, { data: centres }, { data: links }, { data: depts }] = await Promise.all([
    query,
    supabase.from('centres').select('id, name, code, sort_order').order('sort_order'),
    supabase.from('supplier_centres').select('supplier_id, centre_id'),
    supabase.from('supplier_departments').select('supplier_id, dept'),
  ]);

  const centresOf = new Map<string, Set<string>>();
  (links ?? []).forEach((l) => centresOf.set(l.supplier_id, (centresOf.get(l.supplier_id) ?? new Set()).add(l.centre_id)));
  const catsOf = new Map<string, Set<string>>();
  (depts ?? []).forEach((d) => catsOf.set(d.supplier_id, (catsOf.get(d.supplier_id) ?? new Set()).add(d.dept)));
  const centreName = new Map((centres ?? []).map((c) => [c.id, c.name]));

  // Category filter applies to every view
  const afterCat = (suppliers ?? []).filter((s) => !cat || catsOf.get(s.id)?.has(cat));

  // Counts per centre for the chips
  const countFor = (cid: string) => afterCat.filter((s) => centresOf.get(s.id)?.has(cid)).length;

  const hrefWith = (over: Partial<SP>) => {
    const merged: Record<string, string> = { centre: centreId, cat, status, q: term, ...over } as Record<string, string>;
    const qs = Object.entries(merged).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return `/admin/suppliers${qs ? `?${qs}` : ''}`;
  };
  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'}`;

  // Row for one supplier. Shown under every centre it belongs to.
  const row = (s: (typeof afterCat)[number], showCentres: boolean) => (
    <tr key={`${s.id}-${showCentres ? 'x' : ''}`} className="hover:bg-slate-50">
      <td className="px-4 py-3 font-mono text-xs">
        <Link href={`/admin/suppliers/${s.id}`} className="font-semibold text-sky-700 hover:underline">{s.supplier_code ?? 'HIS code pending'}</Link>
      </td>
      <td className="px-4 py-3">
        <Link href={`/admin/suppliers/${s.id}`} className="font-medium text-slate-900 hover:text-sky-700">{s.company_name}</Link>
        <p className="text-xs text-slate-500">{s.contact_person ?? ''}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {[...(centresOf.get(s.id) ?? [])].map((cid) => (
            <span key={cid} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{centreName.get(cid)}</span>
          ))}
          {!(centresOf.get(s.id)?.size) && <span className="text-xs text-slate-400">No centre</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {[...(catsOf.get(s.id) ?? [])].map((d) => (
            <span key={d} className="rounded-md bg-sky-50 px-2 py-0.5 text-xs text-sky-800">{CATEGORY_LABEL[d as keyof typeof CATEGORY_LABEL]}</span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-600">{s.telephone ?? '—'}</td>
      <td className="px-4 py-3"><Badge status={s.status} /></td>
    </tr>
  );

  const header = (
    <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
      <tr>
        <th className="px-4 py-3">HIS code</th>
        <th className="px-4 py-3">Supplier</th>
        <th className="px-4 py-3">Centres</th>
        <th className="px-4 py-3">Categories</th>
        <th className="px-4 py-3">Telephone</th>
        <th className="px-4 py-3">Status</th>
      </tr>
    </thead>
  );

  // Grouped by centre when no centre is chosen; flat list when one is chosen
  const groups = centreId
    ? [{ id: centreId, name: centreName.get(centreId) ?? 'Centre', list: afterCat.filter((s) => centresOf.get(s.id)?.has(centreId)) }]
    : (centres ?? []).map((c) => ({ id: c.id, name: c.name, list: afterCat.filter((s) => centresOf.get(s.id)?.has(c.id)) }));
  const unassigned = afterCat.filter((s) => !(centresOf.get(s.id)?.size));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Supplier management" title="Supplier directory">
        <Link href="/admin/import" className={btn}>+ Import data</Link>
      </PageHeader>

      <section className={`${card} space-y-4 !p-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Centre</span>
          <Link href={hrefWith({ centre: '' })} className={chip(!centreId)}>All centres ({afterCat.length})</Link>
          {(centres ?? []).map((c) => (
            <Link key={c.id} href={hrefWith({ centre: c.id })} className={chip(centreId === c.id)}>
              {c.name} ({countFor(c.id)})
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
          <Link href={hrefWith({ cat: '' })} className={chip(!cat)}>All</Link>
          {CATEGORY_KEYS.map((k) => (
            <Link key={k} href={hrefWith({ cat: k })} className={chip(cat === k)}>{CATEGORY_LABEL[k]}</Link>
          ))}
        </div>
        <form method="get" className="flex flex-wrap items-end gap-3">
          {centreId && <input type="hidden" name="centre" value={centreId} />}
          {cat && <input type="hidden" name="cat" value={cat} />}
          <label className="min-w-[240px] flex-1 space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">Search</span>
            <input name="q" defaultValue={term} placeholder="Supplier name, HIS code, contact person" className={field} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">Status</span>
            <select name="status" defaultValue={status} className={field}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </label>
          <button type="submit" className={btn}>Apply</button>
        </form>
      </section>

      {afterCat.length === 0 ? (
        <EmptyState title="No suppliers match" text="Change the centre, category, status or search. Suppliers appear here from the database." />
      ) : centreId ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            {header}
            <tbody className="divide-y divide-slate-100">{(centreId ? groups[0].list : afterCat).map((s) => row(s, true))}</tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.filter((g) => g.list.length).map((g) => (
            <section key={g.id} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold text-slate-900">{g.name}</h2>
                <span className="text-xs text-slate-500">{g.list.length} supplier(s)</span>
              </div>
              <table className="min-w-full text-sm">
                {header}
                <tbody className="divide-y divide-slate-100">{g.list.map((s) => row(s, true))}</tbody>
              </table>
            </section>
          ))}
          {unassigned.length > 0 && (
            <p className="text-xs text-slate-500">{unassigned.length} supplier(s) have no centre yet. Open a supplier profile and tick the centres.</p>
          )}
        </div>
      )}
    </div>
  );
}
