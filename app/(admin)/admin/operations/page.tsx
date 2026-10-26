import { PageHeader, card, EmptyState } from '@/components/admin-ui';

export default function Operations() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Procurement operations" title="Purchase orders & deliveries" />
      <EmptyState
        title="Not connected yet"
        text="This portal does not store purchase orders, goods receipts, or delivery dates yet. Nothing is shown here so that no placeholder figures are mistaken for live data."
      />
      <section className={card}>
        <h2 className="font-semibold text-slate-900">What is needed to switch this on</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Purchase order table (PO number, supplier, items, quantities, order date, expected delivery).</li>
          <li>Goods receipt table (PO, received quantity, received date) to calculate on-time delivery.</li>
          <li>Reports for supplier performance, approval turnaround, and document expiry built from these tables.</li>
        </ol>
        <p className="mt-4 text-xs text-slate-500">Supplier approvals, price lists, contacts, and document expiry are already live in this portal.</p>
      </section>
    </div>
  );
}
