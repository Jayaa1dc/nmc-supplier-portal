import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nawaloka Medical Centre — Supplier Registration',
  description: 'Supplier directory and pre-qualification portal',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <header className="bg-navy text-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-semibold tracking-wide">NAWALOKA MEDICAL CENTRE</p>
              <p className="text-xs text-gold">Supplier Directory &amp; Pre-Qualification</p>
            </div>
          </div>
          <div className="h-1 bg-gold" />
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
