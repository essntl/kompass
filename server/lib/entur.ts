/**
 * Entur proxy: geocoder autocomplete and Journey Planner v3.
 *
 * Every field and argument in TRIP_QUERY was checked against the live schema by
 * introspection (2026-11-16): `trip(from, to, dateTime, arriveBy, walkSpeed,
 * numTripPatterns)`, `TripPattern.{aimed,expected}{Start,End}Time/duration/legs`,
 * `Leg.mode/realtime/distance/duration/fromPlace/toPlace/line/fromEstimatedCall/
 * intermediateEstimatedCalls/situations`, `Place.name/quay.publicCode`,
 * `Line.publicCode/name/presentation.{colour,textColour}`,
 * `EstimatedCall.destinationDisplay.frontText`, `PtSituationElement.summary/description`
 * (lists of `{ value, language }`).
 */
import type { GeocodeFeature, GeocodeResponse, TripsRequest, TripsResponse } from '../../shared/api';
import type { TransportMode, TripLeg, TripPattern, TripSituation } from '../../shared/types';
import { getEnturClientName } from '../config';
import { TtlCache } from './cache';
import { HttpError, MESSAGES } from './errors';

const GEOCODER_URL = 'https://api.entur.io/geocoder/v1/autocomplete';
const JOURNEY_PLANNER_URL = 'https://api.entur.io/journey-planner/v3/graphql';
const REQUEST_TIMEOUT_MS = 10_000;

const GEOCODE_TTL_MS = 10 * 60_000;
const TRIPS_TTL_MS = 60_000;
const DEFAULT_TRIP_PATTERNS = 6;

export const TRIP_QUERY = /* GraphQL */ `
  query Trips(
    $from: Location!
    $to: Location!
    $dateTime: DateTime
    $arriveBy: Boolean
    $walkSpeed: Float
    $numTripPatterns: Int
  ) {
    trip(
      from: $from
      to: $to
      dateTime: $dateTime
      arriveBy: $arriveBy
      walkSpeed: $walkSpeed
      numTripPatterns: $numTripPatterns
    ) {
      tripPatterns {
        aimedStartTime
        expectedStartTime
        aimedEndTime
        expectedEndTime
        duration
        legs {
          mode
          aimedStartTime
          expectedStartTime
          aimedEndTime
          expectedEndTime
          realtime
          distance
          duration
          fromPlace { name quay { publicCode } }
          toPlace { name quay { publicCode } }
          line { publicCode name presentation { colour textColour } }
          fromEstimatedCall { destinationDisplay { frontText } }
          intermediateEstimatedCalls { quay { id } }
          situations {
            summary { value language }
            description { value language }
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------- raw Entur shapes

interface EnturText {
  value: string;
  language?: string | null;
}

interface EnturPlace {
  name?: string | null;
  quay?: { publicCode?: string | null } | null;
}

export interface EnturLeg {
  mode: string;
  aimedStartTime: string;
  expectedStartTime: string;
  aimedEndTime: string;
  expectedEndTime: string;
  realtime: boolean;
  distance: number;
  duration: number;
  fromPlace: EnturPlace;
  toPlace: EnturPlace;
  line?: {
    publicCode?: string | null;
    name?: string | null;
    presentation?: { colour?: string | null; textColour?: string | null } | null;
  } | null;
  fromEstimatedCall?: { destinationDisplay?: { frontText?: string | null } | null } | null;
  intermediateEstimatedCalls?: unknown[] | null;
  situations?: Array<{ summary?: EnturText[] | null; description?: EnturText[] | null }> | null;
}

export interface EnturTripPattern {
  aimedStartTime: string;
  expectedStartTime: string;
  aimedEndTime: string;
  expectedEndTime: string;
  duration?: number | null;
  legs: EnturLeg[];
}

export interface EnturTripResponse {
  data?: { trip?: { tripPatterns?: EnturTripPattern[] | null } | null } | null;
  errors?: Array<{ message?: string }> | null;
}

// ---------------------------------------------------------------- normalisation

const MODE_MAP: Record<string, TransportMode> = {
  foot: 'foot',
  bus: 'bus',
  trolleybus: 'bus',
  coach: 'coach',
  tram: 'tram',
  metro: 'metro',
  rail: 'rail',
  monorail: 'rail',
  water: 'water',
  bicycle: 'bicycle',
};

/** Maps an Entur `Mode` to ours. Anything we have no colour or icon for becomes 'other'. */
export function mapMode(mode: string): TransportMode {
  return MODE_MAP[mode] ?? 'other';
}

const HEX_COLOUR = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

function toHexColour(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const match = HEX_COLOUR.exec(value.trim());
  return match ? `#${match[1].toUpperCase()}` : undefined;
}

