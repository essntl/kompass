/** Random id for client-side records. Optional prefix makes ids easier to read in devtools. */
export function newId(prefix?: string): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : fallbackId();
  return prefix ? `${prefix}-${uuid}` : uuid;
}

/** Only used on insecure origins (http on a LAN address) where `randomUUID` is missing. */
function fallbackId(): string {
  const random = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random()}${random()}`;
}
