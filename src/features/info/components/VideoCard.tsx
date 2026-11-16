import { Play, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge, Card } from '@/components/ui';
import { youtubeEmbedUrl, youtubeThumbnail, type TopicVideo } from '../data/videos';

/**
 * A video with a click-to-load facade: only a thumbnail until the student presses play,
 * then a privacy-enhanced youtube-nocookie.com iframe. Placeholders say plainly that no
 * video has been chosen yet.
 */
export function VideoCard({ video }: { video: TopicVideo }) {
  if (video.kind === 'placeholder') return <VideoPlaceholder description={video.description} />;
  return <YoutubeFacade video={video} />;
}

function YoutubeFacade({ video }: { video: Extract<TopicVideo, { kind: 'youtube' }> }) {
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // The play button disappears: hand focus to the player so keyboard users keep their place.
  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="relative aspect-video bg-surface-2">
        {playing ? (
          <iframe
            ref={frameRef}
            src={youtubeEmbedUrl(video.youtubeId)}
            title={video.title}
            className="absolute inset-0 size-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Spill av videoen «${video.title}»`}
            className="group absolute inset-0 grid size-full place-items-center focus-visible:-outline-offset-4"
          >
            {thumbFailed ? null : (
              <img
                src={youtubeThumbnail(video.youtubeId)}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setThumbFailed(true)}
                className="absolute inset-0 size-full object-cover"
              />
            )}
            <span
              aria-hidden
              className="relative grid size-14 place-items-center rounded-full bg-primary text-primary-ink shadow-2 transition-[scale] duration-150 ease-out group-hover:scale-105 group-active:scale-[0.97]"
            >
              <Play className="ml-0.5 size-6 fill-current" />
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <p className="font-semibold text-ink">{video.title}</p>
        <p className="text-small text-ink-2">{video.description}</p>
        <p className="mt-1 text-caption text-ink-3">
          {video.publisher} på YouTube. Videoen lastes først når du trykker på den.
        </p>
      </div>
    </Card>
  );
}

function VideoPlaceholder({ description }: { description: string }) {
  return (
    <Card tone="sunken" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-semibold text-ink">
          <VideoOff aria-hidden className="size-5 text-ink-2" />
          Video kommer
        </span>
        <Badge>Plassholder</Badge>
      </div>
      <p className="text-small text-ink-2">
        Vi har ikke funnet en video fra en offentlig kilde om dette ennå, så her står en
        plassholder. {description}
      </p>
    </Card>
  );
}
