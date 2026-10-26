import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/admin-login/actions';
import AdminNav from '@/components/AdminNav';

/**
 * Every page under (admin) passes through here. Authentication is checked by
 * middleware; authorisation (admin_users membership) is checked here and in RLS.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) redirect('/admin-login?error=not_authorised');

  return (
    <div className="grid min-h-screen lg:grid-cols-[232px_1fr]">
      <aside className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-zinc-200 bg-white p-6 lg:flex-col lg:items-stretch lg:gap-8 lg:border-b-0 lg:border-r">
        <div>
          <p className="label">NMC</p>
          <p className="text-lg font-bold tracking-tight">Procurement</p>
        </div>
        <AdminNav />
        <div className="ml-auto flex items-center gap-3 lg:ml-0 lg:mt-auto lg:flex-col lg:items-stretch">
          <p className="hidden max-w-[10rem] truncate text-xs text-zinc-500 sm:block lg:max-w-none">{user.email}</p>
          <form action={signOut}>
            <button type="submit" className="btn-ghost w-full text-xs">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="page-enter mx-auto w-full min-w-0 max-w-6xl p-6 lg:p-10">{children}</main>
    </div>
  );
}
