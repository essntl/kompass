import type { Place } from '@shared/types';

/**
 * Demo places. Coordinates come from the Entur geocoder (looked up 2026-11-16),
 * so the route planner returns real trips on first launch.
 */
export const SEED_SCHOOL_NAME = 'Kuben videregående skole';

export const SEED_SCHOOL: Place = {
  label: 'Kabelgata 10, Oslo',
  lat: 59.927336,
  lon: 10.816307,
};

export const SEED_HOME: Place = {
  label: 'Vogts gate 40, Oslo',
  lat: 59.93343,
  lon: 10.763308,
};

/** Work placement used for the one class per week that is not at the school. */
export const SEED_PLACEMENT: Place = {
  label: 'Dronning Margretes vei 15, Oslo',
  lat: 59.919091,
  lon: 10.805987,
};
