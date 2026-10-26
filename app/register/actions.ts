'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { sendAdminNotification } from '@/lib/email';
import { registrationSchema, SUPPLIER_BUCKET } from '@/lib/schemas';
import { FIELDS, MGMT_ROWS, PAST_ROWS, SERVICE_LINES } from '@/lib/questionnaire';
import { collectUploads, validateUploads } from '@/lib/uploads';
import { parsePriceList, type PriceRow } from '@/lib/price-import';

export type RegistrationState = {
  ok: boolean;
  message?: string;
  errors?: string[];
  values?: Record<string, string>;
  categories?: string[];
};

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : undefined;
};
const trimmed = (fd: FormData, key: string) => (str(fd, key) ?? '').trim();

function parseItems(json?: string) {
  try {
    const parsed = JSON.parse(json ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** PDF answers that have no dedicated column, stored in suppliers.application */
function buildApplication(fd: FormData) {
  const answers: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = trimmed(fd, f.key);
    if (v) answers[f.key] = v;
  }
  const items_services = Array.from({ length: SERVICE_LINES }, (_, i) => trimmed(fd, `service_${i + 1}`)).filter(Boolean);
  const management = Array.from({ length: MGMT_ROWS }, (_, i) => ({
    name: trimmed(fd, `mgmt_name_${i + 1}`),
    title: trimmed(fd, `mgmt_title_${i + 1}`),
  })).filter((m) => m.name);
  const past_experience = Array.from({ length: PAST_ROWS }, (_, i) => ({
    company: trimmed(fd, `past_company_${i + 1}`),
    contact: trimmed(fd, `past_contact_${i + 1}`),
    period: trimmed(fd, `past_period_${i + 1}`),
  })).filter((p) => p.company);
  return { answers, items_services, management, past_experience };
}

const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);

export async function submitRegistration(
  _prev: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  // Honeypot: humans never fill the hidden "website" field. Pretend success for bots.
  if (formData.get('website')) return { ok: true };

  const echo = {
    values: Object.fromEntries(
      Array.from(formData.entries()).filter((e): e is [string, string] => typeof e[1] === 'string'),
    ),
    categories: formData.getAll('categories').map(String),
  };
  const fail = (message: string, errors?: string[]): RegistrationState => ({ ok: false, ...echo, message, errors });

  const parsed = registrationSchema.safeParse({
    company_name: str(formData, 'company_name'),
    head_office_address: str(formData, 'head_office_address'),
    factory_address: str(formData, 'factory_address'),
    telephone: str(formData, 'telephone'),
    mobile: str(formData, 'mobile'),
    fax: str(formData, 'fax'),
    email: str(formData, 'email'),
    contact_person: str(formData, 'contact_person'),
    contact_title: str(formData, 'contact_title'),
    business_nature: str(formData, 'business_nature'),
    categories: formData.getAll('categories').map(String),
    iso_9000: formData.get('iso_9000') === 'on',
    iso_certificate_no: str(formData, 'iso_certificate_no'),
    production_capacity: str(formData, 'production_capacity'),
    quality_controls: undefined,
    price_validity_until: str(formData, 'price_validity_until'),
    deposit_amount: str(formData, 'deposit_amount'),
    deposit_receipt_no: str(formData, 'deposit_receipt_no'),
    items: parseItems(str(formData, 'items_json')),
    declaration: formData.get('declaration') === 'on',
  });

  if (!parsed.success) {
    return fail(
      'Please correct the highlighted fields and try again.',
      parsed.error.issues.map((i) => `${i.path.join('.') || 'form'}: ${i.message}`),
    );
  }
  const data = parsed.data;

  // ---- Documents (incl. price list file) ----
  const uploads = collectUploads(formData);
  const fileError = await validateUploads(uploads);
  if (fileError) return fail(fileError);
  if (!uploads.some((u) => u.docType === 'business_registration')) {
    return fail('The business registration certificate is required.');
  }

  // ---- Price list: typed Form 04 rows + rows from an uploaded Excel/CSV ----
  let excelRows: PriceRow[] = [];
  const priceFile = uploads.find(
    (u) => u.docType === 'price_list' && /\.(xlsx|xls|csv)$/i.test(u.file.name),
  );
  if (priceFile) {
    try {
      excelRows = parsePriceList(Buffer.from(await priceFile.file.arrayBuffer())).rows;
    } catch (err) {
      return fail((err as Error).message);
    }
  }

  const allItems = [
    ...data.items.map((it) => ({
      his_item_code: it.his_item_code ?? null,
      description: it.description,
      brand: it.brand ?? null,
      unit: it.unit,
      unit_price: it.unit_price,
    })),
    ...excelRows.map((r) => ({
      his_item_code: r.his_item_code,
      description: r.description,
      brand: null,
      unit: r.unit,
      unit_price: r.unit_price,
    })),
  ];
  if (allItems.length === 0) {
    return fail('Add at least one price item in Form 04, or upload a price list file.');
  }
  if (allItems.length > 500) return fail('A price list can have at most 500 items.');

  const db = adminClient();

  // ---- Same company already pending or approved? ----
  const { data: dup } = await db
    .from('suppliers')
    .select('id')
    .ilike('company_name', data.company_name)
    .in('status', ['pending', 'approved'])
    .limit(1);
  if (dup && dup.length > 0) {
    return fail(`${data.company_name} is already registered or approved. Please contact the Procurement Division.`);
  }

  // Reference shown to the supplier. The HIS code is assigned later by the admin.
  const ref = `APP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
  const existing = null as { id: string; status: string } | null;

  const record = {
    company_name: data.company_name,
    head_office_address: data.head_office_address,
    factory_address: data.factory_address ?? null,
    telephone: data.telephone,
    mobile: data.mobile ?? null,
    fax: data.fax ?? null,
    email: data.email,
    contact_person: data.contact_person,
    contact_title: data.contact_title ?? null,
    business_nature: data.business_nature,
    categories: data.categories,
    iso_9000: data.iso_9000,
    iso_certificate_no: data.iso_certificate_no ?? null,
    production_capacity: data.production_capacity ?? null,
    price_validity_until: data.price_validity_until ?? null,
    deposit_amount: data.deposit_amount ?? null,
    deposit_receipt_no: data.deposit_receipt_no ?? null,
    application: buildApplication(formData),
  };

  let supplierId: string;
  let createdNew = false;

  if (existing) {
    // Resubmission after rejection: replace everything from the previous attempt
    await db.from('supplier_items').delete().eq('supplier_id', existing.id);
    await db.from('supplier_documents').delete().eq('supplier_id', existing.id);
    const { error } = await db
      .from('suppliers')
      .update({
        ...record,
        status: 'pending',
        source: 'application',
        review_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) {
      console.error('Resubmission failed', error);
      return fail('Could not save your application. Please try again.');
    }
    supplierId = existing.id;
  } else {
    const { data: row, error } = await db
      .from('suppliers')
      .insert({ ...record, application_ref: ref, status: 'pending', source: 'application' })
      .select('id')
      .single();
    if (error) {
      console.error('Insert failed', error);
      return fail('Could not save your application. Please try again.');
    }
    supplierId = row.id;
    createdNew = true;
  }

  // ---- Items, files, with rollback on failure ----
  const uploadedPaths: string[] = [];
  const rollback = async () => {
    if (uploadedPaths.length) await db.storage.from(SUPPLIER_BUCKET).remove(uploadedPaths);
    if (createdNew) await db.from('suppliers').delete().eq('id', supplierId);
  };

  try {
    const { error: itemErr } = await db.from('supplier_items').insert(
      allItems.map((it, i) => ({
        supplier_id: supplierId,
        line_no: i + 1,
        his_item_code: it.his_item_code,
        description: it.description,
        brand: it.brand,
        unit: it.unit,
        unit_price: it.unit_price,
        currency: 'LKR',
      })),
    );
    if (itemErr) throw itemErr;

    const docRows: Record<string, unknown>[] = [];
    for (const { docType, file } of uploads) {
      const path = `${ref}/${docType}/${randomUUID()}-${safeName(file.name)}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      const { error } = await db.storage
        .from(SUPPLIER_BUCKET)
        .upload(path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (error) throw error;
      uploadedPaths.push(path);
      docRows.push({
        supplier_id: supplierId,
        doc_type: docType,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      });
    }
    if (docRows.length) {
      const { error } = await db.from('supplier_documents').insert(docRows);
      if (error) throw error;
    }
  } catch (err) {
    console.error('Registration failed; rolling back', err);
    await rollback();
    return fail('We could not save your documents. Please try again.');
  }

  // ---- Notify procurement (non-blocking: the application is already saved) ----
  try {
    await sendAdminNotification({
      supplierId,
      supplierCode: ref,
      companyName: data.company_name,
      contactPerson: data.contact_person,
      email: data.email,
      telephone: data.telephone,
      businessNature: data.business_nature,
      categories: data.categories,
      items: allItems.map((it) => ({
        his_item_code: it.his_item_code ?? undefined,
        description: it.description,
        unit: it.unit,
        unit_price: it.unit_price,
      })),
      documentCount: uploads.length,
    });
  } catch (err) {
    console.error('Resend notification failed (application saved)', err);
  }

  redirect(`/register/thank-you?ref=${encodeURIComponent(ref)}`);
}
