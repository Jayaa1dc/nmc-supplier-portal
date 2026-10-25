import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/admin-login/actions';

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
    <div className="-mx-6 -my-10">
      <nav className="bg-navy px-6 py-3 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <span className="font-semibold tracking-wide">NMC Procurement</span>
            <Link href="/admin" className="hover:text-gold">Suppliers</Link>
            <Link href="/admin/import" className="hover:text-gold">Import list</Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-300 sm:inline">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="rounded-md border border-gold px-3 py-1 text-gold hover:bg-gold hover:text-navy">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </div>
  );
}
