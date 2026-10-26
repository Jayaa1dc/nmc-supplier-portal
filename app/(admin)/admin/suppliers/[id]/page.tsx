import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SUPPLIER_BUCKET, DOC_LABELS, type DocType } from '@/lib/schemas';
import { StatusBadge } from '@/components/StatusBadge';
import { Field, inputCls } from '@/components/ui';
import ReviewDrawer from '@/components/ReviewDrawer';
import { groupsOf } from '@/components/categoryGroups';
import { updateSupplierStatus } from './actions';

const dt = (v: string | null) => (v ? new Date(v).toLocaleString('en-GB') : '—');
const money = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2 });

export default async function SupplierDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: s } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();

  const [{ data: items }, { data: docs }] = await Promise.all([
    supabase.from('supplier_items').select('*').eq('supplier_id', id).order('line_no'),
    supabase.from('supplier_documents').select('*').eq('supplier_id', id).order('uploaded_at'),
  ]);

  // Short-lived signed URLs; files are never public.
  const documents = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await supabase.storage.from(SUPPLIER_BUCKET).createSignedUrl(d.storage_path, 60 * 10);
      return { ...d, url: data?.signedUrl ?? null };
    }),
  );

  const decide = updateSupplierStatus.bind(null, id);
  const total = (items ?? []).reduce((sum, it) => sum + Number(it.unit_price), 0);
  const categories = s.categories as string[];
  const groups = groupsOf(categories);

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">← All suppliers</Link>

      <section className="card p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <p className="font-mono text-sm font-semibold text-zinc-500">HIS code {s.supplier_code}</p>
            <h1 className="text-3xl font-bold tracking-tight">{s.company_name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={s.status as 'pending' | 'approved' | 'rejected'} />
              {groups.map((g) => (
                <span key={g.key} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">{g.label}</span>
              ))}
            </div>
          </div>
          <ReviewDrawer title="Review decision" triggerLabel="Review decision">
            <form action={decide} className="space-y-4">
              <Field label="Status">
                <select name="status" defaultValue={s.status} className={inputCls}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </Field>
              <Field label="Review notes" hint="Internal only. Not shown to the supplier.">
                <textarea name="review_notes" rows={5} defaultValue={s.review_notes ?? ''} className={inputCls} />
              </Field>
              <button type="submit" className="btn w-full">Save decision</button>
              {s.reviewed_at && <p className="text-xs text-zinc-500">Last reviewed {dt(s.reviewed_at)}</p>}
            </form>
          </ReviewDrawer>
        </div>

        <div className="stagger mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="label">Price items</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{items?.length ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="label">Documents</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{documents.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="label">Last reviewed</p>
            <p className="mt-2 text-sm font-semibold">{dt(s.reviewed_at)}</p>
          </div>
        </div>
      </section>

      {/* Company details */}
      <section className="card p-6 sm:p-7">
        <h2 className="label">Company details</h2>
        <dl className="mt-5 grid gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
          <div><dt className="label">Head office</dt><dd className="mt-1">{s.head_office_address ?? '—'}</dd></div>
          <div><dt className="label">Factory</dt><dd className="mt-1">{s.factory_address ?? '—'}</dd></div>
          <div><dt className="label">Contact</dt><dd className="mt-1">{s.contact_person ?? '—'} {s.contact_title ? `(${s.contact_title})` : ''}</dd></div>
          <div><dt className="label">Email</dt><dd className="mt-1">{s.email ?? '—'}</dd></div>
          <div><dt className="label">Telephone / mobile</dt><dd className="mt-1">{[s.telephone, s.mobile].filter(Boolean).join(' / ') || '—'}</dd></div>
          <div><dt className="label">Nature of business</dt><dd className="mt-1 capitalize">{s.business_nature ?? '—'}</dd></div>
          <div><dt className="label">ISO 9000</dt><dd className="mt-1">{s.iso_9000 ? `Yes ${s.iso_certificate_no ? `(${s.iso_certificate_no})` : ''}` : 'No'}</dd></div>
          <div><dt className="label">Prices valid until</dt><dd className="mt-1">{s.price_validity_until ?? '—'}</dd></div>
          <div><dt className="label">Deposit receipt</dt><dd className="mt-1">{s.deposit_receipt_no ? `${s.deposit_receipt_no} · LKR ${s.deposit_amount ? money(Number(s.deposit_amount)) : '—'}` : '—'}</dd></div>
          <div><dt className="label">Submitted</dt><dd className="mt-1">{dt(s.submitted_at)}</dd></div>
          {s.branches?.length > 0 && <div className="sm:col-span-2"><dt className="label">Used at branches</dt><dd className="mt-1">{s.branches.join(', ')}</dd></div>}
          {s.production_capacity && <div className="sm:col-span-2"><dt className="label">Production capacity</dt><dd className="mt-1 whitespace-pre-wrap">{s.production_capacity}</dd></div>}
          {s.quality_controls && <div className="sm:col-span-2"><dt className="label">Quality controls</dt><dd className="mt-1 whitespace-pre-wrap">{s.quality_controls}</dd></div>}
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">{c}</span>
          ))}
        </div>
      </section>

      {/* Price list */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h2 className="font-bold">Item &amp; price list</h2>
          <p className="text-xs text-zinc-500">{items?.length ?? 0} items</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr className="label">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">HIS item code</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 text-right font-semibold">Unit price (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items?.map((it) => (
                <tr key={it.id} className="row">
                  <td className="px-4 py-3 text-zinc-500">{it.line_no}</td>
                  <td className="px-4 py-3 font-mono text-xs">{it.his_item_code ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{it.description}</td>
                  <td className="px-4 py-3 text-zinc-600">{it.brand ?? '—'}</td>
                  <td className="px-4 py-3">{it.unit}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(Number(it.unit_price))}</td>
                </tr>
              ))}
              {(items?.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">No price list submitted.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-zinc-200 px-6 py-3 text-xs text-zinc-500">
          Sum of unit prices (for reference only, not a quote total): LKR {money(total)}
        </p>
      </section>

      {/* Documents */}
      <section className="space-y-4">
        <h2 className="label">Uploaded documents ({documents.length})</h2>
        {documents.length === 0 && <p className="text-sm text-zinc-500">No documents uploaded.</p>}
        {documents.map((d) => (
          <div key={d.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{DOC_LABELS[d.doc_type as DocType] ?? d.doc_type}</p>
                <p className="text-xs text-zinc-500">{d.file_name} · {(d.size_bytes / 1024).toFixed(0)} KB · {dt(d.uploaded_at)}</p>
              </div>
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="btn-ghost">Open in new tab</a>
              )}
            </div>
            {d.url && d.mime_type === 'application/pdf' && (
              <iframe src={d.url} title={d.file_name} className="mt-4 h-[520px] w-full rounded-xl border border-zinc-200" />
            )}
            {d.url && d.mime_type.startsWith('image/') && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.url} alt={d.file_name} className="mt-4 max-h-[520px] w-auto rounded-xl border border-zinc-200" />
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
