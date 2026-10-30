import type { Metadata } from 'next';
import Link from 'next/link';
import { Noto_Sans_Sinhala } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const sinhala = Noto_Sans_Sinhala({
  subsets: ['sinhala'],
  variable: '--font-sinhala',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nawaloka Medical Centre | Supplier Portal',
  description: 'Nawaloka Medical Centre supplier registration, pre-qualification and procurement workspace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sinhala.variable} min-h-screen bg-slate-50 font-sans text-slate-900 antialiased`}>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 lg:px-8">
            <Link href="/" className="flex items-center gap-4 rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nmc-logo.webp" alt="Nawaloka Medical Centre logo" className="h-16 w-16 shrink-0 object-contain" />
              <div>
                <p className="text-lg font-extrabold leading-tight tracking-tight text-slate-900 sm:text-xl">Nawaloka Medical Centre</p>
                <p className="si text-sm font-medium text-slate-700" lang="si">නවලෝක මෙඩිකල් සෙන්ටර්</p>
              </div>
            </Link>
            <p className="ml-auto hidden text-xs font-semibold uppercase tracking-[0.14em] text-sky-800 md:block">
              Supplier Directory &amp; Pre-Qualification
            </p>
          </div>
          <div className="h-1 bg-gold" />
        </header>
        <main className="w-full px-5 py-8 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
