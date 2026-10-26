import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/admin-login/actions';
import { btnGhost } from '@/components/admin-ui';

const NAV = [
  { href: '/admin', label: 'Directory' },
  { href: '/admin/import', label: 'Import data' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) redirect('/admin-login?error=not_authorised');

  return (
    <div className="-mx-6 -my-10 min-h-[80vh] bg-slate-950 text-slate-100">
      <div className="grid lg:grid-cols-[250px_1fr]">
        <aside className="flex flex-col gap-8 border-b border-white/5 bg-slate-900/60 p-6 lg:border-b-0 lg:border-r">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-fuchsia-300">NMC</p>
            <p className="text-xl font-extrabold tracking-tight">Procurement</p>
          </div>
          <nav className="flex flex-wrap gap-2 lg:flex-col">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <p className="break-all text-xs text-slate-500">{user.email}</p>
            <form action={signOut}>
              <button type="submit" className={`${btnGhost} w-full`}>Sign out</button>
            </form>
          </div>
        </aside>
        <main className="mx-auto w-full max-w-6xl p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
