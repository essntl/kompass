import type { QuickLink } from '@shared/types';

export const QUICK_LINK_LABEL_MAX = 32;

/**
 * Turns what the student typed into a safe link, or null when it is not one.
 * "vilbli.no" → "https://vilbli.no/". Only http(s) links with a real host are allowed.
 */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw);
  if (!hasScheme && /^[a-z][a-z\d+.-]*:(?!\d)/i.test(raw)) return null; // mailto:, javascript: …
  const candidate = hasScheme ? raw : `https://${raw.replace(/^\/+/, '')}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname;
  if (host !== 'localhost' && !/\.[a-z]{2,}$/i.test(host)) return null;
  return url.href;
}

export interface QuickLinkDraft {
  label: string;
  url: string;
  icon?: string;
}

export interface QuickLinkValidation {
  errors: { label?: string; url?: string };
  /** The cleaned link, when there are no errors. */
  value?: Omit<QuickLink, 'id'>;
}

export function validateQuickLink(draft: QuickLinkDraft): QuickLinkValidation {
  const label = draft.label.trim().replace(/\s+/g, ' ');
  const url = normalizeUrl(draft.url);
  const errors: QuickLinkValidation['errors'] = {};
  if (!label) errors.label = 'Gi snarveien et navn.';
  else if (label.length > QUICK_LINK_LABEL_MAX) errors.label = `Bruk høyst ${QUICK_LINK_LABEL_MAX} tegn.`;
  if (!draft.url.trim()) errors.url = 'Skriv inn en nettadresse.';
  else if (!url) errors.url = 'Dette ser ikke ut som en nettadresse. Prøv for eksempel vilbli.no.';
  if (errors.label || errors.url || !url) return { errors };
  return { errors, value: { label, url, ...(draft.icon ? { icon: draft.icon } : {}) } };
}

/** "https://www.vilbli.no/fag" → "vilbli.no", for the small line under a link. */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
