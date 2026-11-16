import '@/styles/global.css';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from '@/app/router';
import { startThemeSync } from '@/app/theme';
import { Toaster } from '@/components/ui';
import { tween } from '@/lib/motion';

// index.html already set the theme before first paint; from here on it follows the store.
startThemeSync();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    {/* reducedMotion="user": with "reduce motion" on, transforms are skipped and fades stay. */}
    <MotionConfig reducedMotion="user" transition={tween.base}>
      <RouterProvider router={router} />
      <Toaster />
    </MotionConfig>
  </StrictMode>,
);
