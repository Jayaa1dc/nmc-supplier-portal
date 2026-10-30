import Link from 'next/link';

export default async function ThankYou({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return (
    <div className="rise mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-800" aria-hidden="true">✓</span>
      <h1 className="mt-5 text-2xl font-extrabold text-slate-900">Application received</h1>
      <p className="si text-lg font-semibold text-slate-700" lang="si">ඔබේ ඉල්ලුම්පත්‍රය ලැබුණා</p>
      <p className="mt-4 text-base text-slate-700">
        Thank you. The Procurement Division will review your pre-qualification and contact you. Your HIS supplier code will be assigned after approval.
      </p>
      <p className="si mt-1 text-base text-slate-600" lang="si">
        ස්තුතියි. සපයා ගැනීම් අංශය ඔබේ පූර්ව සුදුසුකම් ඉල්ලුම්පත්‍රය සමාලෝචනය කර ඔබව සම්බන්ධ කරගනී. අනුමත කිරීමෙන් පසු ඔබට HIS සැපයුම්කරු කේතය ලැබේ.
      </p>
      {ref && (
        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Reference / යොමු අංකය: <span className="font-mono text-base font-bold text-slate-900">{ref}</span>
        </p>
      )}
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-sky-800 underline-offset-4 hover:underline">← Back to home / මුල් පිටුවට</Link>
    </div>
  );
}
