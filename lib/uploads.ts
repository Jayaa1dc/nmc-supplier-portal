import { ALLOWED_MIME, DOC_FIELDS, MAX_FILE_BYTES, MAX_FILES_PER_FIELD, type DocType } from './schemas';

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

// Magic-number checks so a renamed .exe cannot pass as a PDF.
const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  'application/pdf': (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
};

export async function validateUploads(uploads: Upload[]): Promise<string | null> {
  const perField = new Map<DocType, number>();

  for (const { docType, file } of uploads) {
    if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
      return `${file.name}: only PDF, JPG, PNG or WEBP files are accepted.`;
    }
    if (file.size > MAX_FILE_BYTES) return `${file.name}: file must be 10 MB or smaller.`;

    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!SIGNATURES[file.type]?.(head)) {
      return `${file.name}: file content does not match its type.`;
    }
    perField.set(docType, (perField.get(docType) ?? 0) + 1);
  }

  for (const [docType, count] of perField) {
    if (count > MAX_FILES_PER_FIELD) {
      return `You can upload at most ${MAX_FILES_PER_FIELD} files for ${docType.replace(/_/g, ' ')}.`;
    }
  }
  return null;
}
