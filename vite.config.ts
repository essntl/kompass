import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Read API_PORT from .env too, so the proxy always points at the port the backend uses.
const env = loadEnv('development', process.cwd(), 'API_');
const API_PORT = Number(process.env.API_PORT ?? env.API_PORT ?? 8787) || 8787;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // All backend calls (Anthropic proxy + Entur proxy) go through /api.
      '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts', 'shared/**/*.test.ts'],
  },
});
