import { useSyncExternalStore } from 'react';

export type AiStatus = 'live' | 'mock' | 'unknown';

/**
 * One shared `/api/health` lookup for the whole app. Plain `fetch` on purpose:
 * the shell must keep working when the API server is not running.
 */
let status: AiStatus = 'unknown';
let started = false;
const listeners = new Set<() => void>();
const RETRY_DELAYS_MS = [2000, 5000, 12000];

function setStatus(next: AiStatus) {
  if (next === status) return;
  status = next;
  listeners.forEach((listener) => listener());
}

async function check(attempt: number): Promise<void> {
  try {
    const res = await fetch('/api/health', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body: unknown = await res.json();
    const ai = (body as { ai?: unknown } | null)?.ai;
    if (ai !== 'live' && ai !== 'mock') throw new Error('Unexpected health payload');
    setStatus(ai);
  } catch {
    // The API may still be starting (dev) or missing entirely: stay 'unknown' and retry a few times.
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay !== undefined) window.setTimeout(() => void check(attempt + 1), delay);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void check(0);
  }
  return () => {
    listeners.delete(listener);
  };
}

/** `'live'` with a real API key, `'mock'` in demo mode, `'unknown'` until known or on failure. */
export function useAiStatus(): AiStatus {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => 'unknown' as const,
  );
}
