'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Public pages get a light top bar; the admin area renders its own sidebar shell. */
export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');
  if (isAdminArea) return <>{children}</>;

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="block">
            <p className="label">Nawaloka Medical Centre</p>
            <p className="text-lg font-bold tracking-tight">Supplier Directory</p>
          </Link>
        </div>
      </header>
      <main className="page-enter mx-auto max-w-5xl px-6 py-10">{children}</main>
    </>
  );
}
