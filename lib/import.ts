import * as XLSX from 'xlsx';
import { HIS_CODE_REGEX } from './schemas';

// Header aliases so existing NMC branch lists import without reformatting.
const ALIASES = {
  supplier_code: ['supplier code', 'his code', 'his supplier code', 'supplier_code'],
  company_name: ['supplier', 'supplier name', 'company name', 'company'],
  telephone: ['phone', 'telephone', 'tel', 'telephone no', 'contact no'],
  email: ['email', 'e-mail', 'email address'],
  contact_person: ['contact person', 'contact', 'contact name'],
  notes: ['notes', 'remarks', 'note'],
} as const;

type Field = keyof typeof ALIASES;

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const clean = (v: unknown) => {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s && s.toUpperCase() !== 'N/A' ? s : null;
};

function normalizePhone(v: unknown): string | null {
  let s = String(v ?? '').replace(/[^\d+]/g, '');
  if (/^\d{9}$/.test(s)) s = '0' + s; // Excel drops the leading zero
  return s.length >= 7 ? s : null;
}

function normalizeEmail(v: unknown): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

export type ParsedRow = {
  entry: number;
  supplier_code: string;
  company_name: string;
  telephone: string | null;
  email: string | null;
  contact_person: string | null;
  notes: string | null;
};

export type ParseError = { entry: number; reason: string };

export type ParseResult = { rows: ParsedRow[]; errors: ParseError[]; sheet: string };

/**
 * Reads a CSV or XLSX legacy supplier list. The header row can sit anywhere
 * (branch lists have title rows above it); we locate the row that contains a
 * "Supplier Code" column and read everything beneath it.
 */
export function parseSupplierSheet(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  for (const sheetName of wb.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      defval: '',
      blankrows: false,
    });

    const headerRow = matrix.findIndex((row) =>
      row.some((c) => (ALIASES.supplier_code as readonly string[]).includes(norm(c))),
    );
    if (headerRow === -1) continue;

    const headers = (matrix[headerRow] as unknown[]).map(norm);
    const col = {} as Record<Field, number>;
    (Object.keys(ALIASES) as Field[]).forEach((field) => {
      col[field] = headers.findIndex((h) => (ALIASES[field] as readonly string[]).includes(h));
    });

    const rows: ParsedRow[] = [];
    const errors: ParseError[] = [];
    const seen = new Set<string>();

    for (let i = headerRow + 1; i < matrix.length; i++) {
      const r = matrix[i] as unknown[];
      const entry = i - headerRow;
      const get = (f: Field) => (col[f] >= 0 ? r[col[f]] : '');

      const code = String(get('supplier_code') ?? '').trim().toUpperCase();
      const company = clean(get('company_name'));
      if (!code && !company) continue; // blank line

      if (!HIS_CODE_REGEX.test(code)) {
        errors.push({ entry, reason: `Invalid HIS code "${code || '(blank)'}"` });
        continue;
      }
      if (!company) {
        errors.push({ entry, reason: `${code}: company name is missing` });
        continue;
      }
      if (seen.has(code)) {
        errors.push({ entry, reason: `${code}: duplicate code within this file` });
        continue;
      }
      seen.add(code);

      rows.push({
        entry,
        supplier_code: code,
        company_name: company,
        telephone: normalizePhone(get('telephone')),
        email: normalizeEmail(get('email')),
        contact_person: clean(get('contact_person')),
        notes: clean(get('notes')),
      });
    }

    return { rows, errors, sheet: sheetName };
  }

  throw new Error('No sheet with a "Supplier Code" column was found. Check the header row.');
}
