// Item/service categories from NMC Form 03 (Registration of Suppliers / Contractors).
export const SUPPLIER_CATEGORIES = [
  'Hardware, Stainless Steel, Plumbing & Paints',
  'Electronics',
  'Electrical',
  'Stationery & Related Consumables',
  'All Kinds of Hospital & Other Furniture',
  'Computers, Printers, Spares & Related Accessories',
  'Air Conditioning Equipment & Spares',
  'Motor Spare Parts (Tyres, Batteries, Oil & Lubricants)',
  'Cleaning Materials & Related Accessories',
  'Clothing Materials & Tailoring Services',
  'Medical Equipment / Electromedical / Dental Equipment / Spares & Accessories',
  'Consumable Items for CT Scanning, MRI Scanning, X-Ray Machinery',
  'Mattress & Plastic Products',
  'Sign Boards & Advertising Materials',
  'Laboratory Equipment & Chemicals',
  'Printing',
] as const;

export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];
