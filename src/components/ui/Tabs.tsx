import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Small count after the label, e.g. number of saved listings. */
  count?: number;
}

export interface TabsProps<T extends string> {
  tabs: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Names the tab list for screen readers, e.g. "Lærlingplasser". */
  'aria-label': string;
  /**
   * Shared with `TabPanel` so tabs and panels point at each other.
   * Generate one with `useId()` in the page.
   */
  id?: string;
  /** Tabs share the full width equally (good for 2–3 tabs on mobile). */
  fullWidth?: boolean;
  className?: string;
}

interface Indicator {
  left: number;
  width: number;
}

/**
 * Underlined tabs for switching between views of the same page.
 * The underline is one element moved with `transform` (translate + scaleX),
 * measured from the active tab, so it never animates layout.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  id: idProp,
  fullWidth = false,
  className,
  'aria-label': ariaLabel,
}: TabsProps<T>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  // The first measurement must not animate in from the left edge.
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const tab = tabRefs.current.get(value);
      if (!tab) return;
      setIndicator((previous) => {
        const next = { left: tab.offsetLeft, width: tab.offsetWidth };
        return previous && previous.left === next.left && previous.width === next.width
          ? previous
          : next;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    tabRefs.current.forEach((tab) => observer.observe(tab));
    return () => observer.disconnect();
  }, [value, tabs]);

  useLayoutEffect(() => {
    if (!indicator || animate) return;
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, [indicator, animate]);

  function select(next: T) {
    onChange(next);
    const tab = tabRefs.current.get(next);
    tab?.focus();
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    let target: number | null = null;
    if (event.key === 'ArrowRight') target = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') target = index === 0 ? last : index - 1;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = last;
    const tab = target === null ? undefined : tabs[target];
    if (!tab) return;
    event.preventDefault();
    select(tab.value);
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'no-scrollbar relative flex overflow-x-auto overscroll-x-contain border-b border-line',
        fullWidth ? 'w-full' : 'gap-1',
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              if (node) tabRefs.current.set(tab.value, node);
              else tabRefs.current.delete(tab.value);
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${id}-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(tab.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 px-3 text-body font-semibold whitespace-nowrap',
              'rounded-sm transition-[color,scale] duration-150 ease-out active:scale-[0.97]',
              'focus-visible:-outline-offset-2',
              fullWidth && 'flex-1',
              selected ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cn(
                  'nums inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-caption font-semibold',
                  'transition-colors duration-150',
                  selected
                    ? 'bg-primary-soft text-primary-soft-ink'
                    : 'bg-surface-2 text-ink-2',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
      <span
        aria-hidden
        className={cn(
          'motion-move pointer-events-none absolute bottom-0 left-0 h-0.5 w-25 origin-left bg-primary',
          animate && 'transition-transform duration-250 ease-drawer',
          !indicator && 'opacity-0',
        )}
        style={
          indicator
            ? { transform: `translateX(${indicator.left}px) scaleX(${indicator.width / 100})` }
            : undefined
        }
      />
    </div>
  );
}

export interface TabPanelProps extends ComponentPropsWithRef<'div'> {
  /** The same id that was passed to `Tabs`. */
  tabsId: string;
  value: string;
  /** Only the active panel renders its children. */
  active: boolean;
  children?: ReactNode;
}

/** Optional companion to `Tabs`: wires `role="tabpanel"` to the matching tab. */
export function TabPanel({ tabsId, value, active, children, ...rest }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={`${tabsId}-panel-${value}`}
      aria-labelledby={`${tabsId}-tab-${value}`}
      hidden={!active}
      tabIndex={-1}
      {...rest}
    >
      {active ? children : null}
    </div>
  );
}
