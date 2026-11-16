import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses } from './Field';
import { withField, type FieldWiring } from './fieldWiring';

export interface InputProps extends ComponentPropsWithRef<'input'>, FieldWiring {
  /** Icon or text inside the left edge, e.g. `<Search />`. */
  leading?: ReactNode;
  /** Content inside the right edge, e.g. a clear button or a unit ("min"). */
  trailing?: ReactNode;
}

/**
 * Single-line text input. Remember the keyboard hints on mobile:
 * `type="email"`, `inputMode="numeric"`, `enterKeyHint="search"`, `autoComplete`.
 */
export function Input({
  label,
  hint,
  error,
  optional,
  wrapperClassName,
  leading,
  trailing,
  className,
  id,
  ...rest
}: InputProps) {
  return withField({ label, hint, error, optional, wrapperClassName }, id, (control) => {
    const input = (
      <input
        {...control}
        {...rest}
        className={cn(
          controlClasses,
          'h-12 px-3',
          leading ? 'pl-11' : null,
          trailing ? 'pr-11' : null,
          className,
        )}
      />
    );
    if (!leading && !trailing) return input;
    return (
      <div className="relative">
        {leading ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-ink-2 [&_svg]:size-5"
          >
            {leading}
          </span>
        ) : null}
        {input}
        {trailing ? (
          <span className="absolute inset-y-0 right-0 grid min-w-11 place-items-center pr-0.5 text-small text-ink-2 [&_svg]:size-5">
            {trailing}
          </span>
        ) : null}
      </div>
    );
  });
}
