import { DOC_FIELDS, MAX_FILE_BYTES, MAX_FILES_PER_FIELD, type DocType } from './schemas';

export type Upload = { docType: DocType; file: File };

export function collectUploads(formData: FormData): Upload[] {
  const out: Upload[] = [];
  for (const [field, docType] of Object.entries(DOC_FIELDS)) {
    for (const value of formData.getAll(field)) {
      if (value instanceof File && value.size > 0) out.push({ docType, file: value });
    }
  }
  return out;
}

// Extension decides which checks apply; the file bytes must match the extension.
const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04; // xlsx, docx
const isOle = (b: Uint8Array) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0; // xls, doc
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  pdf: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  webp: (b) =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  xlsx: isZip,
  docx: isZip,
  xls: isOle,
  doc: isOle,
  csv: (b) => !b.includes(0), // plain text: no binary bytes
};

function allowedExtensions(docType: DocType): string[] {
  if (docType === 'price_list') return ['xlsx', 'xls', 'csv', 'docx', 'doc', 'pdf'];
  return ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
}

export async function validateUploads(uploads: Upload[]): Promise<string | null> {
  const perField = new Map<DocType, number>();

  for (const { docType, file } of uploads) {
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    const key = ext === 'jpeg' ? 'jpg' : ext;
    if (!allowedExtensions(docType).includes(ext)) {
      return `${file.name}: this file type is not accepted for ${docType.replace(/_/g, ' ')}.`;
    }
    if (file.size > MAX_FILE_BYTES) return `${file.name}: file must be 10 MB or smaller.`;

    const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
    if (!MAGIC[key]?.(head)) return `${file.name}: file content does not match its type.`;

    perField.set(docType, (perField.get(docType) ?? 0) + 1);
  }

  for (const [docType, count] of perField) {
    if (count > MAX_FILES_PER_FIELD) {
      return `You can upload at most ${MAX_FILES_PER_FIELD} files for ${docType.replace(/_/g, ' ')}.`;
    }
  }
  return null;
}
