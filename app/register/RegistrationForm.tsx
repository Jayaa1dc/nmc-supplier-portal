'use client';

import { useActionState, useState } from 'react';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { Field, Section, inputCls } from '@/components/ui';
import { submitRegistration, type RegistrationState } from './actions';

type ItemRow = {
  key: number;
  his_item_code: string;
  description: string;
  brand: string;
  unit: string;
  unit_price: string;
};

const emptyItem = (key: number): ItemRow => ({
  key,
  his_item_code: '',
  description: '',
  brand: '',
  unit: 'Each',
  unit_price: '',
});

const NATURE_OPTIONS = ['manufacturer', 'wholesaler', 'stockist', 'retailer'] as const;

const initialState: RegistrationState = { ok: false };

export default function RegistrationForm() {
  const [state, formAction, pending] = useActionState(submitRegistration, initialState);
  const [items, setItems] = useState<ItemRow[]>([emptyItem(1)]);
  const [nextKey, setNextKey] = useState(2);

  const v = state.values ?? {};
  const selectedCats = state.categories ?? [];

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem(nextKey)]);
    setNextKey((k) => k + 1);
  };
  const removeItem = (key: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  const updateItem = (key: number, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  // Serialised for the server action; the "key" is a React-only identifier.
  const itemsJson = JSON.stringify(items.map(({ key, ...rest }) => rest));

  return (
    <form action={formAction} className="space-y-8" encType="multipart/form-data">
      {/* Honeypot — hidden from people, attractive to bots */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.message && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-medium">{state.message}</p>
          {state.errors && state.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-rose-700">For security, please re-attach your documents.</p>
        </div>
      )}

      {/* 1 — Identification */}
      <Section
        title="1. Supplier identification"
        note="Enter the code already issued in our Hospital Information System (HIS). It must match your existing record."
      >
        <Field
          label="Existing HIS Supplier Code *"
          hint="Format SP followed by 8 digits, e.g. SP00000108. New codes are not generated here."
          className="md:col-span-2"
        >
          <input
            name="supplier_code"
            required
            placeholder="SP00000000"
            pattern="[Ss][Pp][0-9]{8}"
            defaultValue={v.supplier_code}
            className={`${inputCls} font-mono uppercase tracking-wider`}
          />
        </Field>
        <Field label="Name of Company *" className="md:col-span-2">
          <input name="company_name" required defaultValue={v.company_name} className={inputCls} />
        </Field>
        <Field label="Head Office Address *">
          <textarea name="head_office_address" required rows={2} defaultValue={v.head_office_address} className={inputCls} />
        </Field>
        <Field label="Factory Address">
          <textarea name="factory_address" rows={2} defaultValue={v.factory_address} className={inputCls} />
        </Field>
      </Section>

      {/* 2 — Contacts */}
      <Section title="2. Contact details">
        <Field label="Telephone *">
          <input name="telephone" required defaultValue={v.telephone} className={inputCls} />
        </Field>
        <Field label="Mobile">
          <input name="mobile" defaultValue={v.mobile} className={inputCls} />
        </Field>
        <Field label="Fax">
          <input name="fax" defaultValue={v.fax} className={inputCls} />
        </Field>
        <Field label="Email *">
          <input name="email" type="email" required defaultValue={v.email} className={inputCls} />
        </Field>
        <Field label="Contact Person *">
          <input name="contact_person" required defaultValue={v.contact_person} className={inputCls} />
        </Field>
        <Field label="Title / Position">
          <input name="contact_title" defaultValue={v.contact_title} className={inputCls} />
        </Field>
      </Section>

      {/* 3 — Business profile */}
      <Section title="3. Business profile">
        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm font-medium text-slate-700">You are a *</legend>
          <div className="flex flex-wrap gap-4">
            {NATURE_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="radio"
                  name="business_nature"
                  value={opt}
                  required
                  defaultChecked={v.business_nature === opt}
                  className="accent-navy"
                />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Categories of items / services * (select all that apply)
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SUPPLIER_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-start gap-2 rounded-md border border-slate-200 p-2 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  name="categories"
                  value={cat}
                  defaultChecked={selectedCats.includes(cat)}
                  className="mt-0.5 accent-navy"
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="ISO 9000 or other recognised quality certification?">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="iso_9000" defaultChecked={v.iso_9000 === 'on'} className="accent-navy" />
            Yes, we hold a current certificate
          </label>
        </Field>
        <Field label="ISO / certificate number" hint="Upload a copy in the documents section below.">
          <input name="iso_certificate_no" defaultValue={v.iso_certificate_no} className={inputCls} />
        </Field>
        <Field label="Production capacity">
          <textarea name="production_capacity" rows={2} defaultValue={v.production_capacity} className={inputCls} />
        </Field>
        <Field label="Production controls, defect segregation, inspections, packing">
          <textarea name="quality_controls" rows={3} defaultValue={v.quality_controls} className={inputCls} />
        </Field>
      </Section>

      {/* 4 — Pre-qualification fee */}
      <Section title="4. Pre-qualification fee" note="Non-refundable deposit receipt for the pre-qualification application.">
        <Field label="Cash receipt number">
          <input name="deposit_receipt_no" defaultValue={v.deposit_receipt_no} className={inputCls} />
        </Field>
        <Field label="Amount paid (LKR)">
          <input name="deposit_amount" type="number" min="0" step="0.01" defaultValue={v.deposit_amount} className={inputCls} />
        </Field>
        <Field label="Prices valid until" hint="Supplier maintains the quoted prices up to this date.">
          <input name="price_validity_until" type="date" defaultValue={v.price_validity_until} className={inputCls} />
        </Field>
      </Section>

      {/* 5 — Items & prices */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-navy">5. Items &amp; price list *</h2>
            <p className="mt-1 text-sm text-slate-500">
              List each item or service with its unit and price. If you know the HIS item code, include it.
            </p>
          </div>
          <button type="button" onClick={addItem} className="rounded-md border border-navy px-3 py-1.5 text-sm font-medium text-navy hover:bg-navy hover:text-white">
            + Add row
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">HIS item code</th>
                <th className="px-2 py-2">Description *</th>
                <th className="px-2 py-2">Brand / model</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2 text-right">Unit price (LKR) *</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => (
                <tr key={it.key}>
                  <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-2 py-2">
                    <input value={it.his_item_code} onChange={(e) => updateItem(it.key, { his_item_code: e.target.value })} className={`${inputCls} w-32 font-mono`} />
                  </td>
                  <td className="px-2 py-2">
                    <input value={it.description} onChange={(e) => updateItem(it.key, { description: e.target.value })} className={`${inputCls} min-w-[220px]`} />
                  </td>
                  <td className="px-2 py-2">
                    <input value={it.brand} onChange={(e) => updateItem(it.key, { brand: e.target.value })} className={`${inputCls} w-36`} />
                  </td>
                  <td className="px-2 py-2">
                    <input value={it.unit} onChange={(e) => updateItem(it.key, { unit: e.target.value })} className={`${inputCls} w-24`} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => updateItem(it.key, { unit_price: e.target.value })} className={`${inputCls} w-32 text-right`} />
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => removeItem(it.key)} aria-label={`Remove row ${idx + 1}`} className="text-rose-600 hover:text-rose-800">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <input type="hidden" name="items_json" value={itemsJson} />
        <p className="mt-3 text-xs text-slate-500">{items.length} item row(s). Attach extra pages if needed.</p>
      </section>

      {/* 6 — Documents */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-navy">6. Supporting documents</h2>
        <p className="mt-1 text-sm text-slate-500">PDF, JPG, PNG or WEBP. Maximum 10&nbsp;MB per file.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Business registration / Certificate of Incorporation *">
            <input type="file" name="doc_business_registration" required accept=".pdf,.jpg,.jpeg,.png,.webp" className="text-sm" />
          </Field>
          <Field label="VAT registration certificate">
            <input type="file" name="doc_vat_certificate" accept=".pdf,.jpg,.jpeg,.png,.webp" className="text-sm" />
          </Field>
          <Field label="ISO certificate (if applicable)">
            <input type="file" name="doc_iso_certificate" accept=".pdf,.jpg,.jpeg,.png,.webp" className="text-sm" />
          </Field>
          <Field label="Non-refundable deposit receipt">
            <input type="file" name="doc_deposit_receipt" accept=".pdf,.jpg,.jpeg,.png,.webp" className="text-sm" />
          </Field>
          <Field label="Past experience / list of current customers" className="md:col-span-2" hint="You may attach up to 5 files.">
            <input type="file" name="doc_past_experience" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="text-sm" />
          </Field>
        </div>
      </section>

      {/* 7 — Declaration & submit */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="declaration" required className="mt-1 accent-navy" />
          <span>
            I declare that the information provided is true and complete. I understand that Nawaloka Medical
            Centre may accept or reject any application, and may discontinue the services of any supplier.
          </span>
        </label>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-navy px-6 py-2.5 font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </section>
    </form>
  );
}
