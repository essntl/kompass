import type { QuickLink } from '@shared/types';
import { useState, type KeyboardEvent } from 'react';
import { cn, Field, Input } from '@/components/ui';
import { QUICK_LINK_LABEL_MAX, validateQuickLink, type QuickLinkValidation } from '../logic/quickLinks';
import { QUICK_LINK_ICONS } from './quickLinkIcons';

export const QUICK_LINK_FORM_ID = 'dashboard-quick-link-form';

export interface QuickLinkFormProps {
  /** The link being edited; empty for a new one. */
  initial?: QuickLink;
  onSubmit: (value: Omit<QuickLink, 'id'>) => void;
}

/**
 * Name, address and icon for one quick link. Submitted by the sheet's footer button
 * (`form={QUICK_LINK_FORM_ID}`), so the keyboard's return key works too.
 */
export function QuickLinkForm({ initial, onSubmit }: QuickLinkFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'link');
  // Errors show after the first submit attempt, then update as the student types.
  const [errors, setErrors] = useState<QuickLinkValidation['errors'] | null>(null);

  const live = errors ? validateQuickLink({ label, url, icon }).errors : {};

  return (
    <form
      id={QUICK_LINK_FORM_ID}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const result = validateQuickLink({ label, url, icon });
        if (result.value) onSubmit(result.value);
        else setErrors(result.errors);
      }}
    >
      <Input
        label="Navn"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="For eksempel Skole-e-post"
        maxLength={QUICK_LINK_LABEL_MAX + 8}
        enterKeyHint="next"
        error={live.label}
      />
      <Input
        label="Nettadresse"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onBlur={() => {
          // Show the full address once they leave the field, so they see what will open.
          const trimmed = url.trim();
          if (trimmed && !/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) && !/\s/.test(trimmed)) {
            setUrl(`https://${trimmed.replace(/^\/+/, '')}`);
          }
        }}
        placeholder="vilbli.no"
        type="text"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        hint="Vi legger til https:// for deg."
        error={live.url}
      />
      <Field label="Ikon" as="group">
        {(control) => <IconPicker labelledBy={control['aria-labelledby']} value={icon} onChange={setIcon} />}
      </Field>
    </form>
  );
}

/** A radio group of icons, with arrow-key navigation like native radios. */
function IconPicker({
  labelledBy,
  value,
  onChange,
}: {
  labelledBy?: string;
  value: string;
  onChange: (name: string) => void;
}) {
  const selectedIndex = Math.max(
    0,
    QUICK_LINK_ICONS.findIndex((entry) => entry.name === value),
  );

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (selectedIndex + step + QUICK_LINK_ICONS.length) % QUICK_LINK_ICONS.length;
    const entry = QUICK_LINK_ICONS[next];
    if (!entry) return;
    onChange(entry.name);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-icon="${entry.name}"]`)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className="grid grid-cols-5 gap-2"
    >
      {QUICK_LINK_ICONS.map(({ name, label, Icon }, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            data-icon={name}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(name)}
            className={cn(
              'grid h-12 place-items-center rounded-md border',
              'transition-[scale,background-color,border-color,color] duration-150 ease-out active:scale-[0.97]',
              selected
                ? 'border-primary bg-primary text-primary-ink'
                : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-hover hover:text-ink',
            )}
          >
            <Icon aria-hidden className="size-5" />
          </button>
        );
      })}
    </div>
  );
}
