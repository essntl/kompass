import type { ISODate } from '@shared/types';
import { Chip, ChipGroup } from '@/components/ui';
import type { DayOption } from '../lib/days';

export interface DayPickerProps {
  days: DayOption[];
  value: ISODate;
  onChange: (date: ISODate) => void;
}

/** I dag · I morgen · the next school days, one line that scrolls sideways on mobile. */
export function DayPicker({ days, value, onChange }: DayPickerProps) {
  return (
    <ChipGroup label="Velg dag" layout="scroll">
      {days.map((day) => (
        <Chip
          key={day.date}
          selected={day.date === value}
          onClick={() => onChange(day.date)}
          className="snap-start"
          aria-label={day.hasClasses ? undefined : `${day.label}, ingen timer`}
        >
          {day.label}
        </Chip>
      ))}
    </ChipGroup>
  );
}
