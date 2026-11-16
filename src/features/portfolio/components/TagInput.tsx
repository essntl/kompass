import { Plus, X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { Field, IconButton, Input } from '@/components/ui';
import { addTags, MAX_TAG_LENGTH, MAX_TAGS } from '../logic';

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

/**
 * Free-text tags. Return or a comma adds what is typed; each tag is a removable pill.
 * Whatever is still in the box when the form is saved is added too (see `flush`).
 */
export function TagInput({ tags, onChange }: TagInputProps) {
  const id = useId();
  const [text, setText] = useState('');
  const full = tags.length >= MAX_TAGS;

  function commit(value = text) {
    if (!value.trim()) return;
    onChange(addTags(tags, value));
    setText('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !text && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <Field
      label="Stikkord"
      optional
      id={id}
      hint={full ? `Du kan ha opptil ${MAX_TAGS} stikkord.` : 'For eksempel sveising, måling, HMS. Trykk retur for å legge til.'}
    >
      {(control) => (
        <div className="flex flex-col gap-2">
          <Input
            {...control}
            value={text}
            maxLength={MAX_TAG_LENGTH * 3}
            disabled={full}
            placeholder={full ? 'Fjern et stikkord for å legge til flere' : 'Skriv et stikkord'}
            enterKeyHint="done"
            autoCapitalize="none"
            onChange={(event) => {
              const value = event.target.value;
              if (value.includes(',')) commit(value);
              else setText(value);
            }}
            onBlur={() => commit()}
            onKeyDown={onKeyDown}
            trailing={
              text.trim() ? (
                <IconButton
                  label="Legg til stikkord"
                  icon={<Plus />}
                  size="sm"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commit()}
                />
              ) : undefined
            }
          />
          {tags.length > 0 ? (
            <ul aria-label="Stikkord" className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag}>
                  <span className="inline-flex h-9 items-center gap-1 rounded-sm bg-primary-soft pl-3 text-small font-medium text-primary-soft-ink">
                    {tag}
                    <button
                      type="button"
                      aria-label={`Fjern stikkordet ${tag}`}
                      onClick={() => onChange(tags.filter((value) => value !== tag))}
                      className="hit-44 grid size-9 place-items-center rounded-sm transition-[scale] duration-150 ease-out active:scale-[0.97] [&_svg]:size-4"
                    >
                      <X aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Field>
  );
}
