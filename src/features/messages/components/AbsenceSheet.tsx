import { CircleExclamationPoint, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { AbsenceReason, CalendarEvent, ISODate } from '@shared/types';
import {
  Badge,
  Button,
  ButtonLink,
  Chip,
  ChipGroup,
  Collapse,
  Field,
  SegmentedControl,
  Sheet,
  Textarea,
  cn,
  subjectColor,
  toast,
} from '@/components/ui';
import { ABSENCE_REASONS, ABSENCE_REASON_LABELS } from '@/lib/absence';
import { formatDayLong, formatTimeRange, relativeDay, todayISO } from '@/lib/date';
import { tween } from '@/lib/motion';
import { isAbsentFrom } from '@/lib/timetable';
import { useMessagesStore } from '@/stores/messages';
import { useSubjectMap, useTimetableStore } from '@/stores/timetable';
import {
  MAX_ABSENCE_TEXT_LENGTH,
  absenceDateOptions,
  absenceRecipients,
  classesForDates,
  hasErrors,
  initialAbsenceForm,
  pruneClassIds,
  recipientsSentence,
  toAbsenceInput,
  validateAbsenceForm,
  type AbsenceFormErrors,
  type AbsenceFormState,
  type AbsencePreset,
  type AbsenceScope,
} from '../logic/absenceForm';
import { capitalise } from '../logic/detection';
import { submitAbsence } from '../logic/flows';
import { SuccessCheck } from './SuccessCheck';

export interface AbsenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** From `/meldinger?fravaer=…&time=…`, or null for an empty form. */
  preset: AbsencePreset | null;
}

/** How long the success state stays before the sheet closes itself. */
const SUCCESS_CLOSE_MS = 1800;

const SCOPE_OPTIONS = [
  { value: 'day', label: 'Hele dagen' },
  { value: 'classes', label: 'Velg timer' },
] as const satisfies ReadonlyArray<{ value: AbsenceScope; label: string }>;

/**
 * "Meld fravær": days, whole day or single classes, reason, an optional note – and a
 * truthful line about who is told. Every opening starts from a fresh form.
 */
export function AbsenceSheet({ open, onOpenChange, preset }: AbsenceSheetProps) {
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }
  return (
    <AbsenceSheetSession key={session} open={open} onOpenChange={onOpenChange} preset={preset} />
  );
}

