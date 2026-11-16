import { useCallback } from 'react';
import type { Listing } from '@shared/types';
import { toast } from '@/components/ui';
import { useApprenticeshipStore } from '@/stores/apprenticeships';
import { useApprenticeshipUi } from './store';

/**
 * Saves or un-saves a listing. Saved deadlines reach Hjem and the calendar through the
 * store on their own; the very first save explains that once with a toast.
 * Returns the new saved state.
 */
export function useToggleSave(): (listing: Listing) => boolean {
  return useCallback((listing: Listing) => {
    const store = useApprenticeshipStore.getState();
    const willSave = !store.savedIds.includes(listing.id);
    store.toggleSaved(listing.id);

    const ui = useApprenticeshipUi.getState();
    if (willSave && !ui.saveHintShown) {
      ui.markSaveHintShown();
      toast.success('Annonsen er lagret', {
        description: 'Fristen vises nå på Hjem og i timeplanen.',
        id: 'apprenticeship-save-hint',
      });
    }
    return willSave;
  }, []);
}
