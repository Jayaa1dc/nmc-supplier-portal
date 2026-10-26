import ImportForm from './ImportForm';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Import existing HIS supplier list</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Load branch supplier lists (Battaramulla, Kiribathgoda, Panadura, Ja-Ela, Kirillawala, Kurunegala) with their
          existing HIS codes. Existing codes are matched and never duplicated, so the directory stays aligned with HIS.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
