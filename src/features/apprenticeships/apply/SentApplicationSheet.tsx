import type { Application, Listing } from '@shared/types';
import { Card, Sheet } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/date';
import { usePortfolioStore } from '@/stores/portfolio';
import { EntryThumb } from '../components/EntryThumb';
import { splitParagraphs } from '../logic/application';
import { DemoNote } from './ReviewStep';

export interface SentApplicationSheetProps {
  listing: Listing;
  application: Application;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Read-only view of what the student sent. */
export function SentApplicationSheet({ listing, application, open, onOpenChange }: SentApplicationSheetProps) {
  const allEntries = usePortfolioStore((s) => s.entries);
  const entries = application.entryIds
    .map((id) => allEntries.find((e) => e.id === id))
    .filter((e) => e !== undefined);
  const missing = application.entryIds.length - entries.length;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Søknaden du sendte"
      description={`Til ${listing.company}, ${formatDate(application.submittedAt)} kl. ${formatTime(application.submittedAt)}`}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="text-small font-semibold text-ink-2">Vedlegg ({application.entryIds.length})</h3>
          {entries.length === 0 && missing === 0 ? (
            <p className="text-small text-ink-2">Ingen arbeid fra porteføljen ble lagt ved.</p>
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
              {missing > 0 ? (
                <li className="text-small text-ink-2">
                  {missing === 1 ? 'Ett arbeid' : `${missing} arbeider`} er slettet fra porteføljen siden.
                </li>
              ) : null}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-small font-semibold text-ink-2">Søknadstekst</h3>
          <Card className="flex flex-col gap-3">
            {splitParagraphs(application.text).map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </Card>
        </section>

        <DemoNote />
      </div>
    </Sheet>
  );
}
