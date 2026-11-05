'use client';

import { useActionState, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { FIELDS, MGMT_ROWS, PAST_ROWS, SERVICE_LINES } from '@/lib/questionnaire';
import { CATEGORY_KEYS, CATEGORY_LABEL } from '@/lib/centres';
import { SUPPLIER_BUCKET } from '@/lib/schemas';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import type { Draft, ExtractResult } from '@/lib/form-draft';
import { Banner, btn, btnGhost, card, field } from '@/components/admin-ui';
import { extractFromStored, prepareUpload, saveDraft } from './actions';

type Ok = Extract<ExtractResult, { ok: true }>;
type Centre = { id: string; name: string };

function L({ t, children, className = '' }: { t: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-semibold text-slate-600">{t}</span>
      {children}
    </label>
  );
}

export default function ImportClient({ centres, aiReady }: { centres: Centre[]; aiReady: boolean }) {
  const [stage, setStage] = useState<'idle' | 'upload' | 'read' | 'review'>('idle');
  const [err, setErr] = useState('');
  const [res, setRes] = useState<Ok | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onRead(e: FormEvent) {
    e.preventDefault();
    const f = fileRef.current?.files?.[0];
    if (!f) { setErr('Choose a file first.'); return; }
    setErr('');
    setStage('upload');
    const prep = await prepareUpload(f.name, f.size);
    if (!prep.ok) { setErr(prep.error); setStage('idle'); return; }
    const up = await createBrowserSupabase().storage.from(SUPPLIER_BUCKET).uploadToSignedUrl(prep.path, prep.token, f, { contentType: f.type || undefined });
    if (up.error) { setErr(`Upload failed: ${up.error.message}`); setStage('idle'); return; }
    setStage('read');
    const out = await extractFromStored(prep.path, f.name);
    if (!out.ok) { setErr(out.error); setStage('idle'); return; }
    setRes(out);
    setStage('review');
  }

  if (stage === 'review' && res) return <Review res={res} centres={centres} onCancel={() => { setRes(null); setStage('idle'); }} />;

  const busy = stage === 'upload' || stage === 'read';
  return (
    <div className="space-y-4">
      {err && <Banner tone="err">{err}</Banner>}
      {!aiReady && (
        <Banner tone="err">
          AI reading of scans is not switched on (ANTHROPIC_API_KEY is not set in Vercel). Fillable PDFs from the NMC form pack can still be read. Scans and photos cannot until it is set.
        </Banner>
      )}
      <form onSubmit={onRead} className={`${card} space-y-4`}>
        <div>
          <h2 className="font-semibold text-slate-900">1. Choose the supplier&apos;s form</h2>
          <p className="mt-1 text-sm text-slate-600">
            PDF, JPG or PNG, up to 10 MB. A filled NMC fillable PDF is read exactly. A scan or photo is read by AI and shown to you as a draft to check.
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" required disabled={busy} className="block text-sm text-slate-700" />
        <button type="submit" disabled={busy} className={btn}>
          {stage === 'upload' ? 'Uploading…' : stage === 'read' ? 'Reading the form (up to a minute)…' : 'Read the form'}
        </button>
        <p className="text-xs text-slate-500">Nothing is saved to the supplier list until you check the values and press Create.</p>
      </form>
    </div>
  );
}

function Review({ res, centres, onCancel }: { res: Ok; centres: Centre[]; onCancel: () => void }) {
  const d: Draft = res.draft;
  const [state, formAction, pending] = useActionState(saveDraft, {});
  const row = <T,>(list: T[], n: number) => Array.from({ length: n }, (_, i) => list[i]);
  const svc = row(d.items_services, SERVICE_LINES);
  const mgmt = row(d.management, MGMT_ROWS);
  const past = row(d.past_experience, PAST_ROWS);
  const price = row(d.price_rows, 26);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="storage_path" value={res.file.path} />
        <input type="hidden" name="file_name" value={res.file.name} />
        <input type="hidden" name="mime_type" value={res.file.mime} />
        <input type="hidden" name="size_bytes" value={res.file.size} />
        <input type="hidden" name="source" value={res.source} />

        {state.error && <Banner tone="err">{state.error}</Banner>}

        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Check these before saving</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{d.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </section>

        <section className={`${card} grid gap-4 md:grid-cols-2`}>
          <h2 className="font-semibold text-slate-900 md:col-span-2">Company and contact</h2>
          <L t="Company name *" className="md:col-span-2"><input name="company_name" defaultValue={d.company_name} required className={field} /></L>
          <L t="Head office address *" className="md:col-span-2"><textarea name="head_office_address" rows={2} defaultValue={d.head_office_address} className={field} /></L>
          <L t="Factory address" className="md:col-span-2"><textarea name="factory_address" rows={2} defaultValue={d.factory_address} className={field} /></L>
          <L t="Telephone *"><input name="telephone" defaultValue={d.telephone} className={field} /></L>
          <L t="Mobile"><input name="mobile" defaultValue={d.mobile} className={field} /></L>
          <L t="Fax"><input name="fax" defaultValue={d.fax} className={field} /></L>
          <L t="Email *"><input name="email" type="email" defaultValue={d.email} className={field} /></L>
          <L t="Contact person *"><input name="contact_person" defaultValue={d.contact_person} className={field} /></L>
          <L t="Title"><input name="contact_title" defaultValue={d.contact_title} className={field} /></L>
          <L t="Nature of business *">
            <select name="business_nature" defaultValue={d.business_nature} className={field}>
              <option value="">Choose…</option>
              {['manufacturer', 'wholesaler', 'stockist', 'retailer'].map((n) => <option key={n} value={n} className="capitalize">{n}</option>)}
            </select>
          </L>
          <L t="HIS supplier code (if known)"><input name="supplier_code" placeholder="SP00000108" className={`${field} font-mono uppercase`} /></L>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="iso_9000" defaultChecked={d.iso_9000} className="accent-sky-600" /> Holds ISO 9000 or another quality registration
          </label>
          <L t="Deposit receipt no."><input name="deposit_receipt_no" defaultValue={d.deposit_receipt_no} className={field} /></L>
          <L t="Deposit amount (LKR)"><input name="deposit_amount" defaultValue={d.deposit_amount} className={field} /></L>
        </section>

        <section className={`${card} space-y-4`}>
          <h2 className="font-semibold text-slate-900">Centres and categories (not on the paper form: choose)</h2>
          <div className="flex flex-wrap gap-2">
            {centres.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" name="centre_ids" value={c.id} className="accent-sky-600" /> {c.name}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" name="departments" value={k} className="accent-sky-600" /> {CATEGORY_LABEL[k]}
              </label>
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-600">Form 03 categories ticked by the supplier</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SUPPLIER_CATEGORIES.map((c) => (
              <label key={c} className="flex items-start gap-2 rounded-xl border border-slate-200 p-2.5 text-sm">
                <input type="checkbox" name="categories" value={c} defaultChecked={d.categories.includes(c)} className="mt-0.5 accent-sky-600" /> {c}
              </label>
            ))}
          </div>
        </section>

        <section className={`${card} grid gap-4 md:grid-cols-2`}>
          <h2 className="font-semibold text-slate-900 md:col-span-2">Questionnaire answers</h2>
          <L t="Production capacity" className="md:col-span-2"><textarea name="ans_production_capacity" rows={2} defaultValue={d.answers.production_capacity ?? ''} className={field} /></L>
          {FIELDS.map((f) => (
            <L key={f.key} t={f.label} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
              {f.type === 'textarea' ? (
                <textarea name={`ans_${f.key}`} rows={2} defaultValue={d.answers[f.key] ?? ''} className={field} />
              ) : (
                <input name={`ans_${f.key}`} defaultValue={d.answers[f.key] ?? ''} className={field} />
              )}
            </L>
          ))}
        </section>

        <details open={d.items_services.length > 0 || d.management.length > 0} className={card}>
          <summary className="cursor-pointer font-semibold text-slate-900">Items / services and management</summary>
          <div className="mt-4 space-y-2">
            {svc.map((v, i) => <input key={i} name={`service_${i + 1}`} defaultValue={v ?? ''} placeholder={`Item or service ${i + 1}`} className={field} />)}
          </div>
          <div className="mt-5 space-y-2">
            {mgmt.map((m, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <input name={`mgmt_name_${i + 1}`} defaultValue={m?.name ?? ''} placeholder={`${i + 1}. Name`} className={field} />
                <input name={`mgmt_title_${i + 1}`} defaultValue={m?.title ?? ''} placeholder="Title" className={field} />
              </div>
            ))}
          </div>
        </details>

        <details open={d.past_experience.length > 0} className={card}>
          <summary className="cursor-pointer font-semibold text-slate-900">Past experience (Form 02)</summary>
          <div className="mt-4 space-y-2">
            {past.map((p, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_170px_130px]">
                <input name={`past_company_${i + 1}`} defaultValue={p?.company ?? ''} placeholder={`${i + 1}. Company`} className={field} />
                <input name={`past_contact_${i + 1}`} defaultValue={p?.contact ?? ''} placeholder="Contact no." className={field} />
                <input name={`past_period_${i + 1}`} defaultValue={p?.period ?? ''} placeholder="Period" className={field} />
              </div>
            ))}
          </div>
        </details>

        <details open={d.price_rows.length > 0} className={card}>
          <summary className="cursor-pointer font-semibold text-slate-900">Price list (Form 04) {d.price_rows.length === 0 && <span className="font-normal text-slate-500">(none on this form)</span>}</summary>
          <div className="mt-4 space-y-2">
            {price.map((p, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px]">
                <input name={`price_category_${i + 1}`} defaultValue={p?.category ?? ''} placeholder="Item / category" className={field} />
                <input name={`price_item_${i + 1}`} defaultValue={p?.item ?? ''} placeholder="Item" className={field} />
                <input name={`price_value_${i + 1}`} defaultValue={p?.price ?? ''} placeholder="Price (Rs.)" className={field} />
              </div>
            ))}
          </div>
        </details>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
          <button type="submit" disabled={pending} className={btn}>{pending ? 'Saving…' : 'Create supplier (Submitted)'}</button>
          <button type="button" onClick={onCancel} className={btnGhost}>Start again</button>
          <span className="text-xs text-slate-500">Source: {res.source === 'ai' ? 'AI reading of a scan' : 'fillable PDF fields'}</span>
        </div>
      </form>

      <aside className="xl:sticky xl:top-20 xl:self-start">
        <div className={`${card} !p-3`}>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-slate-900">The supplier&apos;s form</p>
            {res.previewUrl && <a href={res.previewUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-sky-700 hover:underline">Open in new tab</a>}
          </div>
          {res.previewUrl && res.file.mime === 'application/pdf' && <iframe src={res.previewUrl} title="Supplier form" className="h-[78vh] w-full rounded-lg border border-slate-200" />}
          {res.previewUrl && res.file.mime !== 'application/pdf' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={res.previewUrl} alt="Supplier form" className="max-h-[78vh] w-full rounded-lg border border-slate-200 object-contain" />
          )}
        </div>
      </aside>
    </div>
  );
}
