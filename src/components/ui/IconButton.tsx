import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface IconButtonProps
  extends Omit<ComponentPropsWithRef<'button'>, 'aria-label' | 'children'> {
  /** Required. Becomes the `aria-label`, e.g. "Lukk" or "Slett oppføring". */
  label: string;
  /** The icon, e.g. `<X />`. Sized by the button. */
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

/** Icon-only button. Round, 44px by default; `sm` is 36px with a 44px hit area. */
export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        buttonClasses({ variant, size, iconOnly: true, dimmed: disabled && !loading }),
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" label={null} /> : <span aria-hidden className="inline-flex">{icon}</span>}
    </button>
  );
}
