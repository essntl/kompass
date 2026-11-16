/**
 * Kompass API server: Anthropic proxy (with a mock mode), Entur proxy and, with
 * `--serve-dist`, the built client.
 *
 *   npx tsx server/index.ts               API only (Vite proxies /api to it in dev)
 *   npx tsx server/index.ts --serve-dist  API + dist/ with SPA fallback (npm start)
 */
import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { getAiMode, getEnturClientName, getModel, getPort } from './config';

const serveDist = process.argv.includes('--serve-dist');
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');

const app = createApp({ distDir: serveDist ? distDir : undefined });
const port = getPort();

const server = app.listen(port, () => {
  const ai =
    getAiMode() === 'live'
      ? `live (model ${getModel()})`
      : 'mock (ANTHROPIC_API_KEY is not set – AI routes answer with built-in demo data)';
  console.log(`[api] Kompass API listening on http://localhost:${port}`);
  console.log(`[api] AI mode: ${ai}`);
  console.log(`[api] Entur client name: ${getEnturClientName()}`);
  if (serveDist) {
    console.log(
      existsSync(path.join(distDir, 'index.html'))
        ? `[api] Serving the built app from ${distDir}`
        : `[api] --serve-dist was given, but ${distDir} has no index.html. Run "npm run build" first.`,
    );
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[api] Port ${port} is already in use. Stop the other process or set API_PORT in .env.`);
  } else {
    console.error('[api] Could not start the server:', err);
  }
  process.exit(1);
});
