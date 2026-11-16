import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/entur-trip.json';
import { mapMode, normalizeGeocode, normalizeTripPatterns, type EnturTripResponse } from './entur';

// Recorded from the live Journey Planner v3 API with TRIP_QUERY (2026-11-16), two patterns.
const response = fixture as EnturTripResponse;

describe('normalizeTripPatterns', () => {
  const patterns = normalizeTripPatterns(response, { from: 'Hjem', to: 'Kuben videregående skole' });

  it('maps every recorded pattern with expected times and duration', () => {
    expect(patterns).toHaveLength(2);
    expect(patterns[0]).toMatchObject({
      startTime: '2026-11-17T07:28:18+01:00',
      endTime: '2026-11-17T07:54:28+01:00',
      duration: 1570,
    });
    expect(patterns[0].legs.map((leg) => leg.mode)).toEqual(['foot', 'tram', 'foot', 'metro', 'foot']);
    expect(patterns[1].legs.map((leg) => leg.mode)).toEqual(['foot', 'tram', 'foot', 'bus', 'foot']);
  });

  it('gives each pattern a stable, unique id', () => {
    const again = normalizeTripPatterns(response);
    expect(patterns[0].id).toMatch(/^tp-[a-z0-9]+$/);
    expect(patterns[0].id).not.toBe(patterns[1].id);
    expect(again.map((pattern) => pattern.id)).toEqual(patterns.map((pattern) => pattern.id));
  });

  it('sums the walking distance from the foot legs only', () => {
    // 49.01 + 132.47 + 209.06 metres, each leg rounded.
    expect(patterns[0].walkDistance).toBe(49 + 132 + 209);
  });

  it('normalises a transit leg: line, colours, platforms, headsign and stops', () => {
    const metro = patterns[0].legs[3];
    expect(metro).toMatchObject({
      mode: 'metro',
      fromName: 'Storo',
      toName: 'Økern',
      fromPlatform: '2',
      toPlatform: '1',
      aimedStart: '2026-11-17T07:45:00+01:00',
      expectedStart: '2026-11-17T07:45:00+01:00',
      aimedEnd: '2026-11-17T07:51:00+01:00',
      expectedEnd: '2026-11-17T07:51:00+01:00',
      realtime: false,
      distance: 3190,
      duration: 360,
      headsign: 'Vestli',
      intermediateStops: 2,
    });
    expect(metro.line).toEqual({
      publicCode: '4',
      name: 'Vestli - Bergkrystallen',
      color: '#EC700C',
      textColor: '#FFFFFF',
    });
  });

  it('prefers the Norwegian situation text', () => {
    expect(patterns[0].legs[3].situations).toEqual([
      {
        summary: 'T-banen stenger 19.-22. november',
        description:
          'T-banen er stengt på nesten alle strekninger 19. - 22. november. Se ruter.no for mer informasjon.',
      },
    ]);
  });

  it('leaves walking legs without line, headsign, stop count or situations', () => {
    const walk = patterns[0].legs[0];
    expect(walk.mode).toBe('foot');
    expect(walk.fromName).toBe('Hjem');
    expect(walk.line).toBeUndefined();
    expect(walk.headsign).toBeUndefined();
    expect(walk.intermediateStops).toBeUndefined();
    expect(walk.fromPlatform).toBeUndefined();
    expect(walk.situations).toEqual([]);
  });

  it('returns an empty list when Entur finds no trips', () => {
    expect(normalizeTripPatterns({ data: { trip: { tripPatterns: [] } } })).toEqual([]);
    expect(normalizeTripPatterns({ data: null })).toEqual([]);
  });

  it('replaces the placeholder names Entur uses for unnamed locations', () => {
    const [pattern] = normalizeTripPatterns(
      {
        data: {
          trip: {
            tripPatterns: [
              {
                aimedStartTime: '2026-11-17T08:00:00+01:00',
                expectedStartTime: '2026-11-17T08:00:00+01:00',
                aimedEndTime: '2026-11-17T08:05:00+01:00',
                expectedEndTime: '2026-11-17T08:05:30+01:00',
                duration: null,
                legs: [
                  {
                    mode: 'foot',
                    aimedStartTime: '2026-11-17T08:00:00+01:00',
                    expectedStartTime: '2026-11-17T08:00:00+01:00',
                    aimedEndTime: '2026-11-17T08:05:00+01:00',
                    expectedEndTime: '2026-11-17T08:05:30+01:00',
                    realtime: false,
                    distance: 410.6,
                    duration: 330,
                    fromPlace: { name: 'Origin' },
                    toPlace: { name: 'Destination' },
                  },
                ],
              },
            ],
          },
        },
      },
      { from: 'Hjemme', to: 'Skolen' },
    );
    expect(pattern.legs[0]).toMatchObject({ fromName: 'Hjemme', toName: 'Skolen', distance: 411 });
    // No duration from Entur: computed from the expected times.
    expect(pattern.duration).toBe(330);
    expect(pattern.walkDistance).toBe(411);
  });
});

describe('mapMode', () => {
  it('maps Entur modes to our transport modes', () => {
    expect(mapMode('foot')).toBe('foot');
    expect(mapMode('bus')).toBe('bus');
    expect(mapMode('trolleybus')).toBe('bus');
    expect(mapMode('coach')).toBe('coach');
    expect(mapMode('tram')).toBe('tram');
    expect(mapMode('metro')).toBe('metro');
    expect(mapMode('rail')).toBe('rail');
    expect(mapMode('water')).toBe('water');
    expect(mapMode('bicycle')).toBe('bicycle');
  });

  it('falls back to "other" for modes without their own colour', () => {
    expect(mapMode('air')).toBe('other');
    expect(mapMode('taxi')).toBe('other');
    expect(mapMode('something-new')).toBe('other');
  });
});

describe('normalizeGeocode', () => {
  it('maps Pelias features to GeocodeFeature', () => {
    const features = normalizeGeocode({
      features: [
        {
          geometry: { coordinates: [10.816307, 59.927336] },
          properties: {
            id: '360201611',
            name: 'Kabelgata 10',
            label: 'Kabelgata 10, Oslo',
            locality: 'Oslo',
            county: 'Oslo',
            layer: 'address',
          },
        },
        { geometry: {}, properties: { id: 'broken', name: 'No coordinates' } },
      ],
    });
    expect(features).toEqual([
      {
        id: '360201611',
        name: 'Kabelgata 10',
        label: 'Kabelgata 10, Oslo',
        lat: 59.927336,
        lon: 10.816307,
        layer: 'address',
        locality: 'Oslo',
        county: 'Oslo',
      },
    ]);
  });
});
