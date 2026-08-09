import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// See packages/ui/vitest.setup.ts for the full rationale — this project's
// Vitest config deliberately does not set `test.globals: true`, so
// Testing Library's automatic per-test unmount never self-registers;
// explicit cleanup is required or a later test in the same file finds an
// earlier test's still-mounted elements.
afterEach(cleanup);

// jsdom has no `window.matchMedia` implementation — see
// packages/ui/vitest.setup.ts for the full rationale. Any component that
// (directly or via @nexgen/ui's ThemeProvider) checks a media query needs
// this stub or throws before its own test assertions run.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Test scripts run with `NODE_OPTIONS=--no-experimental-webstorage` — see
// packages/ui/vitest.setup.ts for why (Node 22+'s own native
// `globalThis.localStorage` getter otherwise shadows jsdom's real
// implementation, breaking every test that touches `localStorage`).
