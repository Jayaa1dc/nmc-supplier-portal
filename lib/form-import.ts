// Reads a supplier form. Two routes:
//  1) readFillable: the NMC fillable PDF. Exact values from the form fields, no AI.
//  2) readWithAI: a scan or photo. The Anthropic API reads the handwriting; the result is only a draft
//     that an administrator must check before it is saved.
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup } from 'pdf-lib';
import { SUPPLIER_CATEGORIES } from './categories';
import { emptyDraft, type Draft } from './form-draft';

const NATURES = ['manufacturer', 'wholesaler', 'stockist', 'retailer'];

const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const first = (...vals: (string | undefined)[]) => vals.find((v) => v && v.trim()) ?? '';
// First number in a text such as "Rs. 1,850.50" -> "1850.50"
const num = (v: string | undefined) => (v ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0] ?? '';
const yesNo = (v: string) => (v === 'yes' || v === 'no' ? v : '');

// ---------------------------------------------------------------------------
// 1) Fillable PDF
// ---------------------------------------------------------------------------
export async function readFillable(bytes: Uint8Array): Promise<Draft | null> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    return null;
  }
  let fields;
  try {
    fields = doc.getForm().getFields();
  } catch {
    return null;
  }
  if (fields.length === 0) return null;

  const t: Record<string, string> = {};
  const c: Record<string, boolean> = {};
  const r: Record<string, string> = {};
  for (const f of fields) {
    const name = f.getName();
    try {
      if (f instanceof PDFTextField) t[name] = (f.getText() ?? '').trim();
      else if (f instanceof PDFCheckBox) c[name] = f.isChecked();
      else if (f instanceof PDFRadioGroup) r[name] = f.getSelected() ?? '';
    } catch {
      /* skip unreadable field */
    }
  }

  const anyValue = Object.values(t).some(Boolean) || Object.values(c).some(Boolean) || Object.values(r).some(Boolean);
  const looksLikeNmc = Boolean(t.company_name || t.issued_to_company || t.applicant_name);
  if (!anyValue || !looksLikeNmc) return null;

  const d = emptyDraft();
  d.company_name = first(t.company_name, t.issued_to_company, t.applicant_name);
  d.head_office_address = first(t.head_office_address, t.address, [t.applicant_address_1, t.applicant_address_2].filter(Boolean).join(', '));
  d.factory_address = t.factory_address ?? '';
  d.telephone = first(t.telephone_head_office, t.telephone, t.f1_telephone);
  d.mobile = first(t.mobile, t.f1_mobile);
  d.fax = first(t.fax, t.fax_number, t.f1_fax);
  d.email = first(t.email, t.email_address, t.f1_email).toLowerCase();
  d.contact_person = first(t.applicant_name, t.completed_by);
  d.contact_title = t.completed_position ?? '';
  d.business_nature = NATURES.includes(r.business_nature) ? r.business_nature : '';
  d.iso_9000 = r.iso_registered === 'yes';
  d.deposit_receipt_no = t.cash_receipt_no ?? '';
  d.deposit_amount = num(t.amount);

  SUPPLIER_CATEGORIES.forEach((cat, i) => {
    if (c[`category_${i + 1}`]) d.categories.push(cat);
  });

  const a = d.answers;
  const set = (k: string, v: string | undefined) => { if (v && v.trim()) a[k] = v.trim(); };
  set('telephone_factory', t.telephone_factory);
  set('intended_category', t.intended_category);
  set('business_reg_no', t.business_reg_no);
  set('nature_of_business', t.nature_of_business);
  set('principal_line_of_business', t.principal_line_of_business);
  set('ltd_company', t.ltd_company);
  set('ltd_directors', t.ltd_directors);
  set('partners', t.partners);
  set('bankers', t.bankers);
  set('vat_registered', yesNo(r.vat_registered));
  set('credit_period', t.credit_period);
  set('production_capacity', t.production_capacity);
  set('production_controls', t.production_controls);
  set('defect_segregation', t.defect_segregation);
  set('quality_records', t.quality_records);
  set('inspection_types', t.inspection_types);
  set('incoming_inspection', t.incoming_inspection);
  set('packing', t.packing);
  set('factory_visit', t.factory_visit);
  set('customers_attached', t.customers_list);
  set('completed_by', t.completed_by);
  set('completed_position', t.completed_position);
  set('completed_date', first(t.completed_date, t.f1_date));

  for (let i = 1; i <= 8; i++) if (t[`service_${i}`]) d.items_services.push(t[`service_${i}`]);
  for (let i = 1; i <= 8; i++) if (t[`mgmt_name_${i}`]) d.management.push({ name: t[`mgmt_name_${i}`], title: t[`mgmt_title_${i}`] ?? '' });
  for (let i = 1; i <= 15; i++) {
    if (t[`past_company_${i}`]) d.past_experience.push({ company: t[`past_company_${i}`], contact: t[`past_contact_${i}`] ?? '', period: t[`past_period_${i}`] ?? '' });
  }
  for (let i = 1; i <= 26; i++) {
    if (t[`price_item_${i}`]) d.price_rows.push({ category: t[`price_category_${i}`] ?? '', item: t[`price_item_${i}`], price: num(t[`price_value_${i}`]) });
  }
  d.notes.unshift('Read directly from the PDF form fields (no AI used). Values are exactly what the supplier typed.');
  return d;
}

