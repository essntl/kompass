import { Check } from 'lucide-react';
import { cn } from '@/components/ui';

/**
 * The check circle on a selectable entry. Filled with a check when selected, an empty
 * ring otherwise – the state never rests on colour alone.
 */
export function SelectionMark({ selected, className }: { selected: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-7 place-items-center rounded-full border-2 shadow-1',
        'transition-[background-color,border-color,scale] duration-150 ease-out',
        selected
          ? 'scale-100 border-primary bg-primary text-primary-ink'
          : 'scale-95 border-line-strong bg-surface text-transparent',
        className,
      )}
    >
      <Check strokeWidth={3} className="size-4" />
    </span>
  );
}
