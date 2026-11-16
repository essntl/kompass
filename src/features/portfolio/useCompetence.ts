import type { PortfolioEntry } from '@shared/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { describePortfolioEntry, isAbortError, isApiError } from '@/lib/api';
import { photoToBase64 } from '@/lib/photos';
import { usePortfolioStore } from '@/stores/portfolio';
import { useSettingsStore } from '@/stores/settings';
import { useTimetableStore } from '@/stores/timetable';
import { buildDescribeRequest } from './logic';

export type CompetenceStatus = 'idle' | 'loading' | 'error';

const FALLBACK_ERROR = 'Vi fikk ikke laget beskrivelsen akkurat nå. Prøv igjen om litt.';

/**
 * Generates (or regenerates) the competence description for an entry and saves it on
 * the entry. The request is cancelled if the student leaves the page.
 */
export function useCompetence(entry: PortfolioEntry | undefined) {
  const [status, setStatus] = useState<CompetenceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const generate = useCallback(async () => {
    if (!entry) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');
    setError(null);

    try {
      const profile = useSettingsStore.getState().profile;
      const subject = entry.subjectId
        ? useTimetableStore.getState().subjects.find((s) => s.id === entry.subjectId)
        : undefined;
      const image = await photoToBase64(entry.photo);
      const request = buildDescribeRequest(entry, profile, subject, image);
      const { competence } = await describePortfolioEntry(request, { signal: controller.signal });
      if (controller.signal.aborted) return;
      usePortfolioStore.getState().updateEntry(entry.id, { competence });
      setStatus('idle');
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      setError(isApiError(err) ? err.message : FALLBACK_ERROR);
      setStatus('error');
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [entry]);

  const dismissError = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, generate, dismissError };
}
