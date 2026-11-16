import { ArrowLeft } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

export interface PageHeaderProps {
  title: string;
  /** One quiet line under the title, e.g. the date or a count. */
  subtitle?: ReactNode;
  /**
   * Shows a back button. A path (`"/meldinger"`) always goes there;
   * `true` goes one step back in history.
   */
  back?: string | true;
  /** Buttons on the right, usually one `IconButton` or a small `Button`. */
  actions?: ReactNode;
  className?: string;
}

/** The page's `<h1>` in the display font, with optional back button and actions. */
export function PageHeader({ title, subtitle, back, actions, className }: PageHeaderProps) {
  const navigate = useNavigate();

  // The browser tab and the task switcher show which page this is.
  useEffect(() => {
    document.title = `${title} – Kompass`;
    return () => {
      document.title = 'Kompass';
    };
  }, [title]);

  function goBack() {
    if (typeof back === 'string') {
      navigate(back);
    } else if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      // Opened directly on a detail page: there is no history to go back to.
      navigate('/');
    }
  }

  return (
    <header className={cn('flex min-h-11 items-start gap-2', className)}>
      {back ? (
        <IconButton
          label="Tilbake"
          icon={<ArrowLeft />}
          onClick={goBack}
          className="-ml-2.5 shrink-0"
        />
      ) : null}
      <div className="min-w-0 flex-1 py-1">
        <h1 className="font-display text-title font-semibold tracking-tight text-ink desktop:text-display">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-body text-ink-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </header>
  );
}
