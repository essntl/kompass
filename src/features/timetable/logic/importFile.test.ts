import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  bytesToBase64,
  checkImportFile,
  detectImportFileKind,
  fileToBase64,
  IMPORT_MESSAGES,
  MAX_IMPORT_BYTES,
  pdfImportErrorMessage,
  pdfProgressText,
} from './importFile';

describe('detectImportFileKind', () => {
  it('recognises PDFs and calendar files by extension or MIME type', () => {
    expect(detectImportFileKind({ name: 'Timeplan uke 47.PDF', type: '' })).toBe('pdf');
    expect(detectImportFileKind({ name: 'download', type: 'application/pdf' })).toBe('pdf');
    expect(detectImportFileKind({ name: 'timeplan.ics', type: '' })).toBe('ics');
    expect(detectImportFileKind({ name: 'kalender', type: 'text/calendar' })).toBe('ics');
  });

  it('rejects other files', () => {
    expect(detectImportFileKind({ name: 'timeplan.png', type: 'image/png' })).toBeNull();
    expect(detectImportFileKind({ name: 'timeplan.pdf.zip', type: 'application/zip' })).toBeNull();
  });
});

describe('checkImportFile', () => {
  it('accepts files up to 5 MB', () => {
    expect(checkImportFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_IMPORT_BYTES })).toEqual({ kind: 'pdf' });
    expect(checkImportFile({ name: 'a.ics', type: '', size: 1200 })).toEqual({ kind: 'ics' });
  });

  it('explains what is wrong in Norwegian', () => {
    expect(checkImportFile({ name: 'a.pdf', type: '', size: MAX_IMPORT_BYTES + 1 })).toEqual({ error: IMPORT_MESSAGES.pdfTooLarge });
    expect(checkImportFile({ name: 'a.ics', type: '', size: MAX_IMPORT_BYTES + 1 })).toEqual({ error: IMPORT_MESSAGES.icsTooLarge });
    expect(checkImportFile({ name: 'a.docx', type: '', size: 10 })).toEqual({ error: IMPORT_MESSAGES.wrongType });
    expect(checkImportFile({ name: 'a.pdf', type: '', size: 0 })).toEqual({ error: IMPORT_MESSAGES.emptyFile });
  });
});

describe('base64', () => {
  it('encodes bytes like Node does, also beyond one chunk', () => {
    const bytes = new Uint8Array(100_000).map((_, i) => (i * 7) % 256);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    expect(bytesToBase64(new Uint8Array())).toBe('');
  });

  it('reads a file as base64 without a data: prefix', async () => {
    const blob = new Blob(['%PDF-1.7\n'], { type: 'application/pdf' });
    expect(await fileToBase64(blob)).toBe('JVBERi0xLjcK');
  });
});

describe('pdfImportErrorMessage', () => {
  it('shows the server message, or a friendly fallback', () => {
    expect(pdfImportErrorMessage(new ApiError('BAD_REQUEST', 'Vi fant ingen timeplan i PDF-en.'))).toBe(
      'Vi fant ingen timeplan i PDF-en.',
    );
    expect(pdfImportErrorMessage(new Error('boom'))).toBe(IMPORT_MESSAGES.pdfFailed);
  });
});

describe('pdfProgressText', () => {
  it('moves through the steps as time passes', () => {
    expect(pdfProgressText(0)).toBe('Sender PDF-en');
    expect(pdfProgressText(3_000)).toBe('Finner dagene og klokkeslettene');
    expect(pdfProgressText(20_000)).toBe('Setter opp timene uke for uke');
    expect(pdfProgressText(60_000)).toMatch(/Snart ferdig/);
  });
});
