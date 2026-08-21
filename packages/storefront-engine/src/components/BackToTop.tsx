'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@nexgen/ui';
import { ArrowUp } from 'lucide-react';

/**
 * Store Components library — a real, working "Back to top" affordance:
 * appears after real scroll distance, scrolls smoothly (respecting
 * `prefers-reduced-motion` via the global override in `globals.css`),
 * and is keyboard-focusable. No data dependency at all — genuinely
 * complete, unlike most of this milestone's other new components.
 */
export function BackToTop({ threshold = 480 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > threshold);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-primary shadow-elevation-3 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 lg:bottom-6"
    >
      <Icon icon={ArrowUp} size="standalone" />
    </button>
  );
}
