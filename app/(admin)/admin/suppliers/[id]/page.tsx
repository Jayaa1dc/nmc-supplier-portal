import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SUPPLIER_BUCKET, DOC_LABELS, type DocType } from '@/lib/schemas';
import { StatusBadge } from '@/components/StatusBadge';
import { Field, inputCls } from '@/components/ui';
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-slate-500 hover:underline">← All suppliers</Link>
          <h1 className="mt-2 text-2xl font-semibold text-navy">{s.company_name}</h1>
          <p className="mt-1 font-mono text-lg text-gold">HIS code {s.supplier_code}</p>
        </div>
        <StatusBadge status={s.status as "pending" | "approved" | "rejected"} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Company details */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Company details</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Head office</dt><dd>{s.head_office_address ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Factory</dt><dd>{s.factory_address ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Contact</dt><dd>{s.contact_person ?? '—'} {s.contact_title ? `(${s.contact_title})` : ''}</dd></div>
              <div><dt className="text-slate-500">Email</dt><dd>{s.email ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Telephone / mobile</dt><dd>{[s.telephone, s.mobile].filter(Boolean).join(' / ') || '—'}</dd></div>
              <div><dt className="text-slate-500">Nature of business</dt><dd className="capitalize">{s.business_nature ?? '—'}</dd></div>
              <div><dt className="text-slate-500">ISO 9000</dt><dd>{s.iso_9000 ? `Yes ${s.iso_certificate_no ? `(${s.iso_certificate_no})` : ''}` : 'No'}</dd></div>
              <div><dt className="text-slate-500">Prices valid until</dt><dd>{s.price_validity_until ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Deposit receipt</dt><dd>{s.deposit_receipt_no ? `${s.deposit_receipt_no} · LKR ${s.deposit_amount ? money(Number(s.deposit_amount)) : '—'}` : '—'}</dd></div>
              <div><dt className="text-slate-500">Submitted</dt><dd>{dt(s.submitted_at)}</dd></div>
              {s.branches?.length > 0 && <div className="sm:col-span-2"><dt className="text-slate-500">Used at branches</dt><dd>{s.branches.join(', ')}</dd></div>}
              {s.production_capacity && <div className="sm:col-span-2"><dt className="text-slate-500">Production capacity</dt><dd className="whitespace-pre-wrap">{s.production_capacity}</dd></div>}
              {s.quality_controls && <div className="sm:col-span-2"><dt className="text-slate-500">Quality controls</dt><dd className="whitespace-pre-wrap">{s.quality_controls}</dd></div>}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {(s.categories as string[]).map((c) => (
                <span key={c} className="rounded-full bg-gold-50 px-3 py-1 text-xs text-navy ring-1 ring-inset ring-gold/40">{c}</span>
              ))}
            </div>
          </section>

          {/* Price list */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Item &amp; price list ({items?.length ?? 0})</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">HIS item code</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Brand</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Unit price (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items?.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-slate-500">{it.line_no}</td>
                      <td className="px-3 py-2 font-mono text-xs">{it.his_item_code ?? '—'}</td>
                      <td className="px-3 py-2">{it.description}</td>
                      <td className="px-3 py-2 text-slate-600">{it.brand ?? '—'}</td>
                      <td className="px-3 py-2">{it.unit}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(Number(it.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">Sum of unit prices (for reference only, not a quote total): LKR {money(total)}</p>
          </section>

          {/* Documents */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Uploaded documents ({documents.length})</h2>
            {documents.length === 0 && <p className="text-sm text-slate-500">No documents uploaded.</p>}
            {documents.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-navy">{DOC_LABELS[d.doc_type as DocType] ?? d.doc_type}</p>
                    <p className="text-xs text-slate-500">{d.file_name} · {(d.size_bytes / 1024).toFixed(0)} KB · {dt(d.uploaded_at)}</p>
                  </div>
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noreferrer" className="rounded-md border border-navy px-3 py-1 text-sm text-navy hover:bg-navy hover:text-white">
                      Open in new tab
                    </a>
                  )}
                </div>
                {d.url && d.mime_type === 'application/pdf' && (
                  <iframe src={d.url} title={d.file_name} className="mt-4 h-[520px] w-full rounded border border-slate-200" />
                )}
                {d.url && d.mime_type.startsWith('image/') && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.url} alt={d.file_name} className="mt-4 max-h-[520px] w-auto rounded border border-slate-200" />
                )}
              </div>
            ))}
          </section>
        </div>

        {/* Review panel */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <form action={decide} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Review decision</h2>
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
            <button type="submit" className="w-full rounded-md bg-navy px-4 py-2.5 font-semibold text-white hover:bg-navy-700">
              Save decision
            </button>
            {s.reviewed_at && (
              <p className="text-xs text-slate-500">Last reviewed {dt(s.reviewed_at)}</p>
            )}
          </form>
        </aside>
      </div>
    </div>
  );
}
