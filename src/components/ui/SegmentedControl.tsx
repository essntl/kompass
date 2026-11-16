import { useId, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional leading icon, e.g. `<Sun />`. */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** One of these is required: names the group for screen readers. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  /** sm = 36px (inline filters), md = 44px (default, forms and settings). */
  size?: 'sm' | 'md';
  /** Stretch to the container width (default true). */
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Picks one of 2–4 short options ("Dag / Uke", "System / Lys / Mørk").
 * A radio group underneath: arrow keys move the selection.
 *
 * The thumb slides with a CSS transform (segments are equal width, so its
 * position is just `index × 100%`): it stays on the compositor and retargets
 * mid-flight when the user changes their mind.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = true,
  disabled,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  function move(from: number, direction: 1 | -1) {
    const count = options.length;
    for (let step = 1; step <= count; step += 1) {
      const index = (from + direction * step + count) % count;
      const option = options[index];
      if (option && !option.disabled) {
        onChange(option.value);
        refs.current[index]?.focus();
        return;
      }
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(index, -1);
    }
  }

  const thumbStyle: CSSProperties = {
    width: `calc((100% - 8px) / ${options.length})`,
    transform: `translateX(${selectedIndex * 100}%)`,
  };

  return (
    <div
      role="radiogroup"
      aria-disabled={disabled || undefined}
      className={cn(
        'relative grid auto-cols-fr grid-flow-col rounded-md bg-surface-2 p-1',
        fullWidth ? 'w-full' : 'inline-grid',
        disabled && 'pointer-events-none opacity-45',
        className,
      )}
      {...aria}
    >
      <span
        aria-hidden
        style={thumbStyle}
        className="motion-move absolute inset-y-1 left-1 rounded-sm bg-raised shadow-1 transition-transform duration-250 ease-drawer"
      />
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={`${groupId}-${option.value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative z-10 inline-flex min-w-0 items-center justify-center gap-1.5 rounded-sm px-3',
              'font-semibold transition-[color,scale] duration-150 ease-out active:scale-[0.97]',
              'disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
              size === 'md' ? 'h-9 text-small' : 'hit-44 h-7 text-small',
              selected ? 'text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {option.icon ? <span aria-hidden className="inline-flex">{option.icon}</span> : null}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
