import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'NMC Supplier Portal | Procurement Workspace',
  description: 'Nawaloka Medical Centres supplier directory and procurement workspace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 lg:px-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nmc-logo.webp" alt="Nawaloka Medical Centre" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Nawaloka Medical Centre</p>
              <p className="text-base font-bold tracking-tight text-slate-900">Supplier Directory &amp; Pre-Qualification</p>
            </div>
          </div>
          <div className="h-0.5 bg-sky-600" />
        </header>
        <main className="w-full px-5 py-8 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
