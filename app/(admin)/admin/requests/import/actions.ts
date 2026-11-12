'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { SUPPLIER_BUCKET } from '@/lib/schemas';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { FIELDS, MGMT_ROWS, PAST_ROWS, SERVICE_LINES } from '@/lib/questionnaire';
import { isCategory, isUuid } from '@/lib/centres';
import { recordTransition } from '@/lib/approval';
import type { ExtractResult } from '@/lib/form-draft';
import { aiReady, readFillable, readWithAI } from '@/lib/form-import';

const MAX_BYTES = 10 * 1024 * 1024;
const EXT_MIME: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
const safeName = (n: string) => n.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) redirect('/admin-login?error=not_authorised');
  return { supabase, user };
}

function magicOk(bytes: Uint8Array, mime: string) {
  if (mime === 'application/pdf') return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return false;
}

// Step 1: give the browser a one-time upload token (the file goes straight to storage, avoiding Vercel's 4.5 MB request limit)
export async function prepareUpload(name: string, size: number): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  await requireAdmin();
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (!EXT_MIME[ext]) return { ok: false, error: 'Choose a PDF, JPG or PNG file.' };
  if (!(size > 0) || size > MAX_BYTES) return { ok: false, error: 'The file must be 10 MB or smaller.' };

  const path = `imports/${randomUUID()}/${safeName(name)}`;
  const { data, error } = await adminClient().storage.from(SUPPLIER_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? 'Could not prepare the upload.' };
  return { ok: true, path, token: data.token };
}

// Step 2: read the uploaded file
export async function extractFromStored(path: string, name: string): Promise<ExtractResult> {
  await requireAdmin();
  if (!path.startsWith('imports/') || path.includes('..')) return { ok: false, error: 'Invalid file.' };
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  const mime = EXT_MIME[ext];
  if (!mime) return { ok: false, error: 'Choose a PDF, JPG or PNG file.' };

  const db = adminClient();
  const { data: blob, error } = await db.storage.from(SUPPLIER_BUCKET).download(path);
  if (error || !blob) return { ok: false, error: 'The uploaded file could not be found. Try again.' };
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length > MAX_BYTES || !magicOk(bytes, mime)) {
    await db.storage.from(SUPPLIER_BUCKET).remove([path]);
    return { ok: false, error: 'The file content does not match its type.' };
  }

  let source: 'fillable' | 'ai' = 'fillable';
  let draft = mime === 'application/pdf' ? await readFillable(bytes) : null;
  if (!draft) {
    if (!aiReady()) {
      return { ok: false, error: 'This looks like a scan or photo. AI reading is not switched on yet (GEMINI_API_KEY is missing in Vercel). Fillable PDFs from the NMC form pack still work.' };
    }
    try {
      draft = await readWithAI(bytes, mime);
      source = 'ai';
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  const signed = await db.storage.from(SUPPLIER_BUCKET).createSignedUrl(path, 3600);
  return { ok: true, source, draft, file: { path, name, mime, size: bytes.length }, previewUrl: signed.data?.signedUrl ?? null };
}

// Step 3: the administrator checked the values; create the supplier as "Submitted"
export type SaveState = { error?: string };

const txt = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' ? v.trim() : '';
};
const nul = (s: string) => (s === '' ? null : s);

