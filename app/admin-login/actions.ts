'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/admin-login?error=invalid');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    await supabase.auth.signOut();
    redirect('/admin-login?error=not_authorised');
  }
  redirect('/admin');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin-login');
}
