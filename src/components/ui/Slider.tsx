import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/cn';

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  /** Fires once when the user lets go – use it for expensive work (e.g. re-planning a trip). */
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Spoken value, e.g. `(v) => \`${v} meter per sekund\``. */
  formatValue?: (value: number) => string;
  /** Tick marks under the track, e.g. the walking-speed presets. */
  marks?: Array<{ value: number; label?: string }>;
  /** One of these is required unless the slider sits in a `Field as="group"`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Single-value slider. The thumb is 24px with a 44px hit area. */
export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  marks,
  disabled,
  id,
  className,
  ...aria
}: SliderProps) {
  const span = max - min || 1;
  return (
    <div className={cn('w-full', className)}>
      <SliderPrimitive.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([next]) => next !== undefined && onValueChange(next)}
        onValueCommit={([next]) => next !== undefined && onValueCommit?.(next)}
        // A sideways drag on the slider must never start dragging the sheet it sits in.
        data-vaul-no-drag=""
        className="relative flex h-11 w-full touch-none items-center select-none data-disabled:opacity-45"
      >
        <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-track/50">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          id={id}
          aria-valuetext={formatValue?.(value)}
          className={cn(
            'hit-44 block size-6 rounded-full border-2 border-primary bg-surface shadow-1',
            'transition-[scale] duration-150 ease-out active:scale-110',
            'cursor-grab active:cursor-grabbing',
          )}
          {...aria}
        />
      </SliderPrimitive.Root>
      {marks && marks.length > 0 ? (
        <div aria-hidden className="relative mx-3 h-5">
          {marks.map((mark) => (
            <span
              key={mark.value}
              className="absolute top-0 -translate-x-1/2 text-caption whitespace-nowrap text-ink-2"
              style={{ left: `${((mark.value - min) / span) * 100}%` }}
            >
              {mark.label ?? mark.value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
