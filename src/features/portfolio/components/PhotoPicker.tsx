import { Camera, ImagePlus, RefreshCw, Trash } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, cn, Field, Skeleton } from '@/components/ui';
import { fileToDownscaledJpeg, usePhotoUrl } from '@/lib/photos';

/** The photo while editing: the stored one, a new (not yet saved) one, or none. */
export type PhotoValue =
  | { kind: 'stored'; ref: string }
  | { kind: 'new'; blob: Blob }
  | { kind: 'none' };

export interface PhotoPickerProps {
  value: PhotoValue;
  onChange: (value: PhotoValue) => void;
  /** Alt text for the preview (the entry's title). */
  alt: string;
}

/** Longest side of a stored photo. Matches what the AI route accepts. */
const MAX_PX = 1280;

function useBlobUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

/**
 * Photo field: "Ta bilde" opens the camera on a phone (`capture="environment"`),
 * "Velg bilde" opens the gallery or file picker. The picked image is downscaled to JPEG
 * right away; it is only written to IndexedDB when the form is saved.
 */
export function PhotoPicker({ value, onChange, alt }: PhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storedUrl = usePhotoUrl(value.kind === 'stored' ? value.ref : null);
  const newUrl = useBlobUrl(value.kind === 'new' ? value.blob : null);
  const previewUrl = value.kind === 'stored' ? storedUrl : value.kind === 'new' ? newUrl : null;
  const hasPhoto = value.kind !== 'none';

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Filen er ikke et bilde. Velg et bilde, for eksempel JPG eller PNG.');
      return;
    }
    setError(null);
    setProcessing(true);
    try {
      const blob = await fileToDownscaledJpeg(file, MAX_PX);
      onChange({ kind: 'new', blob });
    } catch {
      setError('Vi fikk ikke lest bildet. Prøv et annet bilde.');
    } finally {
      setProcessing(false);
    }
  }

  const inputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </>
  );

  return (
    <Field label="Bilde" as="group" optional error={error ?? undefined} hint="Et bilde av det du har laget gjør porteføljen levende.">
      {(control) => (
        <div role="group" aria-labelledby={control['aria-labelledby']} aria-describedby={control['aria-describedby']} className="flex flex-col gap-3">
          {inputs}
          <div
            className={cn(
              'relative aspect-4/3 overflow-hidden rounded-lg',
              hasPhoto || processing ? 'bg-surface-2' : 'border-2 border-dashed border-line-strong bg-surface-2',
            )}
          >
            {processing || (hasPhoto && !previewUrl) ? (
              <div className="absolute inset-0">
                <Skeleton className="size-full" />
              </div>
            ) : hasPhoto && previewUrl ? (
              <img src={previewUrl} alt={alt || 'Bilde av oppføringen'} className="absolute inset-0 size-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-2 transition-[scale,color] duration-150 ease-out hover:text-ink active:scale-[0.98]"
              >
                <span aria-hidden className="grid size-12 place-items-center rounded-full bg-surface text-primary [&_svg]:size-6">
                  <Camera />
                </span>
                <span className="text-small font-semibold">Ta bilde av arbeidet</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {hasPhoto ? (
              <>
                <Button variant="secondary" size="sm" icon={<RefreshCw />} disabled={processing} onClick={() => fileRef.current?.click()}>
                  Bytt bilde
                </Button>
                <Button variant="ghost" size="sm" icon={<Trash />} disabled={processing} onClick={() => onChange({ kind: 'none' })}>
                  Fjern bildet
                </Button>
              </>
            ) : (
              <>
                <Button variant="soft" size="sm" icon={<Camera />} loading={processing} onClick={() => cameraRef.current?.click()}>
                  Ta bilde
                </Button>
                <Button variant="secondary" size="sm" icon={<ImagePlus />} disabled={processing} onClick={() => fileRef.current?.click()}>
                  Velg bilde
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </Field>
  );
}
