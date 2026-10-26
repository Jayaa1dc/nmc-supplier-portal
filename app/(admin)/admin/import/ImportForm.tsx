'use client';

import { useActionState } from 'react';
import { importLegacySuppliers, type ImportReport } from './actions';
import { inputCls } from '@/components/ui';

const BRANCHES = ['Battaramulla', 'Kiribathgoda', 'Panadura', 'Ja-Ela', 'Kirillawala', 'Kurunegala', 'Peliyagoda', 'Head Office'];

export default function ImportForm() {
  const [report, formAction, pending] = useActionState<ImportReport | null, FormData>(importLegacySuppliers, null);

  return (
    <div className="space-y-6">
      <form action={formAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Branch list file (.xlsx, .xls or .csv)</span>
          <input type="file" name="file" required accept=".xlsx,.xls,.csv" className="text-sm" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Branch</span>
          <select name="branch" required className={inputCls}>
            <option value="">Select branch…</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Initial status for new records</span>
          <select name="status" defaultValue="approved" className={inputCls}>
            <option value="approved">Approved (current suppliers)</option>
            <option value="pending">Pending (needs re-qualification)</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={pending} className="rounded-md bg-navy px-5 py-2.5 font-semibold text-slate-900 hover:bg-navy-700 disabled:opacity-60">
            {pending ? 'Importing…' : 'Import suppliers'}
          </button>
        </div>
        <p className="text-xs text-slate-500 md:col-span-2">
          The file needs a header row containing <strong>Supplier Code</strong> and <strong>Supplier</strong>. Optional columns:
          Phone, Email, Contact Person, Notes. Title rows above the header are ignored.
        </p>
      </form>

      {report && !report.ok && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{report.message}</div>
      )}

      {report?.ok && (
        <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
          <p className="font-semibold">Import complete (sheet “{report.sheet}”)</p>
          <ul className="list-disc pl-5">
            <li>{report.inserted} new supplier records created</li>
            <li>{report.merged} existing records linked to this branch (status unchanged)</li>
            <li>{report.skipped} rows skipped</li>
          </ul>
          {report.errors && report.errors.length > 0 && (
            <details>
              <summary className="cursor-pointer font-medium">View skipped rows</summary>
              <ul className="mt-2 max-h-64 overflow-auto font-mono text-xs">
                {report.errors.map((e, i) => <li key={i}>Entry {e.entry}: {e.reason}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
