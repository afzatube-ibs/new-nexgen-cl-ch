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
