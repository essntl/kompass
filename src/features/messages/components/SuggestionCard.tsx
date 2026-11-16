import { CalendarPlus, Check, CircleCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, DemoBadge } from '@/components/ui';
import { collapse, tween } from '@/lib/motion';
import { useMessagesStore } from '@/stores/messages';
import { useTimetableStore } from '@/stores/timetable';
import { absenceRecipients, recipientsSentence } from '../logic/absenceForm';
import { isAbsenceRegistered, summariseAbsence } from '../logic/detection';
import { acceptSuggestion, dismissSuggestion } from '../logic/flows';
import { useSuggestion } from '../store';

/**
 * "Legg til fravær i kalenderen?" under the chat message the AI read an absence in.
 * Opens by growing its height (the chat stays pinned to the bottom while it does), and
 * after "Legg til" shrinks into a one-line confirmation in the same box.
 */
export function SuggestionCard({
  messageId,
  onDismissed,
}: {
  messageId: string;
  /** Focus has nowhere to go once the card is gone; the chat decides where. */
  onDismissed?: () => void;
}) {
  const suggestion = useSuggestion(messageId);
  const events = useTimetableStore((s) => s.events);
  const teachers = useMessagesStore((s) => s.teachers);

  // A pending card whose absence got registered another way (the form) has nothing to offer.
  const registered =
    suggestion?.status === 'pending' && isAbsenceRegistered(suggestion.input, events);
  // "Lagt til" stops being true once the absence is removed under "Mitt fravær".
  const stillAdded = useMessagesStore((s) =>
    suggestion?.absenceId ? s.absences.some((a) => a.id === suggestion.absenceId) : false,
  );
  const visible =
    !!suggestion &&
    ((suggestion.status === 'added' && stillAdded) ||
      (suggestion.status === 'pending' && !registered));

  return (
    <AnimatePresence initial={false}>
      {visible && suggestion ? (
        <MeasuredBox key="suggestion">
          {suggestion.status === 'added' ? (
            <Confirmation />
          ) : (
            <PendingCard
              messageId={messageId}
              mock={suggestion.mock}
              summary={summariseAbsence(suggestion.input, events)}
              recipients={recipientsSentence(
                absenceRecipients(suggestion.input, { events, teachers }),
              )}
              onDismissed={onDismissed}
            />
          )}
        </MeasuredBox>
      ) : null}
    </AnimatePresence>
  );
}

/** Animates to its content's measured height: in from 0, between states, out to 0. */
function MeasuredBox({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 1, transition: collapse.open }}
      exit={{ height: 0, opacity: 0, transition: collapse.close }}
      // `clip` instead of `hidden` keeps the buttons' focus rings visible.
      style={{ overflow: 'clip' }}
      className="flex w-full justify-end"
    >
      <div ref={inner} className="flex w-full justify-end pt-2">
        {children}
      </div>
    </motion.div>
  );
}

function PendingCard({
  messageId,
  mock,
  summary,
  recipients,
  onDismissed,
}: {
  messageId: string;
  mock: boolean;
  summary: { when: string; scope: string; reason: string };
  recipients: string;
  onDismissed?: () => void;
}) {
  const titleId = useId();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: tween.base }}
      exit={{ opacity: 0, transition: tween.fast }}
      role="group"
      aria-labelledby={titleId}
      className="w-full max-w-[85%] rounded-lg border border-line bg-surface p-3.5 desktop:max-w-sm"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-soft-ink"
        >
          <CalendarPlus className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p id={titleId} className="text-small font-semibold text-ink">
              Legg til fravær i kalenderen?
            </p>
            {mock ? <DemoBadge /> : null}
          </div>
          <p className="mt-1 text-small text-ink">
            {summary.when} · {summary.scope}
          </p>
          <p className="text-small text-ink-2">
            Årsak: {summary.reason}. {recipients}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            dismissSuggestion(messageId);
            onDismissed?.();
          }}
        >
          Ikke nå
        </Button>
        <Button size="sm" icon={<Check />} onClick={() => acceptSuggestion(messageId)}>
          Legg til
        </Button>
      </div>
    </motion.div>
  );
}

function Confirmation() {
  const link = useRef<HTMLAnchorElement>(null);
  // "Legg til" is gone from under the finger: keep keyboard focus on the card's successor.
  useEffect(() => {
    if (document.activeElement === document.body || !document.activeElement?.isConnected) {
      link.current?.focus({ preventScroll: true });
    }
  }, []);
  return (
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0, transition: tween.base }}
      role="status"
      className="flex items-center gap-1.5 text-small text-ink-2"
    >
      <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
      <span>Lagt til i kalenderen</span>
      <span aria-hidden>·</span>
      <Link
        ref={link}
        to="/timeplan"
        className="hit-44 rounded-sm font-semibold text-primary underline-offset-2 hover:underline"
      >
        Se timeplanen
      </Link>
    </motion.p>
  );
}
