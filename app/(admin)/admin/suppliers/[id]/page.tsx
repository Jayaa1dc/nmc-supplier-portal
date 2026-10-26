import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SUPPLIER_BUCKET, DOC_LABELS, BUSINESS_NATURES, type DocType } from '@/lib/schemas';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { Badge, Banner, Field, Kpi, btn, btnGhost, card, field } from '@/components/admin-ui';
import { ApplicationView } from '@/components/application-view';
import {
  addPriceItem,
  deleteItem,
  importPriceList,
  updateItem,
  updateSupplierDetails,
  updateSupplierStatus,
} from './actions';

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'prices', label: 'Price list' },
  { key: 'documents', label: 'Documents' },
] as const;

const money = (n: number | string) =>
  Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 });
const day = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-GB') : '—');

export default async function SupplierProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab === 'prices' || sp.tab === 'documents' ? sp.tab : 'details';

  const supabase = await createClient();
  const { data: s } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();

  const [{ data: itemsData }, { data: docs }] = await Promise.all([
    supabase.from('supplier_items').select('*').eq('supplier_id', id).order('line_no'),
    supabase.from('supplier_documents').select('*').eq('supplier_id', id).order('uploaded_at'),
  ]);
  const items = itemsData ?? [];

  // KPIs for this supplier
  const avgPrice = items.length ? items.reduce((a, i) => a + Number(i.unit_price), 0) / items.length : 0;
  const lastUpdate = items.reduce<string | null>(
    (m, i) => (!m || i.updated_at > m ? i.updated_at : m),
    null,
  );
  const daysLeft = s.price_validity_until
    ? Math.ceil((new Date(s.price_validity_until).getTime() - Date.now()) / 86_400_000)
    : null;

  // Signed URLs only when the documents tab is open
  const documents =
    tab === 'documents'
      ? await Promise.all(
          (docs ?? []).map(async (d) => {
            const { data } = await supabase.storage.from(SUPPLIER_BUCKET).createSignedUrl(d.storage_path, 600);
            return { ...d, url: data?.signedUrl ?? null };
          }),
        )
      : [];

  const save = updateSupplierDetails.bind(null, id);
  const setStatus = updateSupplierStatus.bind(null, id);
  const addItem = addPriceItem.bind(null, id);
  const importList = importPriceList.bind(null, id);
  const cats = (s.categories as string[]) ?? [];
  const branches = ((s.branches as string[]) ?? []).join(', ');

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-slate-400 hover:text-white">← All suppliers</Link>

      {sp.ok && <Banner tone="ok">{sp.ok}</Banner>}
      {sp.err && <Banner tone="err">{sp.err}</Banner>}

      {/* Hero */}
      <section className={`${card} relative overflow-hidden`}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fuchsia-600/25 via-transparent to-cyan-400/20" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <p className="font-mono text-sm font-bold text-cyan-300">{s.supplier_code ?? 'Pending HIS code'}</p>
            <h1 className="text-3xl font-extrabold tracking-tight">{s.company_name}</h1>
            <div className="flex flex-wrap gap-2">
              <Badge status={s.status} />
              {s.source === 'legacy_import' && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">HIS import</span>
              )}
              {cats.slice(0, 3).map((c) => (
                <span key={c} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{c}</span>
              ))}
            </div>
          </div>
          <form action={setStatus} className="flex items-center gap-2">
            <select name="status" defaultValue={s.status} className={`${field} w-40`}>
              <option value="pending" className="bg-slate-900">Pending</option>
              <option value="approved" className="bg-slate-900">Approved</option>
              <option value="rejected" className="bg-slate-900">Rejected</option>
            </select>
            <input type="hidden" name="review_notes" value={s.review_notes ?? ''} />
            <button type="submit" className={btn}>Update status</button>
          </form>
        </div>

        <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Price items" value={items.length} />
          <Kpi label="Avg unit price" value={items.length ? `LKR ${money(avgPrice)}` : '—'} />
          <Kpi label="Last price update" value={day(lastUpdate)} />
          <Kpi
            label="Price valid until"
            value={daysLeft === null ? '—' : daysLeft < 0 ? 'Expired' : `${daysLeft} days`}
            sub={s.price_validity_until ? day(s.price_validity_until) : 'Not set'}
            tone={daysLeft !== null && daysLeft < 30 ? 'warn' : 'default'}
          />
        </div>
      </section>

      {/* Tabs */}
      <nav className="flex gap-2 border-b border-white/10">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/suppliers/${id}?tab=${t.key}`}
            className={`rounded-t-xl px-5 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Details */}
      {tab === 'details' && (
        <form action={save} className={`${card} grid gap-5 md:grid-cols-2`}>
          <Field label="HIS supplier code" className="md:col-span-2">
            <input name="supplier_code" defaultValue={s.supplier_code ?? ''} placeholder="SP00000108 (enter from HIS)" className={`${field} font-mono uppercase`} />
            {!s.supplier_code && <span className="text-xs text-amber-300">Not assigned yet. Enter it from HIS before approving.</span>}
          </Field>
          <Field label="Company name" className="md:col-span-2">
            <input name="company_name" required defaultValue={s.company_name} className={field} />
          </Field>
          <Field label="Head office address">
            <textarea name="head_office_address" rows={2} defaultValue={s.head_office_address ?? ''} className={field} />
          </Field>
          <Field label="Factory address">
            <textarea name="factory_address" rows={2} defaultValue={s.factory_address ?? ''} className={field} />
          </Field>
          <Field label="Contact person">
            <input name="contact_person" defaultValue={s.contact_person ?? ''} className={field} />
          </Field>
          <Field label="Title">
            <input name="contact_title" defaultValue={s.contact_title ?? ''} className={field} />
          </Field>
          <Field label="Telephone">
            <input name="telephone" defaultValue={s.telephone ?? ''} className={field} />
          </Field>
          <Field label="Mobile">
            <input name="mobile" defaultValue={s.mobile ?? ''} className={field} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={s.email ?? ''} className={field} />
          </Field>
          <Field label="Fax">
            <input name="fax" defaultValue={s.fax ?? ''} className={field} />
          </Field>
          <Field label="Nature of business">
            <select name="business_nature" defaultValue={s.business_nature ?? ''} className={field}>
              <option value="" className="bg-slate-900">Not set</option>
              {BUSINESS_NATURES.map((b) => (
                <option key={b} value={b} className="bg-slate-900 capitalize">{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Branches (comma separated)">
            <input name="branches" defaultValue={branches} placeholder="Battaramulla, Ja-Ela" className={field} />
          </Field>
          <Field label="ISO 9000 certified">
            <label className="flex items-center gap-2 pt-2 text-sm">
              <input type="checkbox" name="iso_9000" defaultChecked={s.iso_9000} className="accent-fuchsia-500" />
              Yes
            </label>
          </Field>
          <Field label="ISO certificate no.">
            <input name="iso_certificate_no" defaultValue={s.iso_certificate_no ?? ''} className={field} />
          </Field>
          <Field label="Prices valid until">
            <input name="price_validity_until" type="date" defaultValue={s.price_validity_until ?? ''} className={field} />
          </Field>
          <Field label="Production capacity" className="md:col-span-2">
            <textarea name="production_capacity" rows={2} defaultValue={s.production_capacity ?? ''} className={field} />
          </Field>
          <Field label="Quality controls" className="md:col-span-2">
            <textarea name="quality_controls" rows={3} defaultValue={s.quality_controls ?? ''} className={field} />
          </Field>
          <div className="md:col-span-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Categories</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUPPLIER_CATEGORIES.map((c) => (
                <label key={c} className="flex items-start gap-2 rounded-xl border border-white/10 p-3 text-sm text-slate-300 hover:bg-white/5">
                  <input
                    type="checkbox"
                    name="categories"
                    value={c}
                    defaultChecked={cats.includes(c)}
                    className="mt-0.5 accent-fuchsia-500"
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between md:col-span-2">
            <p className="text-xs text-slate-500">Submitted {day(s.submitted_at)} · Last reviewed {day(s.reviewed_at)}</p>
            <button type="submit" className={btn}>Save details</button>
          </div>
        </form>
      )}

      {tab === 'details' && <div className="mt-8"><ApplicationView data={s.application} /></div>}

      {/* Price list */}
      {tab === 'prices' && (
        <div className="space-y-6">
          <section className={card}>
            <h2 className="text-lg font-bold">Add item</h2>
            <form action={addItem} className="mt-4 grid gap-3 md:grid-cols-[140px_1fr_100px_150px_auto]">
              <input name="his_item_code" placeholder="HIS item code" className={field} />
              <input name="description" required placeholder="Description" className={field} />
              <input name="unit" defaultValue="Each" className={field} />
              <input name="unit_price" type="number" step="0.01" min="0" required placeholder="Price (LKR)" className={field} />
              <button type="submit" className={btn}>Add</button>
            </form>
          </section>

          <section className={card}>
            <h2 className="text-lg font-bold">Import price list</h2>
            <p className="mt-1 text-sm text-slate-400">
              Excel or CSV. Columns: <span className="text-slate-200">Item Code, Description, Unit, Price</span>. Existing items are kept; new rows are added.
            </p>
            <form action={importList} className="mt-4 flex flex-wrap items-center gap-3">
              <input type="file" name="file" accept=".xlsx,.xls,.csv" required className="text-sm text-slate-300" />
              <button type="submit" className={btnGhost}>Import</button>
            </form>
          </section>

          <section className={`${card} p-0`}>
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-bold">Items ({items.length})</h2>
              <p className="text-xs text-slate-500">Edits are saved to price history</p>
            </div>
            {items.length === 0 && <p className="px-6 py-12 text-center text-slate-500">No price items yet.</p>}
            <div className="divide-y divide-white/5">
              {items.map((item) => {
                const update = updateItem.bind(null, id, item.id);
                const remove = deleteItem.bind(null, id, item.id);
                return (
                  <div key={item.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                    <form action={update} className="flex flex-1 flex-wrap items-center gap-2">
                      <span className="w-24 font-mono text-xs text-cyan-300">{item.his_item_code ?? '—'}</span>
                      <input name="description" defaultValue={item.description} className={`${field} min-w-[220px] flex-1`} />
                      <input name="unit" defaultValue={item.unit} className={`${field} w-24`} />
                      <input name="unit_price" type="number" step="0.01" min="0" defaultValue={item.unit_price} className={`${field} w-36 text-right`} />
                      <button type="submit" className={btn}>Save</button>
                    </form>
                    <form action={remove}>
                      <button type="submit" className="rounded-xl px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-400/10">Delete</button>
                    </form>
                    <p className="w-full text-[11px] text-slate-500">Last changed {day(item.updated_at)}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Documents */}
      {tab === 'documents' && (
        <div className="space-y-6">
          {documents.length === 0 && <p className="text-slate-500">No documents uploaded.</p>}
          {documents.map((d) => (
            <section key={d.id} className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{DOC_LABELS[d.doc_type as DocType] ?? d.doc_type}</p>
                  <p className="text-xs text-slate-500">
                    {d.file_name} · {(d.size_bytes / 1024).toFixed(0)} KB · {day(d.uploaded_at)}
                  </p>
                </div>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer" className={btnGhost}>Open</a>
                )}
              </div>
              {d.url && d.mime_type === 'application/pdf' && (
                <iframe src={d.url} title={d.file_name} className="mt-5 h-[560px] w-full rounded-2xl border border-white/10 bg-white" />
              )}
              {d.url && d.mime_type.startsWith('image/') && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.url} alt={d.file_name} className="mt-5 max-h-[560px] rounded-2xl border border-white/10" />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
