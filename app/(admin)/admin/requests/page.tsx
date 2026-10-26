import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge, Banner, PageHeader, card, btn, btnDanger, btnGhost, EmptyState } from '@/components/admin-ui';
import { REVIEW_ACTIONS, STATUS_LABEL } from '@/lib/approval';
import { reviewRequest } from './actions';

const TABS = [
  { key: 'open', label: 'Open', statuses: ['pending', 'under_review', 'changes_requested'] },
  { key: 'pending', label: 'Submitted', statuses: ['pending'] },
  { key: 'under_review', label: 'Under review', statuses: ['under_review'] },
  { key: 'changes_requested', label: 'Changes requested', statuses: ['changes_requested'] },
  { key: 'approved', label: 'Approved', statuses: ['approved'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
];

export default async function Requests({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];
  const supabase = await createClient();

  const [{ data: rows }, { data: log }] = await Promise.all([
    supabase
      .from('suppliers')
      .select('id, status, company_name, supplier_code, application_ref, contact_person, email, telephone, categories, submitted_at, review_notes, reviewed_at, source')
      .in('status', tab.statuses)
      .order('submitted_at', { ascending: false })
      .limit(200),
    supabase
      .from('supplier_approval_log')
      .select('supplier_id, from_status, to_status, reason, actor_email, created_at')
      .order('created_at', { ascending: false })
      .limit(400),
  ]);

  const history = new Map<string, typeof log>();
  (log ?? []).forEach((l) => history.set(l.supplier_id, [...(history.get(l.supplier_id) ?? []), l]));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Approval workflow" title="Supplier requests" />

      {sp.ok && <Banner tone="ok">{sp.ok}</Banner>}
      {sp.err && <Banner tone="err">{sp.err}</Banner>}

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Request status">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/requests?tab=${t.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab.key === t.key ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {(rows ?? []).length === 0 ? (
        <EmptyState title={`No ${tab.label.toLowerCase()} requests`} text="Requests appear here when a supplier submits the public registration form." />
      ) : (
        <div className="space-y-4">
          {(rows ?? []).map((r) => {
            const h = (history.get(r.id) ?? []).slice(0, 5);
            const actions = Object.entries(REVIEW_ACTIONS).filter(([, a]) => a.to !== r.status);
            return (
              <article key={r.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge status={r.status} />
                      <span className="font-mono text-xs text-slate-500">{r.supplier_code ?? `Ref ${r.application_ref ?? '—'} · HIS code pending`}</span>
                    </div>
                    <Link href={`/admin/suppliers/${r.id}`} className="block text-lg font-semibold text-slate-900 hover:text-sky-700">{r.company_name}</Link>
                    <p className="text-sm text-slate-600">{r.contact_person ?? '—'} · {r.email ?? 'no email'} · {r.telephone ?? 'no phone'}</p>
                    <p className="text-xs text-slate-500">Submitted {r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-GB') : '—'} · {(r.categories as string[])?.length ?? 0} categories</p>
                    {r.review_notes && <p className="text-sm text-amber-800">Last note: {r.review_notes}</p>}
                  </div>
                  <Link href={`/admin/suppliers/${r.id}`} className={btnGhost}>Open profile</Link>
                </div>

                {actions.length > 0 && (
                  <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 lg:grid-cols-[1fr_auto]">
                    <form action={reviewRequest} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      {actions.map(([key, a]) => {
                        const cls = key === 'approve' ? btn : key === 'reject' ? btnDanger : btnGhost;
                        return (
                          <button key={key} name="action" value={key} type="submit" className={cls}>
                            {a.label}
                          </button>
                        );
                      })}
                      <input name="reason" placeholder="Reason (required for reject or request changes)" className="min-w-[260px] flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
                    </form>
                  </div>
                )}

                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer font-medium text-sky-700">Approval history ({history.get(r.id)?.length ?? 0})</summary>
                  {h.length === 0 ? (
                    <p className="mt-2 text-slate-500">No status changes recorded yet.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {h.map((x, i) => (
                        <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <span className="font-semibold">{x.from_status ? STATUS_LABEL[x.from_status] : 'Created'}</span> → <span className="font-semibold">{STATUS_LABEL[x.to_status]}</span>
                          {' · '}{x.actor_email ?? 'system'}{' · '}{new Date(x.created_at).toLocaleString('en-GB')}
                          {x.reason ? <div className="mt-1 italic text-slate-600">“{x.reason}”</div> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
