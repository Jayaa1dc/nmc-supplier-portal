'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { FIELDS, MGMT_ROWS, PAST_ROWS, SECTIONS, SERVICE_LINES, type FieldDef } from '@/lib/questionnaire';
import { submitRegistration, type RegistrationState } from './actions';

type Item = { key: number; his_item_code: string; description: string; brand: string; unit: string; unit_price: string };
const blankItem = (key: number): Item => ({ key, his_item_code: '', description: '', brand: '', unit: 'Each', unit_price: '' });

const NATURES = ['manufacturer', 'wholesaler', 'stockist', 'retailer'] as const;
const initial: RegistrationState = { ok: false };

const input =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-[border-color,box-shadow] duration-150 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10';
const label = 'text-xs font-semibold uppercase tracking-wide text-zinc-500';
const card = 'rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm';

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={card}>
      <h2 className="text-base font-bold tracking-tight text-zinc-900">{title}</h2>
      {note && <p className="mt-1 text-xs text-zinc-500">{note}</p>}
      <div className="mt-5 grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Text({
  label: text, name, v, required, multiline, type = 'text', className = '', placeholder, hint,
}: {
  label: string; name: string; v: Record<string, string>; required?: boolean; multiline?: boolean;
  type?: string; className?: string; placeholder?: string; hint?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className={label}>{text}{required ? ' *' : ''}</span>
      {multiline ? (
        <textarea name={name} rows={2} required={required} defaultValue={v[name]} className={input} placeholder={placeholder} />
      ) : (
        <input name={name} type={type} required={required} defaultValue={v[name]} className={input} placeholder={placeholder} />
      )}
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

function YesNo({ name, text, v, className = '' }: { name: string; text: string; v: Record<string, string>; className?: string }) {
  return (
    <fieldset className={`space-y-2 ${className}`}>
      <legend className={label}>{text}</legend>
      <div className="flex gap-5 text-sm text-zinc-800">
        {(['yes', 'no'] as const).map((o) => (
          <label key={o} className="flex items-center gap-2">
            <input type="radio" name={name} value={o} defaultChecked={v[name] === o} className="accent-zinc-900" />
            <span className="capitalize">{o}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function renderField(f: FieldDef, v: Record<string, string>) {
  if (f.type === 'yesno') return <YesNo key={f.key} name={f.key} text={f.label} v={v} className="md:col-span-2" />;
  return (
    <Text
      key={f.key}
      label={f.label}
      name={f.key}
      v={v}
      multiline={f.type === 'textarea'}
      type={f.type === 'date' ? 'date' : 'text'}
      className={f.type === 'textarea' ? 'md:col-span-2' : ''}
    />
  );
}

export default function RegistrationForm() {
  const [state, formAction, pending] = useActionState(submitRegistration, initial);
  const [items, setItems] = useState<Item[]>([blankItem(1)]);
  const [nextKey, setNextKey] = useState(2);

  const v = state.values ?? {};
  const cats = state.categories ?? [];

  const addItem = () => { setItems((p) => [...p, blankItem(nextKey)]); setNextKey((k) => k + 1); };
  const removeItem = (key: number) => setItems((p) => (p.length > 1 ? p.filter((it) => it.key !== key) : p));
  const updateItem = (key: number, patch: Partial<Item>) =>
    setItems((p) => p.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const itemsJson = JSON.stringify(items.map(({ key, ...rest }) => rest));

  const company = FIELDS.filter((f) => f.section === 'company');
  const production = FIELDS.filter((f) => f.section === 'production');
  const declaration = FIELDS.filter((f) => f.section === 'declaration');

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {state.message && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{state.message}</p>
          {state.errors && state.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
          <p className="mt-2 text-xs text-red-700">Please re-attach your files. Typed answers were kept.</p>
        </div>
      )}

      {/* 1. Company & applicant */}
      <Card title="1. Company & applicant" note={SECTIONS.company}>
        <p className="md:col-span-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">The HIS supplier code is assigned by the Procurement Division after review. You do not need to enter it.</p>
        <Text label="Name of company" name="company_name" v={v} required className="md:col-span-2" />
        <Text label="Head office address" name="head_office_address" v={v} required multiline />
        <Text label="Factory address" name="factory_address" v={v} multiline />
        <Text label="Telephone" name="telephone" v={v} required />
        <Text label="Mobile" name="mobile" v={v} />
        <Text label="Fax" name="fax" v={v} />
        <Text label="E-mail" name="email" v={v} type="email" required />
        <Text label="Name of applicant (contact person)" name="contact_person" v={v} required />
        <Text label="Title" name="contact_title" v={v} />
        {company.map((f) => renderField(f, v))}
      </Card>

      {/* 2. Business profile */}
      <Card title="2. Business profile & personnel" note={`${SECTIONS.company.split(' · ')[0]} · Questionnaire 44/FO/KM/02 (page 1)`}>
        <fieldset className="md:col-span-2 space-y-2">
          <legend className={label}>You are a *</legend>
          <div className="flex flex-wrap gap-5 text-sm">
            {NATURES.map((o) => (
              <label key={o} className="flex items-center gap-2 capitalize">
                <input type="radio" name="business_nature" value={o} required defaultChecked={v.business_nature === o} className="accent-zinc-900" />
                {o}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="md:col-span-2 space-y-2">
          <legend className={label}>Categories (Form 03) *</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SUPPLIER_CATEGORIES.map((c) => (
              <label key={c} className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-700 transition-colors duration-150 hover:bg-zinc-50">
                <input type="checkbox" name="categories" value={c} defaultChecked={cats.includes(c)} className="mt-0.5 accent-zinc-900" />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="md:col-span-2 space-y-2">
          <legend className={label}>Description of items / services provided</legend>
          {Array.from({ length: SERVICE_LINES }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 text-right text-xs text-zinc-400">{i + 1}.</span>
              <input name={`service_${i + 1}`} defaultValue={v[`service_${i + 1}`]} className={input} />
            </div>
          ))}
        </fieldset>

        <fieldset className="md:col-span-2 space-y-2">
          <legend className={label}>Principal management personnel (name and title, responsible for quality marked with *)</legend>
          {Array.from({ length: MGMT_ROWS }, (_, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2">
              <input name={`mgmt_name_${i + 1}`} defaultValue={v[`mgmt_name_${i + 1}`]} placeholder={`${i + 1}. Name`} className={input} />
              <input name={`mgmt_title_${i + 1}`} defaultValue={v[`mgmt_title_${i + 1}`]} placeholder="Title" className={input} />
            </div>
          ))}
        </fieldset>

        <label className="flex items-center gap-2 text-sm md:col-span-1">
          <input type="checkbox" name="iso_9000" defaultChecked={v.iso_9000 === 'on'} className="accent-zinc-900" />
          Yes, we hold a current certificate (attach copy)
        </label>
        <Text label="ISO certificate / registration no." name="iso_certificate_no" v={v} />
      </Card>

      {/* 3. Production & quality */}
      <Card title="3. Production & quality" note={SECTIONS.production}>
        <Text label="What is your production capacity?" name="production_capacity" v={v} multiline className="md:col-span-2" />
        {production.map((f) => renderField(f, v))}
      </Card>

      {/* 4. Past experience */}
      <Card title="4. Record of past experience (Form 02)" note="Supplier / manufacturer / agent / distributor in the last three years. Attach evidence if available.">
        <div className="md:col-span-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr><th className="py-2 pr-3">S/N</th><th className="py-2 pr-3">Name of company</th><th className="py-2 pr-3">Contact no.</th><th className="py-2">Period</th></tr>
            </thead>
            <tbody>
              {Array.from({ length: PAST_ROWS }, (_, i) => (
                <tr key={i} className="border-t border-zinc-100">
                  <td className="py-2 pr-3 text-zinc-400">{i + 1}</td>
                  <td className="py-2 pr-3"><input name={`past_company_${i + 1}`} defaultValue={v[`past_company_${i + 1}`]} className={input} /></td>
                  <td className="py-2 pr-3"><input name={`past_contact_${i + 1}`} defaultValue={v[`past_contact_${i + 1}`]} className={input} /></td>
                  <td className="py-2"><input name={`past_period_${i + 1}`} defaultValue={v[`past_period_${i + 1}`]} className={input} placeholder="e.g. 2023–2025" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Pre-qualification fee */}
      <Card title="5. Pre-qualification fee" note="Non-refundable deposit for pre-qualification (Form 01 cover page).">
        <Text label="Cash receipt number" name="deposit_receipt_no" v={v} />
        <Text label="Amount (LKR)" name="deposit_amount" v={v} type="number" />
        <Text label="Supplier maintains prices up to" name="price_validity_until" v={v} type="date" />
      </Card>

      {/* 6. Price list */}
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-zinc-900">6. Price list (Form 04)</h2>
            <p className="mt-1 text-xs text-zinc-500">Type each item here, or upload your price list as Excel, CSV, Word or PDF. You can do both.</p>
          </div>
          <button type="button" onClick={addItem} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition-[transform,background-color] duration-150 hover:bg-zinc-50 active:scale-[0.97]">+ Add row</button>
        </div>

        <div className="mt-5 space-y-2">
          {items.map((it, idx) => (
            <div key={it.key} className="grid grid-cols-[28px_1fr_90px_110px_110px_auto] items-center gap-2">
              <span className="text-right text-xs text-zinc-400">{idx + 1}.</span>
              <input value={it.description} onChange={(e) => updateItem(it.key, { description: e.target.value })} placeholder="Item / category description" className={input} />
              <input value={it.his_item_code} onChange={(e) => updateItem(it.key, { his_item_code: e.target.value })} placeholder="HIS code" className={`${input} font-mono`} />
              <input value={it.unit} onChange={(e) => updateItem(it.key, { unit: e.target.value })} placeholder="Unit" className={input} />
              <input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => updateItem(it.key, { unit_price: e.target.value })} placeholder="Price LKR" className={`${input} text-right`} />
              <button type="button" onClick={() => removeItem(it.key)} aria-label={`Remove row ${idx + 1}`} className="text-sm text-red-600 hover:text-red-800">Remove</button>
            </div>
          ))}
        </div>
        <input type="hidden" name="items_json" value={itemsJson} />

        <label className="mt-6 block space-y-1.5">
          <span className={label}>Price list file (optional, Excel / CSV / Word / PDF)</span>
          <input type="file" name="doc_price_list" accept=".xlsx,.xls,.csv,.docx,.doc,.pdf" className="block text-sm text-zinc-700 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
          <span className="block text-xs text-zinc-500">Excel/CSV columns: Item Code, Description, Unit, Price. Excel rows are added to the items above.</span>
        </label>
      </section>

      {/* 7. Documents */}
      <section className={card}>
        <h2 className="text-base font-bold tracking-tight text-zinc-900">7. Supporting documents</h2>
        <p className="mt-1 text-xs text-zinc-500">PDF, JPG, PNG or WEBP. Maximum 10 MB per file.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block space-y-1.5"><span className={label}>Business registration / Certificate of incorporation *</span>
            <input type="file" name="doc_business_registration" required accept=".pdf,.jpg,.jpeg,.png,.webp" className="block text-sm" /></label>
          <label className="block space-y-1.5"><span className={label}>VAT registration certificate</span>
            <input type="file" name="doc_vat_certificate" accept=".pdf,.jpg,.jpeg,.png,.webp" className="block text-sm" /></label>
          <label className="block space-y-1.5"><span className={label}>ISO certificate</span>
            <input type="file" name="doc_iso_certificate" accept=".pdf,.jpg,.jpeg,.png,.webp" className="block text-sm" /></label>
          <label className="block space-y-1.5"><span className={label}>Deposit receipt</span>
            <input type="file" name="doc_deposit_receipt" accept=".pdf,.jpg,.jpeg,.png,.webp" className="block text-sm" /></label>
          <label className="block space-y-1.5 md:col-span-2"><span className={label}>Signed application forms (scanned, up to 5 files)</span>
            <input type="file" name="doc_signed_forms" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="block text-sm" /></label>
          <label className="block space-y-1.5 md:col-span-2"><span className={label}>Past experience evidence / list of current customers (up to 5 files)</span>
            <input type="file" name="doc_past_experience" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="block text-sm" /></label>
        </div>
      </section>

      {/* 8. Completion & declaration */}
      <Card title="8. Completion & declaration" note={SECTIONS.declaration}>
        {declaration.map((f) => renderField(f, v))}
        <label className="flex items-start gap-3 text-sm text-zinc-700 md:col-span-2">
          <input type="checkbox" name="declaration" required defaultChecked={v.declaration === 'on'} className="mt-1 accent-zinc-900" />
          <span>We declare that the information provided is true and accurate to the best of our knowledge. We understand that Nawaloka Medical Centre may accept or reject any application, and may discontinue the services of any supplier.</span>
        </label>
      </Card>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-[transform,background-color,opacity] duration-150 hover:bg-zinc-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Submitting…' : 'Submit application'}
        </button>
      </div>
    </form>
  );
}
