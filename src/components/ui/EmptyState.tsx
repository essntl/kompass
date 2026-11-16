import { RotateCw, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  /** A lucide icon, e.g. `<Inbox />`. */
  icon: ReactNode;
  /** What is (not) here: "Ingen meldinger ennå". */
  title: string;
  /** What the user can do about it. */
  description?: ReactNode;
  /** Usually one `<Button>`. */
  action?: ReactNode;
  /** `compact` for use inside a card, `page` (default) when it fills the page. */
  size?: 'compact' | 'page';
  className?: string;
}

function StateLayout({
  icon,
  title,
  description,
  action,
  size = 'page',
  className,
  iconClassName,
  role,
}: EmptyStateProps & { iconClassName: string; role?: 'alert' }) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center text-center',
        size === 'page' ? 'px-4 py-12' : 'px-2 py-6',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'mb-4 grid size-12 place-items-center rounded-lg [&_svg]:size-6',
          iconClassName,
        )}
      >
        {icon}
      </div>
      <p className="text-heading font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[36ch] text-body text-ink-2">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** For lists and pages with nothing to show yet. Always say what to do next. */
export function EmptyState(props: EmptyStateProps) {
  return <StateLayout {...props} iconClassName="bg-surface-2 text-ink-2" />;
}

export interface ErrorStateProps extends Partial<Pick<EmptyStateProps, 'icon'>> {
  /** Default: "Noe gikk galt". */
  title?: string;
  /** Default explains that it may be the connection. Pass `ApiError.message` here. */
  description?: ReactNode;
  /** Extra action next to the retry button. */
  action?: ReactNode;
  /** Renders a "Prøv igjen" button. */
  onRetry?: () => void;
  size?: 'compact' | 'page';
  className?: string;
}

/** For failed loads. Announced to screen readers when it appears. */
export function ErrorState({
  icon = <WifiOff />,
  title = 'Noe gikk galt',
  description = 'Vi fikk ikke hentet innholdet. Sjekk nettet og prøv igjen.',
  action,
  onRetry,
  size,
  className,
}: ErrorStateProps) {
  return (
    <StateLayout
      role="alert"
      icon={icon}
      title={title}
      description={description}
      size={size}
      className={className}
      iconClassName="bg-danger-soft text-danger-soft-ink"
      action={
        onRetry || action ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onRetry ? (
              <Button variant="secondary" icon={<RotateCw />} onClick={onRetry}>
                Prøv igjen
              </Button>
            ) : null}
            {action}
          </div>
        ) : undefined
      }
    />
  );
}
