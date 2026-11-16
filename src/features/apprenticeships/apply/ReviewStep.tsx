import { Info, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Listing, PortfolioEntry } from '@shared/types';
import { Avatar, Button, Card } from '@/components/ui';
import { formatDate } from '@/lib/date';
import { EntryThumb } from '../components/EntryThumb';
import { splitParagraphs } from '../logic/application';

export interface ReviewStepProps {
  listing: Listing;
  entries: readonly PortfolioEntry[];
  text: string;
  onEditEntries: () => void;
  onEditText: () => void;
}

/** Step 3: what will be sent, with a way back to each part. */
export function ReviewStep({ listing, entries, text, onEditEntries, onEditText }: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card tone="sunken" className="flex items-center gap-3">
        <Avatar name={listing.company} initials={listing.logo.initials} color={listing.logo.color} shape="square" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{listing.title}</p>
          <p className="truncate text-small text-ink-2">
            {listing.company} · {listing.location}
          </p>
        </div>
      </Card>

      <ReviewBlock title={`Vedlegg (${entries.length})`} onEdit={onEditEntries} editLabel="Endre vedlegg">
        {entries.length === 0 ? (
          <p className="text-small text-ink-2">Ingen arbeid fra porteføljen er lagt ved.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3">
                <EntryThumb photo={entry.photo} className="size-10" />
                <div className="min-w-0">
                  <p className="truncate text-small font-semibold">{entry.title}</p>
                  <p className="truncate text-caption text-ink-2">{formatDate(entry.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ReviewBlock>

      <ReviewBlock title="Søknadstekst" onEdit={onEditText} editLabel="Endre teksten">
        <div className="flex flex-col gap-3 text-body text-ink">
          {splitParagraphs(text).map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
      </ReviewBlock>

      <DemoNote />
    </div>
  );
}

function ReviewBlock({
  title,
  onEdit,
  editLabel,
  children,
}: {
  title: string;
  onEdit: () => void;
  editLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-small font-semibold text-ink-2">{title}</h3>
        <Button variant="ghost" size="sm" icon={<Pencil />} onClick={onEdit} aria-label={editLabel}>
          Endre
        </Button>
      </div>
      <Card>{children}</Card>
    </section>
  );
}

/** Plain note that nothing actually leaves the app. */
export function DemoNote() {
  return (
    <p className="flex items-start gap-2 text-small text-ink-2">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      Kompass er en demo. Søknaden lagres i appen, men blir ikke sendt til bedriften.
    </p>
  );
}
