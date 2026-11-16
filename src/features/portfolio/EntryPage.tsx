import { CalendarDays, Pencil, SearchX, Trash } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Page,
  PageHeader,
  Section,
  toast,
} from '@/components/ui';
import { formatDate } from '@/lib/date';
import { usePortfolioEntry, usePortfolioStore } from '@/stores/portfolio';
import { useSubject } from '@/stores/timetable';
import { CompetenceSection } from './components/CompetenceSection';
import { EntryFormSheet } from './components/EntryFormSheet';
import { EntryPhoto } from './components/EntryPhoto';
import { SubjectTag } from './components/SubjectTag';
import { launchFlight, RADII, useFlightLanding } from './photoFlight';

const PORTFOLIO_PATH = '/portefolje';

/** `/portefolje/:entryId` – one entry, big photo first. */
export function EntryPage() {
  const { entryId } = useParams();
  const entry = usePortfolioEntry(entryId);
  const subject = useSubject(entry?.subjectId);
  const removeEntry = usePortfolioStore((s) => s.removeEntry);
  const navigate = useNavigate();

  const heroRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  // The photo flies in from the card that was tapped …
  useFlightLanding(entry?.id, heroRef, RADII.hero, 'expand');

  // … and back into it when the student returns to the portfolio. The layout-effect
  // cleanup runs while this page is still in the document, so the hero can be measured.
  const deletedRef = useRef(false);
  const id = entry?.id;
  useLayoutEffect(() => {
    if (!id) return;
    const hero = heroRef.current;
    return () => {
      if (deletedRef.current) return;
      if (window.location.pathname.replace(/\/+$/, '') === PORTFOLIO_PATH) {
        launchFlight(id, hero, RADII.hero);
      }
    };
  }, [id]);

  if (deleted) return <Page />;

  if (!entry) {
    return (
      <Page>
        <PageHeader title="Fant ikke oppføringen" back />
        <EmptyState
          icon={<SearchX />}
          title="Oppføringen finnes ikke"
          description="Den kan ha blitt slettet. Gå tilbake til porteføljen for å se resten."
          action={<ButtonLink to={PORTFOLIO_PATH}>Til porteføljen</ButtonLink>}
        />
      </Page>
    );
  }

  function confirmDelete() {
    if (!entry) return;
    deletedRef.current = true;
    setDeleted(true);
    navigate(PORTFOLIO_PATH, { replace: true });
    removeEntry(entry.id);
    toast('Oppføringen er slettet');
  }

  return (
    <Page>
      <PageHeader
        title={entry.title}
        back
        actions={
          <>
            <IconButton label="Rediger oppføringen" icon={<Pencil />} onClick={() => setEditOpen(true)} />
            <IconButton label="Slett oppføringen" icon={<Trash />} onClick={() => setConfirmOpen(true)} />
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <EntryPhoto
          ref={heroRef}
          photo={entry.photo}
          alt={entry.title}
          subject={subject}
          size="lg"
          shape="hero"
          className="rounded-xl"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-small text-ink-2">
            <CalendarDays aria-hidden className="size-4" />
            <time dateTime={entry.date}>{formatDate(entry.date)}</time>
          </span>
          {subject ? <SubjectTag subject={subject} /> : null}
        </div>
      </div>

      <Section title="Notat">
        <p className="text-body whitespace-pre-line text-ink">{entry.note}</p>
        {entry.tags.length > 0 ? (
          <ul aria-label="Stikkord" className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <li key={tag} className="inline-flex h-7 items-center rounded-sm bg-surface-2 px-2.5 text-small text-ink-2">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <CompetenceSection key={entry.id} entry={entry} />

      <EntryFormSheet open={editOpen} onOpenChange={setEditOpen} entry={entry} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Slette oppføringen?"
        description="Bildet, notatet og kompetansebeskrivelsen blir borte. Du kan ikke angre."
        confirmLabel="Slett"
        onConfirm={confirmDelete}
      />
    </Page>
  );
}
