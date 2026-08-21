/**
 * `PERFORMANCE_FOUNDATION.md` §7: `next/image`'s own remote-image support
 * is configured to allow whatever origin Media assets are actually served
 * from — a configuration value, never hardcoded to one provider. Today
 * that's the local backend dev server; a production deploy points this at
 * whatever R2/S3-compatible origin `apps/backend`'s own filesystem disk is
 * actually configured for, with zero frontend code change (that document's
 * own stated guarantee).
 */
const backendMediaOrigin = new URL(process.env.NEXT_PUBLIC_MEDIA_ORIGIN ?? 'http://localhost:8080');

/**
 * `next/image`'s `remotePatterns` matches by exact hostname string — a
 * real, live-found gap (Beta Milestone 1's own browser verification: a
 * real product's real image 500'd with "hostname not configured" because
 * `.env` was set to `127.0.0.1` while the backend's own Media URL
 * generator emits the literal hostname `localhost`). Rather than relying
 * on every developer's `.env` to happen to match exactly, both common
 * loopback hostnames are allowed whenever the configured origin is a
 * loopback address — a real resilience fix, not just a one-off `.env`
 * correction, since this exact "127.0.0.1 vs localhost" mismatch is a
 * generic local-dev footgun, not specific to this one environment.
 */
const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1'];
const mediaHostnames = LOOPBACK_HOSTNAMES.includes(backendMediaOrigin.hostname) ? LOOPBACK_HOSTNAMES : [backendMediaOrigin.hostname];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @nexgen/storefront-engine, @nexgen/ui, @nexgen/tokens ship their own
  // TypeScript source directly (no build step of their own, per ADR-0009's
  // "packages/* are consumed as source" convention already established for
  // apps/admin's Vite build) — Next.js must transpile them itself rather
  // than treating them as pre-compiled node_modules.
  transpilePackages: ['@nexgen/storefront-engine', '@nexgen/ui', '@nexgen/tokens'],
  images: {
    remotePatterns: mediaHostnames.map((hostname) => ({
      protocol: backendMediaOrigin.protocol.replace(':', ''),
      hostname,
      port: backendMediaOrigin.port || undefined,
      pathname: '/storage/**',
    })),
  },
  // @nexgen/ui and @nexgen/storefront-engine write import specifiers as
  // `./lib/cn.js` for a source file that's actually `cn.ts` — the standard
  // TypeScript ESM/NodeNext convention (`moduleResolution: "Bundler"`),
  // already correctly resolved by tsc and by Vite (apps/admin's own
  // bundler). Webpack (Next.js's default bundler) does not remap `.js`
  // specifiers to `.ts` files on its own; `extensionAlias` is webpack 5's
  // own documented mechanism for exactly this — a config change scoped to
  // this app's own build, not a rewrite of every shared package's own
  // import specifiers. `config` is typed minimally via JSDoc (matching
  // only the field this file actually touches) rather than left as Next's
  // own `any` — this repo's shared ESLint config
  // (`@typescript-eslint/no-unsafe-*`) correctly flags unsafe `any` member
  // access/return, and real type annotation syntax isn't valid in a plain
  // `.mjs` file (this config is executed directly by Node, not compiled).
  /** @param {{ resolve: { extensionAlias?: Record<string, string[]> } }} config */
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
