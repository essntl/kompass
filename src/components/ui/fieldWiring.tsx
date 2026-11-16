import type { ReactNode } from 'react';
import { Field, type FieldControlProps } from './Field';

export interface FieldWiring {
  /** Visible label. When set, the control renders inside a `Field`. */
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  /** Class for the outer Field wrapper (layout); `className` goes on the control itself. */
  wrapperClassName?: string;
}

export function withField(
  { label, hint, error, optional, wrapperClassName }: FieldWiring,
  id: string | undefined,
  render: (control: Partial<FieldControlProps>) => ReactNode,
) {
  if (!label) {
    // Bare control: the caller provides the label (e.g. inside its own <Field>).
    return render({ id, 'aria-invalid': error ? true : undefined });
  }
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      id={id}
      className={wrapperClassName}
    >
      {({ 'aria-labelledby': _unused, ...control }) => render(control)}
    </Field>
  );
}
