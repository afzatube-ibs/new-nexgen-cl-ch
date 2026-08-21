// A no-op stand-in for the real `server-only` package, aliased in only for
// the Vitest test run (vitest.config.ts). The real package is a poison
// pill that always throws when `require()`'d directly — its actual
// protection is enforced by Next.js's own bundler (which aliases it to a
// no-op for server bundles and leaves it throwing for client bundles),
// not by a runtime check Vitest (a plain Node process, not the Next.js
// bundler) can honor. This is the standard, documented pattern for
// testing `server-only`-guarded modules outside Next.js itself.
export {};
