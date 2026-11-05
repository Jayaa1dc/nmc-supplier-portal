// Shape of the data read from a supplier form (fillable PDF or scan).
// No server-only imports here, so client components may import it.

export type Draft = {
  company_name: string;
  head_office_address: string;
  factory_address: string;
  telephone: string;
  mobile: string;
  fax: string;
  email: string;
  contact_person: string;
  contact_title: string;
  business_nature: string; // manufacturer | wholesaler | stockist | retailer | ''
  categories: string[];
  iso_9000: boolean;
  deposit_receipt_no: string;
  deposit_amount: string;
  answers: Record<string, string>; // keys of lib/questionnaire FIELDS, plus production_capacity
  items_services: string[];
  management: { name: string; title: string }[];
  past_experience: { company: string; contact: string; period: string }[];
  price_rows: { category: string; item: string; price: string }[];
  notes: string[];
};

export const emptyDraft = (): Draft => ({
  company_name: '', head_office_address: '', factory_address: '', telephone: '', mobile: '', fax: '', email: '',
  contact_person: '', contact_title: '', business_nature: '', categories: [], iso_9000: false,
  deposit_receipt_no: '', deposit_amount: '', answers: {}, items_services: [], management: [], past_experience: [],
  price_rows: [], notes: [],
});

export type ExtractResult =
  | { ok: true; source: 'fillable' | 'ai'; draft: Draft; file: { path: string; name: string; mime: string; size: number }; previewUrl: string | null }
  | { ok: false; error: string };
