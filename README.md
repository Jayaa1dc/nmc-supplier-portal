# NMC Supplier Directory & Pre-Qualification Portal

Next.js (App Router) · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Resend

## What it does

| Area | Route | Notes |
|---|---|---|
| Public registration | `/register` | Mirrors Form 44/FO/MC/GN/01 and Form 03 categories. Mandatory **Existing HIS Supplier Code**. Dynamic item/price rows. Five document slots. |
| Document storage | Supabase bucket `supplier-documents` | Private. PDF/JPG/PNG/WEBP, 10 MB max, magic-number checked. |
| Email alert | Resend → `ADMIN_NOTIFICATION_EMAIL` | Sent after a successful save; contains HIS code, details, price list, and a review link. Reply-to is the supplier. |
| Admin dashboard | `/admin` | Search by HIS code or name, filter by status, category coverage flags. |
| Supplier review | `/admin/suppliers/[id]` | Inspect PDFs/images via signed URLs, review price list, set Pending / Approved / Rejected with internal notes. |
| Bulk import | `/admin/import` | CSV/XLSX branch lists with existing HIS codes. Matches existing codes, never duplicates them. |

**HIS codes are never generated.** The database enforces `supplier_code` as unique and in the format `SP` + 8 digits (matching the codes in your branch lists, e.g. `SP00000108`). If HIS ever issues a different format, change the check constraint and `HIS_CODE_REGEX` together.

## 1. Supabase setup

1. Create a project. Copy the URL, anon key, and service-role key.
2. SQL Editor → run `supabase/schema.sql` (once, on a fresh project).
3. Authentication → Users → **Add user** for each procurement officer. Then run the seed `insert` at the bottom of the schema file.

Security model:
- The **anon** role has no table policies. Public submissions go through a server action that uses the service-role key after validation.
- Admin reads and status updates run under the admin's own session. RLS (`is_admin()`) enforces them.
- Storage files are private. Admins get 10-minute signed URLs.

## 2. Resend setup

1. Verify your sending domain in Resend (DNS records).
2. Create an API key. Set `RESEND_FROM_EMAIL` to an address on that domain.

## 3. Run locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

## 4. Deploy

Deploy to Vercel (or any Node host). Add every variable from `.env.example` to the project settings. Use the production URL for `NEXT_PUBLIC_SITE_URL`.

## Importing the existing lists

Open `/admin/import`, choose the branch file (for example `Battaramulla_Suppliers_list.xlsx`), pick the branch, and run the import. The importer:
- finds the header row automatically (branch files have title rows above it);
- reads the columns `Supplier Code`, `Supplier`, and optionally `Phone`, `Email`, `Contact Person`, `Notes`;
- normalises phone numbers that Excel saved without the leading zero;
- skips rows with an invalid HIS code and reports them with entry numbers;
- for codes that already exist, adds the branch to the record and fills blank contact fields only.

Run it once per branch file. Re-running is safe.

## Design notes

- **Duplicate HIS codes:** a code with a pending or approved record cannot be re-submitted through the form. That blocks anyone from overwriting a live record with a known code. A rejected applicant can re-apply; the record is reset to Pending and the old documents are removed.
- **Atomicity:** the registration action rolls back on failure (deletes uploaded files and, for a new record, the supplier row).
- **Spam:** a honeypot field is included. For production traffic, add Cloudflare Turnstile or hCaptcha at the form level.
- **Single-source risk:** the dashboard flags categories with one or zero approved suppliers. This follows the rule that tier-1 categories should not rely on a single source without a documented contingency plan.

## Not included (recommended next steps)

- Validating each submitted HIS code against an HIS export. Currently it checks format and uniqueness only.
- Generated PDF of the completed application for the physical file.
- Supplier-facing status lookup (code + email, then a one-time link).
- Automated tests (Playwright for the form, Vitest for `lib/schemas.ts` and `lib/import.ts`).
- Regenerating Supabase TypeScript types (`supabase gen types typescript`) to replace the untyped client calls.


## UI refresh (October 2026)

The admin workspace has been refreshed with a light, enterprise ERP-inspired design: navy navigation, a clean workspace header, responsive KPI cards, clearer form controls, and light status badges. Existing routes, server actions, Supabase data access, supplier registration, review, price list, and import workflows are retained. This is a UI refresh, not an SAP integration.

### Security dependency note

The Next.js dependency is pinned to `15.5.28`, the patched 15.x release for the October 2026 critical security advisories. React and React DOM are pinned to `19.0.9`. After pulling the project, run `npm install` so your local dependency tree and lockfile are regenerated, then run `npm run typecheck` and `npm run build`.
