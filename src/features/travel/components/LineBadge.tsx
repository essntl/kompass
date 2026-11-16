import type { TripLeg } from '@shared/types';
import { cn } from '@/lib/cn';
import { lineBadgeColors, modeColor, modeIcon, modeLabel } from '../lib/modes';

export interface LineBadgeProps {
  leg: Pick<TripLeg, 'mode' | 'line'>;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Mode icon + line number on the operator's colour (from Entur), or the mode colour when
 * the operator has none. The icon keeps the mode readable without relying on colour.
 */
export function LineBadge({ leg, size = 'md', className }: LineBadgeProps) {
  const Icon = modeIcon(leg.mode);
  const operator = lineBadgeColors(leg.line?.color, leg.line?.textColor);
  const fallback = modeColor(leg.mode);
  const code = leg.line?.publicCode;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm font-bold tabular-nums',
        size === 'md' ? 'h-7 gap-1 px-2 text-small [&_svg]:size-4' : 'h-5 gap-0.5 px-1.5 text-caption [&_svg]:size-3',
        !operator && cn(fallback.bg, fallback.onBg),
        className,
      )}
      style={operator ?? undefined}
    >
      <Icon aria-hidden strokeWidth={2.25} />
      <span>
        <span className="sr-only">{modeLabel(leg.mode)} </span>
        {code}
      </span>
    </span>
  );
}
