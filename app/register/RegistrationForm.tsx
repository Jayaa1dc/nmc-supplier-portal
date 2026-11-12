'use client';

import { useActionState, useState, type ChangeEvent, type ReactNode } from 'react';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { SI_CATEGORY } from '@/lib/i18n';
import { submitRegistration, type RegistrationState } from './actions';

/*
 * This form is a page-by-page copy of the NMC paper forms:
 *   44/FO/KM/02  Supplier Questionnaire - Local (2 pages)
 *   44/FO/MC/GN/01  Pre-Qualification Application Form
 *   Form 01 Application for Pre-Qualification, Form 02 Record of Past Experience,
 *   Form 03 Registration of Suppliers / Contractors, Form 04 Item / Category / Price.
 * English wording is as printed on the paper forms. Sinhala is as printed on the questionnaire;
 * Sinhala lines on the other pages are added helper translations.
 */

const initial: RegistrationState = { ok: false };
type Change = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

const input =
  'w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 transition-[border-color,box-shadow] duration-150 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-600/15';
const fileCls =
  'block w-full text-sm text-zinc-800 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white';
const choice =
  'flex cursor-pointer items-center gap-2.5 rounded-lg border border-zinc-400 bg-white px-4 py-2.5 text-base text-zinc-900 has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50';

function Lbl({ en, si, req }: { en: string; si?: string; req?: boolean }) {
  return (
    <span className="block">
      <span className="block font-serif text-[15px] font-bold leading-snug text-zinc-900">
        {en}
        {req && <span className="text-red-600" aria-hidden="true"> *</span>}
      </span>
      {si && <span className="si block text-sm text-zinc-600" lang="si">{si}</span>}
    </span>
  );
}

function Fld({ name, v, req, type = 'text', onChange, ph }: { name: string; v: Record<string, string>; req?: boolean; type?: string; onChange?: (e: Change) => void; ph?: string }) {
  return <input name={name} type={type} required={req} defaultValue={v[name]} onChange={onChange} placeholder={ph} className={input} />;
}
function Area({ name, v, rows = 3, req, onChange }: { name: string; v: Record<string, string>; rows?: number; req?: boolean; onChange?: (e: Change) => void }) {
  return <textarea name={name} rows={rows} required={req} defaultValue={v[name]} onChange={onChange} className={input} />;
}

/** A value copied from another page of the paper form (typed once, shown again here) */
function Mirror({ value, hint = 'Filled in from page 1' }: { value: string; hint?: string }) {
  return (
    <div className="min-h-[2.75rem] whitespace-pre-line rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-base text-zinc-800">
      {value || <span className="text-zinc-400">{hint}</span>}
    </div>
  );
}

