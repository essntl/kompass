import { useMemo } from 'react';
import { useUnreadCount } from '@/stores/messages';

/**
 * Counts shown on navigation items, keyed by destination path
 * (e.g. `{ '/meldinger': 1 }` for one unread message).
 */
export function useNavBadges(): Partial<Record<string, number>> {
  const unread = useUnreadCount();
  return useMemo(() => (unread > 0 ? { '/meldinger': unread } : EMPTY), [unread]);
}

const EMPTY: Partial<Record<string, number>> = {};
