import ImportForm from './ImportForm';

export default function ImportPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="label">Data</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Import existing HIS supplier list</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Load branch supplier lists (Battaramulla, Kiribathgoda, Panadura, Ja-Ela, Kirillawala, Kurunegala) with their
          existing HIS codes. Existing codes are matched and never duplicated, so the directory stays aligned with HIS.
        </p>
      </header>
      <ImportForm />
    </div>
  );
}
