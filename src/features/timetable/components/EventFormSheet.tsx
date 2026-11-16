import type { CalendarEvent, ISODate } from '@shared/types';
import { useId, useState } from 'react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import {
  Button,
  Collapse,
  Field,
  Input,
  SegmentedControl,
  Select,
  Sheet,
  Switch,
  Textarea,
  toast,
} from '@/components/ui';
import { useSettingsStore } from '@/stores/settings';
import { useTimetableStore } from '@/stores/timetable';
import {
  emptyEventForm,
  eventToForm,
  formToEvent,
  NEW_SUBJECT,
  validateEventForm,
  type EventFormErrors,
  type EventFormValues,
} from '../logic/eventForm';

export interface EventFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Event to edit; null adds a new one. */
  editing: CalendarEvent | null;
  /** Date for a new event. */
  defaultDate: ISODate;
  onSaved?: (event: { start: string }) => void;
}

/** "Legg til hendelse" / "Rediger hendelse": manual entry with inline validation. */
export function EventFormSheet(props: EventFormSheetProps) {
  // Remount the form for every opening so it starts from the right values.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setSession((n) => n + 1);
  }
  return <EventForm key={session} {...props} />;
}

function EventForm({ open, onOpenChange, editing, defaultDate, onSaved }: EventFormSheetProps) {
  const formId = useId();
  const subjects = useTimetableStore((s) => s.subjects);
  const addEvent = useTimetableStore((s) => s.addEvent);
  const updateEvent = useTimetableStore((s) => s.updateEvent);
  const ensureSubject = useTimetableStore((s) => s.ensureSubject);
  const school = useSettingsStore((s) => s.school);

  const [values, setValues] = useState<EventFormValues>(() =>
    editing ? eventToForm(editing) : emptyEventForm(defaultDate),
  );
  const [submitted, setSubmitted] = useState(false);
  const errors: EventFormErrors = submitted ? validateEventForm(values) : {};

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function submit() {
    setSubmitted(true);
    const found = validateEventForm(values);
    if (Object.keys(found).length > 0) {
      // Focus the first invalid control so keyboard and screen reader users land on it.
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`#${CSS.escape(formId)} [aria-invalid="true"]`)?.focus();
      });
      return;
    }
    let subject: { id: string; name: string } | null = null;
    if (values.kind === 'class') {
      subject =
        values.subjectId === NEW_SUBJECT
          ? ensureSubject(values.newSubject)
          : (subjects.find((s) => s.id === values.subjectId) ?? null);
    }
    const fields = formToEvent(values, subject);
    if (editing) {
      updateEvent(editing.id, {
        subjectId: undefined,
        room: undefined,
        location: undefined,
        note: undefined,
        allDay: undefined,
        ...fields,
      });
      toast.success('Endringene er lagret');
    } else {
      addEvent({ ...fields, source: 'manual' });
      toast.success('Lagt til i timeplanen');
    }
    onSaved?.(fields);
    onOpenChange(false);
  }

  const subjectOptions = [
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
    { value: NEW_SUBJECT, label: 'Nytt fag …' },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Rediger hendelse' : 'Legg til hendelse'}
      description={editing ? undefined : 'En time eller noe annet du vil ha i timeplanen.'}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button type="submit" form={formId} fullWidth>
            {editing ? 'Lagre' : 'Legg til'}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="Type" as="group">
          {(control) => (
            <SegmentedControl
              aria-labelledby={control['aria-labelledby']}
              value={values.kind}
              onChange={(kind) => set('kind', kind)}
              options={[
                { value: 'class', label: 'Time' },
                { value: 'custom', label: 'Annet' },
              ]}
            />
          )}
        </Field>

        {values.kind === 'class' ? (
          <>
            <Select
              label="Fag"
              placeholder="Velg fag"
              value={values.subjectId}
              onChange={(event) => set('subjectId', event.target.value)}
              options={subjectOptions}
              error={errors.subjectId}
            />
            <Collapse open={values.subjectId === NEW_SUBJECT}>
              <Input
                label="Navn på faget"
                placeholder="For eksempel Samfunnskunnskap"
                value={values.newSubject}
                onChange={(event) => set('newSubject', event.target.value)}
                error={errors.newSubject}
                autoCapitalize="sentences"
                enterKeyHint="next"
              />
            </Collapse>
          </>
        ) : (
          <Input
            label="Tittel"
            placeholder="For eksempel Tannlege"
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
            error={errors.title}
            autoCapitalize="sentences"
            enterKeyHint="next"
          />
        )}

        <Input
          label="Dato"
          type="date"
          value={values.date}
          onChange={(event) => set('date', event.target.value)}
          error={errors.date}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fra"
            type="time"
            value={values.start}
            onChange={(event) => set('start', event.target.value)}
            error={errors.start}
          />
          <Input
            label="Til"
            type="time"
            value={values.end}
            onChange={(event) => set('end', event.target.value)}
            error={errors.end}
          />
        </div>

        <Input
          label="Rom"
          optional
          placeholder="For eksempel B214"
          value={values.room}
          onChange={(event) => set('room', event.target.value)}
          enterKeyHint="next"
        />

        <Switch
          label="Annet sted"
          description="Slå på hvis det ikke er på skolen."
          checked={values.otherPlace}
          onCheckedChange={(checked) => set('otherPlace', checked)}
        />
        <Collapse open={values.otherPlace}>
          <AddressAutocomplete
            label="Adresse"
            placeholder="Søk etter adresse"
            value={values.place}
            onChange={(place) => set('place', place)}
            focus={school ? { lat: school.lat, lon: school.lon } : undefined}
          />
          {errors.place ? (
            <p role="alert" className="mt-1.5 text-small text-danger">
              {errors.place}
            </p>
          ) : null}
        </Collapse>

        <Textarea
          label="Notat"
          optional
          autoGrow
          rows={2}
          placeholder="For eksempel Ta med vernesko"
          value={values.note}
          onChange={(event) => set('note', event.target.value)}
        />
      </form>
    </Sheet>
  );
}
