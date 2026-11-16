import { CircleStop, RotateCw, Sparkles, TriangleExclamationPoint } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button, DemoBadge, Textarea } from '@/components/ui';
import { MIN_TEXT_LENGTH } from '../logic/application';
import type { StreamStatus } from './useDraftStream';

export interface TextStepProps {
  text: string;
  mock: boolean;
  status: StreamStatus;
  error: string | null;
  /** Shown when the student tried to continue without enough text. */
  showLengthHint: boolean;
  onChange: (text: string) => void;
  onGenerate: () => void;
  onStop: () => void;
}

/** Step 2: write the application text, or stream a draft with AI and edit it. */
export function TextStep({ text, mock, status, error, showLengthHint, onChange, onGenerate, onStop }: TextStepProps) {
  const streaming = status === 'streaming';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = text.trim().length > 0;

  // Follow the text as it streams in.
  useEffect(() => {
    const el = textareaRef.current;
    if (streaming && el) el.scrollTop = el.scrollHeight;
  }, [streaming, text]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {streaming ? (
          <Button variant="secondary" icon={<CircleStop />} onClick={onStop}>
            Stopp
          </Button>
        ) : (
          <Button variant="soft" icon={hasText ? <RotateCw /> : <Sparkles />} onClick={onGenerate}>
            {hasText ? 'Lag på nytt' : 'Lag utkast med KI'}
          </Button>
        )}
        {mock && !streaming && hasText ? <DemoBadge /> : null}
        <p className="sr-only" aria-live="polite">
          {streaming ? 'Lager utkast' : ''}
        </p>
      </div>

      {error ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg bg-danger-soft p-4 text-danger-soft-ink">
          <TriangleExclamationPoint aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Fikk ikke laget et utkast</p>
            <p className="mt-1 text-small">{error}</p>
            <Button variant="secondary" size="sm" icon={<RotateCw />} onClick={onGenerate} className="mt-3">
              Prøv igjen
            </Button>
          </div>
        </div>
      ) : null}

      <Textarea
        ref={textareaRef}
        label="Søknadstekst"
        rows={12}
        value={text}
        readOnly={streaming}
        aria-busy={streaming || undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Fortell kort hvem du er, hvorfor du vil bli lærling akkurat her, og hva du har lært så langt."
        hint={
          showLengthHint
            ? undefined
            : 'Skriv med egne ord, eller la KI lage et utkast som du endrer på. Les alltid over før du sender.'
        }
        error={showLengthHint ? `Skriv minst ${MIN_TEXT_LENGTH} tegn før du går videre.` : undefined}
        className="min-h-64"
      />
    </div>
  );
}
