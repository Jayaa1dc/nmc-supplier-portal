// Shared constants for centres, categories and price-list fields.
export const CATEGORY_KEYS = ['pharmacy', 'lab', 'general_stores'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  pharmacy: 'Pharmacy',
  lab: 'Lab',
  general_stores: 'General Stores',
};

export const CENTRE_ORDER = ['Panadura', 'Kiribathgoda', 'Battaramulla', 'Ja-Ela', 'Kirillawala', 'Kurunegala'] as const;

export function isCategory(v: string): v is CategoryKey {
  return (CATEGORY_KEYS as readonly string[]).includes(v);
}
export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
export const money = (n: number | string) => Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 });
