import type { CalendarEvent, ISODate } from '@shared/types';
import { CalendarDays, ChevronLeft, ChevronRight, FileUp, List, Plus, RotateCw, Rows3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Button,
  Card,
  IconButton,
  Page,
  PageHeader,
  SegmentedControl,
} from '@/components/ui';
import {
  addDaysISO,
  formatDate,
  formatDayLong,
  isoWeek,
  relativeDay,
  startOfWeekISO,
  toISODate,
  weekDays,
} from '@/lib/date';
import { useCalendarEvents, useNow } from '@/lib/timetable';
import { useSubjectMap } from '@/stores/timetable';
import { DayView } from './components/DayView';
import { EventDetailSheet } from './components/EventDetailSheet';
import { EventFormSheet } from './components/EventFormSheet';
import { ImportSheet, useLoadSampleTimetable } from './components/ImportSheet';
import { Legend } from './components/Legend';
import { LIST_DAYS, ListView } from './components/ListView';
import { SwipePager, type SwipePagerHandle } from './components/SwipePager';
import { WeekView } from './components/WeekView';
import type { TimetableView } from './logic/layout';
import { useRememberedView } from './useRememberedView';

const STEP: Record<TimetableView, number> = { dag: 1, uke: 7, liste: LIST_DAYS };
const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/** "16.–20. november" (same month) or "30. november – 4. desember". */
function rangeLabel(from: ISODate, to: ISODate, now: Date): string {
  const strip = (label: string, day: ISODate) =>
    day.slice(0, 4) === String(now.getFullYear()) ? label.replace(/ \d{4}$/, '') : label;
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${Number(from.slice(8))}.–${strip(formatDate(to), to)}`;
  }
  return `${strip(formatDate(from), from)} – ${strip(formatDate(to), to)}`;
}

function periodLabel(view: TimetableView, anchor: ISODate, now: Date): { title: string; detail: string } {
  if (view === 'dag') {
    const relative = relativeDay(anchor, now);
    const long = formatDayLong(anchor);
    return {
      title: long.charAt(0).toUpperCase() + long.slice(1),
      detail: ['i dag', 'i morgen', 'i går'].includes(relative) ? relative.charAt(0).toUpperCase() + relative.slice(1) : `Uke ${isoWeek(anchor)}`,
    };
  }
  if (view === 'uke') {
    const days = weekDays(anchor, 7);
    return { title: `Uke ${isoWeek(anchor)}`, detail: rangeLabel(days[0] ?? anchor, days[4] ?? anchor, now) };
  }
  return { title: 'Agenda', detail: rangeLabel(anchor, addDaysISO(anchor, LIST_DAYS - 1), now) };
}

/** Elements where ←/→ already mean something. */
function ownsArrowKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return !!target.closest('input, textarea, select, [role="radiogroup"], [role="slider"], [role="tablist"], [role="dialog"]');
}

export function TimetablePage() {
  const now = useNow(60_000);
  const today = toISODate(now);
  const events = useCalendarEvents();
  const subjects = useSubjectMap();
  const [params] = useSearchParams();
  const [view, setView] = useRememberedView();
  const [anchor, setAnchor] = useState<ISODate>(() => {
    const requested = params.get('dato');
    return requested && DATE_PARAM.test(requested) ? requested : toISODate(new Date());
  });
  const pager = useRef<SwipePagerHandle>(null);

  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [formDate, setFormDate] = useState<ISODate>(anchor);
  const [importOpen, setImportOpen] = useState(false);
  const loadSample = useLoadSampleTimetable();

  const hasClasses = events.some((e) => e.kind === 'class');
  const label = periodLabel(view, anchor, now);
  const anyOverlayOpen = selected !== null || formOpen || importOpen;

  const shift = (direction: 1 | -1) => setAnchor((current) => addDaysISO(current, direction * STEP[view]));

  function navigate(direction: 1 | -1) {
    if (view === 'liste' || !pager.current) shift(direction);
    else pager.current.go(direction);
  }

  const isCurrentPeriod =
    view === 'dag'
      ? anchor === today
      : view === 'uke'
        ? startOfWeekISO(anchor) === startOfWeekISO(today)
        : anchor === today;

  // ←/→ move a day / week, like the arrow buttons.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  useEffect(() => {
    if (anyOverlayOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (ownsArrowKeys(event.target)) return;
      event.preventDefault();
      navigateRef.current(event.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anyOverlayOpen]);

  function openAdd(day: ISODate = anchor) {
    setEditing(null);
    setFormDate(day < today && view !== 'dag' ? today : day);
    setFormOpen(true);
  }

  function openDay(day: ISODate) {
    setAnchor(day);
    setView('dag');
  }

  return (
    <Page width={view === 'uke' ? 'full' : 'wide'}>
      <PageHeader
        title="Timeplan"
        actions={
          <>
            <IconButton label="Importer timeplan" icon={<FileUp />} onClick={() => setImportOpen(true)} />
            <IconButton label="Legg til hendelse" icon={<Plus />} variant="soft" onClick={() => openAdd()} />
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <SegmentedControl
          aria-label="Visning"
          className="desktop:max-w-sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'dag', label: 'Dag', icon: <CalendarDays /> },
            { value: 'uke', label: 'Uke', icon: <Rows3 /> },
            { value: 'liste', label: 'Liste', icon: <List /> },
          ]}
        />

        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
            <h2 className="truncate font-display text-heading font-semibold text-ink">{label.title}</h2>
            <p className="truncate text-small text-ink-2 nums">{label.detail}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={isCurrentPeriod}
            onClick={() => setAnchor(today)}
            className="mr-1"
          >
            I dag
          </Button>
          <IconButton
            label={view === 'dag' ? 'Forrige dag' : view === 'uke' ? 'Forrige uke' : 'Forrige to uker'}
            icon={<ChevronLeft />}
            onClick={() => navigate(-1)}
          />
          <IconButton
            label={view === 'dag' ? 'Neste dag' : view === 'uke' ? 'Neste uke' : 'Neste to uker'}
            icon={<ChevronRight />}
            onClick={() => navigate(1)}
          />
        </div>
      </div>

      {!hasClasses ? (
        <Card tone="sunken" className="flex flex-col gap-3 desktop:flex-row desktop:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Ingen timer i timeplanen</p>
            <p className="mt-1 text-small text-ink-2">
              Importer timeplanen fra Visma InSchool, eller last inn et eksempel for å prøve appen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" size="sm" icon={<RotateCw />} onClick={loadSample}>
              Last inn eksempeltimeplan
            </Button>
            <Button variant="secondary" size="sm" icon={<FileUp />} onClick={() => setImportOpen(true)}>
              Importer
            </Button>
          </div>
        </Card>
      ) : null}

      <section aria-label={`${label.title}, ${label.detail}`}>
        {view === 'liste' ? (
          <ListView
            from={anchor}
            events={events}
            subjects={subjects}
            now={now}
            onOpenEvent={setSelected}
            onAdd={openAdd}
          />
        ) : (
          <SwipePager
            key={view}
            ref={pager}
            onCommit={shift}
            renderPage={(offset) =>
              view === 'dag' ? (
                <DayView
                  day={addDaysISO(anchor, offset)}
                  events={events}
                  subjects={subjects}
                  now={now}
                  onOpenEvent={setSelected}
                  onAdd={openAdd}
                />
              ) : (
                <WeekView
                  anchor={addDaysISO(anchor, offset * 7)}
                  events={events}
                  subjects={subjects}
                  now={now}
                  onOpenEvent={setSelected}
                  onOpenDay={openDay}
                />
              )
            }
          />
        )}
      </section>

      <Legend />

      <EventDetailSheet
        event={selected}
        events={events}
        subject={selected?.subjectId ? subjects.get(selected.subjectId) : undefined}
        onOpenChange={(open) => !open && setSelected(null)}
        onEdit={(event) => {
          setEditing(event);
          setFormOpen(true);
        }}
      />
      <EventFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        defaultDate={formDate}
        onSaved={(saved) => setAnchor(saved.start.slice(0, 10))}
      />
      <ImportSheet open={importOpen} onOpenChange={setImportOpen} />
    </Page>
  );
}
