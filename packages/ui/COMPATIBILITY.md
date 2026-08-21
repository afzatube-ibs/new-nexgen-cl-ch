# `@nexgen/ui` — Cross-Bundler Compatibility Contract

Written per `STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md` §2.1's own recommendation, during Beta Milestone 2. `apps/admin` (Vite) was this package's only consumer until Beta Milestone 1 added `apps/storefront` (Next.js/webpack) as a second one — three real, live-verified build failures surfaced from that transition, all traced to the same root cause. This document exists so the *next* new consumer of this package doesn't have to rediscover the same class of bug from scratch.

## The root cause

This package ships **raw TypeScript/TSX source, no build step of its own** (`main`/`types` in `package.json` point directly at `src/index.ts`). Vite and `tsc` both handle this transparently. A bundler that does anything more structural with module resolution or React Server Components — Next.js's webpack (and, unverified so far, Turbopack) — does not, in two specific, independent ways:

### 1. `.js`-specifier-to-`.ts`-file resolution

Every internal import in this package (and in `@nexgen/storefront-engine`) is written the standard TypeScript ESM/NodeNext way — `import { cn } from '../../lib/cn.js'` for a file that is actually `cn.ts`. `tsc` (with `moduleResolution: "Bundler"`) and Vite both resolve this correctly and invisibly. Webpack does not remap `.js` specifiers to `.ts` files on its own.

**If your new consumer uses webpack** (directly, or via a framework that does — Next.js, for example): add `resolve.extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }` to your own webpack config. See `apps/storefront/next.config.mjs` for the exact, working reference implementation — this is scoped to the *consumer's* build config, never a change to this package's own import specifiers.

### 2. React Server Component boundaries and the barrel-export

`src/index.ts` re-exports the entire component library from one file. Under Vite (no RSC concept at all), this is transparent — tree-shaking handles unused exports invisibly. Under Next.js App Router, importing even one named export from this barrel forces the framework's own Server/Client Component boundary analysis to walk the **entire** imported module graph, not just the specific export used — including every file that uses a genuinely client-only hook (`useState`, `useEffect`, `useContext`, `useSyncExternalStore`, ...) with no `"use client"` directive of its own.

**Every file in this package that uses a client-only hook must have its own `"use client"` directive at the top**, even though it is a harmless no-op under Vite (an unrecognized top-of-file string-literal expression). As of Beta Milestone 1, that is exactly three files: `src/theme/ThemeProvider.tsx`, `src/lib/motion.ts`, `src/components/Toast/useToast.ts`. **If you add a new hook-using file to this package, add the directive to it too** — this is not automatically enforced (see "Known gap" below).

### 3. React version

This package's own peer dependency is pinned to `react: ^18.3.0`, matching `apps/admin`. **Every new consumer of this package must also stay on React 18** until this package itself is upgraded — this is a real, monorepo-wide constraint, not a per-package choice a new app can make independently. See the root `package.json`'s own description for the same note stated at the workspace level.

## Known gap — not yet enforced automatically

Nothing in this package's own lint or build config currently *catches* a new hook-using file missing its `"use client"` directive before a consuming app's own build fails on it — that failure mode is what originally surfaced all three of the files named above, one `next build` at a time. A `grep -rl "useState\|useEffect\|useContext\|useSyncExternalStore\|useReducer\|useLayoutEffect" src` audit before adding a Next.js-consuming feature is the current, manual mitigation; a real ESLint rule enforcing this automatically is real, valuable, not-yet-built future work.

## Recommended long-term fix (not done, named for a future phase)

The barrel-export pattern itself (§2 above) is the deeper problem, not just this milestone's workaround for it. Vercel's own guidance for a shared component library consumed by an App Router app is granular, per-component subpath exports (`@nexgen/ui/button`, not `@nexgen/ui`) — so a consumer's bundler only ever analyzes the one component actually imported, rather than the whole library. This is a real, non-trivial refactor (`package.json` `exports` map changes, every consuming import site updated) — correctly out of scope for the milestone that discovered the need for it, named here so it isn't lost.
