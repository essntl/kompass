import { CircleCheck, Eye, Send } from 'lucide-react';
import type { Application, Listing } from '@shared/types';
import { Badge, Button } from '@/components/ui';
import { formatDate, formatDayShort } from '@/lib/date';
import { isExpired } from '../logic/deadline';
import { SaveHeart } from './SaveHeart';

export interface ApplyActionsProps {
  listing: Listing;
  application: Application | undefined;
  hasDraft: boolean;
  onApply: () => void;
  onViewApplication: () => void;
  /** `bar` = the sticky mobile bar (one row), `card` = the desktop action card. */
  layout: 'bar' | 'card';
  now?: Date;
}

/** "Søk" + heart, or the sent state, or the closed state. */
export function ApplyActions({
  listing,
  application,
  hasDraft,
  onApply,
  onViewApplication,
  layout,
  now,
}: ApplyActionsProps) {
  const expired = isExpired(listing.deadline, now);
  const bar = layout === 'bar';

  if (application && bar) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-small font-semibold text-success-soft-ink">
            <CircleCheck aria-hidden className="size-4 shrink-0" />
            Søknad sendt
          </p>
          <p className="nums truncate text-caption text-ink-2">{formatDayShort(application.submittedAt)}</p>
        </div>
        <Button variant="secondary" size="lg" onClick={onViewApplication}>
          Se søknaden
        </Button>
        <SaveHeart listing={listing} variant="secondary" size="lg" />
      </div>
    );
  }

  if (application) {
    return (
      <div className="flex flex-col gap-3">
        <Badge tone="success" icon={<CircleCheck />} className="self-start">
          Søknad sendt {formatDate(application.submittedAt)}
        </Badge>
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" icon={<Eye />} onClick={onViewApplication} fullWidth>
            Se søknaden
          </Button>
          <SaveHeart listing={listing} variant="secondary" size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button size="lg" fullWidth icon={<Send />} onClick={onApply} disabled={expired}>
          {hasDraft ? 'Fortsett søknaden' : 'Søk'}
        </Button>
        <SaveHeart listing={listing} variant="secondary" size="lg" />
      </div>
      {expired ? <p className="text-small text-ink-2">Fristen har gått ut, så du kan ikke søke lenger.</p> : null}
    </div>
  );
}
