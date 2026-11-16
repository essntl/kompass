import { ChevronRight, FileText, LayoutGrid, List, Plus, Camera, SearchX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  IconButton,
  Page,
  PageHeader,
  SegmentedControl,
  toast,
  useIsDesktop,
} from '@/components/ui';
import { formatDayShort } from '@/lib/date';
import { useSettingsStore } from '@/stores/settings';
import { useSortedEntries } from '@/stores/portfolio';
import { useSubjectMap, useTimetableStore } from '@/stores/timetable';
import { ApplicationSheet } from './components/ApplicationSheet';
import { EntryFormSheet } from './components/EntryFormSheet';
import { EntryGrid } from './components/EntryGrid';
import { EntryTimeline } from './components/EntryTimeline';
import { SelectionBar } from './components/SelectionBar';
import {
  buildApplicationRequest,
  filterEntries,
  filterSubjects,
  MAX_SELECTION,
  pickEntries,
} from './logic';
import { viewSwap } from './motion';
import { landOnPortfolio, pendingFlightEntryId } from './photoFlight';
import { usePortfolioUiStore, type PortfolioView } from './store';

const VIEW_OPTIONS = [
  { value: 'grid', label: 'Rutenett', icon: <LayoutGrid /> },
  { value: 'timeline', label: 'Tidslinje', icon: <List /> },
] as const satisfies ReadonlyArray<{ value: PortfolioView; label: string; icon: ReactNode }>;

const countLabel = (n: number) => (n === 1 ? '1 oppføring' : `${n} oppføringer`);

