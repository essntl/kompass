import { CircleCheck, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router';
import type { Listing } from '@shared/types';
import { Avatar, Badge, cn } from '@/components/ui';
import { useApplicationFor } from '@/stores/apprenticeships';
import { isExpired } from '../logic/deadline';
import { formatPositions } from '../logic/filters';
import { DeadlineBadge } from './DeadlineBadge';
import { SaveHeart } from './SaveHeart';

export interface ListingCardProps {
  listing: Listing;
  now?: Date;
}

/**
 * One listing in the finn.no-style list. The title link is stretched over the whole card
 * (so the card is one tap target); the heart sits above it as its own button.
 */
export function ListingCard({ listing, now }: ListingCardProps) {
  const application = useApplicationFor(listing.id);
  const expired = isExpired(listing.deadline, now);

  return (
    <article
      className={cn(
        'relative rounded-lg border border-line bg-surface p-4 text-ink',
        'transition-[scale,background-color,border-color] duration-150 ease-out',
        'hover:border-line-strong hover:bg-surface-hover has-[.listing-link:active]:scale-[0.98]',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          name={listing.company}
          initials={listing.logo.initials}
          color={listing.logo.color}
          shape="square"
          size="lg"
          className={cn(expired && 'opacity-60')}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-small text-ink-2">{listing.company}</p>
          <h2 className="mt-0.5 text-heading font-semibold text-ink">
            <Link
              to={`/laerlingplass/${listing.id}`}
              className={cn(
                'listing-link rounded-sm',
                // Stretched link: the whole card opens the listing.
                'after:absolute after:inset-0 after:rounded-lg after:content-[""]',
                'focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-(--focus-ring)',
              )}
            >
              {listing.title}
            </Link>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-small text-ink-2">
            <span className="font-medium text-ink">{listing.trade}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              {listing.location}
            </span>
          </p>
        </div>
        <SaveHeart listing={listing} className="relative z-10 -mt-1.5 -mr-1.5" />
      </div>

      <p className="mt-3 line-clamp-2 text-small text-ink-2">{listing.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DeadlineBadge deadline={listing.deadline} now={now} />
        <Badge icon={<Users />}>{formatPositions(listing.positions)}</Badge>
        {application ? (
          <Badge tone="success" icon={<CircleCheck />}>
            Søknad sendt
          </Badge>
        ) : null}
      </div>
    </article>
  );
}
