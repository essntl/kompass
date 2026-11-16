import { CalendarDays, Flag, GraduationCap, UserX } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/ui';
import { ABSENT_HATCH } from '../logic/appearance';

function Item({ swatch, icon, label }: { swatch: string; icon: ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={cn('size-3 shrink-0 rounded-full border border-line', swatch)} />
      <span aria-hidden className="inline-flex text-ink-2 [&_svg]:size-3.5">
        {icon}
      </span>
      <span>{label}</span>
    </li>
  );
}

/** Small key to the colours and icons on the grid. */
export function Legend() {
  return (
    <ul aria-label="Forklaring" className="flex flex-wrap gap-x-4 gap-y-2 text-caption text-ink-2">
      <Item swatch="bg-subj-1" icon={<GraduationCap />} label="Time (farge per fag)" />
      <Item swatch="bg-info" icon={<CalendarDays />} label="Annet" />
      <Item swatch="bg-accent" icon={<Flag />} label="Søknadsfrist" />
      <Item swatch={cn('border-danger bg-surface', ABSENT_HATCH)} icon={<UserX />} label="Fravær" />
    </ul>
  );
}
