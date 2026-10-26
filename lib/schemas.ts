import { z } from 'zod';
import { SUPPLIER_CATEGORIES } from './categories';

export const SUPPLIER_BUCKET = 'supplier-documents';
export const HIS_CODE_REGEX = /^SP\d{8}$/;
export const BUSINESS_NATURES = ['manufacturer', 'wholesaler', 'stockist', 'retailer'] as const;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_FIELD = 5;
export const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;

// Form field name → stored doc_type
export const DOC_FIELDS = {
  doc_business_registration: 'business_registration',
  doc_vat_certificate: 'vat_certificate',
  doc_iso_certificate: 'iso_certificate',
  doc_past_experience: 'past_experience',
  doc_deposit_receipt: 'deposit_receipt',
  doc_price_list: 'price_list',
  doc_signed_forms: 'signed_form',
} as const;

export type DocType = (typeof DOC_FIELDS)[keyof typeof DOC_FIELDS];

export const DOC_LABELS: Record<DocType | 'other', string> = {
  business_registration: 'Business Registration / Certificate of Incorporation',
  vat_certificate: 'VAT Registration Certificate',
  iso_certificate: 'ISO Certificate',
  past_experience: 'Past Experience / Performance Record',
  deposit_receipt: 'Non-refundable Deposit Receipt',
  price_list: 'Price list (Form 04, Excel / Word / PDF)',
  signed_form: 'Signed application forms (scanned)',
  other: 'Other',
};

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

const optionalNumber = z.preprocess(
  (v) => (v === '' || v == null ? undefined : Number(v)),
  z.number().nonnegative().optional(),
);

const optionalDate = z.preprocess(
  (v) => (v ? v : undefined),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').optional(),
);

export const itemSchema = z.object({
  his_item_code: optionalText(40),
  description: z.string().trim().min(2, 'Item description is required').max(300),
  brand: optionalText(120),
  unit: z.string().trim().min(1, 'Unit is required').max(30),
  unit_price: z.preprocess(
    (v) => (v === '' || v == null ? NaN : Number(v)),
    z.number({ invalid_type_error: 'Price must be a number' }).nonnegative().max(1e10),
  ),
});

export const registrationSchema = z.object({
  company_name: z.string().trim().min(2, 'Company name is required').max(200),
  head_office_address: z.string().trim().min(5, 'Head office address is required').max(500),
  factory_address: optionalText(500),
  telephone: z.string().trim().min(7, 'Telephone number is required').max(30),
  mobile: optionalText(30),
  fax: optionalText(30),
  email: z.string().trim().toLowerCase().email('A valid email is required').max(200),
  contact_person: z.string().trim().min(2, 'Contact person is required').max(120),
  contact_title: optionalText(120),
  business_nature: z.enum(BUSINESS_NATURES, {
    errorMap: () => ({ message: 'Select the nature of your business' }),
  }),
  categories: z.array(z.enum(SUPPLIER_CATEGORIES)).min(1, 'Select at least one category'),
  iso_9000: z.boolean(),
  iso_certificate_no: optionalText(100),
  production_capacity: optionalText(500),
  quality_controls: optionalText(1000),
  price_validity_until: optionalDate,
  deposit_amount: optionalNumber,
  deposit_receipt_no: optionalText(60),
  items: z.array(itemSchema).max(300),
  declaration: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the declaration' }),
  }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
