import type { Subject } from '@shared/types';
import { Wrench } from 'lucide-react';
import { useState, type Ref } from 'react';
import { cn, subjectColor } from '@/components/ui';
import { usePhotoUrl } from '@/lib/photos';

export interface EntryPhotoProps {
  photo: string | undefined;
  /** Empty for decorative use (the title is right next to it). */
  alt: string;
  subject?: Subject;
  /** Fixed-ratio box; the parent decides the size and rounding. */
  className?: string;
  /** Larger fallback icon on the entry page. */
  size?: 'sm' | 'md' | 'lg';
  ref?: Ref<HTMLDivElement>;
  /** Marks the element as a landing spot for the photo transition. */
  entryId?: string;
  shape?: 'card' | 'thumb' | 'hero';
}

const ICON = { sm: 'size-6', md: 'size-8', lg: 'size-12' } as const;

/**
 * An entry's photo in a fixed 4:3 box, so nothing shifts while it loads:
 * skeleton until the image has decoded, then a short fade. Entries without a photo get
 * a calm placeholder in the subject's soft colour.
 */
export function EntryPhoto({
  photo,
  alt,
  subject,
  className,
  size = 'md',
  ref,
  entryId,
  shape,
}: EntryPhotoProps) {
  const url = usePhotoUrl(photo);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const loaded = url !== null && loadedUrl === url;
  const failed = url !== null && failedUrl === url;
  const palette = subject ? subjectColor(subject.color) : null;

  const showFallback = !photo || failed;

  return (
    <div
      ref={ref}
      data-entry-photo={entryId}
      data-photo-shape={shape}
      className={cn(
        'relative aspect-4/3 overflow-hidden',
        showFallback ? (palette ? palette.soft : 'bg-surface-2') : 'bg-surface-2',
        className,
      )}
    >
      {showFallback ? (
        <div
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
          className={cn('absolute inset-0 grid place-items-center', palette ? palette.ink : 'text-ink-2')}
        >
          <Wrench aria-hidden strokeWidth={1.5} className={cn(ICON[size], 'opacity-70')} />
        </div>
      ) : (
        <>
          {!loaded ? (
            // .skeleton sets position: relative, so it fills an absolute wrapper instead.
            <div aria-hidden className="absolute inset-0">
              <div className="skeleton size-full" />
            </div>
          ) : null}
          {url ? (
            <img
              src={url}
              alt={alt}
              decoding="async"
              draggable={false}
              onLoad={() => setLoadedUrl(url)}
              onError={() => setFailedUrl(url)}
              className={cn(
                'absolute inset-0 size-full object-cover transition-opacity duration-200 ease-out',
                loaded ? 'opacity-100' : 'opacity-0',
              )}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
