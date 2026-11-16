import type { GeocodeFeature } from '@shared/api';
import type { Place } from '@shared/types';
import { CircleAlert, MapPin, MapPinned, Search, Signpost, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton, Input, Spinner } from '@/components/ui';
import { geocode, isAbortError, isApiError } from '@/lib/api';
import { cn } from '@/lib/cn';

/**
 * CONTRACT: address search backed by the Entur geocoder (`geocode()` in `@/lib/api`).
 * Used by the settings page and by the timetable's "other location" field.
 * Workstream C replaces the body; the props must not change.
 */
export interface AddressAutocompleteProps {
  label: string;
  value: Place | null;
  /** Called with the chosen place, or null when the field is cleared. */
  onChange: (place: Place | null) => void;
  placeholder?: string;
  hint?: string;
  /** Results near this point are ranked first. */
  focus?: { lat: number; lon: number };
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

interface LookupState {
  /** Results for the last finished lookup, null before the first one. */
  results: GeocodeFeature[] | null;
  loading: boolean;
  error: string | null;
}

const IDLE: LookupState = { results: null, loading: false, error: null };

function FeatureIcon({ layer }: { layer: string }) {
  const className = 'size-5 shrink-0 text-ink-2';
  if (layer === 'venue') return <Signpost aria-hidden className={className} />;
  if (layer === 'address') return <MapPin aria-hidden className={className} />;
  return <MapPinned aria-hidden className={className} />;
}

function layerLabel(layer: string): string {
  if (layer === 'venue') return 'Holdeplass eller sted';
  if (layer === 'address') return 'Adresse';
  if (layer === 'street') return 'Gate';
  return 'Sted';
}

/** "Oslo" (not "Oslo, Oslo"), "Larvik, Vestfold", or the kind of place. */
function secondaryLine(feature: GeocodeFeature): string {
  const parts = [...new Set([feature.locality, feature.county].filter((part): part is string => Boolean(part)))];
  return parts.join(', ') || layerLabel(feature.layer);
}

/** Label stored for a chosen place: "Kabelgata 10, Oslo". */
function placeLabel(feature: GeocodeFeature): string {
  if (feature.locality && !feature.name.includes(feature.locality)) return `${feature.name}, ${feature.locality}`;
  return feature.name || feature.label;
}

/**
 * Accessible combobox (ARIA 1.2 pattern): the input owns `aria-activedescendant`,
 * ↑/↓ move through the results, Enter picks, Esc closes (or clears when closed).
 * Lookups are debounced and the previous request is aborted when the text changes.
 */
export function AddressAutocomplete({ label, value, onChange, placeholder, hint, focus }: AddressAutocompleteProps) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-opt-${index}`;
  const [text, setText] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);
  const [lookup, setLookup] = useState<LookupState>(IDLE);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const focusLat = focus?.lat;
  const focusLon = focus?.lon;

  // Follow outside changes of the value (e.g. "Tilbakestill demodata").
  const valueLabel = value?.label ?? '';
  useEffect(() => {
    setText(valueLabel);
  }, [valueLabel]);

  // Debounced lookup whenever the user has typed something new.
  const query = text.trim();
  const isChosen = value !== null && text === value.label;
  useEffect(() => {
    if (!open || isChosen || query.length < MIN_CHARS) {
      controllerRef.current?.abort();
      setLookup(IDLE);
      return;
    }
    // Older results stay visible until the new ones arrive; the spinner shows the wait.
    setLookup((current) => ({ ...current, loading: true, error: null }));
    const timer = window.setTimeout(() => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      geocode(query, { lat: focusLat, lon: focusLon, signal: controller.signal })
        .then((response) => {
          if (controller.signal.aborted) return;
          setLookup({ results: response.features, loading: false, error: null });
          setActive(-1);
        })
        .catch((err: unknown) => {
          if (isAbortError(err) || controller.signal.aborted) return;
          setLookup({
            results: null,
            loading: false,
            error:
              isApiError(err) && err.code !== 'NETWORK'
                ? 'Fikk ikke søkt etter adresser akkurat nå. Prøv igjen om litt.'
                : 'Fikk ikke søkt etter adresser. Sjekk nettet og prøv igjen.',
          });
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, isChosen, query, focusLat, focusLon]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const results = lookup.results ?? [];
  const showList = open && !isChosen && query.length >= MIN_CHARS && !lookup.error;
  const loading = lookup.loading && open;

  function choose(feature: GeocodeFeature) {
    const place: Place = { label: placeLabel(feature), lat: feature.lat, lon: feature.lon };
    controllerRef.current?.abort();
    setText(place.label);
    setOpen(false);
    setActive(-1);
    onChange(place);
  }

  function clear() {
    controllerRef.current?.abort();
    setText('');
    setLookup(IDLE);
    setActive(-1);
    onChange(null);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        if (results.length > 0) setActive((index) => (index + 1) % results.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setOpen(true);
        if (results.length > 0) setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
        break;
      case 'Enter': {
        const feature = results[active] ?? (results.length === 1 ? results[0] : undefined);
        if (showList && feature) {
          event.preventDefault();
          choose(feature);
        }
        break;
      }
      case 'Escape':
        if (showList) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (text) {
          event.preventDefault();
          setText(value?.label ?? '');
        }
        break;
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        label={label}
        hint={hint}
        error={lookup.error ?? undefined}
        placeholder={placeholder}
        value={text}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        leading={<Search />}
        trailing={
          loading ? (
            <Spinner size="sm" label="Søker" />
          ) : text ? (
            <IconButton label={`Tøm ${label.toLowerCase()}`} icon={<X />} size="sm" onClick={clear} />
          ) : null
        }
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
          // Leaving the field without picking a result keeps the saved address.
          if (value && text !== value.label && text.trim() !== '') setText(value.label);
        }}
        onKeyDown={onKeyDown}
      />

      <div
        id={listId}
        role="listbox"
        aria-label={`Forslag til ${label.toLowerCase()}`}
        hidden={!showList}
        className={cn(
          'absolute inset-x-0 z-30 mt-1 max-h-80 overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface p-1 shadow-2',
          !showList && 'hidden',
        )}
        // Keep focus in the input while the pointer picks an option.
        onMouseDown={(event) => event.preventDefault()}
      >
        {lookup.results === null ? (
          <p className="px-3 py-3 text-small text-ink-2">Søker …</p>
        ) : results.length === 0 ? (
          <p className="flex items-center gap-2 px-3 py-3 text-small text-ink-2">
            <CircleAlert aria-hidden className="size-4 shrink-0" />
            Fant ingen adresse
          </p>
        ) : (
          results.map((feature, index) => (
            <div
              key={feature.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onClick={() => choose(feature)}
              onPointerMove={() => setActive(index)}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-3 py-2',
                index === active ? 'bg-primary-soft text-primary-soft-ink' : 'text-ink',
              )}
            >
              <FeatureIcon layer={feature.layer} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium">{feature.name}</span>
                <span className={cn('block truncate text-small', index === active ? '' : 'text-ink-2')}>
                  <span className="sr-only">{layerLabel(feature.layer)}, </span>
                  {secondaryLine(feature)}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
