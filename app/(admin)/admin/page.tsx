import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge, Kpi, PageHeader, card, btn, btnGhost } from '@/components/admin-ui';
import { STATUS_LABEL } from '@/lib/approval';

const DAY = 86_400_000;

export default async function Dashboard() {
  const supabase = await createClient();
  const soon = new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * DAY).toISOString();

  const [{ data: suppliers }, { data: items }, { data: docs }, { data: recent }, { data: updates }] = await Promise.all([
    supabase.from('suppliers').select('id, status, is_active, company_name, supplier_code, application_ref, submitted_at'),
    supabase.from('supplier_items').select('supplier_id'),
    supabase.from('supplier_documents').select('id, expires_on'),
    supabase
      .from('supplier_approval_log')
      .select('id, to_status, reason, actor_email, created_at, suppliers(company_name, supplier_code, application_ref)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('supplier_items').select('id').gte('updated_at', monthAgo),
  ]);

  const all = suppliers ?? [];
  const active = all.filter((s) => s.status === 'approved' && s.is_active !== false).length;
  const openReviews = all.filter((s) => ['pending', 'under_review', 'changes_requested'].includes(s.status));
  const pricedIds = new Set((items ?? []).map((i) => i.supplier_id));
  const approvedNoPrices = all.filter((s) => s.status === 'approved' && !pricedIds.has(s.id)).length;
  const expiring = (docs ?? []).filter((d) => d.expires_on && d.expires_on <= soon).length;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Procurement overview" title="Dashboard">
        <Link href="/admin/requests" className={btnGhost}>Review requests</Link>
        <Link href="/admin/import" className={btn}>+ Import supplier data</Link>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Active suppliers" value={active} sub="Approved and active" />
        <Kpi label="Pending approvals" value={openReviews.length} sub="Submitted, under review or changes requested" tone={openReviews.length ? 'warn' : 'default'} />
        <Kpi label="Approved without price list" value={approvedNoPrices} sub="Add items before sourcing" tone={approvedNoPrices ? 'warn' : 'default'} />
        <Kpi label="Documents expiring (30 days)" value={expiring} sub="Includes already expired" tone={expiring ? 'bad' : 'default'} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className={`${card} xl:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent activity</h2>
            <Link href="/admin/requests" className="text-sm font-medium text-sky-700 hover:underline">View all</Link>
          </div>
          {(recent ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No approval activity yet. Activity appears here after a supplier is reviewed.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(recent ?? []).map((r: any) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{r.suppliers?.company_name ?? 'Supplier'}</p>
                    <p className="text-xs text-slate-500">
                      {r.actor_email ?? 'System'} · {new Date(r.created_at).toLocaleString('en-GB')}
                      {r.reason ? ` · “${r.reason}”` : ''}
                    </p>
                  </div>
                  <Badge status={r.to_status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Tasks & approvals</h2>
            <Link href="/admin/requests" className="text-sm font-medium text-sky-700 hover:underline">View all</Link>
          </div>
          {openReviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No supplier requests waiting for review.</p>
          ) : (
            <ul className="space-y-3">
              {openReviews.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/suppliers/${s.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-sky-300 hover:bg-sky-50/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{s.company_name}</p>
                      <p className="font-mono text-xs text-slate-500">{s.supplier_code ?? s.application_ref ?? 'No HIS code yet'}</p>
                    </div>
                    <Badge status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className={card}>
          <h2 className="font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ['/admin/requests', 'Review requests'],
              ['/admin/compare', 'Compare prices'],
              ['/admin/contacts', 'View contacts'],
              ['/admin/documents', 'Document library'],
              ['/admin/suppliers', 'Supplier directory'],
              ['/admin/import', 'Import data'],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-sky-300 hover:bg-sky-50/40">
                {label} <span className="float-right text-sky-600">→</span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">Price updates in the last 30 days: <span className="font-semibold text-slate-800">{updates?.length ?? 0}</span> item(s).</p>
        </section>

        <section className={`${card} xl:col-span-2`}>
          <h2 className="font-semibold text-slate-900">Upcoming deliveries & supplier performance</h2>
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Not connected yet</p>
            <p className="mt-1">Delivery dates and on-time performance need purchase order and goods receipt data. This data is not in the portal database yet, so no figures are shown. See the Purchase orders page for what is needed.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
