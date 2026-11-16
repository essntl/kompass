import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Storage for the persisted stores: localStorage in the browser, an in-memory map when it
 * is missing or blocked (Vitest's node environment, private mode with storage disabled).
 * Importing a store therefore never throws, and writes never crash the app.
 */
const memory = new Map<string, string>();

const memoryStorage: StateStorage = {
  getItem: (name) => memory.get(name) ?? null,
  setItem: (name, value) => {
    memory.set(name, value);
  },
  removeItem: (name) => {
    memory.delete(name);
  },
};

function browserStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = 'kompass:probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function resolveStorage(): StateStorage {
  const local = browserStorage();
  if (!local) return memoryStorage;
  return {
    getItem: (name) => {
      try {
        return local.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        local.setItem(name, value);
      } catch {
        // Quota exceeded or storage revoked: keep running with in-memory state.
      }
    },
    removeItem: (name) => {
      try {
        local.removeItem(name);
      } catch {
        // Nothing to clean up.
      }
    },
  };
}

/** Pass as `storage` to zustand's `persist`. */
export function safeJSONStorage<S>() {
  return createJSONStorage<S>(resolveStorage);
}

/** Every `kompass:*` key in localStorage (empty outside the browser). */
export function kompassStorageKeys(): string[] {
  const local = browserStorage();
  if (!local) return [...memory.keys()];
  const keys: string[] = [];
  for (let i = 0; i < local.length; i += 1) {
    const key = local.key(i);
    if (key?.startsWith('kompass:')) keys.push(key);
  }
  return keys;
}

export function removeStorageKey(key: string): void {
  const local = browserStorage();
  try {
    if (local) local.removeItem(key);
    else memory.delete(key);
  } catch {
    // Ignore: nothing to remove.
  }
}
