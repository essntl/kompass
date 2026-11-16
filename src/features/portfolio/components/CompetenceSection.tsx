import type { CompetenceDescription, PortfolioEntry } from '@shared/types';
import { Info, Lightbulb, Pencil, RotateCw, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  DemoBadge,
  ErrorState,
  IconButton,
  Section,
  Textarea,
  toast,
} from '@/components/ui';
import { formatDate } from '@/lib/date';
import { fade } from '@/lib/motion';
import { usePortfolioStore } from '@/stores/portfolio';
import { useCompetence } from '../useCompetence';
import { CompetenceSkeleton } from './CompetenceSkeleton';

/** "Kompetansebeskrivelse" on the entry page: generate, show, edit and regenerate. */
export function CompetenceSection({ entry }: { entry: PortfolioEntry }) {
  const { status, error, generate } = useCompetence(entry);
  const competence = entry.competence;
  const loading = status === 'loading';

  // Regenerating keeps the old text visible (dimmed) instead of swapping in a skeleton.
  const view: 'skeleton' | 'error' | 'result' | 'empty' =
    loading && !competence ? 'skeleton' : status === 'error' && !competence ? 'error' : competence ? 'result' : 'empty';

  return (
    <Section
      title="Kompetansebeskrivelse"
      action={competence?.mock ? <DemoBadge /> : undefined}
    >
      <Card padding="lg" aria-busy={loading || undefined} className="relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={view} variants={fade} initial="hidden" animate="show" exit="exit">
            {view === 'skeleton' ? (
              <CompetenceSkeleton />
            ) : view === 'error' ? (
              <ErrorState
                size="compact"
                title="Fikk ikke laget beskrivelsen"
                description={error}
                onRetry={() => void generate()}
              />
            ) : view === 'result' && competence ? (
              <CompetenceResult
                entryId={entry.id}
                competence={competence}
                regenerating={loading}
                onRegenerate={() => void generate()}
                regenerateError={status === 'error' ? error : null}
              />
            ) : (
              <CompetenceEmpty onGenerate={() => void generate()} />
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </Section>
  );
}

function CompetenceEmpty({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-ink">Gjør arbeidet om til kompetanse</p>
        <p className="text-ink-2">
          Vi bruker bildet og notatet ditt til å beskrive hva du gjorde, hvilke ferdigheter det viser og
          hvilke kompetansemål det kan passe til.
        </p>
      </div>
      <Button icon={<Sparkles />} onClick={onGenerate}>
        Lag kompetansebeskrivelse
      </Button>
    </div>
  );
}

interface CompetenceResultProps {
  entryId: string;
  competence: CompetenceDescription;
  regenerating: boolean;
  regenerateError: string | null;
  onRegenerate: () => void;
}

function CompetenceResult({
  entryId,
  competence,
  regenerating,
  regenerateError,
  onRegenerate,
}: CompetenceResultProps) {
  const updateEntry = usePortfolioStore((s) => s.updateEntry);
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(competence.summary);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const goalsId = useId();

  function startEditing() {
    setSummary(competence.summary);
    setSummaryError(null);
    setEditing(true);
  }

  function saveSummary() {
    const text = summary.trim();
    if (!text) {
      setSummaryError('Skriv minst én setning, eller avbryt for å beholde teksten.');
      return;
    }
    updateEntry(entryId, { competence: { ...competence, summary: text } });
    setEditing(false);
    toast.success('Oppsummeringen er lagret');
  }

  return (
    <div className={regenerating ? 'pointer-events-none opacity-60 transition-opacity duration-200' : 'transition-opacity duration-200'}>
      <div className="flex flex-col gap-6">
        {/* Summary – the student's own words once edited. */}
        {editing ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveSummary();
            }}
          >
            <Textarea
              label="Oppsummering"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={3}
              autoGrow
              autoFocus
              maxLength={600}
              error={summaryError ?? undefined}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Lagre
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Avbryt
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-heading font-medium text-ink">{competence.summary}</p>
            <IconButton label="Rediger oppsummeringen" icon={<Pencil />} size="sm" onClick={startEditing} className="-mt-1 -mr-2 shrink-0" />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <h3 className="text-small font-semibold text-ink-2">Hva du gjorde</h3>
          <p className="text-ink">{competence.whatWasDone}</p>
        </div>

        {competence.skills.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-small font-semibold text-ink-2">Ferdigheter det viser</h3>
            <ul className="flex flex-wrap gap-2">
              {competence.skills.map((skill) => (
                <li
                  key={skill}
                  className="inline-flex min-h-8 items-center rounded-sm bg-primary-soft px-3 py-1 text-small font-medium text-primary-soft-ink"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {competence.suggestedGoals.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 id={goalsId} className="text-small font-semibold text-ink-2">
              Kompetansemål det kan passe til
            </h3>
            <ul aria-labelledby={goalsId} className="flex flex-col gap-2">
              {competence.suggestedGoals.map((goal) => (
                <li key={goal.text} className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface-2 p-3">
                  <Badge tone="info" icon={<Lightbulb />} className="self-start">
                    Forslag
                  </Badge>
                  <p className="font-medium text-ink">{goal.text}</p>
                  <p className="text-small text-ink-2">{goal.why}</p>
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-2 text-small text-ink-2">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              Dette er forslag, ikke en vurdering. Sjekk dem mot læreplanen sammen med læreren din.
            </p>
          </div>
        ) : null}

        {regenerateError ? (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-small text-danger-soft-ink">
            {regenerateError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <p className="text-caption text-ink-2">Laget {formatDate(competence.generatedAt)}</p>
          <Button variant="secondary" size="sm" icon={<RotateCw />} loading={regenerating} onClick={onRegenerate}>
            Lag på nytt
          </Button>
        </div>
      </div>
    </div>
  );
}
