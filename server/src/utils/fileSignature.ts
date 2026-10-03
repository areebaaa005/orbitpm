/**
 * Verifies that an uploaded file's real content matches the type the client claimed.
 * multer's file.mimetype comes from the request header, which the client controls, so it
 * cannot be trusted on its own.
 */

const startsWith = (b: Buffer, bytes: number[], offset = 0) => bytes.every((v, i) => b[offset + i] === v);
const ascii = (b: Buffer, text: string, offset = 0) => b.subarray(offset, offset + text.length).toString('latin1') === text;

type Kind = 'png' | 'jpeg' | 'gif' | 'webp' | 'pdf' | 'ole' | 'zip' | 'text';

function isPlainText(b: Buffer): boolean {
  if (b.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(b);
    return true;
  } catch {
    return false;
  }
}

export function detectKind(b: Buffer): Kind | null {
  if (b.length >= 8 && startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (b.length >= 3 && startsWith(b, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (b.length >= 6 && (ascii(b, 'GIF87a') || ascii(b, 'GIF89a'))) return 'gif';
  if (b.length >= 12 && ascii(b, 'RIFF') && ascii(b, 'WEBP', 8)) return 'webp';
  if (b.subarray(0, 1024).includes('%PDF-')) return 'pdf';
  if (b.length >= 8 && startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole'; // legacy .doc/.xls
  if (b.length >= 4 && startsWith(b, [0x50, 0x4b, 0x03, 0x04])) return 'zip'; // .docx/.xlsx
  if (b.length > 0 && isPlainText(b)) return 'text';
  return null;
}

const EXPECTED: Record<string, Kind> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'ole',
  'application/vnd.ms-excel': 'ole',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'zip',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'zip',
  'text/plain': 'text',
  'text/csv': 'text',
};

export function isFileContentValid(claimedMime: string, buffer: Buffer): boolean {
  const expected = EXPECTED[claimedMime];
  return !!expected && detectKind(buffer) === expected;
}

/** Strips path separators and control characters from a client-supplied file name. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/]+/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/^\.+/, '')
    .trim();
  return cleaned.slice(-120) || 'file';
}
