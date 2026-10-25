'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { sendAdminNotification } from '@/lib/email';
import { registrationSchema, SUPPLIER_BUCKET } from '@/lib/schemas';
import { collectUploads, validateUploads } from '@/lib/uploads';

export type RegistrationState = {
  ok: boolean;
  message?: string;
  errors?: string[];
  values?: Record<string, string>;   // echoed back so the form keeps text on error
  categories?: string[];
};

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : undefined;
};

function parseItems(json?: string) {
  try {
    const parsed = JSON.parse(json ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  const parsed = registrationSchema.safeParse({
    supplier_code: str(formData, 'supplier_code'),
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
    quality_controls: str(formData, 'quality_controls'),
    price_validity_until: str(formData, 'price_validity_until'),
    deposit_amount: str(formData, 'deposit_amount'),
    deposit_receipt_no: str(formData, 'deposit_receipt_no'),
    items: parseItems(str(formData, 'items_json')),
    declaration: formData.get('declaration') === 'on',
  });

  if (!parsed.success) {
    return {
      ok: false,
      ...echo,
      message: 'Please correct the highlighted fields and try again.',
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'form'}: ${i.message}`),
    };
  }
  const data = parsed.data;

  // ---- Documents ----
  const uploads = collectUploads(formData);
  const fileError = await validateUploads(uploads);
  if (fileError) return { ok: false, ...echo, message: fileError };
  if (!uploads.some((u) => u.docType === 'business_registration')) {
    return { ok: false, ...echo, message: 'The business registration certificate is required.' };
  }

  const db = adminClient();

  // ---- HIS code must not already be on file (applications are never auto-numbered) ----
  const { data: existing, error: lookupErr } = await db
    .from('suppliers')
    .select('id, status')
    .eq('supplier_code', data.supplier_code)
    .maybeSingle();

  if (lookupErr) {
    console.error('Lookup failed', lookupErr);
    return { ok: false, ...echo, message: 'We could not verify your supplier code. Please try again.' };
  }
  if (existing && existing.status !== 'rejected') {
    return {
      ok: false,
      ...echo,
      message: `A registration for HIS code ${data.supplier_code} is already on file. Please contact the Procurement Division.`,
    };
  }

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
    quality_controls: data.quality_controls ?? null,
    price_validity_until: data.price_validity_until ?? null,
    deposit_amount: data.deposit_amount ?? null,
    deposit_receipt_no: data.deposit_receipt_no ?? null,
  };

  // ---- Insert or re-submit (previously rejected applications only) ----
  let supplierId: string;
  let createdNew = false;

  if (existing) {
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
      return { ok: false, ...echo, message: 'Could not save your application. Please try again.' };
    }
    supplierId = existing.id;
  } else {
    const { data: row, error } = await db
      .from('suppliers')
      .insert({ ...record, supplier_code: data.supplier_code, status: 'pending', source: 'application' })
      .select('id')
      .single();
    if (error) {
      console.error('Insert failed', error);
      const duplicate = error.code === '23505';
      return {
        ok: false,
        ...echo,
        message: duplicate
          ? `A registration for HIS code ${data.supplier_code} is already on file.`
          : 'Could not save your application. Please try again.',
      };
    }
    supplierId = row.id;
    createdNew = true;
  }

  // ---- Items, files, and rollback on failure ----
  const uploadedPaths: string[] = [];
  const rollback = async () => {
    if (uploadedPaths.length) await db.storage.from(SUPPLIER_BUCKET).remove(uploadedPaths);
    if (createdNew) await db.from('suppliers').delete().eq('id', supplierId);
  };

  try {
    if (data.items.length) {
      const { error } = await db.from('supplier_items').insert(
        data.items.map((it, i) => ({
          supplier_id: supplierId,
          line_no: i + 1,
          his_item_code: it.his_item_code ?? null,
          description: it.description,
          brand: it.brand ?? null,
          unit: it.unit,
          unit_price: it.unit_price,
          currency: 'LKR',
        })),
      );
      if (error) throw error;
    }

    const docRows: Record<string, unknown>[] = [];
    for (const { docType, file } of uploads) {
      const path = `${data.supplier_code}/${docType}/${randomUUID()}-${safeName(file.name)}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      const { error } = await db.storage
        .from(SUPPLIER_BUCKET)
        .upload(path, bytes, { contentType: file.type, upsert: false });
      if (error) throw error;
      uploadedPaths.push(path);
      docRows.push({
        supplier_id: supplierId,
        doc_type: docType,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
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
    return { ok: false, ...echo, message: 'We could not save your documents. Please try again.' };
  }

  // ---- Notify procurement (non-blocking: the application is already saved) ----
  try {
    await sendAdminNotification({
      supplierId,
      supplierCode: data.supplier_code,
      companyName: data.company_name,
      contactPerson: data.contact_person,
      email: data.email,
      telephone: data.telephone,
      businessNature: data.business_nature,
      categories: data.categories,
      items: data.items.map((it) => ({
        his_item_code: it.his_item_code,
        description: it.description,
        unit: it.unit,
        unit_price: it.unit_price,
      })),
      documentCount: uploads.length,
    });
  } catch (err) {
    console.error('Resend notification failed (application saved)', err);
  }

  redirect(`/register/thank-you?code=${encodeURIComponent(data.supplier_code)}`);
}
