import { Compass, House } from 'lucide-react';
import { ButtonLink, EmptyState, Page } from '@/components/ui';

/** Shown for unknown URLs, inside the shell so the navigation still works. */
export function NotFoundPage() {
  return (
    <Page>
      <EmptyState
        icon={<Compass />}
        title="Fant ikke siden"
        description="Lenken kan være feil, eller siden kan være flyttet. Gå til forsiden og prøv derfra."
        action={
          <ButtonLink to="/" icon={<House />}>
            Gå til forsiden
          </ButtonLink>
        }
      />
    </Page>
  );
}
