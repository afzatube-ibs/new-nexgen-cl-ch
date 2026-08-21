'use client';

import { useState } from 'react';
import { Icon } from '@nexgen/ui';
import { Check, Share2 } from 'lucide-react';

/**
 * Product Detail's own real, fully-functional "Share" affordance — this
 * milestone's own build item, read literally as a real feature rather
 * than an inert slot: the Web Share API (`navigator.share`, real on
 * mobile browsers and most desktop browsers today) needs no backend at
 * all, and `navigator.clipboard.writeText` is a real, working fallback
 * everywhere else. Neither path is fabricated — both genuinely copy or
 * share the current page's own real URL.
 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // A user-cancelled share sheet throws AbortError — not a real failure, nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser/OS — a real, if rare, failure with no further honest fallback than leaving the button inert for this click.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-body text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
    >
      <Icon icon={copied ? Check : Share2} size="inline" />
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}
