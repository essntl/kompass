/**
 * Videos for each topic in the info corner.
 *
 * Every YouTube id below was checked on 2026-11-16 with the oEmbed endpoint
 * (https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json → 200).
 * `title` and `channel` are what oEmbed returned. All come from the official utdanning.no
 * channel (@utdanningno, the same channel utdanning.no embeds on its own pages).
 *
 * Rules when editing:
 * - Only add a video after the oEmbed check, from an official channel (Utdanningsdirektoratet,
 *   utdanning.no, vilbli.no, Nav, Lånekassen, a county council).
 * - A topic without a verified video gets a placeholder entry, which the UI shows as
 *   "Video kommer". Never guess an id.
 */
import type { InfoTopicId } from '@shared/types';

export interface VerifiedVideo {
  kind: 'youtube';
  /** YouTube video id, verified with oEmbed. */
  youtubeId: string;
  /** Title as returned by oEmbed. */
  title: string;
  /** `author_name` as returned by oEmbed. */
  channel: string;
  /** Publisher as shown to the student. */
  publisher: string;
  /** One line on what the student gets out of it (our own words). */
  description: string;
}

export interface PlaceholderVideo {
  kind: 'placeholder';
  /** What the video should cover once one is found. */
  description: string;
}

export type TopicVideo = VerifiedVideo | PlaceholderVideo;

const UTDANNING_NO = { channel: 'utdanningno', publisher: 'Utdanning.no' } as const;

export const TOPIC_VIDEOS: Record<InfoTopicId, TopicVideo[]> = {
  laerling: [
    {
      kind: 'youtube',
      youtubeId: 'c6vWyWCa5KQ',
      title: 'Hvordan er det å være i lære?',
      ...UTDANNING_NO,
      description: 'Om hvordan det er å være lærling i en bedrift.',
    },
    {
      kind: 'youtube',
      youtubeId: 'ikoQe0H5-Gw',
      title: 'Dette forventer læreplassen av deg',
      ...UTDANNING_NO,
      description: 'Hva bedriften venter av deg når du begynner som lærling.',
    },
  ],
  soke: [
    {
      kind: 'youtube',
      youtubeId: 'XNlDWmRoFtQ',
      title: 'Slik får du læreplass',
      ...UTDANNING_NO,
      description: 'Tips til hvordan du går fram for å få læreplass.',
    },
    {
      kind: 'youtube',
      youtubeId: 'CrVOhEMhWAQ',
      title: 'Slik bruker du Finn lærebedrift',
      ...UTDANNING_NO,
      description: 'Viser hvordan du finner godkjente lærebedrifter der du bor.',
    },
  ],
  opplaeringskontor: [
    {
      kind: 'placeholder',
      description: 'Her skal det komme en kort video om hva et opplæringskontor gjør for lærlinger.',
    },
  ],
  fagbrev: [
    {
      kind: 'youtube',
      youtubeId: 'JobJ40miaa0',
      title: 'Veien til fagbrev',
      ...UTDANNING_NO,
      description: 'Hvordan du går fra skole og læretid til ferdig fagbrev.',
    },
  ],
  veier: [
    {
      kind: 'youtube',
      youtubeId: 'uw_IUv7Mybg',
      title: 'Hva gjør du hvis du ikke finner lærebedrift?',
      ...UTDANNING_NO,
      description: 'Hvilke muligheter du har hvis du ikke får læreplass.',
    },
    {
      kind: 'youtube',
      youtubeId: 'QyaDcBX7tpE',
      title: 'Hva er fagskole?',
      ...UTDANNING_NO,
      description: 'En kort forklaring av fagskole, en vei videre etter fagbrev.',
    },
  ],
  rettigheter: [
    {
      kind: 'youtube',
      youtubeId: 'yNkZNUeP0GM',
      title: 'Hva gjør du dersom du ikke trives i læretiden?',
      ...UTDANNING_NO,
      description: 'Om hva du kan gjøre hvis læretiden ikke fungerer for deg.',
    },
  ],
  fravaer: [
    {
      kind: 'placeholder',
      description: 'Her skal det komme en kort video om fraværsgrensen og hvilket fravær som ikke teller med.',
    },
  ],
  okonomi: [
    {
      kind: 'placeholder',
      description: 'Her skal det komme en kort video om lærlinglønn og stipend fra Lånekassen.',
    },
  ],
};

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Privacy-enhanced embed; only loaded after the student presses play. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}
