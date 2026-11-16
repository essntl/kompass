import type { PortfolioEntry } from '@shared/types';
import { Copy, RotateCw, Square } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Button, cn, DemoBadge, ErrorState, Sheet, SkeletonText, Spinner, Textarea, toast } from '@/components/ui';
import { usePortfolioUiStore } from '../store';

export interface ApplicationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The entries the draft is built on, for the "Bygger på" line. */
  entries: PortfolioEntry[];
  /** Back to picking entries. */
  onChooseOthers: () => void;
}

/**
 * The text box has one fixed height in every state (skeleton, streaming, editable), so
 * the sheet never grows or jumps while the draft streams in; the text scrolls inside it.
 */
const BOX = 'h-[min(50dvh,26rem)]';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Streams a general apprenticeship application from the chosen entries. */
export function ApplicationSheet({ open, onOpenChange, entries, onChooseOthers }: ApplicationSheetProps) {
  const textId = useId();
  const labelId = useId();
  const hintId = useId();
  const draft = usePortfolioUiStore((s) => s.draft);
  const status = usePortfolioUiStore((s) => s.status);
  const error = usePortfolioUiStore((s) => s.error);
  const setDraftText = usePortfolioUiStore((s) => s.setDraftText);
  const regenerate = usePortfolioUiStore((s) => s.regenerate);
  const stop = usePortfolioUiStore((s) => s.stop);

  const streaming = status === 'streaming';
  const text = draft?.text ?? '';
  const editable = (status === 'done' || status === 'stopped') && Boolean(text);

  // Follow the text while it streams, unless the student has scrolled up to read.
  const streamRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useEffect(() => {
    const box = streamRef.current;
    if (box && streaming && pinned.current) box.scrollTop = box.scrollHeight;
  }, [text, streaming]);
  useEffect(() => {
    if (streaming) pinned.current = true;
  }, [streaming]);

  async function onCopy() {
    if (await copyText(text)) toast.success('Teksten er kopiert');
    else toast.error('Fikk ikke kopiert teksten', { description: 'Merk teksten og kopier den selv.' });
  }

  const sources =
    entries.length === 0
      ? null
      : entries.length === 1
        ? `Bygger på «${entries[0]?.title}».`
        : `Bygger på ${entries.length} oppføringer fra porteføljen.`;

  const hint =
    status === 'streaming'
      ? 'Teksten skrives mens du ser på. Du kan endre den når den er ferdig.'
      : status === 'stopped'
        ? 'Du stoppet underveis. Bruk det som er skrevet, eller lag teksten på nytt.'
        : 'Les gjennom og skriv om med dine egne ord før du sender den.';

  let box;
  if (status === 'error') {
    box = (
      <div className={cn(BOX, 'grid place-items-center rounded-sm border border-line bg-surface-2')}>
        <ErrorState
          size="compact"
          title="Fikk ikke laget teksten"
          description={error ?? undefined}
          onRetry={() => void regenerate()}
        />
      </div>
    );
  } else if (editable) {
    box = (
      <Textarea
        id={textId}
        aria-describedby={hintId}
        value={text}
        onChange={(event) => setDraftText(event.target.value)}
        className={cn(BOX, 'scroll-area')}
      />
    );
  } else {
    box = (
      <div
        ref={streamRef}
        role="log"
        aria-labelledby={labelId}
        aria-describedby={hintId}
        aria-busy={streaming || undefined}
        tabIndex={0}
        onScroll={(event) => {
          const el = event.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className={cn(
          BOX,
          'scroll-area rounded-sm border border-line-strong bg-surface-2 px-3 py-3 leading-6 whitespace-pre-wrap text-ink',
        )}
      >
        {text ? text : <SkeletonText lines={6} />}
      </div>
    );
  }

  // Same three rows in every state – label (with the demo badge slot), box, hint – so
  // nothing moves when the stream finishes and the box turns into a textarea.
  const body = (
    <div className="flex flex-col gap-4">
      {sources ? (
        <div className="flex min-h-11 items-center gap-2 rounded-md bg-surface-2 py-1 pr-1 pl-3">
          <p className="min-w-0 flex-1 text-small text-ink-2">{sources}</p>
          <Button variant="ghost" size="sm" disabled={streaming} onClick={onChooseOthers}>
            Endre utvalg
          </Button>
        </div>
      ) : null}
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <label id={labelId} htmlFor={editable ? textId : undefined} className="text-small font-semibold text-ink">
          Utkast til søknadstekst
        </label>
        {draft?.mock && !streaming && status !== 'error' ? <DemoBadge /> : null}
      </div>
      {box}
      <p id={hintId} className="text-small text-ink-2">
        {hint}
      </p>
    </div>
    </div>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Søknadstekst"
      description="En generell søknad om læreplass, laget fra porteføljen din."
      footer={
        streaming ? (
          <div className="flex items-center gap-3">
            <p className="flex min-w-0 flex-1 items-center gap-2 text-small text-ink-2" aria-live="polite">
              <Spinner size="sm" />
              Skriver utkastet
            </p>
            <Button variant="secondary" icon={<Square />} onClick={stop}>
              Stopp
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth icon={<RotateCw />} onClick={() => void regenerate()}>
              Lag på nytt
            </Button>
            <Button fullWidth icon={<Copy />} disabled={!text} onClick={() => void onCopy()}>
              Kopier
            </Button>
          </div>
        )
      }
    >
      {body}
    </Sheet>
  );
}
