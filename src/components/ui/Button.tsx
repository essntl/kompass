import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

interface ButtonLookProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon, e.g. `<Plus />`. Sized by the button. */
  icon?: ReactNode;
  /** Trailing icon, e.g. `<ArrowRight />`. */
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export interface ButtonProps extends ButtonLookProps, ComponentPropsWithRef<'button'> {
  /** Shows a spinner and blocks clicks. The button keeps its width. */
  loading?: boolean;
}

function ButtonContent({
  icon,
  iconRight,
  children,
  hidden,
}: Pick<ButtonLookProps, 'icon' | 'iconRight'> & { children?: ReactNode; hidden?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center justify-center gap-2 transition-opacity duration-150',
        hidden && 'opacity-0',
      )}
    >
      {icon ? (
        <span aria-hidden className="-ml-0.5 inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
      {iconRight ? (
        <span aria-hidden className="-mr-0.5 inline-flex shrink-0">
          {iconRight}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The standard button. The label is a verb (+ object): "Lagre", "Meld fravær".
 * `type` defaults to "button" so a button inside a form never submits by accident.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        buttonClasses({ variant, size, fullWidth, dimmed: disabled && !loading }),
        className,
      )}
      {...rest}
    >
      <ButtonContent icon={icon} iconRight={iconRight} hidden={loading}>
        {children}
      </ButtonContent>
      {loading ? (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size={size === 'sm' ? 'sm' : 'md'} label="Laster" />
        </span>
      ) : null}
    </button>
  );
}

export interface ButtonLinkProps extends ButtonLookProps, Omit<LinkProps, 'to'> {
  /** In-app path, or a full `https://…` URL (opens in a new tab). */
  to: string;
}

const EXTERNAL = /^(https?:)?\/\/|^mailto:|^tel:/;

/** A link that looks like a button. Use for navigation; use `Button` for actions. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth,
  className,
  children,
  to,
  ...rest
}: ButtonLinkProps) {
  const classes = cn(buttonClasses({ variant, size, fullWidth }), className);
  const content = (
    <ButtonContent icon={icon} iconRight={iconRight}>
      {children}
    </ButtonContent>
  );

  if (EXTERNAL.test(to)) {
    const { reloadDocument, replace, state, preventScrollReset, relative, viewTransition, discover, prefetch, ...anchorRest } = rest;
    return (
      <a href={to} target="_blank" rel="noreferrer noopener" className={classes} {...anchorRest}>
        {content}
      </a>
    );
  }
  return (
    <Link to={to} className={classes} {...rest}>
      {content}
    </Link>
  );
}
