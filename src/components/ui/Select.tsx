import { ChevronDown } from 'lucide-react';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses } from './Field';
import { withField, type FieldWiring } from './fieldWiring';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends ComponentPropsWithRef<'select'>, FieldWiring {
  /** Either pass `options` or `<option>` children. */
  options?: SelectOption[];
  /** Disabled first option shown while nothing is chosen, e.g. "Velg fag". */
  placeholder?: string;
}

/** Native `<select>`: the platform picker is the best picker on a phone. */
export function Select({
  label,
  hint,
  error,
  optional,
  wrapperClassName,
  options,
  placeholder,
  className,
  children,
  id,
  ...rest
}: SelectProps) {
  return withField({ label, hint, error, optional, wrapperClassName }, id, (control) => (
    <div className="relative">
      <select
        {...control}
        {...rest}
        className={cn(controlClasses, 'h-12 appearance-none truncate pr-11 pl-3', className)}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-2"
      />
    </div>
  ));
}
