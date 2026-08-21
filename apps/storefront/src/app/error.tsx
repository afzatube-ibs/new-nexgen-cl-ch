'use client';

import { useEffect } from 'react';
import { ErrorState } from '@nexgen/ui';

/**
 * App Router's own file convention — a route segment error boundary. Must
 * be a Client Component (Next.js requirement: it receives a live `reset`
 * function and renders interactively). Every Gateway call failure this app
 * makes surfaces here (or a nested route's own boundary) with a real retry
 * action, never a raw stack trace — the same `PRINCIPLES:EXPLICIT_FAILURE`
 * bar this platform's admin interface already holds itself to.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-16">
      <ErrorState title="Something went wrong" description="This page could not be loaded. Please try again." onRetry={reset} />
    </div>
  );
}
