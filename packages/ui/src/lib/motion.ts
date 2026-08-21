'use client';

// This directive is a no-op under Vite/apps/admin's own build (Vite does
// not implement React Server Components and treats an unrecognized
// top-of-file string-literal expression as inert) — it only takes effect
// under Next.js's own RSC boundary analysis (apps/storefront), which is
// exactly where it's required: this module calls `useState`/`useEffect`
// directly, genuinely client-only hooks. Found and fixed live during Beta
// Milestone 1's own `next build` — @nexgen/ui's barrel export means any
// app importing even one unrelated named export forces Next to walk this
// module too, so every hook-using file in this package needs its own
// explicit, correct boundary rather than relying on omission being safe.
import { useEffect, useState } from 'react';

/**
 * DESIGN_SYSTEM.md §1.7 / §5: "Every animated component respects
 * `prefers-reduced-motion: reduce`... implemented once, in packages/ui's
 * own shared animation utility, not per component."
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent): void => setPrefersReduced(event.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReduced;
}
