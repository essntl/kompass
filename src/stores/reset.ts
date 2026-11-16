import { clearPhotos } from '@/lib/photos';
import { useApprenticeshipStore } from './apprenticeships';
import { useMessagesStore } from './messages';
import { kompassStorageKeys, removeStorageKey } from './persist';
import { usePortfolioStore } from './portfolio';
import { useSettingsStore } from './settings';
import { useTimetableStore } from './timetable';

/** Storage keys of the stores this function resets in place. */
const CORE_KEYS = new Set([
  'kompass:settings',
  'kompass:timetable',
  'kompass:messages',
  'kompass:portfolio',
  'kompass:apprenticeships',
]);

/**
 * "Tilbakestill demodata": every store goes back to a freshly generated seed (dated from
 * now), settings go back to the demo defaults and all user photos are deleted.
 *
 * Other `kompass:*` keys that features persist on their own are removed from localStorage
 * too; reload the page afterwards if such a feature keeps its state in memory.
 * The stores are reset synchronously; the returned promise settles when IndexedDB is cleared.
 */
export async function resetDemoData(): Promise<void> {
  useSettingsStore.getState().reset();
  useTimetableStore.getState().reset();
  useMessagesStore.getState().reset();
  usePortfolioStore.getState().reset();
  useApprenticeshipStore.getState().reset();

  for (const key of kompassStorageKeys()) {
    if (!CORE_KEYS.has(key)) removeStorageKey(key);
  }

  try {
    await clearPhotos();
  } catch {
    // Photos that could not be deleted are orphaned, never shown.
  }
}
