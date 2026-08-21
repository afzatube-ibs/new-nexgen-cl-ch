import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // `server-only` is a poison pill that always throws when required
    // outside Next.js's own bundler (see test/mocks/server-only.js's own
    // docblock) — aliased to a no-op here so gateway/client.ts (which
    // legitimately imports it for real production protection) is testable
    // under plain Node/Vitest.
    alias: {
      'server-only': fileURLToPath(new URL('./test/mocks/server-only.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // `.tsx` added for `AddToCartButton.test.tsx` — a real React
    // Testing Library component test, opted into `jsdom` per-file via
    // its own `// @vitest-environment jsdom` directive (this config's
    // own default stays `node`, correct for every other test here).
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
