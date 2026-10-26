export default async function ThankYou({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-bold tracking-tight">Application received</h1>
      <p className="mt-3 text-zinc-600">
        Thank you. Our Procurement Division will review your pre-qualification and contact you.
      </p>
      {code && (
        <p className="mt-4 text-sm text-zinc-500">
          HIS Supplier Code: <span className="font-mono font-semibold text-zinc-900">{code}</span>
        </p>
      )}
    </div>
  );
}
