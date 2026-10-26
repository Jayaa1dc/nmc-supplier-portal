import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge, PageHeader, card, field, EmptyState } from '@/components/admin-ui';

export default async function Contacts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = '', status = '' } = await searchParams;
  const supabase = await createClient();
  const term = q.replace(/[%,()*]/g, '').trim();

  let query = supabase
    .from('suppliers')
    .select('id, company_name, supplier_code, application_ref, status, is_active, contact_person, contact_title, email, telephone, mobile, head_office_address, branches')
    .order('company_name')
    .limit(500);
  if (term) query = query.or(`company_name.ilike.%${term}%,contact_person.ilike.%${term}%,email.ilike.%${term}%,telephone.ilike.%${term}%,supplier_code.ilike.%${term}%`);
  if (status) query = query.eq('status', status);
  const { data: rows } = await query;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Supplier relationships" title="Supplier contacts" />

      <form method="get" className={`${card} flex flex-wrap items-end gap-3 !p-4`}>
        <label className="min-w-[260px] flex-1 space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Search</span>
          <input name="q" defaultValue={q} placeholder="Company, contact person, phone, email, HIS code" className={field} />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Status</span>
          <select name="status" defaultValue={status} className={field}>
            <option value="">All statuses</option>
            {['pending', 'under_review', 'changes_requested', 'approved', 'rejected'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </label>
        <button type="submit" className="inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">Apply</button>
      </form>

      {(rows ?? []).length === 0 ? (
        <EmptyState title="No contacts found" text="Contacts come from supplier records. Import a supplier list or add a supplier to see contacts here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Contact person</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/suppliers/${r.id}`} className="font-medium text-slate-900 hover:text-sky-700">{r.company_name}</Link>
                    <p className="font-mono text-xs text-slate-500">{r.supplier_code ?? 'HIS code pending'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{r.contact_person ?? '—'}</p>
                    <p className="text-xs text-slate-500">{r.contact_title ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    {r.telephone ? <a className="text-sky-700 hover:underline" href={`tel:${r.telephone.replace(/\s/g, '')}`}>{r.telephone}</a> : '—'}
                    {r.mobile && <p className="text-xs text-slate-500">M: {r.mobile}</p>}
                  </td>
                  <td className="px-4 py-3">{r.email ? <a className="text-sky-700 hover:underline" href={`mailto:${r.email}`}>{r.email}</a> : '—'}</td>
                  <td className="max-w-[260px] px-4 py-3 text-slate-600">{r.head_office_address ?? '—'}</td>
                  <td className="px-4 py-3"><Badge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
