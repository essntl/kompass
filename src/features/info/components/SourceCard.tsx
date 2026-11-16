import { ExternalLink } from 'lucide-react';
import { Card, cn } from '@/components/ui';

export interface SourceCardProps {
  title: string;
  url: string;
  publisher?: string;
  /** One line on why the source is useful (from the model, or the curated summary). */
  why?: string;
  /** Clamp the description to a few lines (long curated summaries). */
  clamp?: boolean;
}

/** "www.vilbli.no/nb/…" → "vilbli.no". */
export function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** A link to an official page, opening in a new tab. */
export function SourceCard({ title, url, publisher, why, clamp = false }: SourceCardProps) {
  const domain = displayDomain(url);
  return (
    <Card
      as="a"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      interactive
      className="group flex items-start gap-3"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">
          {title}
          <span className="sr-only"> (åpnes i ny fane)</span>
        </p>
        <p className="mt-0.5 truncate text-small text-ink-2">
          {!publisher ? domain : publisher.toLowerCase().includes(domain) ? publisher : `${publisher} · ${domain}`}
        </p>
        {why ? (
          <p className={cn('mt-2 text-small text-ink-2', clamp && 'line-clamp-3')}>{why}</p>
        ) : null}
      </div>
      <ExternalLink
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-ink-3 transition-colors duration-150 group-hover:text-primary"
      />
    </Card>
  );
}
