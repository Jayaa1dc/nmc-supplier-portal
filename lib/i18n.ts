// Sinhala text for the public registration form.
// Sinhala wording for the questionnaire pages is taken from the NMC PDF forms
// (44/FO/KM/02). The remaining lines were translated for this portal and should
// be read once by NMC staff.

export const SI_FIELD: Record<string, string> = {
  intended_category: 'අපේක්ෂිත කාණ්ඩය',
  business_reg_no: 'ව්‍යාපාර ලියාපදිංචි අංකය',
  principal_line_of_business: 'ප්‍රධාන ව්‍යාපාරික අංශය',
  ltd_directors: 'සීමිත සමාගමක් නම්: අධ්‍යක්ෂවරුන්ගේ නම්',
  partners: 'හවුල් ව්‍යාපාරයක් නම්: හවුල්කරුවන්ගේ නම්',
  bankers: 'බැංකු ගනුදෙනුකරුවන්ගේ (බැංකුවල) නම්',
  vat_registered: 'ඔබ VAT සඳහා ලියාපදිංචි වී තිබේද? (ඔව් නම් සහතිකය අමුණන්න)',
  credit_period: 'ණය කාලසීමාව',

  production_controls: 'නිෂ්පාදන ක්‍රියාදාම කෙසේ පාලනය වේද?',
  defect_segregation: 'නුසුදුසු ද්‍රව්‍ය කෙසේ හඳුනා ගෙන වෙන් කෙරේද?',
  quality_records: 'සෑම තත්ත්ව වාර්තාවක්ම ඔබ තබා ගන්නේද?',
  inspection_types: 'ඔබේ නිෂ්පාදන සඳහා කුමන වර්ගයේ පරීක්ෂා සිදු කරන්නේද? (100%, කාණ්ඩ වශයෙන්, පළමු ඒකකය, අවසාන ඒකකය, කිසිවක් නැත - සඳහන් කරන්න)',
  incoming_inspection: 'ඔබ භාවිතා කරන අමුද්‍රව්‍ය පරීක්ෂා කරන්නේද?',
  packing: 'නිෂ්පාදනයෙන් පසු භාණ්ඩ නරක් නොවීමට නිසි ඇසුරුම් කිරීම ඔබ සහතික කරන්නේද?',
  factory_visit: 'අවශ්‍ය නම් ඔබේ කර්මාන්තශාලාවට පැමිණීය හැකිද?',
  customers_attached: 'ඔබේ වත්මන් ගනුදෙනුකරුවන්ගේ ලැයිස්තුව මෙයට අමුණා ඇත',

  completed_by: 'ප්‍රශ්නාවලිය සම්පූර්ණ කරන ලද්දේ',
  completed_position: 'තනතුර',
  completed_date: 'සම්පූර්ණ කළ දිනය',
};

// Keys match the stored English category names in lib/categories.ts
export const SI_CATEGORY: Record<string, string> = {
  'Hardware, Stainless Steel, Plumbing & Paints': 'දෘඩාංග, මල නොබැඳෙන වානේ, ජල නල සහ තීන්ත',
  'Electronics': 'ඉලෙක්ට්‍රොනික උපකරණ',
  'Electrical': 'විදුලි උපකරණ',
  'Stationery & Related Consumables': 'ලිපි ද්‍රව්‍ය සහ අදාළ පරිභෝජන භාණ්ඩ',
  'All Kinds of Hospital & Other Furniture': 'රෝහල් සහ අනෙකුත් සියලු ආකාරයේ ගෘහ භාණ්ඩ',
  'Computers, Printers, Spares & Related Accessories': 'පරිගණක, මුද්‍රණ යන්ත්‍ර, අමතර කොටස් සහ අදාළ උපාංග',
  'Air Conditioning Equipment & Spares': 'වායු සමීකරණ උපකරණ සහ අමතර කොටස්',
  'Motor Spare Parts (Tyres, Batteries, Oil & Lubricants)': 'වාහන අමතර කොටස් (ටයර්, බැටරි, තෙල් සහ ලිහිසි තෙල්)',
  'Cleaning Materials & Related Accessories': 'පිරිසිදු කිරීමේ ද්‍රව්‍ය සහ අදාළ උපාංග',
  'Clothing Materials & Tailoring Services': 'ඇඳුම් ද්‍රව්‍ය සහ මැහුම් සේවා',
  'Medical Equipment / Electromedical / Dental Equipment / Spares & Accessories': 'වෛද්‍ය / විද්‍යුත් වෛද්‍ය / දන්ත වෛද්‍ය උපකරණ, අමතර කොටස් සහ උපාංග',
  'Consumable Items for CT Scanning, MRI Scanning, X-Ray Machinery': 'CT ස්කෑන්, MRI ස්කෑන්, X-Ray යන්ත්‍ර සඳහා පරිභෝජන භාණ්ඩ',
  'Mattress & Plastic Products': 'මෙට්ට සහ ප්ලාස්ටික් නිෂ්පාදන',
  'Sign Boards & Advertising Materials': 'නාම පුවරු සහ ප්‍රචාරණ ද්‍රව්‍ය',
  'Laboratory Equipment & Chemicals': 'රසායනාගාර උපකරණ සහ රසායන ද්‍රව්‍ය',
  'Printing': 'මුද්‍රණය',
};

export const SI_NATURE: Record<string, string> = {
  manufacturer: 'නිෂ්පාදකයෙක්',
  wholesaler: 'තොග වෙළෙන්දෙක්',
  stockist: 'ගබඩා කරුවෙක්',
  retailer: 'කුඩා පරිමාණ වෙළෙන්දෙක්',
};
