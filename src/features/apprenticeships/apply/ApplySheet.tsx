import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Application, Listing } from '@shared/types';
import { Button, Sheet, useIsDesktop } from '@/components/ui';
import { tween } from '@/lib/motion';
import { useApprenticeshipStore } from '@/stores/apprenticeships';
import { useSortedEntries } from '@/stores/portfolio';
import { StepIndicator } from '../components/StepIndicator';
import { hasEnoughText } from '../logic/application';
import { useApprenticeshipUi, useDraft, type ApplyStep } from '../store';
import { EntryPicker } from './EntryPicker';
import { ReviewStep } from './ReviewStep';
import { SuccessView } from './SuccessView';
import { TextStep } from './TextStep';
import { useDraftStream } from './useDraftStream';

const STEPS: readonly ApplyStep[] = ['entries', 'text', 'review'];
const STEP_LABELS = ['Arbeid', 'Tekst', 'Send'] as const;
const STEP_TITLES: Record<ApplyStep, string> = {
  entries: 'Velg arbeid fra porteføljen',
  text: 'Søknadstekst',
  review: 'Se over og send',
};

/** Forward steps enter from the right, back steps from the left. */
const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  show: { opacity: 1, x: 0, transition: tween.base },
  exit: (dir: number) => ({ opacity: 0, x: dir * -16, transition: tween.fast }),
};

export interface ApplySheetProps {
  listing: Listing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Søk": three steps in a sheet (full height on mobile). Everything the student does is
 * kept in the listing's draft, so closing half-way and coming back picks up where they were.
 */
export function ApplySheet({ listing, open, onOpenChange }: ApplySheetProps) {
  const isDesktop = useIsDesktop();
  const draft = useDraft(listing.id);
  const updateDraft = useApprenticeshipUi((s) => s.updateDraft);
  const clearDraft = useApprenticeshipUi((s) => s.clearDraft);
  const submitApplication = useApprenticeshipStore((s) => s.submitApplication);
  const portfolio = useSortedEntries();

  const [direction, setDirection] = useState(1);
  const [submitted, setSubmitted] = useState<Application | null>(null);
  const [lengthHint, setLengthHint] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Entries that were deleted from the portfolio since the draft was started drop out.
  const chosen = useMemo(
    () =>
      draft.entryIds
        .map((id) => portfolio.find((entry) => entry.id === id))
        .filter((entry) => entry !== undefined),
    [draft.entryIds, portfolio],
  );
  const stream = useDraftStream(listing, chosen);
  const streaming = stream.status === 'streaming';

  const stepIndex = Math.max(0, STEPS.indexOf(draft.step));
  const step = STEPS[stepIndex]!;

  // Closing mid-stream keeps what arrived; a finished application starts fresh next time.
  useEffect(() => {
    if (!open) {
      stream.stop();
      setLengthHint(false);
      if (submitted) setSubmitted(null);
    }
  }, [open]);

  function goTo(next: ApplyStep) {
    const nextIndex = STEPS.indexOf(next);
    setDirection(nextIndex >= stepIndex ? 1 : -1);
    setLengthHint(false);
    updateDraft(listing.id, { step: next, entryIds: chosen.map((e) => e.id) });
    bodyRef.current?.closest('.scroll-area')?.scrollTo({ top: 0 });
  }

  function next() {
    if (step === 'entries') goTo('text');
    else if (step === 'text') {
      if (!hasEnoughText(draft.text)) {
        setLengthHint(true);
        return;
      }
      goTo('review');
    }
  }

  function send() {
    const application = submitApplication({
      listingId: listing.id,
      entryIds: chosen.map((e) => e.id),
      text: draft.text.trim(),
    });
    clearDraft(listing.id);
    setSubmitted(application);
  }

  const footer = submitted ? (
    <Button fullWidth size="lg" onClick={() => onOpenChange(false)}>
      Ferdig
    </Button>
  ) : (
    <div className="flex gap-2">
      {stepIndex > 0 ? (
        <Button
          variant="secondary"
          size="lg"
          icon={<ArrowLeft />}
          onClick={() => goTo(STEPS[stepIndex - 1]!)}
          disabled={streaming}
          className="px-4"
        >
          Tilbake
        </Button>
      ) : null}
      {step === 'review' ? (
        <Button fullWidth size="lg" icon={<Send />} onClick={send}>
          Send søknad
        </Button>
      ) : (
        <Button fullWidth size="lg" iconRight={<ArrowRight />} onClick={next} disabled={streaming}>
          {step === 'entries' && chosen.length === 0 && portfolio.length > 0 ? 'Fortsett uten vedlegg' : 'Neste'}
        </Button>
      )}
    </div>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={submitted ? 'Søknad sendt' : `Søk hos ${listing.company}`}
      description={submitted ? undefined : `Steg ${stepIndex + 1} av ${STEPS.length}`}
      size="lg"
      footer={footer}
      className={isDesktop ? undefined : 'h-[calc(100dvh-var(--safe-top)-16px)]'}
    >
      <div ref={bodyRef} className="flex flex-col gap-5">
        {submitted ? (
          <SuccessView company={listing.company} />
        ) : (
          <>
            <StepIndicator steps={STEP_LABELS} current={stepIndex} />
            <div className="relative overflow-x-clip">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="show"
                  exit="exit"
                  className="flex flex-col gap-4"
                >
                  <h3 className="text-heading font-semibold text-ink">{STEP_TITLES[step]}</h3>
                  {step === 'entries' ? (
                    <EntryPicker
                      entries={portfolio}
                      selected={chosen.map((e) => e.id)}
                      onChange={(entryIds) => updateDraft(listing.id, { entryIds })}
                    />
                  ) : step === 'text' ? (
                    <TextStep
                      text={draft.text}
                      mock={!!draft.mock}
                      status={stream.status}
                      error={stream.error}
                      showLengthHint={lengthHint && !hasEnoughText(draft.text)}
                      onChange={(text) => updateDraft(listing.id, { text })}
                      onGenerate={() => void stream.generate()}
                      onStop={stream.stop}
                    />
                  ) : (
                    <ReviewStep
                      listing={listing}
                      entries={chosen}
                      text={draft.text}
                      onEditEntries={() => goTo('entries')}
                      onEditText={() => goTo('text')}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