/** Label on the left, field on the right, like the ruled lines on the paper form */
function Row({ en, si, req, children }: { en: ReactNode; si?: string; req?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 md:grid-cols-[17rem_1fr] md:items-start md:gap-4">
      <div>
        <span className="block font-serif text-[15px] font-bold leading-snug text-zinc-900">
          {en}
          {req && <span className="text-red-600" aria-hidden="true"> *</span>}
        </span>
        {si && <span className="si block text-sm text-zinc-600" lang="si">{si}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Paper({ id, formNo, page, logo, address, children }: { id: string; formNo: string; page: string; logo?: boolean; address?: boolean; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-zinc-300 bg-white p-5 shadow-sm md:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-300 pb-4">
        {logo ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nmc-emblem.png" alt="Nawaloka Medical Centre" className="h-14 w-auto" />
            <div>
              <p className="font-serif text-xl font-bold tracking-wide text-zinc-900 md:text-2xl">NAWALOKA MEDICAL CENTRE</p>
              {address && (
                <p className="text-xs leading-snug text-zinc-700">
                  No. 23, Deshamanya H K Dharmadasa Mawatha, Colombo 02, Sri Lanka<br />
                  General Tel.: 5577111 &nbsp; Fax: 2305051<br />
                  Email: padma@nawaloka.com
                </p>
              )}
            </div>
          </div>
        ) : (
          <div />
        )}
        <div className="shrink-0 text-right font-serif">
          <p className="font-bold text-zinc-900">{formNo}</p>
          <p className="text-sm font-bold text-zinc-900">{page}</p>
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

const Title = ({ en, si, small }: { en: string; si?: string; small?: boolean }) => (
  <div className="text-center">
    <h2 className={`font-serif font-bold text-zinc-900 ${small ? 'text-xl' : 'text-2xl underline underline-offset-4'}`}>{en}</h2>
    {si && <p className="si text-base text-zinc-700" lang="si">{si}</p>}
  </div>
);

const Block = ({ children }: { children: ReactNode }) => <div className="rounded-lg border border-zinc-300 p-4">{children}</div>;

// ---- text exactly as printed ----
const PAPER_CATS = [
  'Hardware, Stainless Steel, Plumbing & Paints',
  'Electronics',
  'Electrical',
  'Stationery & Related Consumables',
  'All kinds of Hospital & Other furniture',
  'Computers, Printers, Spares & Related Accessories',
  'Air Conditioning Equipments & Spares',
  'Motor Spare Parts (Tyres, Batteries, Oil & Lubricants)',
  'Cleaning materials and related accessories',
  'Clothing materials and tailoring services',
  'Medical Equipments/ Electrometrical/Dental Equipments /spares & accessories',
  'Consumable items for CT Scanning, MRI Scanning, X Ray machinery',
  'Mattress & Plastic Products',
  'Sign Boards and Advertising Materials',
  'Laboratory Equipments & Chemicals',
  'Printing',
];

const QUESTIONS: { name: string; en: string; si: string }[] = [
  { name: 'production_capacity', en: 'What is your production capacity?', si: 'ඔබගේ නිෂ්පාදන ධාරිතාවය කුමක්ද?' },
  { name: 'production_controls', en: 'How do you exercise production controls?', si: 'නිෂ්පාදන ක්‍රියාදාම කෙසේ පාලනය වේද?' },
  { name: 'defect_segregation', en: 'How do you identify and segregate defective material?', si: 'නුසුදුසු ද්‍රව්‍ය කෙසේ හඳුනා ගෙන වෙන් කෙරේද?' },
  { name: 'quality_records', en: 'Are all quality records maintained?', si: 'සෑම තත්ත්ව වාර්තාවක්ම ඔබ තබා ගන්නේද?' },
  { name: 'inspection_types', en: 'What types of inspections do you carry out on your products (100%, batch, first off, last off, none) - please specify:', si: 'ඔබේ සැපයීම සඳහා කුමන වර්ගයේ පරීක්ෂා සිදු කරන්නේද? (100 කාණ්ඩ වශයෙන්, පළමු ද්‍රව්‍ය, අවසාන ද්‍රව්‍ය, කිසිවක් නොවේ නම් සඳහන් කරන්න.' },
  { name: 'incoming_inspection', en: 'Do you inspect your incoming materials?', si: 'ඔබ භාවිතා කරන අමුද්‍රව්‍ය පරීක්ෂා කරන්නේද?' },
  { name: 'packing', en: 'Do you ensure proper packing after production, to prevent deterioration?', si: 'ද්‍රව්‍යයේ ආරක්ෂාව පිළිබඳව ඇසුරුම්කරණයේදී ඔබ සැලකිලිමත් වනවාද?' },
  { name: 'factory_visit', en: 'If necessary is a factory visit possible?', si: 'අවශ්‍ය නම් ඔබගේ කර්මාන්තශාලාවට පැමිණිය හැකිද?' },
];

const NAV: [string, string][] = [
  ['q1', 'Questionnaire 1'], ['q2', 'Questionnaire 2'], ['pq', 'Pre-Qualification Application'], ['f1', 'Form 01'],
  ['f2', 'Form 02'], ['f3', 'Form 03'], ['f4', 'Form 04'],
];

export default function RegistrationForm() {
  const [state, formAction, pending] = useActionState(submitRegistration, initial);
  const v = state.values ?? {};
  const [core, setCore] = useState({ company: v.company_name ?? '', address: v.head_office_address ?? '', tel: v.telephone ?? '', mobile: v.mobile ?? '', fax: v.fax ?? '', email: v.email ?? '', sign: v.applicant_signature ?? '' });
  const [cats, setCats] = useState<string[]>(state.categories ?? []);
  const on = (k: keyof typeof core) => (e: Change) => setCore((c) => ({ ...c, [k]: e.target.value }));
  const toggleCat = (value: string, checked: boolean) => setCats((p) => (checked ? [...p, value] : p.filter((x) => x !== value)));
  const catText = SUPPLIER_CATEGORIES.map((c, i) => (cats.includes(c) ? `${i + 1}. ${PAPER_CATS[i]}` : '')).filter(Boolean).join('\n');

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <nav aria-label="Pages of the form" className="flex flex-wrap gap-2 text-sm">
        {NAV.map(([id, label], i) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-800 hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-600/20">
            {i + 1}. {label}
          </a>
        ))}
      </nav>

      {state.message && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-5 text-base text-red-900">
          <p className="font-semibold">{state.message}</p>
          {state.errors && state.errors.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <p className="mt-3 text-sm">Please re-attach your files. Typed answers were kept.</p>
          <p className="si text-sm" lang="si">කරුණාකර ඔබේ ගොනු නැවත අමුණන්න. ටයිප් කළ පිළිතුරු සුරැකී ඇත.</p>
        </div>
      )}

      {/* ===================== 44/FO/KM/02 page 1 ===================== */}
      <Paper id="q1" formNo="44/FO/KM/02" page="Page 1 of 2" logo>
        <div className="text-center">
          <h2 className="font-serif text-xl font-bold text-zinc-900">SUPPLIER QUESTIONNAIRE - LOCAL</h2>
          <p className="si text-base text-zinc-800" lang="si">සැපයුම්කරුවන් සඳහා ප්‍රශ්නාවලිය - දේශීය</p>
        </div>
        <div className="rounded-lg border-2 border-zinc-800 p-3 text-center font-serif font-bold text-zinc-900">
          This questionnaire is for the use of our Supplies Division only and all information will be treated in strict confidence.
          <span className="si block font-bold" lang="si">පහත සඳහන් ප්‍රශ්නාවලිය අප මිලදී ගැනීම් දෙපාර්තුමේන්තුව සඳහා වන අතර තොරතුරු සියල්ල රහසිගතයි</span>
        </div>

        <Block>
          <label className="block space-y-1.5">
            <Lbl en="Name of Company" si="ආයතනයේ නම :" req />
            <Fld name="company_name" v={v} req onChange={on('company')} />
          </label>
        </Block>

        <Block>
          <Lbl en="Address" si="ලිපිනය:" />
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5"><Lbl en="Head Office" si="ප්‍රධාන කාර්යාලය" req /><Area name="head_office_address" v={v} req onChange={on('address')} /></label>
            <label className="block space-y-1.5"><Lbl en="Factory" si="කර්මාන්තශාලාව" /><Area name="factory_address" v={v} /></label>
            <label className="block space-y-1.5"><Lbl en="Telephone No:" si="දුරකථන අංකය:" req /><Fld name="telephone" v={v} req type="tel" onChange={on('tel')} /></label>
            <label className="block space-y-1.5"><Lbl en="Telephone No:" si="දුරකථන අංකය:" /><Fld name="telephone_factory" v={v} type="tel" /></label>
            <label className="block space-y-1.5"><Lbl en="Email No :" si="ඊ-මේල් අංකය :" req /><Fld name="email" v={v} req type="email" onChange={on('email')} /></label>
            <label className="block space-y-1.5"><Lbl en="Fax No :" si="ෆැක්ස් අංකය:" /><Fld name="fax" v={v} onChange={on('fax')} /></label>
          </div>
        </Block>

        <Block>
          <Lbl en="Description of Items / Services Provided" si="සේවා හා සැපයුම් පිළිබඳ විස්තර" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 text-right font-serif font-bold text-zinc-800">{i + 1}.</span>
                <input name={`service_${i + 1}`} defaultValue={v[`service_${i + 1}`]} aria-label={`Item or service ${i + 1}`} className={input} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-zinc-800">
            &bull; If space is inadequate use extra piece of paper <span className="si font-normal" lang="si">ප්‍රමාණවත් නොවේ නම් තව පිටුවක් අමුණන්න</span>
          </p>
        </Block>

        <Block>
          <fieldset>
            <legend><Lbl en="You are a" si="ඔබ" req /></legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([['manufacturer', 'Manufacturer', 'නිෂ්පාදකයෙක්'], ['wholesaler', 'Wholesaler', 'තොග වෙළෙන්දෙක්'], ['stockist', 'Stockist', 'ගබඩා කරුවෙක්'], ['retailer', 'Retailer', 'කුඩා පරිමාණ වෙළෙන්දෙක්']] as const).map(([val, en, si]) => (
                <label key={val} className={choice}>
                  <input type="radio" name="business_nature" value={val} required defaultChecked={v.business_nature === val} className="h-4 w-4 accent-sky-700" />
                  <span><span className="block font-serif font-bold">{en}</span><span className="si block text-sm text-zinc-700" lang="si">{si}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
        </Block>

        <Block>
          <Lbl en="Names and Titles of Principal Management Personnel Place an Asteric for person responsible for Quality:" si="ප්‍රධාන කළමනාකාර මඩුල්ලේ නම් සහ නිලතල තත්ත්ව පාලනය සඳහා වග කියන නිළධාරියාගේ ඉදිරියෙන් තරුවක් තබන්න" />
          <div className="mt-3 hidden gap-3 text-center font-serif font-bold md:grid md:grid-cols-[2rem_1fr_1fr]">
            <span /><span>Names <span className="si font-normal" lang="si">නම්</span></span><span>Titles <span className="si font-normal" lang="si">නිලතල</span></span>
          </div>
          <div className="mt-2 space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[2rem_1fr_1fr] md:items-center">
                <span className="hidden text-right font-serif font-bold text-zinc-800 md:block">{i + 1}.</span>
                <input name={`mgmt_name_${i + 1}`} defaultValue={v[`mgmt_name_${i + 1}`]} placeholder={`${i + 1}. Name / නම`} aria-label={`Person ${i + 1} name`} className={input} />
                <input name={`mgmt_title_${i + 1}`} defaultValue={v[`mgmt_title_${i + 1}`]} placeholder="Title / නිලතල" aria-label={`Person ${i + 1} title`} className={input} />
              </div>
            ))}
          </div>
        </Block>

        <Block>
          <Lbl en="Do you have a current registration in accordance with ISO 9000 or any other recognized Quality Standards?" si="ඔබ දැනට ISO 9000 හෝ වෙනත් පිළිගත හැකි තත්ත්ව ප්‍රතිපත්තියක් සඳහා ලියාපදිංචිවී ඇත්ද?" />
          <div className="mt-3 flex flex-wrap gap-3">
            {([['yes', 'YES', 'ඔව්'], ['no', 'NO', 'නැත']] as const).map(([val, en, si]) => (
              <label key={val} className={choice}>
                <input type="radio" name="iso_registered" value={val} defaultChecked={v.iso_registered === val} className="h-4 w-4 accent-sky-700" />
                <span className="font-serif font-bold">{en} <span className="si font-normal" lang="si">{si}</span></span>
              </label>
            ))}
          </div>
        </Block>

        <Block>
          <label className="block space-y-2">
            <Lbl en="If so could you please let us have a copy of your registration certificate-showing details of the scope of registration." si="එසේ නම් අපේ දැන ගැනීම සඳහා ඔබගේ ලියා පදිංචි හා විස්තර අඩංගු ඡායා පිටපතක් අමුණන්න" />
            <input type="file" name="doc_iso_certificate" accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} />
          </label>
        </Block>
      </Paper>

      {/* ===================== 44/FO/KM/02 page 2 ===================== */}
      <Paper id="q2" formNo="44/FO/KM/02" page="Page 2 of 2" logo>
        {QUESTIONS.map((q) => (
          <Block key={q.name}>
            <label className="block space-y-2">
              <Lbl en={q.en} si={q.si} />
              <Area name={q.name} v={v} rows={q.name === 'inspection_types' || q.name === 'production_capacity' ? 4 : 3} />
            </label>
          </Block>
        ))}
        <Block>
          <label className="block space-y-2">
            <Lbl en="*Please attach a list of your current customers to this format" si="ඔබගේ වත්මන් ගනුදෙනුකරුවන්ගේ ලැයිස්තුවක් මෙයට අමුණන්න" />
            <input type="file" name="doc_past_experience" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} />
          </label>
        </Block>
        <Block>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-1.5"><Lbl en="Questionnaire completed by :" si="ප්‍රශ්නාවලිය සම්පූර්ණ කරන ලද්දේ" /><Fld name="completed_by" v={v} /></label>
            <label className="block space-y-1.5"><Lbl en="Position" si="තත්ත්වය" /><Fld name="completed_position" v={v} /></label>
            <label className="block space-y-1.5"><Lbl en="Date of completion" si="සම්පූර්ණ කල දිනය" /><Fld name="completed_date" v={v} type="date" /></label>
          </div>
        </Block>
      </Paper>

      {/* ===================== 44/FO/MC/GN/01 ===================== */}
      <Paper id="pq" formNo="44/FO/MC/GN/01" page="Page 01 of 05" logo address>
        <Title en="PRE-QUALIFICATION APPLICATION FORM" si="පූර්ව සුදුසුකම් ඉල්ලුම්පත්‍ර" />
        <div className="space-y-4">
          <Row en="Issued to (Name of Company)" si="නිකුත් කරන ලද්දේ (ආයතනයේ නම)"><Mirror value={core.company} /></Row>
          <Row en="Address" si="ලිපිනය"><Mirror value={core.address} /></Row>
          <Row en="Telephone Number/s" si="දුරකථන අංක"><Mirror value={core.tel} /></Row>
          <Row en="Mobile Number/s" si="ජංගම දුරකථන අංක"><Fld name="mobile" v={v} type="tel" onChange={on('mobile')} /></Row>
          <Row en="Fax Number/s" si="ෆැක්ස් අංක"><Mirror value={core.fax} /></Row>
          <Row en="E-mail Address" si="ඊ-මේල් ලිපිනය"><Mirror value={core.email} /></Row>
          <Row en="Categories" si="කාණ්ඩ"><Mirror value={catText} hint="Tick your categories on Form 03" /></Row>
          <Row en="Amount" si="මුදල"><Fld name="deposit_amount" v={v} ph="e.g. 500.00" /></Row>
          <Row en="Cash Receipt Number" si="මුදල් රිසිට්පතේ අංකය"><Fld name="deposit_receipt_no" v={v} /></Row>
        </div>

        <div className="space-y-3 font-serif text-[15px] text-zinc-900">
          <p className="font-bold">The following documents are to be forwarded on or before ................................. to reach the Medical Centre...............................</p>
          <ol className="list-[lower-alpha] space-y-4 pl-8">
            <li>Duly completed application form for pre-qualification Form 1.</li>
            <li>Duly completed record of past performances Form II.</li>
            <li>List of the Items/Services which can be provided as perform III</li>
            <li>
              <label className="block space-y-2">
                <span>Certified copy of the Certificate of Registration of Incorporation <span className="font-sans text-red-600" aria-hidden="true">*</span></span>
                <input type="file" name="doc_business_registration" required accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} />
              </label>
            </li>
            <li>
              <label className="block space-y-2">
                <span>A copy of the receipt issued for the payment of non-refundable deposit/s.</span>
                <input type="file" name="doc_deposit_receipt" accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} />
              </label>
            </li>
            <li>
              <label className="block space-y-2">
                <span>Supplier has to maintain his prices given for the period up to</span>
                <Fld name="price_validity_until" v={v} type="date" />
              </label>
            </li>
            <li>
              <label className="block space-y-2">
                <span>Immediate delivery as and when required to Nawaloka Medical Centre</span>
                <Fld name="delivery_note" v={v} />
              </label>
            </li>
            <li>Hospital has the authority to discontinue the services of any supplier.</li>
          </ol>
        </div>
        <Row en="Signature" si="අත්සන"><Mirror value={core.sign} hint="Type your name under “Signature of Applicant” on Form 01" /></Row>
      </Paper>

      {/* ===================== Form 01 ===================== */}
      <Paper id="f1" formNo="Form: 01" page="Page 02 of 05">
        <Title en="APPLICATION FOR PRE-QUALIFICATION" si="පූර්ව සුදුසුකම් සඳහා ඉල්ලුම්පත්‍රය" small />
        <div className="space-y-4">
          <Row en="Intended Category" si="අපේක්ෂිත කාණ්ඩය"><Fld name="intended_category" v={v} /></Row>
          <Row en="Name of Applicant" si="ඉල්ලුම්කරුගේ නම" req><Fld name="contact_person" v={v} req /></Row>
          <Row en="Address" si="ලිපිනය"><Mirror value={core.address} /></Row>
          <Row en="Telephone Number/s" si="දුරකථන අංක"><Mirror value={core.tel} /></Row>
          <Row en="Mobile Number/s" si="ජංගම දුරකථන අංක"><Mirror value={core.mobile} hint="Filled in from the Pre-Qualification Application Form" /></Row>
          <Row en="Fax Number/s" si="ෆැක්ස් අංක"><Mirror value={core.fax} /></Row>
          <Row en="E-mail Address" si="ඊ-මේල් ලිපිනය"><Mirror value={core.email} /></Row>
          <Row en="Business Registration No." si="ව්‍යාපාර ලියාපදිංචි අංකය"><Fld name="business_reg_no" v={v} /></Row>
          <Row en="Nature of Business" si="ව්‍යාපාරයේ ස්වභාවය"><Fld name="nature_of_business" v={v} /></Row>
          <Row en="Principle Line of Business" si="ප්‍රධාන ව්‍යාපාරික අංශය"><Fld name="principal_line_of_business" v={v} /></Row>
          <Row en="If the Applicant is a Ltd Liability Co." si="ඉල්ලුම්කරු සීමිත වගකීම් සහිත සමාගමක් නම්"><Fld name="ltd_company" v={v} /></Row>
          <Row en="Names of Directors" si="අධ්‍යක්ෂවරුන්ගේ නම්"><Area name="ltd_directors" v={v} rows={2} /></Row>
          <Row en="If the Applicant is a Partnership Names of Partners" si="හවුල් ව්‍යාපාරයක් නම් හවුල්කරුවන්ගේ නම්"><Area name="partners" v={v} rows={2} /></Row>
          <Row en="Names of Bankers" si="බැංකුවල නම්"><Fld name="bankers" v={v} /></Row>
          <Row en="Have you registered for VAT?" si="ඔබ VAT සඳහා ලියාපදිංචි වී තිබේද?">
            <div className="flex flex-wrap gap-3">
              {(['yes', 'no'] as const).map((val) => (
                <label key={val} className={choice}>
                  <input type="radio" name="vat_registered" value={val} defaultChecked={v.vat_registered === val} className="h-4 w-4 accent-sky-700" />
                  <span className="font-serif font-bold">{val.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </Row>
          <Row en="If Registered, Please attach VAT Certificate." si="ලියාපදිංචි නම් VAT සහතිකය අමුණන්න">
            <input type="file" name="doc_vat_certificate" accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} />
          </Row>
          <Row en="Credit Period" si="ණය කාලසීමාව"><Fld name="credit_period" v={v} /></Row>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-400 p-4">
          <input type="checkbox" name="declaration" required defaultChecked={v.declaration === 'on'} className="mt-1 h-4 w-4 accent-sky-700" />
          <span>
            <span className="block font-serif text-[15px] text-zinc-900"><b>DECLARATION:</b> We / I hereby declare that the information provided by us/me above is true and accurate to the best of our/my knowledge. <span className="font-sans text-red-600" aria-hidden="true">*</span></span>
            <span className="si block text-sm text-zinc-600" lang="si">ප්‍රකාශය: අප / මා විසින් ඉහත සපයා ඇති තොරතුරු අපගේ / මගේ දැනුම අනුව සත්‍ය සහ නිවැරදි බව අපි / මම ප්‍රකාශ කරමු.</span>
          </span>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1.5"><Lbl en="Date:" si="දිනය" /><Fld name="form_date" v={v} type="date" /></label>
          <label className="block space-y-1.5"><Lbl en="Signature of Applicant" si="ඉල්ලුම්කරුගේ අත්සන (ඔබේ නම ටයිප් කරන්න)" /><Fld name="applicant_signature" v={v} onChange={on('sign')} ph="Type your full name" /></label>
        </div>
      </Paper>

      {/* ===================== Form 02 ===================== */}
      <Paper id="f2" formNo="Form 02" page="Page 03 of 05">
        <Title en="RECORD OF PAST EXPERIENCE" si="පෙර අත්දැකීම් වාර්තාව" small />
        <p className="font-serif text-[15px] font-bold text-zinc-900">
          Following experience are listed as the Supplier / Manufacturer / Agent / Distributor During the last three years. (Please add the Documentary evidence if necessary).
        </p>
        <div className="hidden gap-2 font-serif font-bold text-zinc-900 md:grid md:grid-cols-[3rem_1fr_13rem_10rem]">
          <span className="text-center">S/N</span><span>NAME OF COMPANY</span><span>CONTACT NO.</span><span>PERIOD</span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[3rem_1fr_13rem_10rem] md:items-center">
              <span className="hidden text-center font-serif font-bold text-zinc-800 md:block">{i + 1}</span>
              <input name={`past_company_${i + 1}`} defaultValue={v[`past_company_${i + 1}`]} placeholder={`${i + 1}. Name of company`} aria-label={`Experience ${i + 1}: company`} className={input} />
              <input name={`past_contact_${i + 1}`} defaultValue={v[`past_contact_${i + 1}`]} placeholder="Contact no." aria-label={`Experience ${i + 1}: contact number`} className={input} />
              <input name={`past_period_${i + 1}`} defaultValue={v[`past_period_${i + 1}`]} placeholder="Period" aria-label={`Experience ${i + 1}: period`} className={input} />
            </div>
          ))}
        </div>
        <label className="block space-y-2">
          <Lbl en="Documentary evidence (if necessary)" si="ලේඛන සාක්ෂි (අවශ්‍ය නම්)" />
          <input type="file" name="doc_past_experience" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} />
        </label>
        <p className="text-center font-serif font-bold text-zinc-900">NAWALOKA MEDICAL CENTRE</p>
      </Paper>

      {/* ===================== Form 03 ===================== */}
      <Paper id="f3" formNo="Form 03" page="Page 04 of 05">
        <div className="space-y-3 font-serif text-[15px] font-bold text-zinc-900">
          <p>REGISTRATION OF SUPPLIERS / CONTRACTORS – ...............................</p>
          <p>Applications are hereby invited from Recognized Suppliers/Contractors who wish to register as Suppliers / Contractors for the following goods and services of Nawaloka Medical Centre , 23, Deshamanya H.K.Dharmadasa Mawatha , Colombo 02, for the Year ......................</p>
        </div>
        <fieldset>
          <legend><Lbl en="ITEMS / CATEGORY" si="අයිතම / කාණ්ඩ (අදාළ සියල්ල තෝරන්න)" req /></legend>
          <div className="mt-3 grid gap-2.5">
            {SUPPLIER_CATEGORIES.map((c, i) => (
              <label key={c} className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-300 p-3 text-zinc-900 has-[:checked]:border-sky-600 has-[:checked]:bg-sky-50">
                <input type="checkbox" name="categories" value={c} defaultChecked={(state.categories ?? []).includes(c)} onChange={(e) => toggleCat(c, e.target.checked)} className="mt-1 h-4 w-4 accent-sky-700" />
                <span>
                  <span className="block font-serif text-[15px] font-bold">{i + 1}. {PAPER_CATS[i]}</span>
                  <span className="si block text-sm text-zinc-600" lang="si">{SI_CATEGORY[c] ?? ''}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-3 font-serif text-[15px] font-bold text-zinc-900">
          <p>Applications could be obtained from the Medical Centre on payment of a non-refundable fee of Rs.500.00 per item Category.</p>
          <p>Applications indicating &ldquo;Registration of Suppliers/Contractors – ...................&rdquo; on the top left hand corner of the envelopes should be submitted to the under mentioned address on or before ...................................</p>
          <p>Please note that late submissions will not be entertained.<br />However, the Nawaloka Medical Centre has the right to accept or reject any or all applications without notifying any reason whatsoever.</p>
          <p className="text-center">A/Manageress Accounts<br />Nawaloka Medical Centre<br />No.23, Deshamanya H.K.Dharmadasa Mawatha<br />Colombo 02</p>
        </div>
      </Paper>

      {/* ===================== Form 04 ===================== */}
      <Paper id="f4" formNo="Form 04" page="Page 05 of 05">
        <div className="hidden gap-2 border-b-2 border-zinc-800 pb-2 font-serif font-bold text-zinc-900 md:grid md:grid-cols-[3rem_1fr_1fr_11rem]">
          <span /><span>ITEM / CATEGORY</span><span>ITEM</span><span>PRICE</span>
        </div>
        <p className="si -mt-3 text-sm text-zinc-600" lang="si">අයිතමය / කාණ්ඩය · අයිතමය · මිල (රු.)</p>
        <div className="space-y-2">
          {Array.from({ length: 26 }, (_, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[3rem_1fr_1fr_11rem] md:items-center">
              <span className="hidden text-center font-serif text-sm text-zinc-500 md:block">{i + 1}</span>
              <input name={`price_category_${i + 1}`} defaultValue={v[`price_category_${i + 1}`]} placeholder="Item / category" aria-label={`Line ${i + 1}: item / category`} className={input} />
              <input name={`price_item_${i + 1}`} defaultValue={v[`price_item_${i + 1}`]} placeholder="Item" aria-label={`Line ${i + 1}: item`} className={input} />
              <input name={`price_value_${i + 1}`} defaultValue={v[`price_value_${i + 1}`]} inputMode="decimal" placeholder="Price (Rs.)" aria-label={`Line ${i + 1}: price`} className={input} />
            </div>
          ))}
        </div>
        <label className="block space-y-2 border-t border-zinc-300 pt-4">
          <Lbl en="Price list file (optional): Excel, CSV, Word or PDF" si="මිල ලැයිස්තු ගොනුව (අවශ්‍ය නම්): Excel, CSV, Word හෝ PDF" />
          <input type="file" name="doc_price_list" accept=".xlsx,.xls,.csv,.docx,.doc,.pdf" className={fileCls} />
          <span className="block text-sm text-zinc-600">Excel or CSV columns: Item Code, Description, Unit, Price. Rows are added to the lines above.</span>
        </label>
      </Paper>

      <section className="rounded-2xl border border-zinc-300 bg-white p-5 shadow-sm md:p-8">
        <label className="block space-y-2">
          <Lbl en="Printed forms completed by hand? Upload the signed scans here (up to 5 files)" si="අතින් පුරවා අත්සන් කළ මුද්‍රිත ආකෘති පත්‍ර ඇත්නම් ඒවායේ ස්කෑන් පිටපත් මෙහි උඩුගත කරන්න (ගොනු 5ක් දක්වා)" />
          <input type="file" name="doc_signed_forms" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className={fileCls} />
          <span className="block text-sm text-zinc-600">PDF, JPG, PNG or WEBP. Maximum 10 MB per file. · * required</span>
        </label>
      </section>

      <div className="flex justify-end pb-6">
        <button type="submit" disabled={pending} className="press rounded-2xl bg-slate-900 px-8 py-4 text-left text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-600/40 disabled:cursor-not-allowed disabled:opacity-60">
          <span className="block text-lg font-bold leading-tight">{pending ? 'Submitting…' : 'Submit application'}</span>
          <span className="si block text-sm" lang="si">{pending ? 'ඉදිරිපත් කරමින්…' : 'ඉල්ලුම්පත්‍රය ඉදිරිපත් කරන්න'}</span>
        </button>
      </div>
    </form>
  );
}
