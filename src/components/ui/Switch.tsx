import * as SwitchPrimitive from '@radix-ui/react-switch';
import { motion } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /**
   * Visible label. With a label the switch renders as a full-width row
   * (label left, switch right) and the whole row is tappable.
   */
  label?: ReactNode;
  /** Second line under the label. */
  description?: ReactNode;
  /** Required when there is no visible `label`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

const TRAVEL_PX = 20; // track 52 − thumb 24 − 2 × 4 inset

/** On/off toggle that takes effect immediately (no "Lagre" needed). */
export function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  disabled,
  id: idProp,
  name,
  className,
  ...aria
}: SwitchProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const checked = checkedProp ?? uncontrolled;

  const control = (
    <SwitchPrimitive.Root
      id={id}
      name={name}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => {
        if (checkedProp === undefined) setUncontrolled(next);
        onCheckedChange?.(next);
      }}
      aria-describedby={description ? `${id}-description` : undefined}
      className={cn(
        'group hit-44 inline-flex h-8 w-13 shrink-0 items-center rounded-full px-1',
        'transition-colors duration-200 ease-out',
        'bg-track data-[state=checked]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-45',
        !label && className,
      )}
      {...aria}
    >
      <SwitchPrimitive.Thumb asChild>
        <motion.span
          initial={false}
          animate={{ x: checked ? TRAVEL_PX : 0 }}
          transition={spring.thumb}
          className={cn(
            'block size-6 rounded-full shadow-1 transition-colors duration-200',
            'bg-thumb group-data-[state=checked]:bg-primary-ink',
          )}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );

  if (!label) return control;

  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-4', className)}>
      <label htmlFor={id} className={cn('min-w-0 flex-1 py-1', !disabled && 'cursor-pointer')}>
        <span className="block text-body font-medium text-ink">{label}</span>
        {description ? (
          <span id={`${id}-description`} className="mt-0.5 block text-small text-ink-2">
            {description}
          </span>
        ) : null}
      </label>
      {control}
    </div>
  );
}
