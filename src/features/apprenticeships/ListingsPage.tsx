import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  Page,
  PageHeader,
  Select,
  Sheet,
  useIsDesktop,
} from '@/components/ui';
import { spring, staggerDelay, tween } from '@/lib/motion';
import { useNow } from '@/lib/timetable';
import { useApprenticeshipStore } from '@/stores/apprenticeships';
import { FilterPanel } from './components/FilterPanel';
import { ListingCard } from './components/ListingCard';
import { SearchField } from './components/SearchField';
import {
  activeFilterChips,
  activeFilterCount,
  applyListingFilters,
  formatResultCount,
  removeFilterChip,
  SORT_LABELS,
  type SortKey,
} from './logic/filters';
import { useApprenticeshipUi } from './store';

const SORT_OPTIONS = (Object.keys(SORT_LABELS) as SortKey[]).map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

export function ListingsPage() {
  const isDesktop = useIsDesktop();
  const now = useNow(60_000);
  const listings = useApprenticeshipStore((s) => s.listings);
  const savedIds = useApprenticeshipStore((s) => s.savedIds);
  const filters = useApprenticeshipUi((s) => s.filters);
  const setFilters = useApprenticeshipUi((s) => s.setFilters);
  const resetFilters = useApprenticeshipUi((s) => s.resetFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sortId = useId();

  const results = useMemo(
    () => applyListingFilters(listings, filters, { savedIds, now }),
    [listings, filters, savedIds, now],
  );
  const filterCount = activeFilterCount(filters);
  const chips = activeFilterChips(filters);
  const resultLabel = formatResultCount(results.length);

  const emptyBecauseNothingSaved = filters.savedOnly && savedIds.length === 0;

  const sortControl = (
    <div className="flex items-center gap-2">
      <label htmlFor={sortId} className="text-small text-ink-2">
        Sorter
      </label>
      <div className="w-44">
        <Select
          id={sortId}
          value={filters.sort}
          onChange={(event) => setFilters({ sort: event.target.value as SortKey })}
          options={SORT_OPTIONS}
        />
      </div>
    </div>
  );

  return (
    <Page width="wide">
      <PageHeader title="Lærlingplass" subtitle="Finn en læreplass, lagre fristen og søk med porteføljen din." />

      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-[288px_minmax(0,1fr)] desktop:gap-8">
        {isDesktop ? (
          <aside aria-label="Filtre" className="sticky top-8 self-start">
            <Card className="scroll-area max-h-[calc(100dvh-64px)] overflow-y-auto">
              <div className="mb-4 flex min-h-9 items-center justify-between gap-2">
                <h2 className="text-heading font-semibold">Filtre</h2>
                {filterCount > 0 ? (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Nullstill
                  </Button>
                ) : null}
              </div>
              <FilterPanel listings={listings} filters={filters} onChange={setFilters} />
            </Card>
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-end gap-2">
            <SearchField
              value={filters.query}
              onCommit={(query) => setFilters({ query })}
              className="min-w-0 flex-1"
            />
            {!isDesktop ? (
              <Button
                variant="secondary"
                className="h-12!"
                icon={<SlidersHorizontal />}
                onClick={() => setSheetOpen(true)}
                aria-label={filterCount ? `Filtre, ${filterCount} aktive` : 'Filtre'}
              >
                Filtre
                {filterCount > 0 ? (
                  <span
                    aria-hidden
                    className="nums ml-1.5 inline-grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-caption font-semibold text-primary-ink"
                  >
                    {filterCount}
                  </span>
                ) : null}
              </Button>
            ) : null}
          </div>

          {!isDesktop && chips.length > 0 ? (
            <ChipGroup label="Aktive filtre" layout="scroll">
              {chips.map((chip) => (
                <Chip
                  key={`${chip.kind}:${chip.value}`}
                  aria-label={`Fjern filteret ${chip.label}`}
                  onClick={() => setFilters(removeFilterChip(filters, chip, listings))}
                >
                  {chip.label}
                  <X aria-hidden className="-mr-1" />
                </Chip>
              ))}
              {chips.length > 1 ? (
                <Chip selected={false} onClick={resetFilters} aria-pressed={undefined}>
                  Nullstill alle
                </Chip>
              ) : null}
            </ChipGroup>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="nums text-body font-semibold text-ink" aria-live="polite" aria-atomic>
              {resultLabel}
            </p>
            {sortControl}
          </div>

          {results.length === 0 ? (
            <Card tone="sunken">
              <EmptyState
                size="compact"
                icon={<SearchX />}
                title={emptyBecauseNothingSaved ? 'Du har ikke lagret noen ennå' : 'Ingen lærlingplasser passer'}
                description={
                  emptyBecauseNothingSaved
                    ? 'Trykk på hjertet på en annonse for å lagre den. Fristen kommer da opp på Hjem.'
                    : 'Prøv et annet søkeord, eller fjern noen av filtrene.'
                }
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    Nullstill filtre
                  </Button>
                }
              />
            </Card>
          ) : (
            <ListingList results={results} now={now} />
          )}
        </div>
      </div>

      {!isDesktop ? (
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Filtre"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={resetFilters} disabled={filterCount === 0}>
                Nullstill
              </Button>
              <Button fullWidth onClick={() => setSheetOpen(false)}>
                {results.length === 0 ? 'Ingen treff' : `Vis ${resultLabel}`}
              </Button>
            </div>
          }
        >
          <FilterPanel listings={listings} filters={filters} onChange={setFilters} />
        </Sheet>
      ) : null}
    </Page>
  );
}

/**
 * The result list. On first render the cards enter with a short, shrinking stagger.
 * After that a filter change is one motion: leaving cards fade out of the layout at
 * once (popLayout) while the rest slide into the gap and new ones fade in.
 */
function ListingList({ results, now }: { results: ReturnType<typeof applyListingFilters>; now: Date }) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  return (
    <ul className="relative flex flex-col gap-3" aria-label="Lærlingplasser">
      <AnimatePresence mode="popLayout" initial>
        {results.map((listing, index) => (
          <motion.li
            key={listing.id}
            layout="position"
            initial={{ opacity: 0, y: mounted.current ? 0 : 8, scale: mounted.current ? 0.98 : 1 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { ...tween.slow, delay: mounted.current ? 0 : staggerDelay(index) },
            }}
            exit={{ opacity: 0, scale: 0.98, transition: tween.fast }}
            transition={{ layout: spring.layout }}
          >
            <ListingCard listing={listing} now={now} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
