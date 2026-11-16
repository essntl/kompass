import { Router } from 'express';
import { geocode, planTrips } from '../lib/entur';
import { geocodeQuerySchema, parseInput, tripsSchema } from '../lib/validate';

export const enturRouter = Router();

/** GET /api/entur/geocode?q=&lat=&lon= – address and stop search (Entur Geocoder). */
enturRouter.get('/geocode', async (req, res) => {
  const query = parseInput(geocodeQuerySchema, req.query);
  res.json(await geocode(query));
});

/** POST /api/entur/trips – trip suggestions (Journey Planner v3). No trips → `patterns: []`. */
enturRouter.post('/trips', async (req, res) => {
  const body = parseInput(tripsSchema, req.body);
  res.json(await planTrips(body));
});
