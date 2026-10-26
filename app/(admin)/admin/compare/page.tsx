import { createClient } from '@/lib/supabase/server';
import { PageHeader, card, field, btn, EmptyState } from '@/components/admin-ui';

const money = (n: number) => Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 });

export default async function Compare({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const term = q.replace(/[%,()*]/g, '').trim();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  let rows: any[] = [];
  if (term) {
    const { data } = await supabase
      .from('supplier_items')
      .select('id, description, unit, unit_price, updated_at, suppliers!inner(id, company_name, supplier_code, application_ref, status, price_validity_until)')
      .ilike('description', `%${term}%`)
      .limit(300);
    rows = data ?? [];
  }

  // Group identical item descriptions so suppliers can be compared side by side
  const groups = new Map<string, any[]>();
  rows.forEach((r) => {
    const key = String(r.description).trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Quotations & price lists" title="Price comparison" />

      <form method="get" className={`${card} flex flex-wrap items-end gap-3 !p-4`}>
        <label className="min-w-[280px] flex-1 space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Item description</span>
          <input name="q" defaultValue={q} placeholder="e.g. syringe, reagent, A4 paper" className={field} />
        </label>
        <button type="submit" className={btn}>Compare</button>
      </form>

      {!term && <EmptyState title="Search an item to compare" text="Prices come from supplier price lists. Enter an item description to see every supplier that quoted it." />}

      {term && groups.size === 0 && <EmptyState title="No price items match" text="Only prices recorded in supplier price lists are compared. Check the spelling or add the price list first." />}

      {[...groups.entries()].map(([key, list]) => {
        const sorted = [...list].sort((a, b) => Number(a.unit_price) - Number(b.unit_price));
        const lowest = sorted[0];
        const comparable = new Set(list.map((x) => x.unit)).size === 1 && list.length > 1;
        return (
          <section key={key} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">{list[0].description}</h2>
                <p className="text-xs text-slate-500">{list.length} supplier price(s){comparable ? '' : ' · units differ, compare with care'}</p>
              </div>
              {list.length > 1 && (
                <p className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                  Lowest listed: <span className="font-semibold">{lowest.suppliers.company_name}</span>. Check quality, lead time and terms before deciding.
                </p>
              )}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs font-semibold text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-4">Supplier</th>
                    <th className="py-2 pr-4">Unit</th>
                    <th className="py-2 pr-4 text-right">Unit price (LKR)</th>
                    <th className="py-2 pr-4">Price valid until</th>
                    <th className="py-2">Last updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((r) => {
                    const v = r.suppliers.price_validity_until as string | null;
                    const expired = v && v < today;
                    return (
                      <tr key={r.id} className={r.id === lowest.id && list.length > 1 ? 'bg-emerald-50/50' : ''}>
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-slate-900">{r.suppliers.company_name}</p>
                          <p className="font-mono text-xs text-slate-500">{r.suppliers.supplier_code ?? r.suppliers.application_ref ?? ''}</p>
                        </td>
                        <td className="py-2.5 pr-4">{r.unit}</td>
                        <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">{money(Number(r.unit_price))}</td>
                        <td className="py-2.5 pr-4">
                          {v ? <span className={expired ? 'font-semibold text-rose-700' : 'text-slate-700'}>{v}{expired ? ' (expired)' : ''}</span> : <span className="text-slate-400">Not set</span>}
                        </td>
                        <td className="py-2.5 text-slate-600">{r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-GB') : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
