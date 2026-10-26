import * as XLSX from 'xlsx';

// Accepted header names (case-insensitive)
const ALIASES = {
  his_item_code: ['his item code', 'item code', 'code', 'his code'],
  description: ['description', 'item', 'item description', 'name'],
  unit: ['unit', 'uom'],
  unit_price: ['price', 'unit price', 'rate', 'unit rate'],
} as const;

type Field = keyof typeof ALIASES;
const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

export type PriceRow = {
  his_item_code: string | null;
  description: string;
  unit: string;
  unit_price: number;
};

export function parsePriceList(buffer: Buffer): { rows: PriceRow[]; skipped: number } {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  for (const sheetName of wb.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      defval: '',
      blankrows: false,
    });

    const headerRow = matrix.findIndex((r) => {
      const cells = r.map(norm);
      return (
        cells.some((c) => (ALIASES.description as readonly string[]).includes(c)) &&
        cells.some((c) => (ALIASES.unit_price as readonly string[]).includes(c))
      );
    });
    if (headerRow === -1) continue;

    const heads = (matrix[headerRow] as unknown[]).map(norm);
    const col = {} as Record<Field, number>;
    (Object.keys(ALIASES) as Field[]).forEach((f) => {
      col[f] = heads.findIndex((h) => (ALIASES[f] as readonly string[]).includes(h));
    });

    const rows: PriceRow[] = [];
    let skipped = 0;

    for (let i = headerRow + 1; i < matrix.length; i++) {
      const r = matrix[i] as unknown[];
      const get = (f: Field) => (col[f] >= 0 ? r[col[f]] : '');

      const description = String(get('description') ?? '').trim();
      const rawPrice = String(get('unit_price') ?? '').replace(/[,\s]/g, '');
      if (!description && rawPrice === '') continue; // blank line

      const price = rawPrice === '' ? NaN : Number(rawPrice);
      if (!description || !Number.isFinite(price) || price < 0) {
        skipped++;
        continue;
      }

      rows.push({
        his_item_code: String(get('his_item_code') ?? '').trim() || null,
        description,
        unit: String(get('unit') ?? '').trim() || 'Each',
        unit_price: price,
      });
    }

    return { rows, skipped };
  }

  throw new Error('No price list found. Needed columns: Description and Price (optional: Item Code, Unit).');
}
