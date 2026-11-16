import { CalendarX, ClipboardList, MessagesSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Button, ButtonLink, EmptyState, Page, PageHeader, useIsDesktop } from '@/components/ui';
import { useMessagesStore, useThread, useUnreadCount } from '@/stores/messages';
import { AbsenceSheet } from './components/AbsenceSheet';
import { ChatView } from './components/ChatView';
import { MyAbsencesSheet } from './components/MyAbsencesSheet';
import { ThreadList } from './components/ThreadList';
import { useKeyboardInset } from './hooks/useKeyboardInset';
import type { AbsencePreset } from './logic/absenceForm';

/** Query params other features link with: `/meldinger?fravaer=2026-11-17&time=<eventId>`. */
const DATE_PARAM = 'fravaer';
const CLASS_PARAM = 'time';

/**
 * `/meldinger` and `/meldinger/:threadId`. Desktop: list and conversation side by side.
 * Mobile: the list and the conversation are separate screens.
 */
export function MessagesPage() {
  const { threadId } = useParams();
  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useSearchParams();

  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [preset, setPreset] = useState<AbsencePreset | null>(null);
  const [mineOpen, setMineOpen] = useState(false);

  // Deep link: open the sheet with the day (and class) preselected, then clean the URL
  // so a reload or the back button does not open it again.
  const linkedDate = searchParams.get(DATE_PARAM);
  const linkedClass = searchParams.get(CLASS_PARAM);
  useEffect(() => {
    if (linkedDate === null && linkedClass === null) return;
    setPreset({ date: linkedDate, eventId: linkedClass });
    setMineOpen(false);
    setAbsenceOpen(true);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(DATE_PARAM);
        next.delete(CLASS_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [linkedDate, linkedClass, setSearchParams]);

  const openAbsence = useCallback(() => {
    setPreset(null);
    setMineOpen(false);
    setAbsenceOpen(true);
  }, []);

  const sheets = (
    <>
      <AbsenceSheet open={absenceOpen} onOpenChange={setAbsenceOpen} preset={preset} />
      <MyAbsencesSheet open={mineOpen} onOpenChange={setMineOpen} onReportAbsence={openAbsence} />
    </>
  );

  if (isDesktop) {
    return (
      <Page width="wide" fill className="pb-8">
        <ListHeader onReportAbsence={openAbsence} onShowMine={() => setMineOpen(true)} />
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(288px,340px)_minmax(0,1fr)] gap-4">
          <div className="scroll-area min-h-0 rounded-lg border border-line bg-surface">
            <ThreadList activeId={threadId} />
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface">
            {threadId ? (
              <ThreadPane
                key={threadId}
                threadId={threadId}
                variant="pane"
                onReportAbsence={openAbsence}
              />
            ) : (
              <div className="grid flex-1 place-items-center">
                <EmptyState
                  icon={<MessagesSquare />}
                  title="Velg en samtale"
                  description="Meldingene til lærerne dine vises her."
                />
              </div>
            )}
          </div>
        </div>
        {sheets}
      </Page>
    );
  }

  if (threadId) {
    return (
      <>
        <MobileThreadPage key={threadId} threadId={threadId} onReportAbsence={openAbsence} />
        {sheets}
      </>
    );
  }

  return (
    <Page key="list">
      <ListHeader onReportAbsence={openAbsence} onShowMine={() => setMineOpen(true)} />
      <div className="-mx-(--gutter) border-y border-line bg-surface">
        <ThreadList />
      </div>
      {sheets}
    </Page>
  );
}

function ListHeader({
  onReportAbsence,
  onShowMine,
}: {
  onReportAbsence: () => void;
  onShowMine: () => void;
}) {
  const unread = useUnreadCount();
  const absenceCount = useMessagesStore((s) => s.absences.length);
  const subtitle =
    unread === 0 ? 'Alt er lest' : unread === 1 ? '1 ulest melding' : `${unread} uleste meldinger`;
  const mineLabel = absenceCount > 0 ? `Mitt fravær (${absenceCount})` : 'Mitt fravær';

  return (
    <div className="flex flex-col gap-4 desktop:flex-row desktop:items-end desktop:justify-between">
      <PageHeader title="Meldinger" subtitle={subtitle} className="desktop:flex-1" />
      <div className="grid grid-cols-[1fr_auto] gap-2 desktop:flex">
        <Button
          size="lg"
          icon={<CalendarX />}
          onClick={onReportAbsence}
          className="desktop:order-2"
        >
          Meld fravær
        </Button>
        <Button size="lg" variant="secondary" icon={<ClipboardList />} onClick={onShowMine}>
          {mineLabel}
        </Button>
      </div>
    </div>
  );
}

function ThreadPane(props: {
  threadId: string;
  variant: 'page' | 'pane';
  onReportAbsence: () => void;
}) {
  const thread = useThread(props.threadId);
  if (!thread) return <MissingThread />;
  return <ChatView {...props} />;
}

function MobileThreadPage({
  threadId,
  onReportAbsence,
}: {
  threadId: string;
  onReportAbsence: () => void;
}) {
  const keyboard = useKeyboardInset();
  return (
    <Page
      fill
      // The bottom nav sits behind an open keyboard; the composer rides on top of it.
      style={keyboard > 0 ? { height: `calc(100dvh - ${keyboard}px)` } : undefined}
    >
      <ThreadPane threadId={threadId} variant="page" onReportAbsence={onReportAbsence} />
    </Page>
  );
}

function MissingThread() {
  return (
    <div className="grid flex-1 place-items-center">
      <EmptyState
        icon={<MessagesSquare />}
        title="Fant ikke samtalen"
        description="Den kan ha blitt borte da demodataene ble tilbakestilt."
        action={
          <ButtonLink to="/meldinger" variant="secondary">
            Til meldinger
          </ButtonLink>
        }
      />
    </div>
  );
}
