/**
 * Tiny toast store. `toast()` can be called from anywhere (components, stores,
 * event handlers); `<Toaster />` in the app shell renders the queue.
 */

export type ToastKind = 'default' | 'success' | 'error';

export interface ToastOptions {
  /** Second line, smaller. */
  description?: string;
  /** Milliseconds before it leaves. Default 4000 (6000 for errors). */
  duration?: number;
  /** One short action, e.g. `{ label: 'Angre', onClick: undo }`. */
  action?: { label: string; onClick: () => void };
  /** Reuse an id to replace a toast that is already showing instead of stacking a new one. */
  id?: string;
}

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  description?: string;
  duration: number;
  action?: { label: string; onClick: () => void };
}

const MAX_VISIBLE = 3;
let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function push(kind: ToastKind, message: string, options: ToastOptions = {}): string {
  const id = options.id ?? `toast-${(counter += 1)}`;
  const item: ToastItem = {
    id,
    kind,
    message,
    description: options.description,
    duration: options.duration ?? (kind === 'error' ? 6000 : 4000),
    action: options.action,
  };
  const existing = items.findIndex((entry) => entry.id === id);
  if (existing >= 0) {
    items = items.map((entry, index) => (index === existing ? item : entry));
  } else {
    // Newest last; drop the oldest when the stack is full.
    items = [...items, item].slice(-MAX_VISIBLE);
  }
  emit();
  return id;
}

export function dismissToast(id?: string) {
  items = id ? items.filter((entry) => entry.id !== id) : [];
  emit();
}

export const toastStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => items,
};

export interface ToastFn {
  (message: string, options?: ToastOptions): string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  dismiss: (id?: string) => void;
}

/**
 * Short confirmation of something the user just did: `toast.success('Fravær meldt')`.
 * Keep it to a few words; errors the user must act on belong inline, not in a toast.
 */
export const toast: ToastFn = Object.assign(
  (message: string, options?: ToastOptions) => push('default', message, options),
  {
    success: (message: string, options?: ToastOptions) => push('success', message, options),
    error: (message: string, options?: ToastOptions) => push('error', message, options),
    dismiss: dismissToast,
  },
);
