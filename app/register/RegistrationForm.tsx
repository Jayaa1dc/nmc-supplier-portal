'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { FIELDS, MGMT_ROWS, PAST_ROWS, SERVICE_LINES, type FieldDef } from '@/lib/questionnaire';
import { SI_CATEGORY, SI_FIELD, SI_NATURE } from '@/lib/i18n';
import { submitRegistration, type RegistrationState } from './actions';

type Item = { key: number; his_item_code: string; description: string; brand: string; unit: string; unit_price: string };
const blankItem = (key: number): Item => ({ key, his_item_code: '', description: '', brand: '', unit: 'Each', unit_price: '' });

const NATURES = ['manufacturer', 'wholesaler', 'stockist', 'retailer'] as const;
const initial: RegistrationState = { ok: false };

const input =
  'w-full rounded-xl border border-zinc-400 bg-white px-3.5 py-3 text-base text-zinc-900 placeholder:text-zinc-400 transition-[border-color,box-shadow] duration-150 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-600/15';
const smallBtn =
  'press rounded-xl border border-zinc-400 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-600/20';
const fileCls =
  'block w-full text-sm text-zinc-800 file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white';

/** English label with the Sinhala line underneath, like the printed NMC forms. */
function Lbl({ en, si, required }: { en: string; si: string; required?: boolean }) {
  return (
    <span className="block">
      <span className="block text-[15px] font-semibold leading-snug text-zinc-900">
        {en}
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
      </span>
      <span className="si block text-sm text-zinc-600" lang="si">{si}</span>
    </span>
  );
}

function Hint({ en, si }: { en: string; si: string }) {
  return (
    <span className="block text-sm text-zinc-600">
      {en}
      <span className="si block" lang="si">{si}</span>
    </span>
  );
}

function Card({ n, en, si, noteEn, noteSi, children }: { n: number; en: string; si: string; noteEn?: string; noteSi?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-xl font-bold tracking-tight text-zinc-900">{n}. {en}</h2>
      <p className="si text-base font-semibold text-zinc-700" lang="si">{si}</p>
      {noteEn && noteSi && <div className="mt-2"><Hint en={noteEn} si={noteSi} /></div>}
      <div className="mt-6 grid gap-6 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Text({
  en, si, name, v, required, multiline, type = 'text', className = '', placeholder, hintEn, hintSi,
}: {
  en: string; si: string; name: string; v: Record<string, string>; required?: boolean; multiline?: boolean;
  type?: string; className?: string; placeholder?: string; hintEn?: string; hintSi?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <Lbl en={en} si={si} required={required} />
      {multiline ? (
        <textarea name={name} rows={3} required={required} defaultValue={v[name]} className={input} placeholder={placeholder} />
      ) : (
        <input name={name} type={type} required={required} defaultValue={v[name]} className={input} placeholder={placeholder} />
      )}
      {hintEn && hintSi && <Hint en={hintEn} si={hintSi} />}
    </label>
  );
}