export async function saveDraft(_prev: SaveState, fd: FormData): Promise<SaveState> {
  const { user } = await requireAdmin();
  const db = adminClient();

  const company = txt(fd, 'company_name');
  const email = txt(fd, 'email').toLowerCase();
  const nature = txt(fd, 'business_nature');
  const his = txt(fd, 'supplier_code').toUpperCase();
  const missing: string[] = [];
  if (company.length < 2) missing.push('company name');
  if (!txt(fd, 'head_office_address')) missing.push('head office address');
  if (!txt(fd, 'telephone')) missing.push('telephone');
  if (!email) missing.push('email');
  if (!txt(fd, 'contact_person')) missing.push('contact person');
  if (!['manufacturer', 'wholesaler', 'stockist', 'retailer'].includes(nature)) missing.push('nature of business');
  if (missing.length) return { error: `Please fill in: ${missing.join(', ')}.` };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'The email address is not valid.' };
  if (his && !/^SP\d{8}$/.test(his)) return { error: 'HIS code must be SP followed by 8 digits, e.g. SP00000108.' };

  const path = txt(fd, 'storage_path');
  if (!path.startsWith('imports/') || path.includes('..')) return { error: 'The uploaded file reference is invalid. Start again.' };

  // Same company already in the system?
  const { data: dup } = await db
    .from('suppliers')
    .select('id, company_name, status')
    .ilike('company_name', company)
    .in('status', ['pending', 'under_review', 'changes_requested', 'approved'])
    .limit(1);
  if (dup && dup.length) return { error: `"${dup[0].company_name}" already exists (${dup[0].status.replace('_', ' ')}). Open that profile instead, or change the name.` };

  // Application answers
  const answers: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = txt(fd, `ans_${f.key}`);
    if (v) answers[f.key] = v;
  }
  const items_services = Array.from({ length: SERVICE_LINES }, (_, i) => txt(fd, `service_${i + 1}`)).filter(Boolean);
  const management = Array.from({ length: MGMT_ROWS }, (_, i) => ({ name: txt(fd, `mgmt_name_${i + 1}`), title: txt(fd, `mgmt_title_${i + 1}`) })).filter((m) => m.name);
  const past_experience = Array.from({ length: PAST_ROWS }, (_, i) => ({ company: txt(fd, `past_company_${i + 1}`), contact: txt(fd, `past_contact_${i + 1}`), period: txt(fd, `past_period_${i + 1}`) })).filter((p) => p.company);

  // Centres and categories chosen by the administrator
  const { data: centres } = await db.from('centres').select('id, name');
  const chosen = (centres ?? []).filter((c) => fd.getAll('centre_ids').map(String).filter(isUuid).includes(c.id));
  const depts = fd.getAll('departments').map(String).filter(isCategory);
  const categories = fd.getAll('categories').map(String).filter((c) => (SUPPLIER_CATEGORIES as readonly string[]).includes(c));

  const amount = Number(txt(fd, 'deposit_amount'));
  const ref = `APP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

  const { data: row, error } = await db
    .from('suppliers')
    .insert({
      supplier_code: nul(his), application_ref: ref, company_name: company,
      head_office_address: nul(txt(fd, 'head_office_address')), factory_address: nul(txt(fd, 'factory_address')),
      telephone: nul(txt(fd, 'telephone')), mobile: nul(txt(fd, 'mobile')), fax: nul(txt(fd, 'fax')), email,
      contact_person: nul(txt(fd, 'contact_person')), contact_title: nul(txt(fd, 'contact_title')),
      business_nature: nature, categories, branches: chosen.map((c) => c.name),
      iso_9000: fd.get('iso_9000') === 'on', production_capacity: nul(txt(fd, 'ans_production_capacity')),
      deposit_receipt_no: nul(txt(fd, 'deposit_receipt_no')), deposit_amount: Number.isFinite(amount) && txt(fd, 'deposit_amount') !== '' ? amount : null,
      application: { answers, items_services, management, past_experience },
      status: 'pending', source: 'application',
    })
    .select('id')
    .single();
  if (error || !row) {
    return { error: error?.code === '23505' ? 'That HIS code is already used by another supplier.' : `Could not save: ${error?.message ?? 'unknown error'}` };
  }
  const id = row.id as string;

  try {
    if (chosen.length) {
      const r = await db.from('supplier_centres').insert(chosen.map((c) => ({ supplier_id: id, centre_id: c.id })));
      if (r.error) throw r.error;
    }
    if (depts.length) {
      const r = await db.from('supplier_departments').insert(depts.map((d) => ({ supplier_id: id, dept: d })));
      if (r.error) throw r.error;
    }

    // Form 04 price rows (centre and category are set later on the Price list tab)
    const prices: { description: string; price: number }[] = [];
    for (let i = 1; i <= 26; i++) {
      const item = txt(fd, `price_item_${i}`);
      const cat = txt(fd, `price_category_${i}`);
      const raw = txt(fd, `price_value_${i}`);
      if (!item || raw === '') continue;
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) continue;
      prices.push({ description: cat ? `${item} (${cat})` : item, price });
    }
    if (prices.length) {
      const today = new Date().toISOString().slice(0, 10);
      const ins = await db
        .from('supplier_items')
        .insert(prices.map((p, i) => ({ supplier_id: id, line_no: i + 1, description: p.description, unit: 'Each', unit_price: p.price, currency: 'LKR', effective_date: today })))
        .select('id, description, unit_price');
      if (ins.error) throw ins.error;
      await db.from('supplier_price_history').insert(
        (ins.data ?? []).map((i) => ({ item_id: i.id, supplier_id: id, description: i.description, old_price: null, new_price: i.unit_price, effective_date: today, changed_by: user.id, actor_email: user.email ?? null })),
      );
    }

    const doc = await db.from('supplier_documents').insert({
      supplier_id: id, doc_type: 'signed_form', storage_path: path, file_name: txt(fd, 'file_name') || 'form.pdf',
      mime_type: txt(fd, 'mime_type') || 'application/pdf', size_bytes: Number(txt(fd, 'size_bytes')) || 0,
    });
    if (doc.error) throw doc.error;

    await recordTransition(db, { supplierId: id, from: null, to: 'pending', reason: `Imported from a supplier form (${txt(fd, 'source') === 'ai' ? 'read by AI, checked by staff' : 'fillable PDF'})`, userId: user.id, email: user.email ?? null });
  } catch (e) {
    await db.from('suppliers').delete().eq('id', id);
    return { error: `Could not finish saving, nothing was created. ${(e as { message?: string }).message ?? ''}` };
  }

  redirect(`/admin/suppliers/${id}?tab=profile&ok=${encodeURIComponent('Supplier created from the form. Add the HIS code, centres and categories, then review.')}`);
}
