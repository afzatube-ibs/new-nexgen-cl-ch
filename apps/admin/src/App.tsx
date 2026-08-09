import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '@nexgen/ui';
import { ErrorBoundary } from './lib/ErrorBoundary.js';
import { queryClient } from './lib/queryClient.js';
import { AuthProvider } from './auth/AuthProvider.js';
import { createAppRouter } from './router.js';

export function App() {
  // Built once per app lifetime — module registration (src/modules/index.ts)
  // is a one-time, synchronous side effect at import time, not per-render.
  const router = useMemo(() => createAppRouter(), []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
