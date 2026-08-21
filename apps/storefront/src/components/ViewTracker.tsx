'use client';

import { useEffect } from 'react';
import { recordRecentlyViewed } from '@nexgen/storefront-engine/client';

/**
 * Product Detail's own real "view" event — records this real product into
 * the real `localStorage`-backed Recently Viewed history
 * (`recentlyViewed.ts`) the moment the page actually mounts in the
 * browser. Renders nothing; exists solely because recording a client-only
 * side effect needs a Client Component, and the Product Detail page
 * itself stays a Server Component for everything else.
 *
 * Imports from the package's new `/client` entry point, not its main
 * barrel — see `client.ts`'s own docblock for the real `next build`
 * failure this avoids.
 */
export function ViewTracker({ id, name, href, imageSrc }: { id: string; name: string; href: string; imageSrc: string | null }) {
  useEffect(() => {
    recordRecentlyViewed({ id, name, href, imageSrc });
  }, [id, name, href, imageSrc]);

  return null;
}
