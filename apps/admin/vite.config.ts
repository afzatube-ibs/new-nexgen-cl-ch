import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ADR-0005: Vite — pure client-side SPA, no SSR requirement.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    sourcemap: true,
    // docs/frontend/PERFORMANCE_FOUNDATION.md: route-level code splitting —
    // each module's own route tree is its own chunk via React.lazy/dynamic
    // import (see src/router.tsx); Vite's default per-dynamic-import
    // chunking already satisfies that half. This handles the other half —
    // vendor dependencies, which every route's chunk would otherwise each
    // duplicate: split by real reason-to-change, not one 500+KB catch-all
    // (found live via this build's own bundle-analysis pass), so a bump to
    // one library invalidates only its own chunk's browser cache, and
    // `charts` — genuinely large (Recharts) but not needed until a future
    // module actually renders a Chart — loads only then, never in the
    // initial bundle.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-data': ['@tanstack/react-query', 'zustand'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-radix': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
});
