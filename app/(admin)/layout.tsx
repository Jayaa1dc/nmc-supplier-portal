import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/admin-login/actions';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '⌂' },
  { href: '/admin/suppliers', label: 'Suppliers', icon: '▦' },
  { href: '/admin/requests', label: 'Supplier requests', icon: '✓' },
  { href: '/admin/compare', label: 'Price comparison', icon: '⇄' },
  { href: '/admin/contacts', label: 'Contacts', icon: '☎' },
  { href: '/admin/documents', label: 'Documents', icon: '▤' },
  { href: '/admin/operations', label: 'Purchase orders', icon: '◫' },
  { href: '/admin/import', label: 'Import data', icon: '⇧' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) redirect('/admin-login?error=not_authorised');

  const { count: pendingCount } = await supabase
    .from('suppliers')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'under_review', 'changes_requested']);

  return (
    <div className="nmc-workspace -mx-5 -my-8 min-h-screen lg:-mx-8">
      <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="nmc-sidebar flex flex-col px-4 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-lg font-black">✚</div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200">Nawaloka Medical Centres</p>
              <p className="text-base font-semibold">Supplier Portal</p>
            </div>
          </div>
          <nav className="space-y-0.5" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                <span className="w-5 text-center text-base text-sky-200">{n.icon}</span>
                <span className="flex-1">{n.label}</span>
                {n.href === '/admin/requests' && (pendingCount ?? 0) > 0 && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">{pendingCount}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
            <p className="truncate px-2 text-xs text-slate-300">{user.email}</p>
            <form action={signOut}>
              <button type="submit" className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10">Sign out</button>
            </form>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 lg:px-8">
            <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
              <span>Procurement</span><span className="mx-2 text-slate-300">/</span><span className="font-medium text-slate-800">Supplier management</span>
            </nav>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <form action="/admin/suppliers" method="get" className="flex-1 sm:w-80">
                <label className="sr-only" htmlFor="global-search">Search suppliers</label>
                <input id="global-search" name="q" placeholder="Search supplier, HIS code, contact…" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10" />
              </form>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800" aria-label="Signed in user">{(user.email?.[0] ?? 'P').toUpperCase()}</span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1500px] p-5 md:p-7">{children}</main>
        </section>
      </div>
    </div>
  );
}
