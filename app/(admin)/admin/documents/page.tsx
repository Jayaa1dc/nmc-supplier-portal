import { createClient } from '@/lib/supabase/server';
import { SUPPLIER_BUCKET, DOC_LABELS, type DocType } from '@/lib/schemas';
import { Banner, PageHeader, card, field, btnGhost, btn, EmptyState } from '@/components/admin-ui';
import Link from 'next/link';
import { setDocumentExpiry } from './actions';

const DAY = 86_400_000;

export default async function Documents({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; expiry?: string; ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10);

  let query = supabase
    .from('supplier_documents')
    .select('id, doc_type, file_name, mime_type, size_bytes, uploaded_at, expires_on, storage_path, suppliers(id, company_name, supplier_code, application_ref)')
    .order('uploaded_at', { ascending: false })
    .limit(300);
  if (sp.type) query = query.eq('doc_type', sp.type);
  if (sp.expiry === 'expired') query = query.lt('expires_on', today);
  if (sp.expiry === 'soon') query = query.gte('expires_on', today).lte('expires_on', soon);

  const { data: docs } = await query;

  // Short-lived links, created on the server only
  const withUrls = await Promise.all(
    (docs ?? []).map(async (d: any) => {
      const { data } = await supabase.storage.from(SUPPLIER_BUCKET).createSignedUrl(d.storage_path, 600);
      return { ...d, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Compliance" title="Document library" />
      {sp.ok && <Banner tone="ok">{sp.ok}</Banner>}
      {sp.err && <Banner tone="err">{sp.err}</Banner>}

      <form method="get" className={`${card} flex flex-wrap items-end gap-3 !p-4`}>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Category</span>
          <select name="type" defaultValue={sp.type ?? ''} className={field}>
            <option value="">All categories</option>
            {(Object.keys(DOC_LABELS) as DocType[]).map((t) => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Expiry</span>
          <select name="expiry" defaultValue={sp.expiry ?? ''} className={field}>
            <option value="">Any</option>
            <option value="soon">Expiring in 30 days</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <button type="submit" className={btn}>Apply</button>
        <Link href="/admin/documents" className={btnGhost}>Reset</Link>
      </form>

      {withUrls.length === 0 ? (
        <EmptyState title="No documents" text="Documents uploaded with supplier applications appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {withUrls.map((d) => {
                const expired = d.expires_on && d.expires_on < today;
                const expiring = d.expires_on && !expired && d.expires_on <= soon;
                return (
                  <tr key={d.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{DOC_LABELS[d.doc_type as DocType] ?? d.doc_type}</p>
                      <p className="text-xs text-slate-500">{d.file_name} · {(d.size_bytes / 1024).toFixed(0)} KB</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/suppliers/${d.suppliers?.id}`} className="font-medium text-slate-900 hover:text-sky-700">{d.suppliers?.company_name ?? '—'}</Link>
                      <p className="font-mono text-xs text-slate-500">{d.suppliers?.supplier_code ?? d.suppliers?.application_ref ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(d.uploaded_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3">
                      <form action={setDocumentExpiry} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={d.id} />
                        <input type="date" name="expires_on" defaultValue={d.expires_on ?? ''} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-sky-500" />
                        <button type="submit" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Save</button>
                      </form>
                      {expired && <p className="mt-1 text-xs font-semibold text-rose-700">Expired</p>}
                      {expiring && <p className="mt-1 text-xs font-semibold text-amber-700">Expires within 30 days</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">Open</a> : <span className="text-slate-400">Unavailable</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
