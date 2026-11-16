import type { CalendarEvent, Subject } from '@shared/types';
import {
  ArrowRight,
  Clock,
  DoorOpen,
  FileUp,
  MapPin,
  Pencil,
  Trash,
  User,
  UserX,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  Sheet,
  toast,
  type BadgeTone,
} from '@/components/ui';
import { teacherForEvent } from '@/lib/absence';
import { formatDayLong, formatDuration, formatTimeRange, minutesBetween } from '@/lib/date';
import { isAbsentFrom } from '@/lib/timetable';
import { useMessagesStore } from '@/stores/messages';
import { useSettingsStore } from '@/stores/settings';
import { useTimetableStore } from '@/stores/timetable';
import { absenceHref, isEditable, KIND_LABEL } from '../logic/layout';

export interface EventDetailSheetProps {
  event: CalendarEvent | null;
  events: CalendarEvent[];
  subject?: Subject;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: CalendarEvent) => void;
}

const KIND_TONE: Record<CalendarEvent['kind'], BadgeTone> = {
  class: 'primary',
  custom: 'info',
  deadline: 'accent',
  absence: 'danger',
};

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span aria-hidden className="mt-0.5 inline-flex text-ink-2 [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-caption text-ink-2">{label}</dt>
        <dd className="text-body text-ink">{children}</dd>
      </div>
    </div>
  );
}

/** Details for one event, with "Meld fravær" for classes and edit/delete for own events. */
export function EventDetailSheet({ event, events, subject, onOpenChange, onEdit }: EventDetailSheetProps) {
  const teachers = useMessagesStore((s) => s.teachers);
  const school = useSettingsStore((s) => s.school);
  const schoolName = useSettingsStore((s) => s.schoolName);
  const removeEvent = useTimetableStore((s) => s.removeEvent);
  const addEvent = useTimetableStore((s) => s.addEvent);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Keep the last event while the sheet animates out.
  const [shown, setShown] = useState<CalendarEvent | null>(event);
  if (event && event !== shown) setShown(event);
  const current = event ?? shown;

  if (!current) return null;

  const absent = current.kind === 'class' && isAbsentFrom(current, events);
  const teacher = current.kind === 'class' ? teacherForEvent(current, teachers) : undefined;
  const minutes = minutesBetween(current.start, current.end);
  const editable = isEditable(current);
  const title = subject?.name ?? current.title;

  function remove() {
    if (!current) return;
    const { id: _id, ...copy } = current;
    removeEvent(current.id);
    onOpenChange(false);
    toast('Hendelsen er slettet', {
      action: { label: 'Angre', onClick: () => addEvent(copy) },
    });
  }

  const footer = (
    <div className="flex flex-col gap-2 desktop:flex-row-reverse">
      {current.kind === 'class' && !absent ? (
        <ButtonLink to={absenceHref(current)} icon={<UserX />} fullWidth>
          Meld fravær
        </ButtonLink>
      ) : null}
      {current.kind === 'deadline' && current.listingId ? (
        <ButtonLink to={`/laerlingplass/${current.listingId}`} iconRight={<ArrowRight />} fullWidth>
          Se annonsen
        </ButtonLink>
      ) : null}
      {current.kind === 'absence' || absent ? (
        <ButtonLink to="/meldinger" variant="secondary" iconRight={<ArrowRight />} fullWidth>
          Se fraværsmeldingen
        </ButtonLink>
      ) : null}
      {editable ? (
        <div className="flex gap-2 desktop:flex-1">
          <Button
            variant="secondary"
            icon={<Pencil />}
            fullWidth
            onClick={() => {
              onOpenChange(false);
              onEdit(current);
            }}
          >
            Rediger
          </Button>
          <Button variant="danger" icon={<Trash />} fullWidth onClick={() => setConfirmOpen(true)}>
            Slett
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <Sheet
        open={event !== null}
        onOpenChange={onOpenChange}
        title={title}
        description={<span className="capitalize">{formatDayLong(current.start)}</span>}
        footer={footer}
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone={KIND_TONE[current.kind]}>{KIND_LABEL[current.kind]}</Badge>
          {absent ? (
            <Badge tone="danger" icon={<UserX />}>
              Fravær meldt
            </Badge>
          ) : null}
          {current.source === 'ics' ? (
            <Badge icon={<FileUp />}>Importert</Badge>
          ) : current.source === 'manual' ? (
            <Badge icon={<Pencil />}>Lagt til av deg</Badge>
          ) : null}
        </div>

        <dl className="mt-2 divide-y divide-line">
          <Row icon={<Clock />} label="Tid">
            {current.allDay ? (
              'Hele dagen'
            ) : (
              <>
                <time className="nums">{formatTimeRange(current.start, current.end)}</time>
                <span className="text-ink-2"> · {formatDuration(minutes)}</span>
              </>
            )}
          </Row>
          {current.room ? (
            <Row icon={<DoorOpen />} label="Rom">
              {current.room}
            </Row>
          ) : null}
          {current.kind === 'class' || current.kind === 'custom' ? (
            <Row icon={<MapPin />} label="Sted">
              {current.location ? (
                current.location.label
              ) : school ? (
                <>
                  {schoolName}
                  <span className="block text-small text-ink-2">{school.label}</span>
                </>
              ) : (
                schoolName
              )}
            </Row>
          ) : null}
          {teacher ? (
            <Row icon={<User />} label="Lærer">
              {teacher.name}
              <span className="block text-small text-ink-2">{teacher.role}</span>
            </Row>
          ) : null}
        </dl>

        {current.note ? (
          <Card tone="sunken" className="mt-2">
            <p className="text-caption font-semibold text-ink-2">Notat</p>
            <p className="mt-1 whitespace-pre-line text-body">{current.note}</p>
          </Card>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Slette hendelsen?"
        description={`«${title}» blir fjernet fra timeplanen.`}
        confirmLabel="Slett"
        tone="danger"
        onConfirm={remove}
      />
    </>
  );
}
