import { Check, FolderOpen } from 'lucide-react';
import type { PortfolioEntry } from '@shared/types';
import { ButtonLink, cn, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/date';
import { EntryThumb } from '../components/EntryThumb';
import { MAX_ATTACHED_ENTRIES, toggleEntry } from '../logic/application';

export interface EntryPickerProps {
  entries: readonly PortfolioEntry[];
  selected: readonly string[];
  onChange: (ids: string[]) => void;
}

/** Step 1: pick 0–5 portfolio entries to attach. */
export function EntryPicker({ entries, selected, onChange }: EntryPickerProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={<FolderOpen />}
        title="Porteføljen din er tom"
        description="Legg til arbeid du har gjort, så kan du vise det fram i søknaden. Du kan også søke uten vedlegg."
        action={
          <ButtonLink to="/portefolje" variant="secondary">
            Gå til porteføljen
          </ButtonLink>
        }
      />
    );
  }

  const full = selected.length >= MAX_ATTACHED_ENTRIES;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-small text-ink-2">Velg arbeid som viser hva du kan. Du kan hoppe over dette.</p>
        <p className="nums shrink-0 text-small font-semibold text-ink" aria-live="polite">
          {selected.length} av {MAX_ATTACHED_ENTRIES} valgt
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2 desktop:grid-cols-2">
        {entries.map((entry) => {
          const isSelected = selected.includes(entry.id);
          const blocked = full && !isSelected;
          return (
            <li key={entry.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-disabled={blocked || undefined}
                title={blocked ? `Du kan legge ved opptil ${MAX_ATTACHED_ENTRIES} arbeider` : undefined}
                onClick={() => !blocked && onChange(toggleEntry(selected, entry.id))}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-2 pr-3 text-left',
                  'transition-[scale,background-color,border-color] duration-150 ease-out active:scale-[0.98]',
                  isSelected
                    ? 'border-primary bg-primary-soft'
                    : 'border-line bg-surface hover:border-line-strong hover:bg-surface-hover',
                  blocked && 'opacity-45 active:scale-100',
                )}
              >
                <EntryThumb photo={entry.photo} className="size-16" />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate font-semibold', isSelected ? 'text-primary-soft-ink' : 'text-ink')}>
                    {entry.title}
                  </span>
                  <span className="block truncate text-small text-ink-2">{formatDate(entry.date)}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full border transition-[background-color,border-color] duration-150',
                    isSelected ? 'border-primary bg-primary text-primary-ink' : 'border-line-strong bg-surface',
                  )}
                >
                  {isSelected ? <Check className="size-4" /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {full ? (
        <p className="text-small text-ink-2">Du har valgt {MAX_ATTACHED_ENTRIES}. Fjern ett for å velge et annet.</p>
      ) : null}
    </div>
  );
}
