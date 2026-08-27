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
    // Beta Sprint 5 — `checkout/checkoutClient.ts` reads this at MODULE
    // load time (same `const GATEWAY_URL = process.env...` pattern
    // `analytics/trackEvent.ts` already established), so a per-test
    // `vi.stubEnv` is too late — it runs after the static import has
    // already evaluated. Set once, here, for every test file, to the
    // same value `.env.example` documents for local dev — real, not a
    // fabricated test-only URL. `checkoutClient.test.ts`'s own
    // "not configured" case uses `vi.resetModules()` + a dynamic import
    // to exercise the unset-env branch despite this default.
    env: {
      NEXT_PUBLIC_STORE_API_GATEWAY_URL: 'http://localhost:4000',
    },
  },
});
