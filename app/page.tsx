import Link from 'next/link';
import type { CSSProperties } from 'react';

const d = (i: number) => ({ '--i': i }) as CSSProperties;

const STEPS = [
  {
    n: '1',
    en: 'Fill in the application',
    si: 'ඉල්ලුම්පත්‍රය පුරවන්න',
    en2: 'Company details, categories, quality information and your price list.',
    si2: 'සමාගම් විස්තර, කාණ්ඩ, තත්ත්ව තොරතුරු සහ ඔබේ මිල ලැයිස්තුව.',
  },
  {
    n: '2',
    en: 'Upload your documents',
    si: 'ලේඛන උඩුගත කරන්න',
    en2: 'Business registration, VAT and ISO certificates and the deposit receipt.',
    si2: 'ව්‍යාපාර ලියාපදිංචි සහතිකය, VAT සහ ISO සහතික සහ තැන්පතු රිසිට්පත.',
  },
  {
    n: '3',
    en: 'We review and contact you',
    si: 'අපි සමාලෝචනය කර ඔබව සම්බන්ධ කරගනිමු',
    en2: 'Our Procurement Division reviews your application. Your HIS supplier code is assigned after approval.',
    si2: 'අපගේ සපයා ගැනීම් අංශය ඔබේ ඉල්ලුම්පත්‍රය සමාලෝචනය කරයි. අනුමත කිරීමෙන් පසු ඔබට HIS සැපයුම්කරු කේතය ලැබේ.',
  },
];

const NEED = [
  ['Business registration certificate (required)', 'ව්‍යාපාර ලියාපදිංචි සහතිකය (අනිවාර්යයි)'],
  ['Price list in Excel, CSV, Word or PDF', 'Excel, CSV, Word හෝ PDF මිල ලැයිස්තුව'],
  ['VAT registration certificate (if registered)', 'VAT ලියාපදිංචි සහතිකය (ලියාපදිංචි නම්)'],
  ['ISO certificate (if you have one)', 'ISO සහතිකය (තිබේ නම්)'],
  ['Pre-qualification deposit receipt', 'පූර්ව සුදුසුකම් තැන්පතු රිසිට්පත'],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}
      <section
        className="rise grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:grid-cols-[auto_1fr] md:p-12"
        style={d(0)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nmc-logo.webp"
          alt="Nawaloka Medical Centre logo"
          className="logo-in mx-auto h-40 w-40 object-contain md:h-52 md:w-52"
        />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">Nawaloka Medical Centre</p>
          <p className="si text-base font-medium text-slate-700" lang="si">නවලෝක මෙඩිකල් සෙන්ටර්</p>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Become a Nawaloka supplier
          </h1>
          <p className="si mt-1 text-2xl font-semibold text-slate-700" lang="si">නවලෝක සැපයුම්කරුවෙකු වන්න</p>

          <p className="mt-5 max-w-2xl text-lg text-slate-700">
            Register your company for pre-qualification. Our Procurement Division reviews every application and contacts you.
          </p>
          <p className="si mt-1 max-w-2xl text-base text-slate-600" lang="si">
            පූර්ව සුදුසුකම් සඳහා ඔබේ සමාගම ලියාපදිංචි කරන්න. අපගේ සපයා ගැනීම් අංශය සෑම ඉල්ලුම්පත්‍රයක්ම සමාලෝචනය කර ඔබව සම්බන්ධ කරගනී.
          </p>

          <Link
            href="/register"
            className="press mt-7 inline-flex items-center gap-4 rounded-2xl bg-gold px-7 py-4 text-slate-900 shadow-sm hover:bg-[#e3aa04] focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/50"
          >
            <span className="text-left">
              <span className="block text-lg font-bold leading-tight">Start registration</span>
              <span className="si block text-sm font-medium" lang="si">ලියාපදිංචිය ආරම්භ කරන්න</span>
            </span>
            <span className="arrow text-2xl" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* Steps */}
      <section aria-labelledby="how" className="space-y-4">
        <div className="rise" style={d(1)}>
          <h2 id="how" className="text-xl font-bold text-slate-900">How it works</h2>
          <p className="si text-sm text-slate-600" lang="si">ක්‍රියාවලිය</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className="rise lift-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              style={d(i + 2)}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-bold leading-snug text-slate-900">{s.en}</h3>
              <p className="si text-base font-semibold text-slate-700" lang="si">{s.si}</p>
              <p className="mt-3 text-[15px] text-slate-700">{s.en2}</p>
              <p className="si mt-1 text-sm text-slate-600" lang="si">{s.si2}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* What you need */}
      <section className="rise rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8" style={d(5)}>
        <h2 className="text-xl font-bold text-slate-900">Keep these ready</h2>
        <p className="si text-sm text-slate-600" lang="si">මේවා සූදානම් කර ගන්න</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {NEED.map(([en, si]) => (
            <li key={en} className="flex gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800" aria-hidden="true">✓</span>
              <span>
                <span className="block text-[15px] font-medium text-slate-900">{en}</span>
                <span className="si block text-sm text-slate-600" lang="si">{si}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Contact + staff */}
      <footer className="rise flex flex-wrap items-start justify-between gap-4 pb-6 text-sm text-slate-600" style={d(6)}>
        <p>
          <span className="font-semibold text-slate-800">Nawaloka Medical Centre</span><br />
          No. 23, Deshamanya H.K. Dharmadasa Mawatha, Colombo 02<br />
          Tel: 5577111
        </p>
        <Link href="/admin-login" className="font-medium text-sky-800 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/30">
          Procurement staff sign in
        </Link>
      </footer>
    </div>
  );
}
