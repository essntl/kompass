/**
 * Runtime configuration, read from the environment on every call so that tests (and
 * `tsx watch` restarts) always see the current values.
 */
export const DEFAULT_MODEL = 'claude-haiku-5-5';
export const DEFAULT_PORT = 8787;

/**
 * The backend port. Deliberately `API_PORT`, not the generic `PORT`: hosting tools and
 * preview environments set `PORT` for the web app, which made the API collide with Vite.
 */
export function getPort(): number {
  const port = Number(process.env.API_PORT);
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT;
}

export function getApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? key : null;
}

/** 'live' when an Anthropic API key is configured, otherwise the built-in mock mode. */
export function getAiMode(): 'live' | 'mock' {
  return getApiKey() ? 'live' : 'mock';
}

export function getModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export function getEnturClientName(): string {
  return process.env.ENTUR_CLIENT_NAME?.trim() || 'student-kompass';
}
