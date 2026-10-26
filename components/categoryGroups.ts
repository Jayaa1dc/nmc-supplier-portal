import type { SupplierCategory } from '@/lib/categories';

export type CategoryGroup = {
  key: 'pharmacy' | 'lab' | 'general';
  label: string;
  categories: readonly SupplierCategory[];
};

// Display-only grouping of the 16 Form 03 categories. Each category belongs to exactly one group.
export const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    categories: [
      'Medical Equipment / Electromedical / Dental Equipment / Spares & Accessories',
      'Consumable Items for CT Scanning, MRI Scanning, X-Ray Machinery',
      'Clothing Materials & Tailoring Services',
    ],
  },
  {
    key: 'lab',
    label: 'Lab',
    categories: [
      'Laboratory Equipment & Chemicals',
      'Printing',
      'Sign Boards & Advertising Materials',
    ],
  },
  {
    key: 'general',
    label: 'General Stores',
    categories: [
      'Hardware, Stainless Steel, Plumbing & Paints',
      'Electronics',
      'Electrical',
      'Stationery & Related Consumables',
      'All Kinds of Hospital & Other Furniture',
      'Computers, Printers, Spares & Related Accessories',
      'Air Conditioning Equipment & Spares',
      'Motor Spare Parts (Tyres, Batteries, Oil & Lubricants)',
      'Cleaning Materials & Related Accessories',
      'Mattress & Plastic Products',
    ],
  },
];

export function findGroup(key: string | undefined) {
  return CATEGORY_GROUPS.find((g) => g.key === key);
}

export function groupsOf(categories: readonly string[]) {
  return CATEGORY_GROUPS.filter((g) => g.categories.some((c) => categories.includes(c)));
}
