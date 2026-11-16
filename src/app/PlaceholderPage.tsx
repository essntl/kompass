import { Hammer } from 'lucide-react';
import { EmptyState, Page, PageHeader } from '@/components/ui';

export interface PlaceholderPageProps {
  title: string;
  /** Path of the parent page, for detail routes. */
  back?: string;
}

/** Stand-in page used by the placeholder `routes.tsx` files until a feature lands. */
export function PlaceholderPage({ title, back }: PlaceholderPageProps) {
  return (
    <Page>
      <PageHeader title={title} back={back} />
      <EmptyState
        icon={<Hammer />}
        title="Her bygger vi fortsatt"
        description="Denne delen av Kompass er ikke klar ennå. Kom tilbake litt senere."
      />
    </Page>
  );
}
