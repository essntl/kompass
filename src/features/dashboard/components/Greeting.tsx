import { UserX } from 'lucide-react';
import { useEffect } from 'react';
import { ButtonLink } from '@/components/ui';
import { formatDayLong, toISODate } from '@/lib/date';
import { useSettingsStore } from '@/stores/settings';
import { firstName, greetingFor } from '../logic/schedule';

export interface GreetingProps {
  now: Date;
}

/** The page heading: "God morgen, Sara" with today's date, and the "Meld fravær" shortcut. */
export function Greeting({ now }: GreetingProps) {
  const name = useSettingsStore((s) => firstName(s.profile.name));
  const greeting = greetingFor(now);
  const today = toISODate(now);

  useEffect(() => {
    document.title = 'Hjem – Kompass';
    return () => {
      document.title = 'Kompass';
    };
  }, []);

  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 py-1">
        <h1 className="font-display text-title font-semibold tracking-tight text-ink desktop:text-display">
          {name ? `${greeting}, ${name}` : greeting}
        </h1>
        <p className="mt-1 font-display text-heading text-ink-2">
          <time dateTime={today}>{formatDayLong(now)}</time>
        </p>
      </div>
      <ButtonLink
        to={`/meldinger?fravaer=${today}`}
        variant="secondary"
        size="sm"
        icon={<UserX />}
        className="mt-1"
      >
        Meld fravær
      </ButtonLink>
    </header>
  );
}
