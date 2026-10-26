'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Sets or clears the expiry date. RLS allows this only for admins. */
export async function setDocumentExpiry(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const raw = String(formData.get('expires_on') ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) && raw !== '') redirect('/admin/documents?err=Invalid+date');

  const supabase = await createClient();
  const { error } = await supabase
    .from('supplier_documents')
    .update({ expires_on: raw || null })
    .eq('id', id);
  if (error) redirect(`/admin/documents?err=${encodeURIComponent(error.message)}`);

  revalidatePath('/admin/documents');
  redirect('/admin/documents?ok=Expiry+date+saved');
}
