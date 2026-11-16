import { BrandMark } from '@/components/ui';

/**
 * Shown by the router while the first route's code is loading. Usually gone
 * within a frame or two, so the mark only fades in if it takes a moment.
 */
export function AppSplash() {
  return (
    <div
      role="status"
      aria-label="Laster Kompass"
      className="grid min-h-dvh place-items-center bg-bg"
    >
      <BrandMark className="size-14 animate-[fade-in_400ms_ease_300ms_backwards]" />
    </div>
  );
}
