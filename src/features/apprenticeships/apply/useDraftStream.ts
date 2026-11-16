import { useCallback, useEffect, useRef, useState } from 'react';
import type { Listing, PortfolioEntry } from '@shared/types';
import { isAbortError, isApiError, streamApplicationText } from '@/lib/api';
import { useSettingsStore } from '@/stores/settings';
import { buildApplicationTextRequest } from '../logic/application';
import { useApprenticeshipUi } from '../store';

export type StreamStatus = 'idle' | 'streaming' | 'error';

const FALLBACK_ERROR = 'Vi fikk ikke laget et utkast nå. Prøv igjen, eller skriv teksten selv.';

/**
 * Streams an AI draft straight into the listing's saved draft. Stopping keeps what has
 * arrived; an error before anything arrived puts the previous text back.
 * The request is aborted when the component using the hook unmounts.
 */
export function useDraftStream(listing: Listing, entries: readonly PortfolioEntry[]) {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const generate = useCallback(async () => {
    stop();
    const abort = new AbortController();
    controller.current = abort;

    const { updateDraft } = useApprenticeshipUi.getState();
    const previous = useApprenticeshipUi.getState().drafts[listing.id]?.text ?? '';
    const profile = useSettingsStore.getState().profile;
    let text = '';

    setStatus('streaming');
    setError(null);
    updateDraft(listing.id, { text: '', mock: false });

    try {
      const { mock } = await streamApplicationText(buildApplicationTextRequest(profile, listing, entries), {
        signal: abort.signal,
        onDelta: (delta) => {
          // The model sometimes opens with blank lines; the textarea should not start empty.
          text = (text + delta).replace(/^\s+/, '');
          updateDraft(listing.id, { text });
        },
      });
      updateDraft(listing.id, { text: text.trim(), mock });
      setStatus('idle');
    } catch (err) {
      if (isAbortError(err)) {
        // Stopped by the student (or the sheet closed): keep what arrived.
        if (!text.trim()) updateDraft(listing.id, { text: previous });
        setStatus('idle');
        return;
      }
      if (!text.trim()) updateDraft(listing.id, { text: previous });
      setError(isApiError(err) ? err.message : FALLBACK_ERROR);
      setStatus('error');
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }, [entries, listing, stop]);

  return { status, error, generate, stop, dismissError: () => setError(null) };
}
