import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nawaloka Medical Centre: Supplier Registration',
  description: 'Supplier directory and pre-qualification portal',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nmc-logo.webp" alt="Nawaloka Medical Centre" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Nawaloka Medical Centre</p>
              <p className="text-lg font-extrabold tracking-tight text-zinc-900">Supplier Directory &amp; Pre-Qualification</p>
            </div>
          </div>
          <div className="h-1 bg-gold" />
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
