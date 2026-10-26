import Link from 'next/link';

export default function Home() {
  return (
    <div className="stagger mx-auto max-w-2xl space-y-6 py-10 text-center">
      <p className="label">Supplier pre-qualification</p>
      <h1 className="text-4xl font-bold tracking-tight">Become a Nawaloka supplier</h1>
      <p className="text-zinc-500">
        Register your company for pre-qualification. Use the Existing HIS Supplier Code issued
        by Nawaloka Medical Centre so your records stay consistent with our systems.
      </p>
      <div>
        <Link href="/register" className="btn px-6 py-2.5">Start registration</Link>
      </div>
    </div>
  );
}
