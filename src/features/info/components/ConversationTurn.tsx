import { getInfoSource } from '@shared/infoSources';
import { CircleStop, RotateCw, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Ref } from 'react';
import {
  Button,
  DemoBadge,
  ErrorState,
  SkeletonText,
  Stagger,
  StaggerItem,
} from '@/components/ui';
import { fade } from '@/lib/motion';
import { parseAnswer } from '../logic/answerText';
import { isInFlight, type Turn } from '../logic/conversation';
import { visibleText } from '../logic/reveal';
import { useRevealedText } from '../useRevealedText';
import { SourceCard } from './SourceCard';
import { TextBlocks } from './TextBlocks';

export interface ConversationTurnProps {
  turn: Turn;
  /** Only the newest turn can be retried. */
  isLast: boolean;
  onRetry: () => void;
  questionRef?: Ref<HTMLDivElement>;
}

/** One question and its answer: skeleton → typed answer → source cards. */
export function ConversationTurn({ turn, isLast, onRetry, questionRef }: ConversationTurnProps) {
  const inFlight = isInFlight(turn);
  const revealed = useRevealedText(turn.answer, inFlight);
  const typing = inFlight || revealed < turn.answer.length;
  const visible = visibleText(turn.answer, revealed);

  // The rest of the word being typed is laid out invisibly, so a long word never jumps to
  // the next line half-way through.
  const nextChar = turn.answer.charAt(visible.length);
  const wordTail = typing && /\S$/.test(visible) && /\S/.test(nextChar)
    ? (turn.answer.slice(visible.length).match(/^\S+/)?.[0] ?? '')
    : '';

  const blocks = parseAnswer(visible, { streaming: typing });
  const showSkeleton = turn.status === 'waiting' || (turn.status === 'streaming' && blocks.length === 0);
  const sources = turn.status === 'done' && !typing ? (turn.sources ?? []) : [];

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={questionRef}
        className="max-w-[85%] scroll-mt-24 self-end rounded-lg rounded-br-sm bg-primary-soft px-4 py-2.5 text-body text-primary-soft-ink"
      >
        <span className="sr-only">Du spurte: </span>
        {turn.question}
      </div>

      <article aria-busy={typing || undefined} aria-label="Svar fra Kompass" className="relative flex flex-col gap-3">
        <div className="flex min-h-6 items-center gap-2 text-small font-semibold text-ink-2">
          <Sparkles aria-hidden className="size-4 text-primary" />
          <span>Kompass</span>
          {turn.status === 'done' && turn.mock ? <DemoBadge /> : null}
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          {showSkeleton ? (
            <motion.div key="skeleton" variants={fade} initial="hidden" animate="show" exit="exit">
              <SkeletonText lines={3} />
              <span className="sr-only">Kompass skriver et svar</span>
            </motion.div>
          ) : blocks.length ? (
            <motion.div key="answer" variants={fade} initial="hidden" animate="show">
              <TextBlocks
                blocks={blocks}
                trailing={
                  typing ? (
                    <>
                      {/* Zero net width (w-0.5 -mr-0.5), so the caret never pushes text around. */}
                      <span
                        aria-hidden
                        className="-mr-0.5 inline-block h-4 w-0.5 translate-y-0.5 rounded-full bg-primary motion-safe:animate-pulse"
                      />
                      <span aria-hidden className="opacity-0">
                        {wordTail}
                      </span>
                    </>
                  ) : null
                }
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {turn.status === 'stopped' ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <CircleStop aria-hidden className="size-4" />
              {turn.answer ? 'Du stoppet svaret.' : 'Du stoppet svaret før det kom noe tekst.'}
            </span>
            {isLast ? (
              <Button variant="ghost" size="sm" icon={<RotateCw />} onClick={onRetry}>
                Spør på nytt
              </Button>
            ) : null}
          </div>
        ) : null}

        {turn.status === 'error' ? (
          <div className="rounded-lg border border-line bg-surface">
            <ErrorState
              size="compact"
              title="Fikk ikke svar"
              description={turn.error?.message}
              onRetry={isLast ? onRetry : undefined}
            />
          </div>
        ) : null}

        {sources.length ? (
          <div className="mt-1 flex flex-col gap-2">
            <p className="text-small font-semibold text-ink-2">Les mer hos kildene</p>
            <Stagger as="ul" className="grid grid-cols-1 gap-2" aria-label="Kilder til svaret">
              {sources.map((source) => {
                const curated = getInfoSource(source.sourceId);
                return (
                  <StaggerItem as="li" key={source.sourceId}>
                    <SourceCard
                      title={source.title}
                      url={source.url}
                      publisher={curated?.publisher}
                      why={source.why}
                    />
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        ) : null}
      </article>
    </div>
  );
}
