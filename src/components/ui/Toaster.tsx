import { CircleCheck, CircleExclamationPoint, X } from 'lucide-react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { useEffect, useRef, useSyncExternalStore, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { EASE_OUT, spring } from '@/lib/motion';
import { dismissToast, toastStore, type ToastItem } from './toast';
import { useIsDesktop } from './useMediaQuery';

/**
 * Renders the toast queue. Mounted once in the app shell.
 *  - Mobile: top of the screen (the bottom belongs to the nav, sheets and the keyboard).
 *  - Desktop: bottom right.
 * Toasts leave the way they came, and can be flicked away in that direction.
 */
export function Toaster() {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, () => []);
  const isDesktop = useIsDesktop();
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="region"
      aria-label="Varsler"
      aria-live="polite"
      aria-relevant="additions text"
      className={cn(
        'pointer-events-none fixed z-70 flex gap-2',
        isDesktop
          ? 'right-6 bottom-6 w-[360px] flex-col'
          : 'inset-x-0 top-0 flex-col-reverse items-center px-3 pt-[calc(var(--safe-top)+8px)]',
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item) => (
          <ToastCard key={item.id} item={item} edge={isDesktop ? 'bottom' : 'top'} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

const ICONS = {
  default: null,
  success: <CircleCheck className="size-5 text-success" />,
  error: <CircleExclamationPoint className="size-5 text-danger" />,
} as const;

function ToastCard({
  item,
  edge,
  ref,
}: {
  item: ToastItem;
  edge: 'top' | 'bottom';
  ref?: Ref<HTMLDivElement>;
}) {
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const controls = useRef<{ start: () => void; pause: () => void } | null>(null);

  // Auto-dismiss, paused while hovered/focused and while the tab is hidden.
  useEffect(() => {
    remaining.current = item.duration;
    const start = () => {
      window.clearTimeout(timer.current);
      startedAt.current = Date.now();
      timer.current = window.setTimeout(() => dismissToast(item.id), remaining.current);
    };
    const pause = () => {
      window.clearTimeout(timer.current);
      remaining.current = Math.max(1000, remaining.current - (Date.now() - startedAt.current));
    };
    const onVisibility = () => (document.hidden ? pause() : start());

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    controls.current = { start, pause };
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [item.id, item.duration, item.message]);

  const away = edge === 'top' ? -1 : 1;

  function onDragEnd(_: unknown, info: PanInfo) {
    const distance = info.offset.y * away;
    const velocity = info.velocity.y * away;
    // A quick flick is enough; it does not have to travel far.
    if (distance > 36 || velocity > 300) dismissToast(item.id);
  }

  return (
    <motion.div
      ref={ref}
      layout
      role={item.kind === 'error' ? 'alert' : undefined}
      initial={{ opacity: 0, y: `${away * 100}%`, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE_OUT } }}
      exit={{
        opacity: 0,
        y: `${away * 60}%`,
        scale: 0.96,
        transition: { duration: 0.2, ease: EASE_OUT },
      }}
      transition={spring.layout}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={edge === 'top' ? { top: 0.7, bottom: 0.08 } : { top: 0.08, bottom: 0.7 }}
      dragSnapToOrigin
      onDragEnd={onDragEnd}
      onPointerEnter={() => controls.current?.pause()}
      onPointerLeave={() => controls.current?.start()}
      onFocus={() => controls.current?.pause()}
      onBlur={() => controls.current?.start()}
      className={cn(
        'pointer-events-auto flex w-full max-w-[420px] touch-none items-start gap-3 select-none',
        'rounded-lg border border-line-strong bg-surface py-3 pr-2 pl-4 text-ink shadow-2',
      )}
    >
      {ICONS[item.kind] ? (
        <span aria-hidden className="mt-0.5 shrink-0">
          {ICONS[item.kind]}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-small font-semibold">{item.message}</p>
        {item.description ? (
          <p className="mt-0.5 text-small text-ink-2">{item.description}</p>
        ) : null}
      </div>
      {item.action ? (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            dismissToast(item.id);
          }}
          className="hit-44 -my-1 h-8 shrink-0 rounded-sm px-2 text-small font-semibold text-primary transition-[scale,background-color] duration-150 ease-out hover:bg-primary-soft active:scale-[0.97]"
        >
          {item.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Lukk varsel"
        onClick={() => dismissToast(item.id)}
        className="hit-44 -my-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-2 transition-[scale,background-color,color] duration-150 ease-out hover:bg-ink/6 hover:text-ink active:scale-[0.97]"
      >
        <X aria-hidden className="size-4" />
      </button>
    </motion.div>
  );
}
