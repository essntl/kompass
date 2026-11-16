import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button, ConfirmDialog, toast } from '@/components/ui';
import { resetDemoData } from '@/stores/reset';

/** "Tilbakestill demodata": back to the seed, then a reload so every feature starts fresh. */
export function ResetDemoRow() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    try {
      await resetDemoData();
    } catch {
      toast.error('Noe av demodataene ble ikke tilbakestilt. Prøv igjen.');
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div>
        <p className="text-body font-medium text-ink">Tilbakestill demodata</p>
        <p className="text-small text-ink-2">
          Timeplan, meldinger, portefølje, lærlingplasser og innstillinger blir som da du åpnet appen første gang.
        </p>
      </div>
      <Button
        variant="secondary"
        icon={<RotateCcw />}
        className="self-start"
        onClick={() => setOpen(true)}
      >
        Tilbakestill demodata
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Tilbakestille demodataene?"
        description="Alt du har lagt inn eller endret blir borte, også bilder du har lastet opp."
        confirmLabel="Tilbakestill"
        loading={busy}
        onConfirm={() => void reset()}
      />
    </div>
  );
}