// ---------------------------------------------------------------------------
// 2) Scan / photo, read by the Anthropic API
// ---------------------------------------------------------------------------
const str = { type: 'string' } as const;
const TOOL = {
  name: 'record_form',
  description: 'Record everything written on the supplier forms.',
  input_schema: {
    type: 'object',
    properties: {
      company_name: str, head_office_address: str, factory_address: str,
      telephone_head_office: str, telephone_factory: str, mobile: str, fax: str, email: str,
      applicant_name: str,
      business_nature: { type: 'string', enum: ['manufacturer', 'wholesaler', 'stockist', 'retailer', ''] },
      iso_registered: { type: 'string', enum: ['yes', 'no', 'unclear'] },
      intended_category: str, business_reg_no: str, nature_of_business: str, principal_line_of_business: str,
      ltd_company: str, ltd_directors: str, partners: str, bankers: str,
      vat_registered: { type: 'string', enum: ['yes', 'no', 'unclear'] },
      credit_period: str, completed_by: str, completed_position: str, completed_date: str,
      cash_receipt_no: str, amount: str,
      production: {
        type: 'object',
        properties: {
          capacity: str, controls: str, defect_segregation: str, quality_records: str, inspections: str,
          incoming_inspection: str, packing: str, factory_visit: str, customers_list: str,
        },
      },
      items_services: { type: 'array', items: str },
      management: { type: 'array', items: { type: 'object', properties: { name: str, title: str, quality_responsible: { type: 'boolean' } }, required: ['name'] } },
      past_experience: { type: 'array', items: { type: 'object', properties: { company: str, contact: str, period: str }, required: ['company'] } },
      categories_ticked: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 16 } },
      price_rows: { type: 'array', items: { type: 'object', properties: { category: str, item: str, price: str }, required: ['item'] } },
      pages_missing: { type: 'array', items: str },
      notes: { type: 'array', items: str },
    },
    required: ['company_name', 'notes'],
  },
};

const SYSTEM = `You read scanned supplier registration forms for Nawaloka Medical Centre (Sri Lanka). The forms are the NMC Supplier Questionnaire 44/FO/KM/02, the Pre-Qualification Application Form 44/FO/MC/GN/01, Form 01, Form 02, Form 03 and Form 04. Suppliers fill them in by hand.
Rules:
- Transcribe exactly what is written. Never guess or invent. If a value is blank, return an empty string or an empty list.
- If handwriting is hard to read, give your best reading and add a note naming the field and why it is uncertain.
- Phone numbers: copy the digits as written. If the same field differs between pages (for example a phone number or address), use the questionnaire page value and add a note describing every version you saw.
- A printed letterhead or stamp is not part of the form. You may use it only to cross-check and mention conflicts in notes.
- For yes/no choices: "yes" or "no" only when clearly marked. If a word is struck through or the mark is ambiguous, return "unclear" and explain in notes.
- Business nature (Manufacturer, Wholesaler, Stockist, Retailer): the one that is ticked; empty if none.
- categories_ticked: the numbers (1-16) ticked on Form 03. Empty if none ticked.
- List in pages_missing any form pages that are not in the file (for example questionnaire page 2 or Form 04).
- Put every doubt, conflict, or odd thing in notes. Keep each note short.`;

export type AiProvider = 'gemini' | 'anthropic';
export function aiProvider(): AiProvider | null {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}
export function aiReady(): boolean {
  return aiProvider() !== null;
}

type Obj = Record<string, unknown>;

export async function readWithAI(bytes: Uint8Array, mime: string): Promise<Draft> {
  const provider = aiProvider();
  if (!provider) throw new Error('AI reading is not set up. Add GEMINI_API_KEY in Vercel.');
  const data = Buffer.from(bytes).toString('base64');
  const raw = provider === 'gemini' ? await callGemini(data, mime) : await callAnthropic(data, mime);
  return fromAI(raw);
}

