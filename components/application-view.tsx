import { FIELDS, SECTIONS } from '@/lib/questionnaire';
import { card } from '@/components/admin-ui';

type App = {
  answers?: Record<string, string>;
  items_services?: string[];
  management?: { name: string; title: string }[];
  past_experience?: { company: string; contact: string; period: string }[];
};

/** Read-only view of every PDF answer the supplier submitted. */
export function ApplicationView({ data }: { data: App | null | undefined }) {
  const a = data?.answers ?? {};
  const hasAny =
    Object.keys(a).length > 0 ||
    (data?.items_services?.length ?? 0) > 0 ||
    (data?.management?.length ?? 0) > 0 ||
    (data?.past_experience?.length ?? 0) > 0;

  if (!hasAny) {
    return (
      <section className={`${card} text-sm text-slate-500`}>
        No questionnaire answers on file (added before the v3 form, or imported from HIS).
      </section>
    );
  }

  return (
    <section className={`${card} space-y-8`}>
      <div>
        <h2 className="text-lg font-bold">Submitted application answers</h2>
        <p className="mt-1 text-xs text-slate-500">Read-only. Matches the PDF questionnaire and pre-qualification forms.</p>
      </div>

      {(Object.keys(SECTIONS) as (keyof typeof SECTIONS)[]).map((sec) => {
        const rows = FIELDS.filter((f) => f.section === sec && a[f.key]);
        if (rows.length === 0) return null;
        return (
          <div key={sec}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{SECTIONS[sec]}</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              {rows.map((f) => (
                <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <dt className="text-xs text-slate-500">{f.label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-slate-800 capitalize">{a[f.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}

      {(data?.items_services?.length ?? 0) > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Description of items / services</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {data!.items_services!.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}

      {(data?.management?.length ?? 0) > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Principal management personnel</p>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data!.management!.map((m, i) => (
                <tr key={i}><td className="py-2 pr-4 text-slate-500">{i + 1}</td><td className="py-2 pr-4 font-semibold">{m.name}</td><td className="py-2 text-slate-600">{m.title || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(data?.past_experience?.length ?? 0) > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Record of past experience (Form 02)</p>
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] uppercase text-slate-500">
              <tr><th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Contact</th><th className="py-2">Period</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data!.past_experience!.map((p, i) => (
                <tr key={i}><td className="py-2 pr-4 font-semibold">{p.company}</td><td className="py-2 pr-4 text-slate-600">{p.contact || '—'}</td><td className="py-2 text-slate-600">{p.period || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
