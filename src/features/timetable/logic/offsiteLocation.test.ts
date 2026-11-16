import type { GeocodeFeature } from '@shared/api';
import { describe, expect, it } from 'vitest';
import {
  addressQuery,
  confidentMatch,
  distinctAddressLocations,
  offsiteSummary,
} from './offsiteLocation';

function feature(patch: Partial<GeocodeFeature>): GeocodeFeature {
  return {
    id: 'f1',
    name: 'Dronning Margretes vei 15',
    label: 'Dronning Margretes vei 15, Oslo',
    locality: 'Oslo',
    layer: 'address',
    lat: 59.919,
    lon: 10.806,
    ...patch,
  };
}

describe('addressQuery', () => {
  it('treats rooms as rooms', () => {
    for (const room of ['B214', 'Verksted 2', 'Naturfagrom C108', 'Gymsal', 'Rom 101, Bygg A', undefined, '']) {
      expect(addressQuery(room)).toBeNull();
    }
  });

  it('finds a street address with a street-type word', () => {
    expect(addressQuery('Dronning Margretes vei 15, Oslo')).toEqual({
      query: 'Dronning Margretes vei 15, Oslo',
      street: 'Dronning Margretes vei 15',
      town: 'Oslo',
    });
    expect(addressQuery('Kabelgata 10')).toEqual({ query: 'Kabelgata 10', street: 'Kabelgata 10' });
    expect(addressQuery('Kirkeveien 12B')?.street).toBe('Kirkeveien 12B');
  });

  it('accepts a house number plus a town, and drops a name and postcode', () => {
    expect(addressQuery('Tellverk Mekaniske, Langkaia 1, 0150 Oslo')).toEqual({
      query: 'Langkaia 1, 0150 Oslo',
      street: 'Langkaia 1',
      town: 'Oslo',
    });
  });
});

describe('confidentMatch', () => {
  const location = 'Tellverk Mekaniske, Dronning Margretes vei 15, Oslo';
  const address = addressQuery(location)!;

  it('takes an address hit with the same street and number', () => {
    expect(confidentMatch(location, address, [feature({ layer: 'venue' }), feature({})])).toEqual({
      label: location,
      lat: 59.919,
      lon: 10.806,
    });
  });

  it('rejects other numbers, other towns and non-address layers', () => {
    expect(confidentMatch(location, address, [feature({ name: 'Dronning Margretes vei 17' })])).toBeNull();
    expect(confidentMatch(location, address, [feature({ locality: 'Bergen' })])).toBeNull();
    expect(confidentMatch(location, address, [feature({ layer: 'street' })])).toBeNull();
    expect(confidentMatch(location, address, [])).toBeNull();
  });
});

describe('distinctAddressLocations', () => {
  it('keeps each address once and skips rooms', () => {
    expect(
      distinctAddressLocations(['B214', 'Kabelgata 10', undefined, 'Kabelgata 10', 'Verksted 1']),
    ).toEqual(['Kabelgata 10']);
  });
});

describe('offsiteSummary', () => {
  it('counts places in Norwegian', () => {
    expect(offsiteSummary(['Dronning Margretes vei 15, Oslo'])).toBe(
      '1 sted utenfor skolen: Dronning Margretes vei 15, Oslo',
    );
    expect(offsiteSummary(['A', 'B'])).toBe('2 steder utenfor skolen: A · B');
  });
});
