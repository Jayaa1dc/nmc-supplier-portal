'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { BUSINESS_NATURES } from '@/lib/schemas';
import { parsePriceList } from '@/lib/price-import';

type Tab = 'details' | 'prices' | 'documents';

const base = (id: string) => `/admin/suppliers/${id}`;
function fail(id: string, tab: Tab, msg: string): never {
  redirect(`${base(id)}?tab=${tab}&err=${encodeURIComponent(msg)}`);
}
function done(id: string, tab: Tab, msg: string): never {
  redirect(`${base(id)}?tab=${tab}&ok=${encodeURIComponent(msg)}`);
}

const txt = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' ? v.trim() : '';
};
const nul = (s: string) => (s === '' ? null : s);

/** Every action runs with the admin's own session; RLS decides what is allowed. */
async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');
  return { supabase, user };
}

const priceSchema = z.coerce.number({ invalid_type_error: 'Price must be a number' }).nonnegative('Price cannot be negative').max(1e10);

// ---------- Supplier details ----------

export async function updateSupplierDetails(id: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();

  const company_name = txt(formData, 'company_name');
  const email = txt(formData, 'email').toLowerCase();
  if (company_name.length < 2) fail(id, 'details', 'Company name is required');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(id, 'details', 'Email address is not valid');

  const his = txt(formData, 'supplier_code').toUpperCase();
  if (his && !/^SP\d{8}$/.test(his)) fail(id, 'details', 'HIS code must be SP followed by 8 digits, e.g. SP00000108');

  const bn = txt(formData, 'business_nature');
  const categories = formData
    .getAll('categories')
    .map(String)
    .filter((c) => (SUPPLIER_CATEGORIES as readonly string[]).includes(c));
  const branches = txt(formData, 'branches')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from('suppliers')
    .update({
      supplier_code: nul(his),
      company_name,
      head_office_address: nul(txt(formData, 'head_office_address')),
      factory_address: nul(txt(formData, 'factory_address')),
      telephone: nul(txt(formData, 'telephone')),
      mobile: nul(txt(formData, 'mobile')),
      fax: nul(txt(formData, 'fax')),
      email: nul(email),
      contact_person: nul(txt(formData, 'contact_person')),
      contact_title: nul(txt(formData, 'contact_title')),
      business_nature: (BUSINESS_NATURES as readonly string[]).includes(bn) ? bn : null,
      categories,
      branches,
      iso_9000: formData.get('iso_9000') === 'on',
      iso_certificate_no: nul(txt(formData, 'iso_certificate_no')),
      production_capacity: nul(txt(formData, 'production_capacity')),
      quality_controls: nul(txt(formData, 'quality_controls')),
      price_validity_until: nul(txt(formData, 'price_validity_until')),
    })
    .eq('id', id);

  if (error) fail(id, 'details', error.code === '23505' ? 'That HIS code is already used by another supplier' : error.message);

  revalidatePath('/admin');
  revalidatePath(base(id));
  done(id, 'details', 'Supplier details saved');
}

