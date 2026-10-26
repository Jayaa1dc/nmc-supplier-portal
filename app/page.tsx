import Link from 'next/link';

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-3xl font-semibold text-navy">Become a Nawaloka supplier</h1>
      <p className="text-slate-600">
        Register your company for pre-qualification. Use the Existing HIS Supplier Code issued
        by Nawaloka Medical Centre so your records stay consistent with our systems.
      </p>
      <Link
        href="/register"
        className="inline-block rounded-md bg-gold px-5 py-2.5 font-semibold text-navy hover:bg-gold/90"
      >
        Start registration
      </Link>
    </div>
  );
}
