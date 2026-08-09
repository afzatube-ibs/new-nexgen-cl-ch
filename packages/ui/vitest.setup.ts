import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Explicit unmount + DOM cleanup after every test — without this, a second
// test in the same file finds the previous test's still-mounted elements
// too ("Found multiple elements with role X"), since this project's Vitest
// config deliberately does not set `test.globals: true` (every test file
// imports `describe`/`it`/`expect` explicitly, per this platform's own
// "no implicit globals" preference) and Testing Library's own automatic
// cleanup only self-registers when it detects a global test framework.
afterEach(cleanup);

// jsdom does not implement `window.matchMedia` — every real browser does,
// but jsdom deliberately leaves media-query evaluation unimplemented
// (there is no layout engine backing it). ThemeProvider (system-preference
// detection) and `usePrefersReducedMotion` both call it unconditionally, so
// without this stub every test that mounts either one throws
// `TypeError: window.matchMedia is not a function` before ever reaching
// its own assertions. `matches: false` is a safe, deterministic default —
// any test that needs to exercise the "OS prefers dark" path overrides
// this mock locally.
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

// The test scripts run with `NODE_OPTIONS=--no-experimental-webstorage`
// (see package.json) for the same underlying reason this file exists to
// document: Node 22+'s own native, unconfigured `globalThis.localStorage`
// getter (a real, reproducible collision — confirmed via `node -e
// "typeof localStorage"` printing a warning and `undefined` even without
// jsdom involved) otherwise shadows jsdom's real `window.localStorage`
// implementation in a way a same-process reassignment cannot reliably
// undo, breaking every test that touches `localStorage` (ThemeProvider,
// the auth token store) with "Cannot read properties of undefined".
