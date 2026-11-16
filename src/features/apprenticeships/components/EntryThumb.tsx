import { ImageOff } from 'lucide-react';
import { cn } from '@/components/ui';
import { usePhotoUrl } from '@/lib/photos';

export interface EntryThumbProps {
  photo?: string;
  className?: string;
}

/** Square thumbnail of a portfolio photo, with a quiet placeholder while loading or missing. */
export function EntryThumb({ photo, className }: EntryThumbProps) {
  const url = usePhotoUrl(photo);
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center overflow-hidden rounded-sm bg-surface-2 text-ink-2', className)}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <ImageOff className="size-5" />
      )}
    </span>
  );
}
