import { FlaskConical } from 'lucide-react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'danger' | 'success' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  primary: 'bg-primary-soft text-primary-soft-ink',
  accent: 'bg-accent-soft text-accent-soft-ink',
  danger: 'bg-danger-soft text-danger-soft-ink',
  success: 'bg-success-soft text-success-soft-ink',
  info: 'bg-info-soft text-info-soft-ink',
};

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  tone?: BadgeTone;
  /** Small leading icon. Status badges should have one so colour is not the only signal. */
  icon?: ReactNode;
}

/** Small status label: "Frist om 3 dager", "Sendt", "Fravær". Not interactive. */
export function Badge({ tone = 'neutral', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 align-middle',
        'text-caption font-semibold whitespace-nowrap [&_svg]:size-3.5',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden className="-ml-0.5 inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

export interface DemoBadgeProps {
  className?: string;
}

/** Shown next to an AI answer that came from the server's mock mode. */
export function DemoBadge({ className }: DemoBadgeProps) {
  return (
    <Badge
      tone="accent"
      icon={<FlaskConical />}
      title="Dette er et eksempelsvar. Appen kjører uten AI-nøkkel."
      className={className}
    >
      Demomodus
    </Badge>
  );
}
