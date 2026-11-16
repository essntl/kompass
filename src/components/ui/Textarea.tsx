import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses } from './Field';
import { withField, type FieldWiring } from './fieldWiring';

export interface TextareaProps extends ComponentPropsWithRef<'textarea'>, FieldWiring {
  /** Grows with its content between `rows` and roughly 12 lines (where the browser supports it). */
  autoGrow?: boolean;
}

export function Textarea({
  label,
  hint,
  error,
  optional,
  wrapperClassName,
  autoGrow = false,
  rows = 4,
  className,
  id,
  ...rest
}: TextareaProps) {
  return withField({ label, hint, error, optional, wrapperClassName }, id, (control) => (
    <textarea
      {...control}
      rows={rows}
      {...rest}
      className={cn(
        controlClasses,
        'block resize-none px-3 py-3 leading-6',
        autoGrow && 'field-sizing-content max-h-72',
        className,
      )}
    />
  ));
}
