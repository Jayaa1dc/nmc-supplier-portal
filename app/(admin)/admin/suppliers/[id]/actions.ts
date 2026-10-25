'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const decisionSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  review_notes: z.string().trim().max(2000).optional(),
});

/**
 * Runs with the admin's own session, so the RLS policy "admins update suppliers"
 * is what actually authorises the change.
 */
export async function updateSupplierStatus(id: string, formData: FormData): Promise<void> {
  const parsed = decisionSchema.parse({
    status: formData.get('status'),
    review_notes: formData.get('review_notes') ?? undefined,
  });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase
    .from('suppliers')
    .update({
      status: parsed.status,
      review_notes: parsed.review_notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`Could not update status: ${error.message}`);

  revalidatePath('/admin');
  revalidatePath(`/admin/suppliers/${id}`);
}
