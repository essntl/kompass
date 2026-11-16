import {
  CalendarClock,
  CalendarDays,
  Check,
  GraduationCap,
  MapPin,
  SearchX,
  Users,
  Wrench,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import type { Listing } from '@shared/types';
import {
  Avatar,
  ButtonLink,
  Card,
  EmptyState,
  Page,
  PageHeader,
  Section,
  useIsDesktop,
} from '@/components/ui';
import { formatDate, formatDaysUntil } from '@/lib/date';
import { useNow } from '@/lib/timetable';
import { useApplicationFor, useListing } from '@/stores/apprenticeships';
import { ApplySheet } from './apply/ApplySheet';
import { SentApplicationSheet } from './apply/SentApplicationSheet';
import { ApplyActions } from './components/ApplyActions';
import { DeadlineBadge } from './components/DeadlineBadge';
import { splitParagraphs } from './logic/application';
import { formatPositions } from './logic/filters';
import { useApprenticeshipUi } from './store';

export function ListingDetailPage() {
  const { listingId } = useParams();
  const listing = useListing(listingId);

  if (!listing) {
    return (
      <Page>
        <PageHeader title="Fant ikke annonsen" back="/laerlingplass" />
        <EmptyState
          icon={<SearchX />}
          title="Denne annonsen finnes ikke lenger"
          description="Den kan være fjernet, eller lenken kan være feil. Det finnes flere lærlingplasser å se på."
          action={<ButtonLink to="/laerlingplass">Se alle lærlingplasser</ButtonLink>}
        />
      </Page>
    );
  }
  return <ListingDetail listing={listing} />;
}

function ListingDetail({ listing }: { listing: Listing }) {
  const isDesktop = useIsDesktop();
  const now = useNow(60_000);
  const application = useApplicationFor(listing.id);
  const hasDraft = useApprenticeshipUi((s) => {
    const draft = s.drafts[listing.id];
    return !!draft && (draft.text.trim().length > 0 || draft.entryIds.length > 0);
  });
  const [applyOpen, setApplyOpen] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);

  const actions = (layout: 'bar' | 'card') => (
    <ApplyActions
      listing={listing}
      application={application}
      hasDraft={hasDraft}
      onApply={() => setApplyOpen(true)}
      onViewApplication={() => setSentOpen(true)}
      layout={layout}
      now={now}
    />
  );

  return (
    <Page width="wide">
      <PageHeader title={listing.title} subtitle={listing.company} back="/laerlingplass" />

      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-[minmax(0,1fr)_320px] desktop:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Card padding="lg" className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Avatar
                name={listing.company}
                initials={listing.logo.initials}
                color={listing.logo.color}
                shape="square"
                size="xl"
              />
              <div className="min-w-0">
                <p className="text-heading font-semibold text-ink">{listing.company}</p>
                <p className="text-small text-ink-2">Publisert {formatDaysUntil(listing.postedAt, now)}</p>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Fact icon={<Wrench />} label="Lærefag">
                {listing.trade}
              </Fact>
              <Fact icon={<MapPin />} label="Sted">
                {listing.location}, {listing.county}
              </Fact>
              <Fact icon={<CalendarClock />} label="Søknadsfrist">
                <span className="flex flex-col items-start gap-1">
                  <time dateTime={listing.deadline}>{formatDate(listing.deadline)}</time>
                  <DeadlineBadge deadline={listing.deadline} withDate={false} now={now} />
                </span>
              </Fact>
              <Fact icon={<CalendarDays />} label="Oppstart">
                <time dateTime={listing.startDate}>{formatDate(listing.startDate)}</time>
              </Fact>
              <Fact icon={<Users />} label="Antall plasser">
                {formatPositions(listing.positions)}
              </Fact>
              <Fact icon={<GraduationCap />} label="Utdanningsprogram">
                {listing.programme}
              </Fact>
            </dl>
          </Card>

          <Section title="Om læreplassen">
            <div className="flex flex-col gap-4 text-body text-ink">
              {splitParagraphs(listing.description).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </Section>

          <BulletSection title="Arbeidsoppgaver" items={listing.tasks} />
          <BulletSection title="Vi ser etter deg som har" items={listing.requirements} />
          <BulletSection title="Vi tilbyr" items={listing.offers} />

          <Section title="Kontaktperson">
            <Card className="flex items-center gap-3">
              <Avatar name={listing.contactName} color={listing.logo.color} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{listing.contactName}</p>
                <p className="truncate text-small text-ink-2">
                  {listing.contactRole}, {listing.company}
                </p>
              </div>
            </Card>
          </Section>
        </div>

        {isDesktop ? (
          <aside aria-label="Søk på læreplassen" className="sticky top-8 self-start">
            <Card padding="lg" className="flex flex-col gap-4">
              <div>
                <p className="text-small text-ink-2">Søknadsfrist</p>
                <p className="text-heading font-semibold">{formatDate(listing.deadline)}</p>
                <DeadlineBadge deadline={listing.deadline} withDate={false} now={now} className="mt-2" />
              </div>
              {actions('card')}
            </Card>
          </aside>
        ) : null}
      </div>

      {!isDesktop ? (
        <>
          {/* Keeps the last section clear of the sticky bar. */}
          <div aria-hidden className="h-20" />
          <div className="fixed inset-x-0 bottom-(--shell-bottom) z-20 border-t border-line bg-surface py-3 pr-[max(var(--gutter),var(--safe-right))] pl-[max(var(--gutter),var(--safe-left))]">
            {actions('bar')}
          </div>
        </>
      ) : null}

      <ApplySheet listing={listing} open={applyOpen} onOpenChange={setApplyOpen} />
      {application ? (
        <SentApplicationSheet
          listing={listing}
          application={application}
          open={sentOpen}
          onOpenChange={setSentOpen}
        />
      ) : null}
    </Page>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-sm bg-surface-2 text-ink-2 [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-caption font-semibold tracking-wide text-ink-2 uppercase">{label}</dt>
        <dd className="mt-0.5 text-body text-ink">{children}</dd>
      </div>
    </div>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-body text-ink">
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