function YesNo({ name, en, si, v, className = '' }: { name: string; en: string; si: string; v: Record<string, string>; className?: string }) {
  return (
    <fieldset className={`space-y-3 ${className}`}>
      <legend><Lbl en={en} si={si} /></legend>
      <div className="flex flex-wrap gap-3">
        {([['yes', 'Yes', 'ඔව්'], ['no', 'No', 'නැත']] as const).map(([val, e, s]) => (
          <label key={val} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-400 bg-white px-4 py-2.5 text-base text-zinc-900 has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50">
            <input type="radio" name={name} value={val} defaultChecked={v[name] === val} className="h-4 w-4 accent-sky-700" />
            <span>{e} <span className="si text-zinc-600" lang="si">/ {s}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function renderField(f: FieldDef, v: Record<string, string>) {
  const si = SI_FIELD[f.key] ?? '';
  if (f.type === 'yesno') return <YesNo key={f.key} name={f.key} en={f.label} si={si} v={v} className="md:col-span-2" />;
  return (
    <Text
      key={f.key}
      en={f.label}
      si={si}
      name={f.key}
      v={v}
      multiline={f.type === 'textarea'}
      type={f.type === 'date' ? 'date' : 'text'}
      className={f.type === 'textarea' ? 'md:col-span-2' : ''}
    />
  );
}

function PastRow({ i, v }: { i: number; v: Record<string, string> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[32px_1fr_190px_160px] sm:items-center">
      <span className="hidden text-right text-sm text-zinc-500 sm:block">{i}.</span>
      <input name={`past_company_${i}`} defaultValue={v[`past_company_${i}`]} placeholder="Company name / සමාගමේ නම" aria-label={`Past experience ${i}: company name`} className={input} />
      <input name={`past_contact_${i}`} defaultValue={v[`past_contact_${i}`]} placeholder="Contact no. / දුරකථන අංකය" aria-label={`Past experience ${i}: contact number`} className={input} />
      <input name={`past_period_${i}`} defaultValue={v[`past_period_${i}`]} placeholder="Period / කාලය" aria-label={`Past experience ${i}: period`} className={input} />
    </div>
  );
}

function MgmtRow({ i, v }: { i: number; v: Record<string, string> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input name={`mgmt_name_${i}`} defaultValue={v[`mgmt_name_${i}`]} placeholder={`${i}. Name / නම`} aria-label={`Management person ${i}: name`} className={input} />
      <input name={`mgmt_title_${i}`} defaultValue={v[`mgmt_title_${i}`]} placeholder="Title / නිලතල" aria-label={`Management person ${i}: title`} className={input} />
    </div>
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
  const more = (rows: number, from: number) => Array.from({ length: rows - from + 1 }, (_, k) => from + k);

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {state.message && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-5 text-base text-red-900">
          <p className="font-semibold">{state.message}</p>
          {state.errors && state.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
          <p className="mt-3 text-sm">Please re-attach your files. Typed answers were kept.</p>
          <p className="si text-sm" lang="si">කරුණාකර ඔබේ ගොනු නැවත අමුණන්න. ටයිප් කළ පිළිතුරු සුරැකී ඇත.</p>
        </div>
      )}

      {/* 1. Company & applicant */}
      <Card
        n={1}
        en="Company & applicant"
        si="සමාගම සහ ඉල්ලුම්කරු"
        noteEn="The HIS supplier code is assigned by the Procurement Division after review. You do not need to enter it."
        noteSi="HIS සැපයුම්කරු කේතය සමාලෝචනයෙන් පසු සපයා ගැනීම් අංශය විසින් ලබා දෙයි. ඔබට එය ඇතුළත් කිරීම අවශ්‍ය නැත."
      >
        <Text en="Name of company" si="ආයතනයේ නම" name="company_name" v={v} required className="md:col-span-2" />
        <Text en="Head office address" si="ප්‍රධාන කාර්යාලයේ ලිපිනය" name="head_office_address" v={v} required multiline />
        <Text en="Factory address" si="කර්මාන්තශාලාවේ ලිපිනය" name="factory_address" v={v} multiline />
        <Text en="Telephone" si="දුරකථන අංකය" name="telephone" v={v} required type="tel" />
        <Text en="Mobile" si="ජංගම දුරකථන අංකය" name="mobile" v={v} type="tel" />
        <Text en="Fax" si="ෆැක්ස් අංකය" name="fax" v={v} />
        <Text en="E-mail" si="ඊ-මේල් ලිපිනය" name="email" v={v} type="email" required />
        <Text en="Name of applicant (contact person)" si="ඉල්ලුම්කරුගේ නම (සම්බන්ධ කර ගත යුතු පුද්ගලයා)" name="contact_person" v={v} required />
        <Text en="Title" si="තනතුර" name="contact_title" v={v} />
        {company.map((f) => renderField(f, v))}
      </Card>

      {/* 2. Business profile */}
      <Card n={2} en="Business profile & personnel" si="ව්‍යාපාර පැතිකඩ සහ කාර්ය මණ්ඩලය">
        <fieldset className="space-y-3 md:col-span-2">
          <legend><Lbl en="You are a" si="ඔබ" required /></legend>
          <div className="flex flex-wrap gap-3">
            {NATURES.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-400 bg-white px-4 py-2.5 text-base text-zinc-900 has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50">
                <input type="radio" name="business_nature" value={o} required defaultChecked={v.business_nature === o} className="h-4 w-4 accent-sky-700" />
                <span className="capitalize">{o} <span className="si normal-case text-zinc-600" lang="si">/ {SI_NATURE[o]}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3 md:col-span-2">
          <legend><Lbl en="Categories of items / services (Form 03). Select all that apply." si="භාණ්ඩ / සේවා කාණ්ඩ (Form 03). අදාළ සියල්ල තෝරන්න." required /></legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {SUPPLIER_CATEGORIES.map((c) => (
              <label key={c} className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-300 bg-white p-3.5 text-zinc-900 transition-colors duration-150 hover:bg-zinc-50 has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50">
                <input type="checkbox" name="categories" value={c} defaultChecked={cats.includes(c)} className="mt-1 h-4 w-4 accent-sky-700" />
                <span>
                  <span className="block text-[15px] font-medium leading-snug">{c}</span>
                  <span className="si block text-sm text-zinc-600" lang="si">{SI_CATEGORY[c] ?? ''}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3 md:col-span-2">
          <legend><Lbl en="Description of items / services provided" si="සපයනු ලබන භාණ්ඩ / සේවා පිළිබඳ විස්තරය" /></legend>
          {Array.from({ length: SERVICE_LINES }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 text-right text-sm text-zinc-500">{i + 1}.</span>
              <input name={`service_${i + 1}`} defaultValue={v[`service_${i + 1}`]} aria-label={`Item or service ${i + 1}`} className={input} />
            </div>
          ))}
        </fieldset>

        <fieldset className="space-y-3 md:col-span-2">
          <legend>
            <Lbl
              en="Principal management personnel: names and titles (mark the person responsible for quality with *)"
              si="ප්‍රධාන කළමනාකාර මණ්ඩලයේ නම් සහ නිලතල (තත්ත්ව පාලනයට වගකිව යුතු නිළධාරියාගේ නමට * ලකුණක් යොදන්න)"
            />
          </legend>
          {[1, 2, 3, 4].map((i) => <MgmtRow key={i} i={i} v={v} />)}
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-sky-800 underline-offset-4 hover:underline">
              Add more people / තවත් අය එක් කරන්න
            </summary>
            <div className="mt-3 space-y-3">{more(MGMT_ROWS, 5).map((i) => <MgmtRow key={i} i={i} v={v} />)}</div>
          </details>
        </fieldset>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-300 bg-white p-3.5 md:col-span-2">
          <input type="checkbox" name="iso_9000" defaultChecked={v.iso_9000 === 'on'} className="mt-1 h-4 w-4 accent-sky-700" />
          <span>
            <span className="block text-[15px] font-semibold text-zinc-900">We hold a current ISO 9000 or other recognised quality registration (attach a copy)</span>
            <span className="si block text-sm text-zinc-600" lang="si">අපට දැනට වලංගු ISO 9000 හෝ වෙනත් පිළිගත් තත්ත්ව ප්‍රමිති ලියාපදිංචියක් ඇත (පිටපතක් අමුණන්න)</span>
          </span>
        </label>
        <Text en="ISO certificate / registration no." si="ISO සහතික / ලියාපදිංචි අංකය" name="iso_certificate_no" v={v} />
      </Card>

      {/* 3. Production & quality */}
      <Card n={3} en="Production & quality" si="නිෂ්පාදනය සහ තත්ත්වය">
        <Text en="What is your production capacity?" si="ඔබේ නිෂ්පාදන ධාරිතාවය කුමක්ද?" name="production_capacity" v={v} multiline className="md:col-span-2" />
        {production.map((f) => renderField(f, v))}
      </Card>

      {/* 4. Past experience */}
      <Card
        n={4}
        en="Record of past experience (Form 02)"
        si="පෙර අත්දැකීම් වාර්තාව (Form 02)"
        noteEn="Experience as supplier / manufacturer / agent / distributor in the last three years. Attach evidence if you can."
        noteSi="පසුගිය වසර තුන තුළ සැපයුම්කරු / නිෂ්පාදකයා / නියෝජිතයා / බෙදාහරින්නා ලෙස ලබාගත් අත්දැකීම්. හැකි නම් සාක්ෂි අමුණන්න."
      >
        <div className="space-y-3 md:col-span-2">
          <div className="hidden gap-2 text-sm font-semibold text-zinc-700 sm:grid sm:grid-cols-[32px_1fr_190px_160px]">
            <span /><span>Name of company / සමාගමේ නම</span><span>Contact no. / දුරකථන අංකය</span><span>Period / කාල පරිච්ඡේදය</span>
          </div>
          {[1, 2, 3, 4, 5].map((i) => <PastRow key={i} i={i} v={v} />)}
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-sky-800 underline-offset-4 hover:underline">
              Add more rows / තවත් පේළි එක් කරන්න
            </summary>
            <div className="mt-3 space-y-3">{more(PAST_ROWS, 6).map((i) => <PastRow key={i} i={i} v={v} />)}</div>
          </details>
        </div>
      </Card>

      {/* 5. Pre-qualification fee */}
      <Card
        n={5}
        en="Pre-qualification fee"
        si="පූර්ව සුදුසුකම් ගාස්තුව"
        noteEn="Non-refundable deposit for pre-qualification."
        noteSi="පූර්ව සුදුසුකම් සඳහා ආපසු නොගෙවන තැන්පතුව."
      >
        <Text en="Cash receipt number" si="මුදල් රිසිට්පතේ අංකය" name="deposit_receipt_no" v={v} />
        <Text en="Amount (LKR)" si="මුදල (රු.)" name="deposit_amount" v={v} type="number" />
        <Text en="Supplier maintains prices up to" si="මිල ගණන් පවත්වා ගන්නා අවසන් දිනය" name="price_validity_until" v={v} type="date" />
      </Card>

      {/* 6. Price list */}
      <section className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">6. Price list (Form 04)</h2>
            <p className="si text-base font-semibold text-zinc-700" lang="si">මිල ලැයිස්තුව (Form 04)</p>
            <div className="mt-2">
              <Hint
                en="Type each item here, or upload your price list as Excel, CSV, Word or PDF. You can do both."
                si="එක් එක් අයිතමය මෙහි ටයිප් කරන්න, නැතහොත් ඔබේ මිල ලැයිස්තුව Excel, CSV, Word හෝ PDF ලෙස උඩුගත කරන්න. දෙකම කළ හැක."
              />
            </div>
          </div>
          <button type="button" onClick={addItem} className={smallBtn}>+ Add row / පේළියක් එක් කරන්න</button>
        </div>

        <div className="mt-6 space-y-3">
          <div className="hidden gap-2 text-sm font-semibold text-zinc-700 sm:grid sm:grid-cols-[32px_1fr_130px_100px_140px_90px]">
            <span /><span>Item / අයිතමය</span><span>HIS code / HIS කේතය</span><span>Unit / ඒකකය</span><span>Price LKR / මිල (රු.)</span><span />
          </div>
          {items.map((it, idx) => (
            <div key={it.key} className="grid gap-2 sm:grid-cols-[32px_1fr_130px_100px_140px_90px] sm:items-center">
              <span className="hidden text-right text-sm text-zinc-500 sm:block">{idx + 1}.</span>
              <input value={it.description} onChange={(e) => updateItem(it.key, { description: e.target.value })} placeholder="Item description / අයිතමයේ විස්තරය" aria-label={`Item ${idx + 1}: description`} className={input} />
              <input value={it.his_item_code} onChange={(e) => updateItem(it.key, { his_item_code: e.target.value })} placeholder="HIS code / කේතය" aria-label={`Item ${idx + 1}: HIS code`} className={`${input} font-mono`} />
              <input value={it.unit} onChange={(e) => updateItem(it.key, { unit: e.target.value })} placeholder="Unit / ඒකකය" aria-label={`Item ${idx + 1}: unit`} className={input} />
              <input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => updateItem(it.key, { unit_price: e.target.value })} placeholder="Price / මිල" aria-label={`Item ${idx + 1}: price in LKR`} className={`${input} sm:text-right`} />
              <button type="button" onClick={() => removeItem(it.key)} aria-label={`Remove row ${idx + 1}`} className="press rounded-xl px-2 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20">
                Remove <span className="si" lang="si">/ ඉවත් කරන්න</span>
              </button>
            </div>
          ))}
        </div>
        <input type="hidden" name="items_json" value={itemsJson} />

        <label className="mt-7 block space-y-2">
          <Lbl en="Price list file (optional): Excel / CSV / Word / PDF" si="මිල ලැයිස්තු ගොනුව (අත්‍යවශ්‍ය නොවේ): Excel / CSV / Word / PDF" />
          <input type="file" name="doc_price_list" accept=".xlsx,.xls,.csv,.docx,.doc,.pdf" className={fileCls} />
          <Hint
            en="Excel or CSV columns: Item Code, Description, Unit, Price. Excel rows are added to the items above."
            si="Excel හෝ CSV තීරු: Item Code, Description, Unit, Price. Excel පේළි ඉහත අයිතම වලට එකතු වේ."
          />
        </label>
      </section>

      {/* 7. Documents */}
      <section className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">7. Supporting documents</h2>
        <p className="si text-base font-semibold text-zinc-700" lang="si">අනුබද්ධ ලේඛන</p>
        <div className="mt-2"><Hint en="PDF, JPG, PNG or WEBP. Maximum 10 MB per file." si="PDF, JPG, PNG හෝ WEBP. ගොනුවකට උපරිම 10 MB." /></div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <label className="block space-y-2"><Lbl en="Business registration / Certificate of incorporation" si="ව්‍යාපාර ලියාපදිංචි සහතිකය / සංස්ථාගත කිරීමේ සහතිකය" required />
            <input type="file" name="doc_business_registration" required accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} /></label>
          <label className="block space-y-2"><Lbl en="VAT registration certificate" si="VAT ලියාපදිංචි සහතිකය" />
            <input type="file" name="doc_vat_certificate" accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} /></label>
          <label className="block space-y-2"><Lbl en="ISO certificate" si="ISO සහතිකය" />
            <input type="file" name="doc_iso_certificate" accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} /></label>
          <label className="block space-y-2"><Lbl en="Deposit receipt" si="තැන්පතු රිසිට්පත" />
            <input type="file" name="doc_deposit_receipt" accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} /></label>
          <label className="block space-y-2 md:col-span-2"><Lbl en="Signed application forms (scanned, up to 5 files)" si="අත්සන් කළ ඉල්ලුම්පත්‍ර (ස්කෑන් කළ, ගොනු 5ක් දක්වා)" />
            <input type="file" name="doc_signed_forms" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} /></label>
          <label className="block space-y-2 md:col-span-2"><Lbl en="Past experience evidence / list of current customers (up to 5 files)" si="පෙර අත්දැකීම් සාක්ෂි / වත්මන් ගනුදෙනුකරුවන්ගේ ලැයිස්තුව (ගොනු 5ක් දක්වා)" />
            <input type="file" name="doc_past_experience" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} /></label>
        </div>
      </section>

      {/* 8. Completion & declaration */}
      <Card n={8} en="Completion & declaration" si="සම්පූර්ණ කිරීම සහ ප්‍රකාශය">
        {declaration.map((f) => renderField(f, v))}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-300 bg-white p-4 md:col-span-2">
          <input type="checkbox" name="declaration" required defaultChecked={v.declaration === 'on'} className="mt-1 h-4 w-4 accent-sky-700" />
          <span>
            <span className="block text-[15px] leading-snug text-zinc-900">
              We declare that the information provided is true and accurate to the best of our knowledge. We understand that Nawaloka Medical Centre may accept or reject any application, and may discontinue the services of any supplier.
              <span className="text-red-600" aria-hidden="true"> *</span>
            </span>
            <span className="si mt-1 block text-sm text-zinc-600" lang="si">
              අප විසින් සපයා ඇති තොරතුරු අපගේ දැනුම අනුව සත්‍ය සහ නිවැරදි බව අපි ප්‍රකාශ කරමු. නවලෝක මෙඩිකල් සෙන්ටර් ආයතනයට ඕනෑම ඉල්ලුම්පත්‍රයක් පිළිගැනීමට හෝ ප්‍රතික්ෂේප කිරීමට සහ ඕනෑම සැපයුම්කරුවෙකුගේ සේවාව නවත්වා දැමීමට අයිතියක් ඇති බව අපි තේරුම් ගනිමු.
            </span>
          </span>
        </label>
      </Card>

      <div className="flex justify-end pb-6">
        <button
          type="submit"
          disabled={pending}
          className="press rounded-2xl bg-slate-900 px-8 py-4 text-left text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-600/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="block text-lg font-bold leading-tight">{pending ? 'Submitting…' : 'Submit application'}</span>
          <span className="si block text-sm" lang="si">{pending ? 'ඉදිරිපත් කරමින්…' : 'ඉල්ලුම්පත්‍රය ඉදිරිපත් කරන්න'}</span>
        </button>
      </div>
    </form>
  );
}
