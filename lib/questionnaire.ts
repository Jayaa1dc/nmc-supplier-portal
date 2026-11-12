// Single source of truth for the PDF questions (Form 44/FO/MC/GN/01, Form 01,
// Form 02, Form 03, Form 04 and Questionnaire 44/FO/KM/02).
// The registration form, the server action, and the admin view all read from here.

export const SECTIONS = {
  company: 'Company & applicant · 44/FO/MC/GN/01 · Form 01',
  production: 'Production & quality · 44/FO/KM/02 (page 2)',
  declaration: 'Completion & declaration · 44/FO/KM/02 (page 2)',
} as const;

export type SectionKey = keyof typeof SECTIONS;
export type FieldType = 'text' | 'textarea' | 'yesno' | 'date';

export type FieldDef = {
  key: string;
  label: string;
  section: SectionKey;
  type?: FieldType;
};

export const FIELDS: FieldDef[] = [
  { key: 'telephone_factory', label: 'Telephone No (Factory)', section: 'company' },
  { key: 'intended_category', label: 'Intended Category', section: 'company' },
  { key: 'business_reg_no', label: 'Business Registration No.', section: 'company' },
  { key: 'nature_of_business', label: 'Nature of Business', section: 'company' },
  { key: 'principal_line_of_business', label: 'Principle Line of Business', section: 'company' },
  { key: 'ltd_company', label: 'If the Applicant is a Ltd Liability Co.', section: 'company' },
  { key: 'ltd_directors', label: 'Names of Directors', section: 'company', type: 'textarea' },
  { key: 'partners', label: 'If the Applicant is a Partnership Names of Partners', section: 'company', type: 'textarea' },
  { key: 'bankers', label: 'Names of Bankers', section: 'company' },
  { key: 'vat_registered', label: 'Have you registered for VAT?', section: 'company', type: 'yesno' },
  { key: 'credit_period', label: 'Credit Period', section: 'company' },
  { key: 'delivery_note', label: 'Immediate delivery as and when required to Nawaloka Medical Centre', section: 'company' },

  { key: 'production_controls', label: 'How do you exercise production controls?', section: 'production', type: 'textarea' },
  { key: 'defect_segregation', label: 'How do you identify and segregate defective material?', section: 'production', type: 'textarea' },
  { key: 'quality_records', label: 'Are all quality records maintained?', section: 'production', type: 'textarea' },
  { key: 'inspection_types', label: 'What types of inspections do you carry out? (100%, batch, first off, last off, none)', section: 'production', type: 'textarea' },
  { key: 'incoming_inspection', label: 'Do you inspect your incoming materials?', section: 'production', type: 'textarea' },
  { key: 'packing', label: 'Do you ensure proper packing after production, to prevent deterioration?', section: 'production', type: 'textarea' },
  { key: 'factory_visit', label: 'If necessary is a factory visit possible?', section: 'production', type: 'textarea' },
  { key: 'customers_attached', label: 'Please attach a list of your current customers to this format', section: 'production', type: 'textarea' },

  { key: 'completed_by', label: 'Questionnaire completed by', section: 'declaration' },
  { key: 'completed_position', label: 'Position', section: 'declaration' },
  { key: 'completed_date', label: 'Date of completion', section: 'declaration', type: 'date' },
  { key: 'form_date', label: 'Date (Form 01 declaration)', section: 'declaration', type: 'date' },
  { key: 'applicant_signature', label: 'Signature of Applicant (typed name)', section: 'declaration' },
];

export const SERVICE_LINES = 8;   // Description of items / services (1–8)
export const MGMT_ROWS = 8;       // Principal management personnel (1–8)
export const PAST_ROWS = 15;      // Form 02 record of past experience
