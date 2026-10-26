export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending: 'Submitted',
  under_review: 'Under review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const REVIEW_ACTIONS = {
  start_review: { to: 'under_review', label: 'Start review', needsReason: false },
  request_changes: { to: 'changes_requested', label: 'Request changes', needsReason: true },
  reject: { to: 'rejected', label: 'Reject', needsReason: true },
  approve: { to: 'approved', label: 'Approve', needsReason: false },
} as const;

export type ReviewAction = keyof typeof REVIEW_ACTIONS;

type Db = {
  from: (t: string) => any;
};

/** Writes one row to the approval history. Called after every status change. */
export async function recordTransition(
  db: Db,
  args: { supplierId: string; from: string | null; to: string; reason?: string | null; userId: string; email: string | null },
) {
  await db.from('supplier_approval_log').insert({
    supplier_id: args.supplierId,
    from_status: args.from,
    to_status: args.to,
    reason: args.reason || null,
    actor_id: args.userId,
    actor_email: args.email,
  });
}
