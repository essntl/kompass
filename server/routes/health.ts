import { Router } from 'express';
import type { HealthResponse } from '../../shared/api';
import { getAiMode, getModel } from '../config';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const body: HealthResponse = { ok: true, ai: getAiMode(), model: getModel() };
  res.json(body);
});
