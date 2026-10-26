'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { REVIEW_ACTIONS, recordTransition, type ReviewAction } from '@/lib/approval';

function back(msg: string, ok: boolean): never {
  redirect(`/admin/requests?${ok ? 'ok' : 'err'}=${encodeURIComponent(msg)}`);
}

/**
 * Approval workflow. Runs with the reviewer's session, so the database
 * constraints and RLS are the real enforcement. Every change is logged.
 */
export async function reviewRequest(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '') as ReviewAction;
  const reason = String(formData.get('reason') ?? '').trim();
  const def = REVIEW_ACTIONS[action];
  if (!id || !def) back('Unknown review action', false);
  if (def.needsReason && reason.length < 5) back(`${def.label}: please give a reason (at least 5 characters)`, false);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');

  const { data: cur } = await supabase.from('suppliers').select('status, supplier_code, company_name').eq('id', id).maybeSingle();
  if (!cur) back('Supplier request not found', false);
  if (cur.status === def.to) back('Status is already set to this value', false);
  if (def.to === 'approved' && !cur.supplier_code) {
    back('Enter the HIS supplier code on the supplier profile before approving', false);
  }

  const { error } = await supabase
    .from('suppliers')
    .update({
      status: def.to,
      review_notes: reason || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) back(error.message, false);

  await recordTransition(supabase, { supplierId: id, from: cur.status, to: def.to, reason, userId: user.id, email: user.email ?? null });

  revalidatePath('/admin');
  revalidatePath('/admin/requests');
  revalidatePath(`/admin/suppliers/${id}`);
  back(`${cur.company_name}: ${def.label.toLowerCase()} done`, true);
}