const NORWEGIAN = new Set(['no', 'nb', 'nob', 'nor', 'nn', 'nno']);

/** Picks the Norwegian text when there is one, otherwise the first non-empty text. */
function pickText(texts: EnturText[] | null | undefined): string | undefined {
  const filled = (texts ?? []).filter((text) => text?.value?.trim());
  const preferred = filled.find((text) => NORWEGIAN.has((text.language ?? '').toLowerCase())) ?? filled[0];
  return preferred?.value.trim();
}

function normalizeSituations(leg: EnturLeg): TripSituation[] {
  const seen = new Set<string>();
  const situations: TripSituation[] = [];
  for (const situation of leg.situations ?? []) {
    const summary = pickText(situation.summary);
    const description = pickText(situation.description);
    const headline = summary ?? description;
    if (!headline || seen.has(headline)) continue;
    seen.add(headline);
    situations.push(summary && description && description !== summary ? { summary, description } : { summary: headline });
  }
  return situations;
}

const nonEmpty = (value: string | null | undefined): string | undefined => value?.trim() || undefined;

function placeName(place: EnturPlace, fallback: string): string {
  const name = place.name?.trim();
  // Entur answers "Origin"/"Destination" when the request location has no name.
  return !name || name === 'Origin' || name === 'Destination' ? fallback : name;
}

function normalizeLeg(leg: EnturLeg, from: string, to: string): TripLeg {
  const mode = mapMode(leg.mode);
  const isTransit = mode !== 'foot' && mode !== 'bicycle';
  const publicCode = nonEmpty(leg.line?.publicCode);
  const lineName = nonEmpty(leg.line?.name);

  const normalized: TripLeg = {
    mode,
    fromName: placeName(leg.fromPlace, from),
    toName: placeName(leg.toPlace, to),
    aimedStart: leg.aimedStartTime,
    expectedStart: leg.expectedStartTime,
    aimedEnd: leg.aimedEndTime,
    expectedEnd: leg.expectedEndTime,
    realtime: Boolean(leg.realtime),
    distance: Math.round(leg.distance ?? 0),
    duration: Math.round(leg.duration ?? 0),
    situations: normalizeSituations(leg),
  };

  const fromPlatform = nonEmpty(leg.fromPlace.quay?.publicCode);
  const toPlatform = nonEmpty(leg.toPlace.quay?.publicCode);
  if (fromPlatform) normalized.fromPlatform = fromPlatform;
  if (toPlatform) normalized.toPlatform = toPlatform;

  if (leg.line && (publicCode || lineName)) {
    const colour = toHexColour(leg.line.presentation?.colour);
    const textColour = toHexColour(leg.line.presentation?.textColour);
    normalized.line = {
      publicCode: publicCode ?? lineName ?? '',
      ...(lineName ? { name: lineName } : {}),
      ...(colour ? { color: colour } : {}),
      ...(textColour ? { textColor: textColour } : {}),
    };
  }

  const headsign = nonEmpty(leg.fromEstimatedCall?.destinationDisplay?.frontText);
  if (headsign) normalized.headsign = headsign;
  if (isTransit) normalized.intermediateStops = leg.intermediateEstimatedCalls?.length ?? 0;

  return normalized;
}

/** Small stable hash (djb2) so the same trip keeps its id between refreshes. */
function hashId(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

function seconds(from: string, to: string): number {
  return Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));
}

/** Normalises a Journey Planner response into our `TripPattern[]`. */
export function normalizeTripPatterns(
  response: EnturTripResponse,
  names: { from: string; to: string } = { from: 'Start', to: 'Mål' },
): TripPattern[] {
  const patterns = response.data?.trip?.tripPatterns ?? [];
  return patterns
    .filter((pattern) => Array.isArray(pattern.legs) && pattern.legs.length > 0)
    .map((pattern) => {
      const legs = pattern.legs.map((leg) => normalizeLeg(leg, names.from, names.to));
      const signature = [
        pattern.aimedStartTime,
        pattern.aimedEndTime,
        ...legs.map((leg) => `${leg.mode}:${leg.line?.publicCode ?? ''}:${leg.fromName}`),
      ].join('|');
      return {
        id: `tp-${hashId(signature)}`,
        startTime: pattern.expectedStartTime,
        endTime: pattern.expectedEndTime,
        duration: Math.round(pattern.duration ?? seconds(pattern.expectedStartTime, pattern.expectedEndTime)),
        walkDistance: legs.filter((leg) => leg.mode === 'foot').reduce((sum, leg) => sum + leg.distance, 0),
        legs,
      };
    });
}

