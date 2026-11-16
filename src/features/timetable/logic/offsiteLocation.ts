import type { GeocodeFeature } from '@shared/api';
import type { Place } from '@shared/types';

/**
 * Imported timetables put the room in LOCATION ("B214", "Verksted 2"), but lessons away
 * from school (work placement, excursions) carry a street address instead. These pure
 * helpers tell the two apart and judge whether a geocoder hit really is that address.
 */

/** Street-type endings, also as part of a compound word ("Kabelgata", "Kirkeveien"). */
const STREET_WORD =
  /(?:vei|veien|veg|vegen|gate|gata|gaten|gt\.?|allé|alle|alléen|alleen|plass|plassen|torg|torget|bakken|kaia|brygge|brygga|ringen|svingen|stien|tunet)$/i;
/** "15", "15B", "15 B". */
const HOUSE_NUMBER = /^\d{1,4}\s?[A-Za-z]?$/;
/** Words that name a place inside a building, not a street. */
const ROOM_WORD =
  /\b(?:rom|klasserom|verksted|sal|gymsal|bygg|etasje|auditorium|lab|aula|kantine|fløy|grupperom)\b/i;
/** A town segment: optional postcode, then letters only ("Oslo", "0682 Oslo"). */
const TOWN = /^(?:\d{4}\s+)?[\p{L}][\p{L} .'-]*$/u;

const segmentsOf = (text: string) =>
  text
    .split(',')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

/** "Dronning Margretes vei 15" → street words + house number, or null. */
function splitStreet(segment: string): { street: string; number: string } | null {
  const match = /^(.*?[\p{L}.])\s+(\d{1,4}\s?[A-Za-z]?)$/u.exec(segment);
  if (!match || !match[1] || !match[2] || !HOUSE_NUMBER.test(match[2])) return null;
  return { street: match[1], number: match[2] };
}

function looksLikeStreet(segment: string, next: string | undefined): boolean {
  const parts = splitStreet(segment);
  if (!parts || ROOM_WORD.test(parts.street)) return false;
  const lastWord = parts.street.split(' ').at(-1) ?? '';
  if (STREET_WORD.test(lastWord)) return true;
  // "Storgaten" is caught above; anything else needs a town after it ("Langkaia 1, Oslo").
  return !!next && TOWN.test(next) && !ROOM_WORD.test(next);
}

export interface AddressQuery {
  /** What to send to the geocoder: from the street to the end ("Dronning Margretes vei 15, Oslo"). */
  query: string;
  /** "Dronning Margretes vei 15". */
  street: string;
  /** "Oslo", without postcode, when the location names a town. */
  town?: string;
}

/**
 * A LOCATION value that looks like a street address rather than a room, or null.
 * "Tellverk Mekaniske, Dronning Margretes vei 15, Oslo" → query "Dronning Margretes vei 15, Oslo".
 * "B214", "Verksted 2", "Naturfagrom C108" → null.
 */
export function addressQuery(location: string | undefined): AddressQuery | null {
  if (!location) return null;
  const segments = segmentsOf(location);
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i] ?? '';
    const next = segments[i + 1];
    if (!looksLikeStreet(segment, next)) continue;
    const town = next && TOWN.test(next) ? next.replace(/^\d{4}\s+/, '') : undefined;
    return {
      query: segments.slice(i).join(', '),
      street: segment,
      ...(town ? { town } : {}),
    };
  }
  return null;
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/(\d)\s+([a-z])\b/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The geocoder hit that is that exact address, as a `Place` labelled with the original
 * LOCATION text, or null when no hit is confident enough (then the lesson stays at school).
 */
export function confidentMatch(
  location: string,
  address: AddressQuery,
  features: GeocodeFeature[],
): Place | null {
  const street = normalise(address.street);
  const town = address.town ? normalise(address.town) : undefined;
  const hit = features.find(
    (feature) =>
      feature.layer === 'address' &&
      normalise(feature.name) === street &&
      (!town || !feature.locality || normalise(feature.locality) === town),
  );
  if (!hit) return null;
  return { label: segmentsOf(location).join(', '), lat: hit.lat, lon: hit.lon };
}

/** The distinct LOCATION values among `rooms` that look like addresses, in order. */
export function distinctAddressLocations(rooms: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const room of rooms) {
    if (!room || seen.has(room)) continue;
    seen.add(room);
    if (addressQuery(room)) out.push(room);
  }
  return out;
}

/** "1 sted utenfor skolen: Dronning Margretes vei 15, Oslo". */
export function offsiteSummary(labels: string[]): string {
  const count = labels.length;
  return `${count} ${count === 1 ? 'sted' : 'steder'} utenfor skolen: ${labels.join(' · ')}`;
}
