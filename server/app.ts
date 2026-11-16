import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import { apiNotFound, errorMiddleware } from './lib/errors';
import { aiRouter } from './routes/ai';
import { enturRouter } from './routes/entur';
import { healthRouter } from './routes/health';

export interface AppOptions {
  /** Absolute path to the built client (`dist/`). When set, it is served with SPA fallback. */
  distDir?: string;
}

/** Base64 photos travel in JSON bodies, so the limit is well above Express's 100 kB default. */
const JSON_BODY_LIMIT = '8mb';

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use('/api/health', healthRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/entur', enturRouter);
  app.use('/api', apiNotFound);

  if (options.distDir) {
    const distDir = options.distDir;
    const indexHtml = path.join(distDir, 'index.html');
    app.use(express.static(distDir));
    // SPA fallback: any other GET that wants HTML gets index.html, and the client router takes over.
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html') || !existsSync(indexHtml)) {
        next();
        return;
      }
      res.sendFile(indexHtml);
    });
  }

  app.use(errorMiddleware);
  return app;
}