interface GeocoderResponse {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: {
      id?: string;
      name?: string;
      label?: string;
      locality?: string;
      county?: string;
      layer?: string;
    };
  }>;
}

export function normalizeGeocode(response: GeocoderResponse): GeocodeFeature[] {
  const features: GeocodeFeature[] = [];
  for (const feature of response.features ?? []) {
    const [lon, lat] = feature.geometry?.coordinates ?? [];
    const props = feature.properties;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !props?.id) continue;
    const name = props.name?.trim() || props.label?.trim() || '';
    if (!name) continue;
    features.push({
      id: props.id,
      name,
      label: props.label?.trim() || name,
      lat,
      lon,
      layer: props.layer ?? 'other',
      ...(props.locality ? { locality: props.locality } : {}),
      ...(props.county ? { county: props.county } : {}),
    });
  }
  return features;
}

// ---------------------------------------------------------------- upstream calls

async function enturFetch(url: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'ET-Client-Name': getEnturClientName(), Accept: 'application/json', ...init.headers },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new HttpError(502, 'UPSTREAM_ERROR', MESSAGES.enturUnavailable, { cause });
  }
  if (!response.ok) {
    throw new HttpError(502, 'UPSTREAM_ERROR', MESSAGES.enturUnavailable, {
      cause: new Error(`Entur answered ${response.status} for ${url}`),
    });
  }
  try {
    return await response.json();
  } catch (cause) {
    throw new HttpError(502, 'UPSTREAM_ERROR', MESSAGES.enturUnavailable, { cause });
  }
}

const geocodeCache = new TtlCache<GeocodeResponse>(GEOCODE_TTL_MS, 500);
const tripsCache = new TtlCache<TripsResponse>(TRIPS_TTL_MS, 200);

export async function geocode(query: { q: string; lat?: number; lon?: number }): Promise<GeocodeResponse> {
  const text = query.q.trim();
  if (text.length < 2) return { features: [] };

  const hasFocus = typeof query.lat === 'number' && typeof query.lon === 'number';
  // Rounded focus point: nearby callers share cache entries.
  const focus = hasFocus ? `${query.lat!.toFixed(2)},${query.lon!.toFixed(2)}` : '';
  const cacheKey = `${text.toLowerCase()}|${focus}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ text, size: '8', lang: 'no' });
  if (hasFocus) {
    params.set('focus.point.lat', String(query.lat));
    params.set('focus.point.lon', String(query.lon));
  }
  const raw = (await enturFetch(`${GEOCODER_URL}?${params}`)) as GeocoderResponse;
  const result: GeocodeResponse = { features: normalizeGeocode(raw) };
  geocodeCache.set(cacheKey, result);
  return result;
}

export async function planTrips(request: TripsRequest): Promise<TripsResponse> {
  const normalizedRequest = {
    from: request.from,
    to: request.to,
    dateTime: request.dateTime,
    arriveBy: request.arriveBy,
    walkSpeed: Math.min(3, Math.max(0.5, request.walkSpeed)),
    numTripPatterns: request.numTripPatterns ?? DEFAULT_TRIP_PATTERNS,
  };
  const cacheKey = JSON.stringify(normalizedRequest);
  const cached = tripsCache.get(cacheKey);
  if (cached) return cached;

  const toLocation = (place: TripsRequest['from']) => ({
    name: place.label,
    coordinates: { latitude: place.lat, longitude: place.lon },
  });
  const raw = (await enturFetch(JOURNEY_PLANNER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: TRIP_QUERY,
      variables: {
        from: toLocation(request.from),
        to: toLocation(request.to),
        dateTime: normalizedRequest.dateTime,
        arriveBy: normalizedRequest.arriveBy,
        walkSpeed: normalizedRequest.walkSpeed,
        numTripPatterns: normalizedRequest.numTripPatterns,
      },
    }),
  })) as EnturTripResponse;

  if (raw.errors?.length && !raw.data?.trip) {
    throw new HttpError(502, 'UPSTREAM_ERROR', MESSAGES.enturUnavailable, {
      cause: new Error(`Entur GraphQL error: ${raw.errors.map((error) => error.message).join('; ')}`),
    });
  }

  const result: TripsResponse = {
    patterns: normalizeTripPatterns(raw, { from: request.from.label, to: request.to.label }),
    fetchedAt: new Date().toISOString(),
  };
  tripsCache.set(cacheKey, result);
  return result;
}

/** Test hook. */
export function clearEnturCaches(): void {
  geocodeCache.clear();
  tripsCache.clear();
}
