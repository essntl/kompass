import { useId, useMemo, useState, type ReactNode } from 'react';
import type { Listing } from '@shared/types';
import { Chip, ChipGroup, Switch } from '@/components/ui';
import {
  DEADLINE_LABELS,
  facetOptions,
  pruneTrades,
  toggleValue,
  tradeOptions,
  type DeadlineBucket,
  type FacetOption,
  type ListingFilters,
} from '../logic/filters';

/** Trades beyond this many hide behind "Vis alle". */
const TRADE_PREVIEW = 8;

const DEADLINE_OPTIONS = (['week', 'month', 'all'] as const).map((value) => ({
  value,
  label: DEADLINE_LABELS[value],
}));

export interface FilterPanelProps {
  listings: readonly Listing[];
  filters: ListingFilters;
  onChange: (patch: Partial<ListingFilters>) => void;
}

function FilterGroup({ title, children }: { title: string; children: (headingId: string) => ReactNode }) {
  const headingId = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <h3 id={headingId} className="text-small font-semibold text-ink">
        {title}
      </h3>
      {children(headingId)}
    </div>
  );
}

function FacetChips({
  labelledBy,
  options,
  selected,
  onToggle,
}: {
  labelledBy: string;
  options: FacetOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <ChipGroup aria-labelledby={labelledBy}>
      {options.map((option) => (
        <Chip key={option.value} selected={selected.includes(option.value)} onClick={() => onToggle(option.value)}>
          {option.value}
          <span className="nums opacity-70">{option.count}</span>
        </Chip>
      ))}
    </ChipGroup>
  );
}

/** The filters themselves. Rendered in the desktop column and inside the mobile sheet. */
export function FilterPanel({ listings, filters, onChange }: FilterPanelProps) {
  const [allTrades, setAllTrades] = useState(false);
  const programmes = useMemo(() => facetOptions(listings, 'programme'), [listings]);
  const counties = useMemo(() => facetOptions(listings, 'county'), [listings]);
  const trades = useMemo(() => tradeOptions(listings, filters.programmes), [listings, filters.programmes]);

  // Always show the trades that are selected, even when they would be past the preview.
  const visibleTrades =
    allTrades || trades.length <= TRADE_PREVIEW
      ? trades
      : trades.filter((t, i) => i < TRADE_PREVIEW || filters.trades.includes(t.value));

  return (
    <div className="flex flex-col gap-6">
      <FilterGroup title="Frist">
        {(id) => (
          <ChipGroup aria-labelledby={id}>
            {DEADLINE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={filters.deadline === option.value}
                onClick={() => onChange({ deadline: option.value as DeadlineBucket })}
              >
                {option.label}
              </Chip>
            ))}
          </ChipGroup>
        )}
      </FilterGroup>

      <FilterGroup title="Utdanningsprogram">
        {(id) => (
          <FacetChips
            labelledBy={id}
            options={programmes}
            selected={filters.programmes}
            onToggle={(value) => {
              const next = toggleValue(filters.programmes, value);
              onChange({ programmes: next, trades: pruneTrades(filters.trades, next, listings) });
            }}
          />
        )}
      </FilterGroup>

      <FilterGroup title="Lærefag">
        {(id) => (
          <>
            <FacetChips
              labelledBy={id}
              options={visibleTrades}
              selected={filters.trades}
              onToggle={(value) => onChange({ trades: toggleValue(filters.trades, value) })}
            />
            {trades.length > TRADE_PREVIEW ? (
              <button
                type="button"
                onClick={() => setAllTrades((v) => !v)}
                aria-expanded={allTrades}
                className="hit-44 self-start rounded-sm text-small font-semibold text-primary underline-offset-4 hover:underline"
              >
                {allTrades ? 'Vis færre' : `Vis alle ${trades.length} lærefag`}
              </button>
            ) : null}
          </>
        )}
      </FilterGroup>

      <FilterGroup title="Fylke">
        {(id) => (
          <FacetChips
            labelledBy={id}
            options={counties}
            selected={filters.counties}
            onToggle={(value) => onChange({ counties: toggleValue(filters.counties, value) })}
          />
        )}
      </FilterGroup>

      <Switch
        label="Kun lagrede"
        description="Vis bare annonsene du har lagret."
        checked={filters.savedOnly}
        onCheckedChange={(savedOnly) => onChange({ savedOnly })}
      />
    </div>
  );
}