export async function updateSupplierStatus(id: string, formData: FormData): Promise<void> {
  const schema = z.object({
    status: z.enum(['pending', 'approved', 'rejected']),
    review_notes: z.string().trim().max(2000).optional(),
  });
  const parsed = schema.parse({
    status: formData.get('status'),
    review_notes: formData.get('review_notes') ?? undefined,
  });

  const { supabase, user } = await requireUser();

  if (parsed.status === 'approved') {
    const { data: current } = await supabase.from('suppliers').select('supplier_code').eq('id', id).maybeSingle();
    if (!current?.supplier_code) fail(id, 'details', 'Enter the HIS supplier code before approving');
  }

  const { error } = await supabase
    .from('suppliers')
    .update({
      status: parsed.status,
      review_notes: parsed.review_notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) fail(id, 'details', error.message);

  revalidatePath('/admin');
  revalidatePath(base(id));
  done(id, 'details', `Status set to ${parsed.status}`);
}

// ---------- Price list ----------

export async function addPriceItem(id: string, formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();

  const description = txt(formData, 'description');
  if (!description) fail(id, 'prices', 'Item description is required');

  const parsedPrice = priceSchema.safeParse(txt(formData, 'unit_price'));
  if (!parsedPrice.success) fail(id, 'prices', parsedPrice.error.issues[0].message);
  const price = parsedPrice.data;

  const { data: last } = await supabase
    .from('supplier_items')
    .select('line_no')
    .eq('supplier_id', id)
    .order('line_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: row, error } = await supabase
    .from('supplier_items')
    .insert({
      supplier_id: id,
      line_no: (last?.line_no ?? 0) + 1,
      his_item_code: nul(txt(formData, 'his_item_code')),
      description,
      unit: txt(formData, 'unit') || 'Each',
      unit_price: price,
      currency: 'LKR',
    })
    .select('id')
    .single();

  if (error || !row) fail(id, 'prices', error?.message ?? 'Could not add item');

  await supabase.from('supplier_price_history').insert({
    item_id: row.id,
    supplier_id: id,
    description,
    old_price: null,
    new_price: price,
    changed_by: user.id,
  });

  revalidatePath(base(id));
  done(id, 'prices', 'Item added');
}

export async function updateItem(id: string, itemId: string, formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: current } = await supabase
    .from('supplier_items')
    .select('description, unit_price')
    .eq('id', itemId)
    .eq('supplier_id', id)
    .maybeSingle();
  if (!current) fail(id, 'prices', 'Item not found');

  const description = txt(formData, 'description');
  if (!description) fail(id, 'prices', 'Item description is required');

  const parsedPrice = priceSchema.safeParse(txt(formData, 'unit_price'));
  if (!parsedPrice.success) fail(id, 'prices', parsedPrice.error.issues[0].message);
  const price = parsedPrice.data;

  const { error } = await supabase
    .from('supplier_items')
    .update({ description, unit: txt(formData, 'unit') || 'Each', unit_price: price })
    .eq('id', itemId)
    .eq('supplier_id', id);
  if (error) fail(id, 'prices', error.message);

  // Log a price history row only when the price actually changed
  if (Number(current.unit_price) !== price) {
    await supabase.from('supplier_price_history').insert({
      item_id: itemId,
      supplier_id: id,
      description,
      old_price: current.unit_price,
      new_price: price,
      changed_by: user.id,
    });
  }

  revalidatePath(base(id));
  done(id, 'prices', 'Item updated');
}

export async function deleteItem(id: string, itemId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from('supplier_items')
    .delete()
    .eq('id', itemId)
    .eq('supplier_id', id);
  if (error) fail(id, 'prices', error.message);

  revalidatePath(base(id));
  done(id, 'prices', 'Item deleted');
}

export async function importPriceList(id: string, formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) fail(id, 'prices', 'Choose a CSV or Excel file');
  if ((file as File).size > 5 * 1024 * 1024) fail(id, 'prices', 'File must be 5 MB or smaller');

  let parsed: ReturnType<typeof parsePriceList>;
  try {
    parsed = parsePriceList(Buffer.from(await (file as File).arrayBuffer()));
  } catch (err) {
    fail(id, 'prices', (err as Error).message);
  }
  if (parsed.rows.length === 0) fail(id, 'prices', 'No valid price rows found in the file');

  const { data: last } = await supabase
    .from('supplier_items')
    .select('line_no')
    .eq('supplier_id', id)
    .order('line_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  let next = last?.line_no ?? 0;
  const rows = parsed.rows.map((r) => ({
    supplier_id: id,
    line_no: ++next,
    his_item_code: r.his_item_code,
    description: r.description,
    unit: r.unit,
    unit_price: r.unit_price,
    currency: 'LKR',
  }));

  const { data: inserted, error } = await supabase
    .from('supplier_items')
    .insert(rows)
    .select('id, description, unit_price');
  if (error || !inserted) fail(id, 'prices', error?.message ?? 'Import failed');

  await supabase.from('supplier_price_history').insert(
    inserted.map((i) => ({
      item_id: i.id,
      supplier_id: id,
      description: i.description,
      old_price: null,
      new_price: i.unit_price,
      changed_by: user.id,
    })),
  );

  revalidatePath(base(id));
  done(id, 'prices', `Imported ${inserted.length} items (${parsed.skipped} skipped)`);
}