function AbsenceSheetSession({ open, onOpenChange, preset }: AbsenceSheetProps) {
  const navigate = useNavigate();
  const events = useTimetableStore((s) => s.events);
  const teachers = useMessagesStore((s) => s.teachers);
  const today = useMemo(() => todayISO(), []);

  const [form, setForm] = useState<AbsenceFormState>(() =>
    initialAbsenceForm(preset, events, today),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [done, setDone] = useState<{ recipients: string } | null>(null);
  const formId = useId();

  const dateOptions = useMemo(
    () => absenceDateOptions(events, today, form.dates),
    [events, today, form.dates],
  );
  const input = useMemo(() => toAbsenceInput(form, events), [form, events]);
  const allErrors = useMemo(() => validateAbsenceForm(form, events), [form, events]);
  const errors: AbsenceFormErrors = showErrors ? allErrors : {};
  const recipients = useMemo(
    () => absenceRecipients(input, { events, teachers }),
    [input, events, teachers],
  );
  const ready = input.dates.length > 0 && (input.wholeDay || input.classEventIds.length > 0);

  const groupRefs = useRef<Partial<Record<keyof AbsenceFormErrors, HTMLDivElement | null>>>({});

  // Close by itself a moment after success; "Ferdig" closes at once.
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => onOpenChange(false), SUCCESS_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [done, onOpenChange]);

  function update(patch: Partial<AbsenceFormState>) {
    setForm((current) => {
      const next = { ...current, ...patch };
      return {
        ...next,
        classIds: pruneClassIds(next.classIds, next.dates, events),
      };
    });
  }

  function toggleDate(date: ISODate) {
    update({
      dates: form.dates.includes(date)
        ? form.dates.filter((d) => d !== date)
        : [...form.dates, date].sort(),
    });
  }

  function toggleClass(id: string) {
    update({
      classIds: form.classIds.includes(id)
        ? form.classIds.filter((c) => c !== id)
        : [...form.classIds, id],
    });
  }

  function submit() {
    setShowErrors(true);
    if (hasErrors(allErrors)) {
      const first = (['dates', 'classes', 'reason', 'form'] as const).find((key) => allErrors[key]);
      if (first)
        groupRefs.current[first]?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
      return;
    }
    const record = submitAbsence(input);
    const sentence = recipientsSentence(
      record.teacherIds
        .map((id) => teachers.find((t) => t.id === id))
        .filter((t): t is NonNullable<typeof t> => !!t),
    );
    setDone({ recipients: sentence });
    toast.success('Fravær meldt', {
      description: sentence,
      action: { label: 'Åpne timeplan', onClick: () => navigate('/timeplan') },
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={done ? 'Fravær meldt' : 'Meld fravær'}
      description={done ? undefined : 'Lærerne dine får beskjed med en gang.'}
      footer={
        done ? (
          <div className="flex gap-2">
            <ButtonLink
              to="/timeplan"
              variant="secondary"
              fullWidth
              onClick={() => onOpenChange(false)}
            >
              Se timeplanen
            </ButtonLink>
            <Button fullWidth onClick={() => onOpenChange(false)}>
              Ferdig
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {errors.form ? (
              <p role="alert" className="flex items-start gap-1.5 text-small text-danger">
                <CircleExclamationPoint aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{errors.form}</span>
              </p>
            ) : null}
            <Button type="submit" form={formId} size="lg" fullWidth>
              Send fravær
            </Button>
          </div>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: tween.base }}
            className="flex flex-col items-center px-2 py-8 text-center"
          >
            <SuccessCheck />
            <p className="mt-4 text-heading font-semibold text-ink">Fraværet er registrert</p>
            <p className="mt-1 max-w-[36ch] text-body text-ink-2">
              {done.recipients} Du finner det i timeplanen og under Mitt fravær.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            id={formId}
            exit={{ opacity: 0, transition: tween.fast }}
            noValidate
            className="flex flex-col gap-6 pb-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div ref={(el) => void (groupRefs.current.dates = el)}>
              <Field label="Hvilke dager?" as="group" error={errors.dates}>
                {(control) => (
                  <ChipGroup
                    aria-labelledby={control['aria-labelledby']}
                    aria-describedby={control['aria-describedby']}
                  >
                    {dateOptions.map((option) => (
                      <Chip
                        key={option.date}
                        selected={form.dates.includes(option.date)}
                        aria-label={`${option.label}, ${formatDayLong(option.date)}`}
                        onClick={() => toggleDate(option.date)}
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </ChipGroup>
                )}
              </Field>
            </div>

            <div
              ref={(el) => void (groupRefs.current.classes = el)}
              className="flex flex-col gap-3"
            >
              <Field label="Gjelder" as="group">
                {(control) => (
                  <SegmentedControl
                    aria-labelledby={control['aria-labelledby']}
                    options={SCOPE_OPTIONS}
                    value={form.scope}
                    onChange={(scope) => update({ scope })}
                  />
                )}
              </Field>
              <Collapse open={form.scope === 'classes'}>
                <ClassChecklist
                  events={events}
                  dates={form.dates}
                  selected={form.classIds}
                  onToggle={toggleClass}
                  error={errors.classes}
                />
              </Collapse>
            </div>

            <div ref={(el) => void (groupRefs.current.reason = el)}>
              <Field label="Årsak" as="group" error={errors.reason}>
                {(control) => (
                  <ChipGroup
                    aria-labelledby={control['aria-labelledby']}
                    aria-describedby={control['aria-describedby']}
                  >
                    {ABSENCE_REASONS.map((reason: AbsenceReason) => (
                      <Chip
                        key={reason}
                        selected={form.reason === reason}
                        onClick={() =>
                          update({
                            reason: form.reason === reason ? null : reason,
                          })
                        }
                      >
                        {ABSENCE_REASON_LABELS[reason]}
                      </Chip>
                    ))}
                  </ChipGroup>
                )}
              </Field>
            </div>

            <Textarea
              label="Melding til lærerne"
              optional
              rows={2}
              autoGrow
              maxLength={MAX_ABSENCE_TEXT_LENGTH}
              placeholder="Skriv mer hvis du vil"
              value={form.text}
              onChange={(event) => update({ text: event.target.value })}
            />

            <div
              ref={(el) => void (groupRefs.current.form = el)}
              aria-live="polite"
              className="flex items-start gap-3 rounded-md bg-surface-2 p-3"
            >
              <Users aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-2" />
              <p className="text-small text-ink-2">
                {ready
                  ? recipientsSentence(recipients)
                  : form.scope === 'classes' && form.dates.length > 0
                    ? 'Velg timer for å se hvem som får beskjed.'
                    : 'Velg dag for å se hvem som får beskjed.'}
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function ClassChecklist({
  events,
  dates,
  selected,
  onToggle,
  error,
}: {
  events: CalendarEvent[];
  dates: ISODate[];
  selected: string[];
  onToggle: (id: string) => void;
  error?: string;
}) {
  const subjects = useSubjectMap();
  const errorId = useId();
  const groups = classesForDates(events, dates);

  if (dates.length === 0) {
    return <p className="text-small text-ink-2">Velg en dag først, så ser du timene her.</p>;
  }

  return (
    <div className="flex flex-col gap-4" aria-describedby={error ? errorId : undefined}>
      {groups.map((group) => (
        <fieldset key={group.date} className="flex flex-col">
          <legend className="mb-1 text-small font-semibold text-ink-2">
            {capitalise(relativeDay(group.date))}
          </legend>
          {group.classes.length === 0 ? (
            <p className="text-small text-ink-2">Ingen timer denne dagen.</p>
          ) : (
            group.classes.map((cls) => {
              const subject = cls.subjectId ? subjects.get(cls.subjectId) : undefined;
              const color = subjectColor(subject?.color ?? 7);
              const already = isAbsentFrom(cls, events);
              return (
                <label
                  key={cls.id}
                  className={cn(
                    '-mx-2 flex min-h-12 items-center gap-3 rounded-md px-2 transition-[background-color] duration-150',
                    already ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-surface-hover',
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 accent-primary"
                    checked={!already && selected.includes(cls.id)}
                    disabled={already}
                    aria-invalid={error ? true : undefined}
                    onChange={() => onToggle(cls.id)}
                  />
                  <span aria-hidden className={cn('h-8 w-1 shrink-0 rounded-full', color.solid)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-ink">{cls.title}</span>
                    <span className="block text-small text-ink-2 tabular-nums">
                      {formatTimeRange(cls.start, cls.end)}
                      {cls.room ? ` · ${cls.room}` : ''}
                    </span>
                  </span>
                  {already ? <Badge tone="danger">Meldt</Badge> : null}
                </label>
              );
            })
          )}
        </fieldset>
      ))}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-small text-danger">
          <CircleExclamationPoint aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
