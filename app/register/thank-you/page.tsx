export default async function ThankYou({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold text-navy">Application received</h1>
      <p className="mt-3 text-zinc-600">
        Thank you. The Procurement Division will review your pre-qualification and contact you.
        Your HIS supplier code will be assigned after approval.
      </p>
      {ref && (
        <p className="mt-4 text-sm text-zinc-500">
          Reference: <span className="font-mono font-semibold text-navy">{ref}</span>
        </p>
      )}
    </div>
  );
}
