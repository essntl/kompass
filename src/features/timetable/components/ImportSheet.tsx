import type { Place } from '@shared/types';
import {
  CalendarCheck,
  ChevronDown,
  Download,
  FileUp,
  MapPin,
  RotateCw,
  TriangleExclamationPoint,
} from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  cn,
  Collapse,
  Sheet,
  Switch,
  toast,
  useIsDesktop,
} from '@/components/ui';
import { geocode } from '@/lib/api';
import { formatDate, formatDayShort, formatTimeRange } from '@/lib/date';
import { useMessagesStore } from '@/stores/messages';
import { useSettingsStore } from '@/stores/settings';
import { useTimetableStore } from '@/stores/timetable';
import { upperFirst } from '../logic/labels';
import {
  addressQuery,
  confidentMatch,
  distinctAddressLocations,
  offsiteSummary,
} from '../logic/offsiteLocation';
import { IcsParseError, parseIcs, type IcsEvent, type IcsParseResult } from '../logic/parseIcs';

export interface ImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SAMPLE_ICS_URL = '/sample/eksempel-timeplan.ics';
const MAX_BYTES = 5 * 1024 * 1024;
const PREVIEW_ROWS = 5;
/** A geocoder that has not answered by then is skipped; the lesson stays at school. */
const GEOCODE_TIMEOUT_MS = 6000;

/**
 * Looks up each distinct LOCATION that reads like a street address (work placement)
 * once. Returns only confident matches, keyed by the LOCATION text. Never throws.
 */
async function locateOffsite(
  events: IcsEvent[],
  near: Place | null,
): Promise<Map<string, Place>> {
  const found = new Map<string, Place>();
  const locations = distinctAddressLocations(events.map((event) => event.room));
  await Promise.all(
    locations.map(async (location) => {
      const address = addressQuery(location);
      if (!address) return;
      try {
        const response = await geocode(address.query, {
          ...(near ? { lat: near.lat, lon: near.lon } : {}),
          signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
        });
        const place = confidentMatch(location, address, response.features);
        if (place) found.set(location, place);
      } catch {
        // Offline, timeout, Entur down: import the lesson without a place.
      }
    }),
  );
  return found;
}

/** Loads the seed timetable around the current week and says so. */
export function useLoadSampleTimetable() {
  const loadSampleTimetable = useTimetableStore((s) => s.loadSampleTimetable);
  return () => {
    loadSampleTimetable();
    toast.success('Eksempeltimeplanen er lastet inn', {
      description: 'Timene ligger i denne uka og de neste fire.',
    });
  };
}

function looksLikeIcs(file: File): boolean {
  return /\.(ics|ical|ifb|icalendar)$/i.test(file.name) || file.type === 'text/calendar';
}