/** `/portefolje` – the student's work as a photo grid or a timeline. */
export function PortfolioPage() {
  const isDesktop = useIsDesktop();
  const entries = useSortedEntries();
  const subjects = useTimetableStore((s) => s.subjects);
  const subjectMap = useSubjectMap();

  const view = usePortfolioUiStore((s) => s.view);
  const filter = usePortfolioUiStore((s) => s.filter);
  const selecting = usePortfolioUiStore((s) => s.selecting);
  const selectedIds = usePortfolioUiStore((s) => s.selectedIds);
  const draft = usePortfolioUiStore((s) => s.draft);
  const status = usePortfolioUiStore((s) => s.status);
  const { setView, setFilter, startSelecting, stopSelecting, toggleSelected, generate } =
    usePortfolioUiStore.getState();

  const [formOpen, setFormOpen] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);

  // The list staggers in on arrival – unless a photo is flying back into it, in which
  // case the grid is simply there for it to land in.
  const [entrance, setEntrance] = useState(() => pendingFlightEntryId() === null);
  useEffect(() => setEntrance(false), []);

  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const returning = pendingFlightEntryId();
    if (returning) return landOnPortfolio(listRef.current, returning);
  }, []);

  const visible = useMemo(() => filterEntries(entries, filter), [entries, filter]);
  const chips = useMemo(() => filterSubjects(entries, subjects, filter), [entries, subjects, filter]);
  const draftEntries = useMemo(() => pickEntries(entries, draft?.entryIds ?? []), [entries, draft]);

  // A filter for a subject that no longer exists falls back to everything.
  useEffect(() => {
    if (filter !== 'all' && !subjects.some((s) => s.id === filter)) setFilter('all');
  }, [filter, subjects, setFilter]);

  // Esc leaves selection mode (when no sheet is open on top).
  useEffect(() => {
    if (!selecting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !applicationOpen && !formOpen) stopSelecting();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selecting, applicationOpen, formOpen, stopSelecting]);

  // Leaving the page leaves selection mode.
  useEffect(() => () => usePortfolioUiStore.getState().stopSelecting(), []);

  function onToggle(id: string) {
    if (!selectedIds.includes(id) && selectedIds.length >= MAX_SELECTION) {
      toast('Du kan velge opptil fem oppføringer', {
        id: 'portfolio-selection-full',
        description: 'Fjern en for å velge en annen.',
      });
      return;
    }
    toggleSelected(id);
  }

  function beginSelection() {
    const keep = (draft?.entryIds ?? []).filter((id) => entries.some((e) => e.id === id));
    startSelecting(keep.slice(0, MAX_SELECTION));
  }

  function createDraft() {
    const chosen = pickEntries(entries, selectedIds);
    if (chosen.length === 0) return;
    const profile = useSettingsStore.getState().profile;
    void generate(buildApplicationRequest(profile, chosen), chosen.map((e) => e.id));
    stopSelecting();
    setApplicationOpen(true);
  }

  const empty = entries.length === 0;
  const subtitle = selecting
    ? `Velg 1–${MAX_SELECTION} oppføringer som viser hva du kan.`
    : empty
      ? 'Det du lager, samlet på ett sted.'
      : filter === 'all'
        ? countLabel(entries.length)
        : `${visible.length} av ${countLabel(entries.length)}`;

  const listProps = {
    entries: visible,
    subjects: subjectMap,
    entrance,
    selecting,
    selectedIds,
    selectionFull: selectedIds.length >= MAX_SELECTION,
    onToggle,
  };

  return (
    <Page width="wide">
      <PageHeader
        title="Portefølje"
        subtitle={subtitle}
        actions={
          empty || selecting ? null : isDesktop ? (
            <div className="flex items-center gap-3">
              <SegmentedControl
                aria-label="Visning"
                size="sm"
                fullWidth={false}
                value={view}
                onChange={setView}
                options={VIEW_OPTIONS}
              />
              <Button icon={<Plus />} onClick={() => setFormOpen(true)}>
                Legg til oppføring
              </Button>
            </div>
          ) : (
            <>
              <IconButton
                label={view === 'grid' ? 'Vis som tidslinje' : 'Vis som rutenett'}
                icon={view === 'grid' ? <List /> : <LayoutGrid />}
                onClick={() => setView(view === 'grid' ? 'timeline' : 'grid')}
              />
              <IconButton label="Legg til oppføring" icon={<Plus />} variant="primary" onClick={() => setFormOpen(true)} />
            </>
          )
        }
      />

      {empty ? (
        <EmptyState
          icon={<Camera />}
          title="Porteføljen din er tom"
          description="Ta bilde av noe du har laget i verkstedet, og skriv kort om hvordan det gikk."
          action={
            <Button icon={<Plus />} onClick={() => setFormOpen(true)}>
              Legg til oppføring
            </Button>
          }
        />
      ) : (
        <>
          {selecting ? null : (
            <Card
              as="button"
              type="button"
              interactive
              tone="sunken"
              onClick={() => (draft ? setApplicationOpen(true) : beginSelection())}
            >
              <span className="flex items-center gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-ink [&_svg]:size-5">
                <FileText />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold text-ink">
                  {draft ? 'Fortsett på søknadsteksten' : 'Lag søknadstekst'}
                </span>
                <span className="text-small text-ink-2">
                  {status === 'streaming'
                    ? 'Utkastet skrives nå.'
                    : draft
                      ? `Utkast fra ${formatDayShort(draft.createdAt)}, bygd på ${countLabel(draft.entryIds.length)}.`
                      : 'Velg det beste du har gjort, så skriver vi et utkast til en lærlingsøknad.'}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-2" />
              </span>
            </Card>
          )}

          {chips.length > 0 ? (
            <ChipGroup label="Filtrer på fag" layout="scroll">
              <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
                Alle
              </Chip>
              {chips.map((subject) => (
                <Chip key={subject.id} selected={filter === subject.id} onClick={() => setFilter(subject.id)}>
                  {subject.name}
                </Chip>
              ))}
            </ChipGroup>
          ) : null}

          <div ref={listRef} className="relative">
            {visible.length === 0 ? (
              <EmptyState
                size="compact"
                icon={<SearchX />}
                title="Ingen oppføringer i dette faget"
                description="Legg til en ny oppføring, eller se hele porteføljen."
                action={
                  <Button variant="secondary" onClick={() => setFilter('all')}>
                    Vis alle
                  </Button>
                }
              />
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={view} variants={viewSwap} initial="hidden" animate="show" exit="exit">
                  {view === 'grid' ? <EntryGrid {...listProps} /> : <EntryTimeline {...listProps} />}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Room for the selection bar, so it never covers the last row. */}
          {selecting ? <div aria-hidden className="h-20" /> : null}
        </>
      )}

      <SelectionBar
        open={selecting}
        count={selectedIds.length}
        onCancel={stopSelecting}
        onConfirm={createDraft}
      />

      <EntryFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(saved) => {
          if (filter !== 'all' && saved.subjectId !== filter) setFilter('all');
        }}
      />

      <ApplicationSheet
        open={applicationOpen}
        onOpenChange={setApplicationOpen}
        entries={draftEntries}
        onChooseOthers={() => {
          setApplicationOpen(false);
          beginSelection();
        }}
      />
    </Page>
  );
}
