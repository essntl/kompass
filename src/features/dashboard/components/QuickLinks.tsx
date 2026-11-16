import type { QuickLink } from '@shared/types';
import { Link2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, EmptyState, Section } from '@/components/ui';
import { useSettingsStore } from '@/stores/settings';
import { displayHost } from '../logic/quickLinks';
import { QuickLinksSheet } from './QuickLinksSheet';
import { quickLinkIcon } from './quickLinkIcons';

/** "Snarveier": the student's own links, opening in a new tab, editable in a sheet. */
export function QuickLinks() {
  const links = useSettingsStore((s) => s.quickLinks);
  const [editing, setEditing] = useState(false);
  const [startWithNew, setStartWithNew] = useState(false);

  function openEditor(addNew: boolean) {
    setStartWithNew(addNew);
    setEditing(true);
  }

  return (
    <Section
      title="Snarveier"
      action={
        links.length > 0 ? (
          <Button variant="ghost" size="sm" icon={<Pencil />} onClick={() => openEditor(false)}>
            Rediger
          </Button>
        ) : null
      }
    >
      {links.length === 0 ? (
        <Card>
          <EmptyState
            size="compact"
            icon={<Link2 />}
            title="Ingen snarveier"
            description="Legg til sidene du bruker mest, for eksempel skole-e-posten."
            action={
              <Button variant="soft" icon={<Plus />} onClick={() => openEditor(true)}>
                Legg til snarvei
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {links.map((link) => (
            <li key={link.id} className="min-w-0">
              <QuickLinkTile link={link} />
            </li>
          ))}
        </ul>
      )}

      <QuickLinksSheet open={editing} onOpenChange={setEditing} startWithNew={startWithNew} />
    </Section>
  );
}

function QuickLinkTile({ link }: { link: QuickLink }) {
  const Icon = quickLinkIcon(link.icon);
  return (
    <Card
      as="a"
      interactive
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-16 items-center gap-3 p-3"
      padding="none"
    >
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-ink"
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-small font-semibold text-ink">{link.label}</span>
        <span className="block truncate text-caption text-ink-3">{displayHost(link.url)}</span>
        <span className="sr-only"> (åpnes i ny fane)</span>
      </span>
    </Card>
  );
}
