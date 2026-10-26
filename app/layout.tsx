import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import AppFrame from '@/components/AppFrame';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Nawaloka Medical Centre — Supplier Registration',
  description: 'Supplier directory and pre-qualification portal',
};

export const viewport: Viewport = {
  themeColor: '#fafafa',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