/** Import a timetable from an .ics file: pick or drop → preview → confirm. */
export function ImportSheet({ open, onOpenChange }: ImportSheetProps) {
  const isDesktop = useIsDesktop();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const events = useTimetableStore((s) => s.events);
  const importEvents = useTimetableStore((s) => s.importEvents);
  const ensureSubject = useTimetableStore((s) => s.ensureSubject);
  const removeEvent = useTimetableStore((s) => s.removeEvent);
  const teachers = useMessagesStore((s) => s.teachers);
  const school = useSettingsStore((s) => s.school);
  const loadSample = useLoadSampleTimetable();

  const [result, setResult] = useState<IcsParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  /** Lessons away from school, by LOCATION text; null while looking them up. */
  const [offsite, setOffsite] = useState<Map<string, Place> | null>(new Map());
  const lookup = useRef(0);
  const hasImported = events.some((e) => e.source === 'ics');
  const seedClasses = events.filter((e) => e.kind === 'class' && e.source === 'seed');
  const [replace, setReplace] = useState(true);
  const [removeSample, setRemoveSample] = useState(true);

  function reset() {
    setResult(null);
    setFileName('');
    setError(null);
    setShowSkipped(false);
    setOffsite(new Map());
    lookup.current += 1;
    if (inputRef.current) inputRef.current.value = '';
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 300); // after the exit animation
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!looksLikeIcs(file)) {
      setError('Det er ikke en kalenderfil. Velg en fil som slutter på .ics.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Filen er for stor. En timeplan er vanligvis under 1 MB.');
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      const parsed = parseIcs(text, {
        matchTeacher: (description) =>
          teachers.find((t) => description.toLowerCase().includes(t.name.toLowerCase()))?.id,
      });
      if (parsed.events.length === 0) {
        setError(
          parsed.outsideWindow > 0
            ? 'Alle hendelsene i filen ligger utenfor perioden vi henter (fra fire uker tilbake til et halvt år fram).'
            : 'Vi fant ingen timer i filen.',
        );
        return;
      }
      setFileName(file.name);
      setResult(parsed);
      const run = ++lookup.current;
      setOffsite(null);
      void locateOffsite(parsed.events, school).then((found) => {
        if (lookup.current === run) setOffsite(found);
      });
    } catch (caught) {
      setError(
        caught instanceof IcsParseError
          ? caught.message
          : 'Vi klarte ikke å lese filen. Prøv igjen, eller eksporter timeplanen på nytt.',
      );
    } finally {
      setReading(false);
    }
  }

  function confirm() {
    if (!result) return;
    const mapped = result.events.map((event) => {
      // An address in LOCATION becomes the lesson's place, so trips go there, not to school.
      const place = event.room ? offsite?.get(event.room) : undefined;
      const located: IcsEvent = place ? { ...event, location: place } : event;
      if (place) delete located.room;
      if (located.kind !== 'class') return located;
      const subject = ensureSubject(located.title);
      return { ...located, title: subject.name, subjectId: subject.id };
    });
    if (removeSample) seedClasses.forEach((e) => removeEvent(e.id));
    const count = importEvents(mapped, { replace });
    toast.success(`${count} hendelser er importert`, {
      description: result.calendarName ?? fileName,
    });
    close(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void readFile(event.dataTransfer.files[0]);
  }

  const classCount = result?.events.filter((e) => e.kind === 'class').length ?? 0;
  const first = result?.events[0];
  const last = result?.events.at(-1);
  const offsiteLabels = offsite ? [...offsite.values()].map((place) => place.label) : [];

  const footer = result ? (
    <div className="flex gap-2">
      <Button variant="secondary" fullWidth onClick={reset}>
        Velg en annen fil
      </Button>
      <Button fullWidth icon={<CalendarCheck />} loading={offsite === null} onClick={confirm}>
        Importer {result.events.length}
      </Button>
    </div>
  ) : undefined;

  return (
    <Sheet
      open={open}
      onOpenChange={close}
      title={result ? 'Se over importen' : 'Importer timeplan'}
      description={
        result
          ? fileName
          : 'Last ned timeplanen som .ics fra Visma InSchool (Timeplan → Eksporter) eller en annen kalender.'
      }
      footer={footer}
    >
      {result ? (
        <div className="flex flex-col gap-4">
          <Card tone="primary-soft">
            <p className="font-display text-title font-semibold nums">{result.events.length} hendelser</p>
            <p className="mt-1 text-small">
              {classCount} timer
              {first && last ? ` · ${formatDate(first.start)} – ${formatDate(last.start)}` : null}
            </p>
            {result.calendarName ? <p className="mt-1 text-small">{result.calendarName}</p> : null}
          </Card>

          {offsite === null ? (
            <p className="flex items-center gap-2 text-small text-ink-2">
              <MapPin aria-hidden className="size-4 shrink-0" />
              Ser etter steder utenfor skolen …
            </p>
          ) : offsiteLabels.length > 0 ? (
            <p className="flex items-start gap-2 text-small text-ink">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-2" />
              <span>{offsiteSummary(offsiteLabels)}</span>
            </p>
          ) : null}

          <div>
            <h3 className="mb-2 text-small font-semibold text-ink">De første</h3>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {result.events.slice(0, PREVIEW_ROWS).map((event, index) => (
                <li key={index} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-24 shrink-0 text-small text-ink-2 nums">
                    {upperFirst(formatDayShort(event.start))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{event.title}</span>
                    <span className="block truncate text-small text-ink-2 nums">
                      {event.allDay ? 'Hele dagen' : formatTimeRange(event.start, event.end)}
                      {event.room ? ` · ${event.room}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {result.events.length > PREVIEW_ROWS ? (
              <p className="mt-2 text-small text-ink-2">og {result.events.length - PREVIEW_ROWS} til.</p>
            ) : null}
          </div>

          {result.skipped.length > 0 ? (
            <Card tone="accent" padding="none">
              <button
                type="button"
                aria-expanded={showSkipped}
                aria-controls={`${inputId}-skipped`}
                onClick={() => setShowSkipped((v) => !v)}
                className="flex min-h-12 w-full items-center gap-2 rounded-lg px-4 text-left text-small font-semibold"
              >
                <TriangleExclamationPoint aria-hidden className="size-4 shrink-0" />
                <span className="flex-1">
                  {result.skipped.length === 1
                    ? '1 oppføring ble hoppet over'
                    : `${result.skipped.length} oppføringer ble hoppet over`}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn('size-4 transition-transform duration-200 ease-out', showSkipped && 'rotate-180')}
                />
              </button>
              <Collapse id={`${inputId}-skipped`} open={showSkipped}>
                <ul className="flex flex-col gap-1 px-4 pb-3 text-small">
                  {result.skipped.map((item, index) => (
                    <li key={index}>
                      <span className="font-semibold">{item.title}</span> – {item.reason.toLowerCase()}
                    </li>
                  ))}
                </ul>
              </Collapse>
            </Card>
          ) : null}

          {result.outsideWindow > 0 ? (
            <p className="text-small text-ink-2">
              {result.outsideWindow} hendelser ligger utenfor perioden fra {formatDate(result.window.from)} til{' '}
              {formatDate(result.window.to)} og blir ikke tatt med.
            </p>
          ) : null}

          <div className="flex flex-col divide-y divide-line">
            <Switch
              className="py-2"
              label="Erstatt tidligere importert timeplan"
              description={
                hasImported
                  ? 'Timene fra forrige import blir fjernet først.'
                  : 'Du har ikke importert noe før.'
              }
              checked={replace}
              onCheckedChange={setReplace}
            />
            {seedClasses.length > 0 ? (
              <Switch
                className="py-2"
                label="Fjern eksempeltimeplanen"
                description="Så får du ikke to timeplaner oppå hverandre."
                checked={removeSample}
                onCheckedChange={setRemoveSample}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center',
              'transition-[background-color,border-color] duration-150',
              dragging ? 'border-primary bg-primary-soft' : 'border-line-strong bg-surface-2',
            )}
          >
            <span aria-hidden className="grid size-12 place-items-center rounded-lg bg-surface text-ink-2 [&_svg]:size-6">
              <FileUp />
            </span>
            <p className="text-body font-semibold">
              {isDesktop ? 'Slipp .ics-filen her' : 'Velg .ics-filen fra telefonen'}
            </p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept=".ics,text/calendar"
              className="sr-only"
              onChange={(event) => void readFile(event.target.files?.[0])}
            />
            <Button
              variant="secondary"
              icon={<FileUp />}
              loading={reading}
              onClick={() => inputRef.current?.click()}
            >
              Velg fil
            </Button>
          </div>

          {error ? (
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft p-4 text-small text-danger-soft-ink">
              <TriangleExclamationPoint aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <a
            href={SAMPLE_ICS_URL}
            download="eksempel-timeplan.ics"
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-sm text-small font-semibold text-primary underline-offset-4 hover:underline"
          >
            <Download aria-hidden className="size-4" />
            Last ned en eksempelfil å teste med
          </a>

          <div className="border-t border-line pt-4">
            <p className="font-semibold">Vil du bare se hvordan det ser ut?</p>
            <p className="mt-1 text-small text-ink-2">
              Eksempeltimeplanen fyller denne uka og de neste fire med timer for 1TIA.
            </p>
            <Button
              variant="soft"
              icon={<RotateCw />}
              className="mt-3"
              onClick={() => {
                loadSample();
                close(false);
              }}
            >
              Last inn eksempeltimeplan
            </Button>
          </div>
          {hasImported ? (
            <Badge tone="info" className="self-start">
              Du har importert en timeplan før
            </Badge>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
