import type { PortfolioEntry } from '@shared/types';
import { useEffect, useId, useMemo, useState } from 'react';
import { Button, Input, Select, Sheet, Textarea, toast } from '@/components/ui';
import { todayISO } from '@/lib/date';
import { savePhoto } from '@/lib/photos';
import { usePortfolioStore } from '@/stores/portfolio';
import { useTimetableStore } from '@/stores/timetable';
import {
  draftToEntryFields,
  hasErrors,
  MAX_NOTE_LENGTH,
  MAX_TITLE_LENGTH,
  validateEntry,
  type EntryDraft,
} from '../logic';
import { PhotoPicker, type PhotoValue } from './PhotoPicker';
import { TagInput } from './TagInput';

export interface EntryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this entry; add a new one when omitted. */
  entry?: PortfolioEntry;
  onSaved?: (entry: PortfolioEntry) => void;
}

function initialDraft(entry: PortfolioEntry | undefined): EntryDraft {
  return {
    title: entry?.title ?? '',
    note: entry?.note ?? '',
    date: entry?.date ?? todayISO(),
    subjectId: entry?.subjectId ?? '',
    tags: entry?.tags ?? [],
  };
}

function initialPhoto(entry: PortfolioEntry | undefined): PhotoValue {
  return entry?.photo ? { kind: 'stored', ref: entry.photo } : { kind: 'none' };
}

/** Add or edit a portfolio entry: photo, title, note, date, subject and tags. */
export function EntryFormSheet({ open, onOpenChange, entry, onSaved }: EntryFormSheetProps) {
  const formId = useId();
  const subjects = useTimetableStore((s) => s.subjects);
  const addEntry = usePortfolioStore((s) => s.addEntry);
  const updateEntry = usePortfolioStore((s) => s.updateEntry);

  const [draft, setDraft] = useState<EntryDraft>(() => initialDraft(entry));
  const [photo, setPhoto] = useState<PhotoValue>(() => initialPhoto(entry));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Every opening starts from the entry as it is now (or an empty form).
  useEffect(() => {
    if (!open) return;
    setDraft(initialDraft(entry));
    setPhoto(initialPhoto(entry));
    setSubmitted(false);
    setSaving(false);
    // Only when the sheet opens; edits to the entry while it is open are our own.
  }, [open]);

  const today = todayISO();
  const errors = useMemo(() => (submitted ? validateEntry(draft, today) : {}), [submitted, draft, today]);

  const subjectOptions = useMemo(
    () => [
      { value: '', label: 'Uten fag' },
      ...subjects.map((subject) => ({ value: subject.id, label: subject.name })),
    ],
    [subjects],
  );

  const update = <K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit() {
    setSubmitted(true);
    const found = validateEntry(draft, today);
    if (hasErrors(found)) {
      // Move focus to the first field that needs attention.
      const first = (['title', 'note', 'date'] as const).find((key) => found[key]);
      if (first) document.getElementById(`${formId}-${first}`)?.focus();
      return;
    }

    setSaving(true);
    try {
      let photoRef: string | undefined;
      if (photo.kind === 'new') photoRef = await savePhoto(photo.blob);
      else if (photo.kind === 'stored') photoRef = photo.ref;

      const fields = draftToEntryFields(draft);
      if (entry) {
        updateEntry(entry.id, { ...fields, photo: photoRef });
        const saved = usePortfolioStore.getState().entries.find((e) => e.id === entry.id);
        toast.success('Endringene er lagret');
        if (saved) onSaved?.(saved);
      } else {
        const created = addEntry({ ...fields, photo: photoRef });
        toast.success('Oppføringen er lagt til');
        onSaved?.(created);
      }
      onOpenChange(false);
    } catch {
      toast.error('Fikk ikke lagret bildet', {
        description: 'Det kan være lite lagringsplass på enheten. Prøv igjen.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? 'Rediger oppføring' : 'Ny oppføring'}
      description={entry ? undefined : 'Vis fram noe du har laget, og skriv kort om hvordan det gikk.'}
      dismissible={!saving}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth disabled={saving} onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button type="submit" form={formId} fullWidth loading={saving}>
            {entry ? 'Lagre' : 'Legg til oppføring'}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <PhotoPicker value={photo} onChange={setPhoto} alt={draft.title.trim()} />
        <Input
          id={`${formId}-title`}
          label="Tittel"
          value={draft.title}
          onChange={(event) => update('title', event.target.value)}
          placeholder="For eksempel Sveiset hyllebrakett"
          maxLength={MAX_TITLE_LENGTH + 20}
          enterKeyHint="next"
          autoComplete="off"
          error={errors.title}
        />
        <Textarea
          id={`${formId}-note`}
          label="Hva gjorde du, og hvordan gikk det?"
          value={draft.note}
          onChange={(event) => update('note', event.target.value)}
          placeholder="Beskriv arbeidet med egne ord. Hva var vanskelig, og hva lærte du?"
          rows={4}
          autoGrow
          maxLength={MAX_NOTE_LENGTH}
          error={errors.note}
          hint="Notatet brukes også når du lager kompetansebeskrivelse og søknadstekst."
        />
        <div className="grid grid-cols-1 gap-5 desktop:grid-cols-2">
          <Input
            id={`${formId}-date`}
            label="Dato"
            type="date"
            value={draft.date}
            max={today}
            onChange={(event) => update('date', event.target.value)}
            error={errors.date}
          />
          <Select
            label="Fag"
            value={draft.subjectId}
            onChange={(event) => update('subjectId', event.target.value)}
            options={subjectOptions}
          />
        </div>
        <TagInput tags={draft.tags} onChange={(tags) => update('tags', tags)} />
      </form>
    </Sheet>
  );
}