async function callAnthropic(data: string, mime: string): Promise<Obj> {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  const block =
    mime === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : { type: 'image', source: { type: 'base64', media_type: mime, data } };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model, max_tokens: 6000, system: SYSTEM, tools: [TOOL], tool_choice: { type: 'tool', name: 'record_form' },
      messages: [{ role: 'user', content: [block, { type: 'text', text: 'Read every page of this supplier form and record it with the record_form tool.' }] }],
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) throw new Error(`The AI service returned an error (${res.status}). ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { content?: { type: string; input?: Obj }[] };
  const tool = json.content?.find((c) => c.type === 'tool_use');
  if (!tool?.input) throw new Error('The AI service did not return a result. Try again.');
  return tool.input;
}

// Gemini wants OpenAPI-style upper-case types and rejects some JSON-schema keywords
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node && typeof node === 'object') {
    const o = node as Obj;
    const out: Obj = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === 'minimum' || k === 'maximum') continue;
      if (k === 'enum' && Array.isArray(v) && v.includes('')) continue; // empty option is handled when normalising
      out[k] = k === 'type' && typeof v === 'string' ? v.toUpperCase() : toGeminiSchema(v);
    }
    return out;
  }
  return node;
}

async function callGemini(data: string, mime: string): Promise<Obj> {
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data } }, { text: 'Read every page of this supplier form and return the JSON.' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 8192, responseMimeType: 'application/json', responseSchema: toGeminiSchema(TOOL.input_schema) },
    }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) throw new Error(`The AI service returned an error (${res.status}). Check GEMINI_API_KEY and GEMINI_MODEL. ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; promptFeedback?: { blockReason?: string } };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error(`The AI service returned nothing${json.promptFeedback?.blockReason ? ` (${json.promptFeedback.blockReason})` : ''}. Try again.`);
  try {
    return JSON.parse(text) as Obj;
  } catch {
    throw new Error('The AI service returned an unreadable result. Try again.');
  }
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function fromAI(raw: Obj): Draft {
  const d = emptyDraft();
  const s = (k: string) => clean(raw[k]);
  const notes: string[] = arr(raw.notes).map(clean).filter(Boolean);

  d.company_name = s('company_name');
  d.head_office_address = s('head_office_address');
  d.factory_address = s('factory_address');
  d.telephone = s('telephone_head_office');
  d.mobile = s('mobile');
  d.fax = s('fax');
  d.email = s('email').toLowerCase();
  d.contact_person = s('applicant_name');
  const bn = s('business_nature');
  d.business_nature = NATURES.includes(bn) ? bn : '';
  d.deposit_receipt_no = s('cash_receipt_no');
  d.deposit_amount = num(s('amount'));

  const iso = s('iso_registered');
  d.iso_9000 = iso === 'yes';
  if (iso === 'unclear') notes.push('ISO answer is unclear on the form. Left as "no". Please check.');

  const a = d.answers;
  const set = (k: string, v: string) => { if (v) a[k] = v; };
  set('telephone_factory', s('telephone_factory'));
  set('intended_category', s('intended_category'));
  set('business_reg_no', s('business_reg_no'));
  set('nature_of_business', s('nature_of_business'));
  set('principal_line_of_business', s('principal_line_of_business'));
  set('ltd_company', s('ltd_company'));
  set('ltd_directors', s('ltd_directors'));
  set('partners', s('partners'));
  set('bankers', s('bankers'));
  const vat = s('vat_registered');
  if (vat === 'yes' || vat === 'no') set('vat_registered', vat);
  else if (vat === 'unclear') notes.push('VAT answer is unclear on the form (not saved). Please check.');
  set('credit_period', s('credit_period'));
  set('completed_by', s('completed_by'));
  set('completed_position', s('completed_position'));
  set('completed_date', s('completed_date'));

  const p = (raw.production ?? {}) as Obj;
  const ps = (k: string) => clean(p[k]);
  set('production_capacity', ps('capacity'));
  set('production_controls', ps('controls'));
  set('defect_segregation', ps('defect_segregation'));
  set('quality_records', ps('quality_records'));
  set('inspection_types', ps('inspections'));
  set('incoming_inspection', ps('incoming_inspection'));
  set('packing', ps('packing'));
  set('factory_visit', ps('factory_visit'));
  set('customers_attached', ps('customers_list'));

  d.items_services = arr(raw.items_services).map(clean).filter(Boolean).slice(0, 8);
  d.management = arr(raw.management)
    .map((m) => {
      const o = (m ?? {}) as Obj;
      return { name: clean(o.name) + (o.quality_responsible === true ? ' *' : ''), title: clean(o.title) };
    })
    .filter((m) => m.name)
    .slice(0, 8);
  d.past_experience = arr(raw.past_experience)
    .map((x) => { const o = (x ?? {}) as Obj; return { company: clean(o.company), contact: clean(o.contact), period: clean(o.period) }; })
    .filter((x) => x.company)
    .slice(0, 15);
  d.categories = arr(raw.categories_ticked)
    .map((n) => SUPPLIER_CATEGORIES[Number(n) - 1])
    .filter((c): c is (typeof SUPPLIER_CATEGORIES)[number] => Boolean(c));
  d.price_rows = arr(raw.price_rows)
    .map((x) => { const o = (x ?? {}) as Obj; return { category: clean(o.category), item: clean(o.item), price: num(clean(o.price)) }; })
    .filter((x) => x.item)
    .slice(0, 26);

  const missing = arr(raw.pages_missing).map(clean).filter(Boolean);
  if (missing.length) notes.push(`Pages not in this file: ${missing.join('; ')}`);
  d.notes = ['Read by AI from a scan. This is a draft: check every value against the form before saving.', ...notes];
  return d;
}
