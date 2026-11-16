import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IconButton, Input } from '@/components/ui';

const DEBOUNCE_MS = 220;

export interface SearchFieldProps {
  /** The committed query (from the store). */
  value: string;
  /** Called debounced while typing, and at once on clear or Enter. */
  onCommit: (query: string) => void;
  className?: string;
}

/** Debounced search input with a clear button. */
export function SearchField({ value, onCommit, className }: SearchFieldProps) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const lastCommitted = useRef(value);
  const commitRef = useRef((query: string) => {
    lastCommitted.current = query;
    onCommit(query);
  });
  commitRef.current = (query: string) => {
    lastCommitted.current = query;
    onCommit(query);
  };

  // Follow outside changes (e.g. "Nullstill filtre"), but never our own commits.
  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function change(next: string) {
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commitRef.current(next), DEBOUNCE_MS);
  }

  function clear() {
    window.clearTimeout(timer.current);
    setDraft('');
    commitRef.current('');
    inputRef.current?.focus();
  }

  return (
    <form
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        window.clearTimeout(timer.current);
        commitRef.current(draft);
        inputRef.current?.blur();
      }}
    >
      <Input
        ref={inputRef}
        label="Søk"
        type="search"
        value={draft}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && draft) {
            event.preventDefault();
            clear();
          }
        }}
        placeholder="Bedrift, fag eller sted"
        enterKeyHint="search"
        autoComplete="off"
        leading={<Search />}
        trailing={
          draft ? <IconButton label="Tøm søket" icon={<X />} size="sm" onClick={clear} /> : undefined
        }
        className="[&::-webkit-search-cancel-button]:appearance-none"
      />
    </form>
  );
}
