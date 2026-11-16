import { CircleExclamationPoint } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Props to spread on the control inside a `Field`. */
export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-labelledby'?: string;
}

export interface FieldProps {
  /** Always visible. Short noun: "Tittel", "Hjemmeadresse". */
  label: string;
  /** Help text under the control. */
  hint?: ReactNode;
  /** Error text. Replaces the hint and marks the control invalid. */
  error?: ReactNode;
  /** Adds "(valgfritt)" after the label. */
  optional?: boolean;
  /** Use your own id for the control instead of a generated one. */
  id?: string;
  /**
   * `label` (default) renders a `<label for>` for a single input.
   * `group` renders a caption for a set of controls (chips, segmented control, switch list);
   * spread `aria-labelledby` on the group element.
   */
  as?: 'label' | 'group';
  className?: string;
  /** The control, or a function that receives the id/aria props to spread on it. */
  children: ReactNode | ((control: FieldControlProps) => ReactNode);
}

/**
 * Label + control + hint/error. `Input`, `Textarea` and `Select` already wrap
 * themselves in a Field when you pass `label`; use Field directly for anything else.
 */
export function Field({
  label,
  hint,
  error,
  optional,
  id: idProp,
  as = 'label',
  className,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const control: FieldControlProps = {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-labelledby': as === 'group' ? labelId : undefined,
  };

  const labelContent = (
    <>
      {label}
      {optional ? <span className="font-normal text-ink-2"> (valgfritt)</span> : null}
    </>
  );

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {as === 'label' ? (
        <label id={labelId} htmlFor={id} className="text-small font-semibold text-ink">
          {labelContent}
        </label>
      ) : (
        <span id={labelId} className="text-small font-semibold text-ink">
          {labelContent}
        </span>
      )}
      {typeof children === 'function' ? children(control) : children}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-small text-danger">
          <CircleExclamationPoint aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-small text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Shared look for text-like controls. 48px tall, 16px text (no iOS zoom). */
export const controlClasses = cn(
  'w-full min-w-0 rounded-sm border border-line-strong bg-surface-2 text-body text-ink',
  'placeholder:text-placeholder',
  'transition-[border-color,background-color] duration-150',
  'hover:border-ink-3',
  'focus-visible:border-primary focus-visible:bg-surface focus-visible:outline-offset-0',
  'aria-invalid:border-danger',
  'disabled:cursor-not-allowed disabled:opacity-50',
);
