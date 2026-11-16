import type { QuickLink } from '@shared/types';
import { Pencil, Plus, RotateCcw, Trash } from 'lucide-react';
import { useState } from 'react';
import { Button, ConfirmDialog, IconButton, Sheet, toast } from '@/components/ui';
import { useSettingsStore } from '@/stores/settings';
import { displayHost } from '../logic/quickLinks';
import { QUICK_LINK_FORM_ID, QuickLinkForm } from './QuickLinkForm';
import { quickLinkIcon } from './quickLinkIcons';

export interface QuickLinksSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open straight on the "new link" form (from the empty state). */
  startWithNew?: boolean;
}

/** null = the list, 'new' = the add form, otherwise the id of the link being edited. */
type View = null | 'new' | string;

/** Add, edit, remove and reset quick links. One sheet; the form replaces the list in place. */
export function QuickLinksSheet({ open, onOpenChange, startWithNew = false }: QuickLinksSheetProps) {
  const links = useSettingsStore((s) => s.quickLinks);
  const addQuickLink = useSettingsStore((s) => s.addQuickLink);
  const updateQuickLink = useSettingsStore((s) => s.updateQuickLink);
  const removeQuickLink = useSettingsStore((s) => s.removeQuickLink);
  const resetQuickLinks = useSettingsStore((s) => s.resetQuickLinks);

  const [view, setView] = useState<View>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Reset the view each time the sheet opens (state adjusted during render, no effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setView(startWithNew ? 'new' : null);
  }

  const editing: QuickLink | undefined =
    view && view !== 'new' ? links.find((link) => link.id === view) : undefined;
  const inForm = view === 'new' || !!editing;

  function remove(link: QuickLink) {
    const before = useSettingsStore.getState().quickLinks;
    removeQuickLink(link.id);
    toast(`${link.label} er fjernet`, {
      id: 'quick-link-removed',
      action: { label: 'Angre', onClick: () => useSettingsStore.setState({ quickLinks: before }) },
    });
  }

  function save(value: Omit<QuickLink, 'id'>) {
    if (editing) {
      // Clearing the icon must remove it, so set it explicitly.
      updateQuickLink(editing.id, { label: value.label, url: value.url, icon: value.icon });
      toast.success('Snarveien er lagret');
    } else {
      addQuickLink(value);
      toast.success('Snarveien er lagt til');
    }
    setView(null);
  }

  const title = view === 'new' ? 'Ny snarvei' : editing ? 'Rediger snarvei' : 'Rediger snarveier';

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={inForm ? 'Lenken åpnes i en ny fane.' : 'Sidene du bruker mest, ett trykk unna.'}
        footer={
          inForm ? (
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setView(null)}>
                Avbryt
              </Button>
              <Button type="submit" form={QUICK_LINK_FORM_ID} fullWidth>
                {editing ? 'Lagre' : 'Legg til'}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth icon={<RotateCcw />} onClick={() => setConfirmReset(true)}>
                Tilbakestill
              </Button>
              <Button fullWidth icon={<Plus />} onClick={() => setView('new')}>
                Legg til snarvei
              </Button>
            </div>
          )
        }
      >
        {inForm ? (
          <QuickLinkForm key={view} initial={editing} onSubmit={save} />
        ) : links.length === 0 ? (
          <p className="py-6 text-center text-ink-2">Du har ingen snarveier. Legg til en, eller tilbakestill til standardlenkene.</p>
        ) : (
          <ul className="-mx-1 flex flex-col">
            {links.map((link) => {
              const Icon = quickLinkIcon(link.icon);
              return (
                <li key={link.id} className="flex min-h-14 items-center gap-3 border-b border-line px-1 py-1.5 last:border-b-0">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-ink"
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{link.label}</span>
                    <span className="block truncate text-small text-ink-2">{displayHost(link.url)}</span>
                  </span>
                  <IconButton label={`Rediger ${link.label}`} icon={<Pencil />} onClick={() => setView(link.id)} />
                  <IconButton label={`Fjern ${link.label}`} icon={<Trash />} onClick={() => remove(link)} />
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Tilbakestille snarveiene?"
        description="Dine egne snarveier blir borte, og standardlenkene kommer tilbake."
        confirmLabel="Tilbakestill"
        onConfirm={() => {
          resetQuickLinks();
          toast.success('Snarveiene er tilbakestilt');
        }}
      />
    </>
  );
}
