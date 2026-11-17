import { isApiError } from '@/lib/api';

/**
 * Pure helpers for the timetable import sheet: which kind of file was picked, whether it
 * may be sent, base64 for the PDF route, and the Norwegian texts the sheet shows.
 */

export type ImportFileKind = 'ics' | 'pdf';

/** Same cap for both: the server takes PDFs up to 5 MB. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** File picker `accept`: extensions plus MIME types, so phones offer both kinds. */
export const IMPORT_ACCEPT = '.pdf,application/pdf,.ics,text/calendar';

export const IMPORT_MESSAGES = {
  wrongType: 'Den filen kan vi ikke lese. Velg timeplanen som PDF, eller en .ics-fil fra en kalender.',
  icsTooLarge: 'Filen er for stor. En timeplan er vanligvis under 1 MB.',
  pdfTooLarge: 'PDF-en er for stor. Den kan være på opptil 5 MB.',
  emptyFile: 'Filen er tom. Prøv å lagre timeplanen på nytt.',
  readFailed: 'Vi klarte ikke å lese filen. Prøv igjen, eller lagre timeplanen på nytt.',
  pdfFailed: 'Vi klarte ikke å lese timeplanen fra PDF-en. Prøv igjen om litt.',
} as const;

interface FileLike {
  name: string;
  type: string;
  size: number;
}

/** By extension first, then MIME type (some phones give a name without an extension). */
export function detectImportFileKind(file: Pick<FileLike, 'name' | 'type'>): ImportFileKind | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (/\.pdf$/.test(name) || type === 'application/pdf' || type === 'application/x-pdf') return 'pdf';
  if (/\.(ics|ical|ifb|icalendar)$/.test(name) || type === 'text/calendar') return 'ics';
  return null;
}

/** The file's kind, or a Norwegian message saying why it cannot be imported. */
export function checkImportFile(file: FileLike): { kind: ImportFileKind } | { error: string } {
  const kind = detectImportFileKind(file);
  if (!kind) return { error: IMPORT_MESSAGES.wrongType };
  if (file.size === 0) return { error: IMPORT_MESSAGES.emptyFile };
  if (file.size > MAX_IMPORT_BYTES) {
    return { error: kind === 'pdf' ? IMPORT_MESSAGES.pdfTooLarge : IMPORT_MESSAGES.icsTooLarge };
  }
  return { kind };
}

/** Base64 without a data: prefix. Chunked, so large files do not overflow the call stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function fileToBase64(file: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await file.arrayBuffer()));
}

/** The message to show when the PDF import fails. Server messages are already Norwegian. */
export function pdfImportErrorMessage(err: unknown): string {
  if (isApiError(err) && err.message) return err.message;
  return IMPORT_MESSAGES.pdfFailed;
}

/**
 * What the waiting state says while the AI reads the PDF (it takes 10–30 seconds), so the
 * wait feels like progress instead of a frozen sheet.
 */
export const PDF_PROGRESS_STEPS: Array<{ afterMs: number; text: string }> = [
  { afterMs: 0, text: 'Sender PDF-en' },
  { afterMs: 2_500, text: 'Finner dagene og klokkeslettene' },
  { afterMs: 9_000, text: 'Leser fag, rom og lærere' },
  { afterMs: 18_000, text: 'Setter opp timene uke for uke' },
  { afterMs: 30_000, text: 'Det tar litt lenger tid enn vanlig. Snart ferdig' },
];

export function pdfProgressText(elapsedMs: number): string {
  let text = PDF_PROGRESS_STEPS[0]!.text;
  for (const step of PDF_PROGRESS_STEPS) if (elapsedMs >= step.afterMs) text = step.text;
  return text;
}
