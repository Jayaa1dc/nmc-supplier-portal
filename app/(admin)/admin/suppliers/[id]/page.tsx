import Link from 'next/link';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SUPPLIER_BUCKET, DOC_LABELS, BUSINESS_NATURES, type DocType } from '@/lib/schemas';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { CATEGORY_KEYS, CATEGORY_LABEL, isCategory, isUuid, money } from '@/lib/centres';
import { Badge, Banner, Field, btn, btnGhost, btnDanger, card, field, EmptyState } from '@/components/admin-ui';
import { ApplicationView } from '@/components/application-view';
import { STATUS_LABEL } from '@/lib/approval';
import {
  addPriceItem, deleteItem, importPriceList, setDocumentExpiry, updateItem,
  updateSupplierDetails, updateSupplierStatus, uploadDocument,
} from './actions';

type Tab = 'profile' | 'prices' | 'documents' | 'history';
const TABS: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Supplier profile' },
  { key: 'prices', label: 'Price list' },
  { key: 'documents', label: 'Documents' },
  { key: 'history', label: 'Price history' },
];

const day = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-GB') : '—');
const dayTime = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB') : '—');

export default async function SupplierProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; ok?: string; err?: string; centre?: string; cat?: string; q?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (TABS.map((t) => t.key) as string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'profile';
  const supabase = await createClient();

  const { data: s } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();

  const [{ data: centres }, { data: links }, { data: deps }] = await Promise.all([
    supabase.from('centres').select('id, name, code').order('sort_order'),
    supabase.from('supplier_centres').select('centre_id').eq('supplier_id', id),
    supabase.from('supplier_departments').select('dept').eq('supplier_id', id),
  ]);
  const myCentres = new Set((links ?? []).map((l) => l.centre_id));
  const myCats = new Set((deps ?? []).map((d) => d.dept));
  const centreName = new Map((centres ?? []).map((c) => [c.id, c.name]));

  const notice = (
    <>
      {sp.ok && <Banner tone="ok">{sp.ok}</Banner>}
      {sp.err && <Banner tone="err">{sp.err}</Banner>}
    </>
  );

  // Header: identity and status (not a tab)
  const header = (
    <section className={`${card} space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/admin/suppliers" className="text-sm text-slate-500 hover:text-slate-900">← Supplier directory</Link>
          <p className="font-mono text-sm font-semibold text-sky-700">{s.supplier_code ?? 'HIS code pending'}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{s.company_name}</h1>
          <div className="flex flex-wrap gap-1.5">
            <Badge status={s.status} />
            {[...myCentres].map((c) => <span key={c} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{centreName.get(c)}</span>)}
            {[...myCats].map((c) => <span key={c} className="rounded-md bg-sky-50 px-2 py-0.5 text-xs text-sky-800">{CATEGORY_LABEL[c as keyof typeof CATEGORY_LABEL]}</span>)}
          </div>
        </div>
        <form action={updateSupplierStatus.bind(null, id)} className="flex items-center gap-2">
          <select name="status" defaultValue={s.status} className={`${field} w-52`} aria-label="Approval status">
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="hidden" name="review_notes" value={s.review_notes ?? ''} />
          <button type="submit" className={btn}>Update status</button>
        </form>
      </div>
      <nav className="flex flex-wrap gap-1 border-t border-slate-100 pt-4" aria-label="Supplier sections">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/suppliers/${id}?tab=${t.key}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </section>
  );

  // ---------- A. Supplier profile ----------
  const profileTab = (
    <div className="space-y-6">
      <form action={updateSupplierDetails.bind(null, id)} className={`${card} grid gap-5 md:grid-cols-2`}>
        <Field label="HIS supplier code" className="md:col-span-2">
          <input name="supplier_code" defaultValue={s.supplier_code ?? ''} placeholder="SP00000108" className={`${field} font-mono uppercase`} />
        </Field>
        <Field label="Supplier name" className="md:col-span-2">
          <input name="company_name" required defaultValue={s.company_name} className={field} />
        </Field>
        <Field label="Contact person"><input name="contact_person" defaultValue={s.contact_person ?? ''} className={field} /></Field>
        <Field label="Title"><input name="contact_title" defaultValue={s.contact_title ?? ''} className={field} /></Field>
        <Field label="Telephone"><input name="telephone" defaultValue={s.telephone ?? ''} className={field} /></Field>
        <Field label="Mobile"><input name="mobile" defaultValue={s.mobile ?? ''} className={field} /></Field>
        <Field label="Email"><input name="email" type="email" defaultValue={s.email ?? ''} className={field} /></Field>
        <Field label="Fax"><input name="fax" defaultValue={s.fax ?? ''} className={field} /></Field>
        <Field label="Address (head office)" className="md:col-span-2">
          <textarea name="head_office_address" rows={2} defaultValue={s.head_office_address ?? ''} className={field} />
        </Field>
        <Field label="Factory address" className="md:col-span-2">
          <textarea name="factory_address" rows={2} defaultValue={s.factory_address ?? ''} className={field} />
        </Field>
        <Field label="Nature of business">
          <select name="business_nature" defaultValue={s.business_nature ?? ''} className={field}>
            <option value="">Not set</option>
            {BUSINESS_NATURES.map((b) => <option key={b} value={b} className="capitalize">{b}</option>)}
          </select>
        </Field>
        <Field label="Prices valid until"><input name="price_validity_until" type="date" defaultValue={s.price_validity_until ?? ''} className={field} /></Field>

        <fieldset className="md:col-span-2 space-y-2">
          <legend className="text-xs font-semibold text-slate-600">Centres this supplier serves (tick all that apply)</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(centres ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" name="centre_ids" value={c.id} defaultChecked={myCentres.has(c.id)} className="accent-sky-600" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="md:col-span-2 space-y-2">
          <legend className="text-xs font-semibold text-slate-600">Categories</legend>
          <div className="flex flex-wrap gap-3">
            {CATEGORY_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" name="departments" value={k} defaultChecked={myCats.has(k)} className="accent-sky-600" />
                {CATEGORY_LABEL[k]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="md:col-span-2 space-y-2">
          <legend className="text-xs font-semibold text-slate-600">Product categories (Form 03)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SUPPLIER_CATEGORIES.map((c) => (
              <label key={c} className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                <input type="checkbox" name="categories" value={c} defaultChecked={(s.categories as string[]).includes(c)} className="mt-0.5 accent-sky-600" />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-between md:col-span-2">
          <p className="text-xs text-slate-500">Submitted {day(s.submitted_at)} · Last reviewed {day(s.reviewed_at)}</p>
          <button type="submit" className={btn}>Save supplier profile</button>
        </div>
      </form>
      <ApplicationView data={s.application} />
    </div>
  );

  // ---------- B. Price list (centre and category aware) ----------
  let pricesTab: ReactNode = null;
  if (tab === 'prices') {
    const term = (sp.q ?? '').replace(/[%,()*]/g, '').trim();
    const fCentre = sp.centre && isUuid(sp.centre) ? sp.centre : '';
    const fCat = sp.cat && isCategory(sp.cat) ? sp.cat : '';
    let q = supabase.from('supplier_items').select('*').eq('supplier_id', id).order('category').order('description').limit(500);
    if (fCentre) q = q.eq('centre_id', fCentre);
    if (fCat) q = q.eq('category', fCat);
    if (term) q = q.or(`description.ilike.%${term}%,his_item_code.ilike.%${term}%`);
    const { data: items } = await q;
    const today = new Date().toISOString().slice(0, 10);
    const chip = (on: boolean) => `rounded-full px-3 py-1 text-xs font-medium ${on ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`;
    const keepParams = (over: Record<string, string>) => {
      const m = { tab: 'prices', centre: fCentre, cat: fCat, q: term, ...over };
      return `/admin/suppliers/${id}?${Object.entries(m).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
    };

    pricesTab = (
      <div className="space-y-6">
        <section className={`${card} space-y-3 !p-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Centre</span>
            <Link href={keepParams({ centre: '' })} className={chip(!fCentre)}>All</Link>
            {(centres ?? []).map((c) => <Link key={c.id} href={keepParams({ centre: c.id })} className={chip(fCentre === c.id)}>{c.name}</Link>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Category</span>
            <Link href={keepParams({ cat: '' })} className={chip(!fCat)}>All</Link>
            {CATEGORY_KEYS.map((k) => <Link key={k} href={keepParams({ cat: k })} className={chip(fCat === k)}>{CATEGORY_LABEL[k]}</Link>)}
            <form method="get" className="ml-auto flex items-center gap-2">
              <input type="hidden" name="tab" value="prices" />
              {fCentre && <input type="hidden" name="centre" value={fCentre} />}
              {fCat && <input type="hidden" name="cat" value={fCat} />}
              <input name="q" defaultValue={term} placeholder="Search item or code" className={`${field} w-56 !py-1.5`} />
              <button type="submit" className={btnGhost}>Search</button>
            </form>
          </div>
        </section>

        <section className={card}>
          <h2 className="font-semibold text-slate-900">Add price item</h2>
          <form action={addPriceItem.bind(null, id)} className="mt-4 grid gap-3 md:grid-cols-6">
            <select name="centre_id" required className={field} defaultValue={fCentre}>
              <option value="">Centre *</option>
              {(centres ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="category" required className={field} defaultValue={fCat}>
              <option value="">Category *</option>
              {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}
            </select>
            <input name="item_code" required placeholder="Item code *" className={field} />
            <input name="description" required placeholder="Item name *" className={`${field} md:col-span-2`} />
            <input name="unit" defaultValue="Each" placeholder="Unit of measure" className={field} />
            <input name="unit_price" type="number" step="0.01" min="0" required placeholder="Unit price (LKR) *" className={field} />
            <input name="effective_date" type="date" defaultValue={today} className={field} aria-label="Effective date" />
            <div className="md:col-span-6"><button type="submit" className={btn}>Add item</button></div>
          </form>
        </section>

        <section className={card}>
          <h2 className="font-semibold text-slate-900">Import price list (Excel / CSV)</h2>
          <p className="mt-1 text-sm text-slate-500">Columns: Item Code, Description, Unit, Price. Every row is saved for the centre and category you choose.</p>
          <form action={importPriceList.bind(null, id)} className="mt-4 flex flex-wrap items-end gap-3">
            <select name="centre_id" required className={field} defaultValue={fCentre}>
              <option value="">Centre *</option>
              {(centres ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="category" required className={field} defaultValue={fCat}>
              <option value="">Category *</option>
              {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}
            </select>
            <input type="file" name="file" accept=".xlsx,.xls,.csv" required className="text-sm text-slate-700" />
            <button type="submit" className={btnGhost}>Import</button>
          </form>
        </section>

        <section className={`${card} !p-0`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Items ({items?.length ?? 0})</h2>
            <p className="text-xs text-slate-500">Every price change is written to Price history</p>
          </div>
          {(items ?? []).length === 0 ? (
            <div className="p-6"><EmptyState title="No price items" text="Add an item or import a price list. Filters above narrow the list by centre and category." /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(items ?? []).map((it) => (
                <div key={it.id} className="px-6 py-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700">{it.his_item_code ?? 'No code'}</span>
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-sky-800">{it.category ? CATEGORY_LABEL[it.category as keyof typeof CATEGORY_LABEL] : 'Category not set'}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{it.centre_id ? centreName.get(it.centre_id) : 'Centre not set'}</span>
                    <span className="text-slate-500">Effective {day(it.effective_date)} · Updated {dayTime(it.updated_at)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <form action={updateItem.bind(null, id, it.id)} className="flex flex-1 flex-wrap items-center gap-2">
                      <input name="item_code" defaultValue={it.his_item_code ?? ''} className={`${field} w-32 font-mono`} aria-label="Item code" />
                      <input name="description" defaultValue={it.description} className={`${field} min-w-[220px] flex-1`} aria-label="Item name" />
                      <input name="unit" defaultValue={it.unit} className={`${field} w-24`} aria-label="Unit of measure" />
                      <input name="unit_price" type="number" step="0.01" min="0" defaultValue={it.unit_price} className={`${field} w-36 text-right`} aria-label="Unit price LKR" />
                      <input name="effective_date" type="date" defaultValue={it.effective_date ?? today} className={`${field} w-40`} aria-label="Effective date" />
                      <button type="submit" className={btn}>Save / update price</button>
                    </form>
                    <form action={deleteItem.bind(null, id, it.id)}>
                      <button type="submit" className={btnDanger}>Delete</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ---------- C. Documents ----------
  let documentsTab: ReactNode = null;
  if (tab === 'documents') {
    const { data: docs } = await supabase
      .from('supplier_documents')
      .select('id, doc_type, file_name, mime_type, size_bytes, uploaded_at, expires_on, storage_path')
      .eq('supplier_id', id)
      .order('uploaded_at', { ascending: false });
    const today = new Date().toISOString().slice(0, 10);
    const withLinks = await Promise.all(
      (docs ?? []).map(async (d) => {
        const view = await supabase.storage.from(SUPPLIER_BUCKET).createSignedUrl(d.storage_path, 600);
        const download = await supabase.storage.from(SUPPLIER_BUCKET).createSignedUrl(d.storage_path, 600, { download: d.file_name });
        return { ...d, view: view.data?.signedUrl ?? null, download: download.data?.signedUrl ?? null };
      }),
    );

    documentsTab = (
      <div className="space-y-6">
        <section className={card}>
          <h2 className="font-semibold text-slate-900">Upload document</h2>
          <form action={uploadDocument.bind(null, id)} className="mt-4 flex flex-wrap items-end gap-3">
            <select name="doc_type" required className={field}>
              <option value="business_registration">Business registration</option>
              <option value="supplier_agreement">Supplier agreement</option>
              <option value="other">Other supplier document</option>
            </select>
            <input name="expires_on" type="date" className={field} aria-label="Expiry date (optional)" />
            <input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" className="text-sm text-slate-700" />
            <button type="submit" className={btn}>Upload</button>
          </form>
          <p className="mt-2 text-xs text-slate-500">PDF, JPG, PNG or WEBP, up to 10 MB.</p>
        </section>

        {withLinks.length === 0 ? (
          <EmptyState title="No documents yet" text="Upload the business registration, supplier agreements and other documents here." />
        ) : (
          <div className="space-y-3">
            {withLinks.map((d) => {
              const expired = d.expires_on && d.expires_on < today;
              return (
                <section key={d.id} className={card}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{DOC_LABELS[d.doc_type as DocType] ?? d.doc_type}</p>
                      <p className="text-xs text-slate-500">{d.file_name} · {(d.size_bytes / 1024).toFixed(0)} KB · Uploaded {day(d.uploaded_at)}</p>
                      {d.expires_on && (
                        <p className={`mt-1 text-xs font-semibold ${expired ? 'text-rose-700' : 'text-slate-700'}`}>
                          {expired ? 'Expired on ' : 'Expires '}{day(d.expires_on)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {d.view && <a href={d.view} target="_blank" rel="noreferrer" className={btnGhost}>View</a>}
                      {d.download && <a href={d.download} className={btnGhost}>Download</a>}
                    </div>
                  </div>
                  <form action={setDocumentExpiry.bind(null, id)} className="mt-4 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="doc_id" value={d.id} />
                    <input type="date" name="expires_on" defaultValue={d.expires_on ?? ''} className={`${field} w-48`} aria-label="Expiry date" />
                    <button type="submit" className={btnGhost}>Save expiry</button>
                  </form>
                </section>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------- D. Price history ----------
  let historyTab: ReactNode = null;
  if (tab === 'history') {
    const { data: hist } = await supabase
      .from('supplier_price_history')
      .select('id, item_code, description, centre_id, category, old_price, new_price, effective_date, changed_at, actor_email')
      .eq('supplier_id', id)
      .order('changed_at', { ascending: false })
      .limit(300);

    historyTab = (
      <section className={`${card} !p-0`}>
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Price history ({hist?.length ?? 0})</h2>
          <p className="text-xs text-slate-500">Newest first. Difference is new price minus previous price.</p>
        </div>
        {(hist ?? []).length === 0 ? (
          <div className="p-6"><EmptyState title="No price changes yet" text="Every new item or price change appears here with the user who made it." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Centre / category</th>
                  <th className="px-4 py-3 text-right">Previous (LKR)</th>
                  <th className="px-4 py-3 text-right">New (LKR)</th>
                  <th className="px-4 py-3 text-right">Difference</th>
                  <th className="px-4 py-3">Effective</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(hist ?? []).map((h) => {
                  const prev = h.old_price === null ? null : Number(h.old_price);
                  const next = Number(h.new_price);
                  const diff = prev === null ? null : next - prev;
                  const pct = prev && prev !== 0 && diff !== null ? (diff / prev) * 100 : null;
                  return (
                    <tr key={h.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{h.description}</p>
                        <p className="font-mono text-xs text-slate-500">{h.item_code ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {h.centre_id ? centreName.get(h.centre_id) : '—'}
                        <p className="text-xs text-slate-500">{h.category ? CATEGORY_LABEL[h.category as keyof typeof CATEGORY_LABEL] : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{prev === null ? 'First price' : money(prev)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(next)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${diff === null ? 'text-slate-400' : diff > 0 ? 'text-rose-700' : diff < 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {diff === null ? '—' : `${diff > 0 ? '+' : ''}${money(diff)}${pct === null ? '' : ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{day(h.effective_date)}</td>
                      <td className="px-4 py-3 text-slate-600">{dayTime(h.changed_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{h.actor_email ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {notice}
      {header}
      {tab === 'profile' && profileTab}
      {tab === 'prices' && pricesTab}
      {tab === 'documents' && documentsTab}
      {tab === 'history' && historyTab}
    </div>
  );
}
