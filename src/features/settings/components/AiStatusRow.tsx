import { CircleCheck, FlaskConical, Sparkles } from 'lucide-react';
import { Badge, Spinner, useAiStatus } from '@/components/ui';

/** Whether the AI features run against the real model or the built-in demo answers. */
export function AiStatusRow() {
  const status = useAiStatus();
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-ink">
        <Sparkles className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          <span className="text-body font-medium text-ink">AI-hjelp</span>
          {status === 'live' ? (
            <Badge tone="success" icon={<CircleCheck />}>
              Tilkoblet
            </Badge>
          ) : status === 'mock' ? (
            <Badge tone="accent" icon={<FlaskConical />}>
              Demomodus
            </Badge>
          ) : (
            <Badge tone="neutral" icon={<Spinner size="sm" label={null} />}>
              Sjekker
            </Badge>
          )}
        </div>
        <p className="text-small text-ink-2">
          {status === 'live'
            ? 'Svarene kommer fra en ekte AI-modell.'
            : 'Uten API-nøkkel på serveren bruker appen ferdige eksempelsvar, så alt kan prøves uten AI.'}
        </p>
      </div>
    </div>
  );
}
