'use client';

import { useState, type FormEvent } from 'react';
import { Button, Input, Text } from '@nexgen/ui';

/**
 * `STOREFRONT_COMPONENT_ENGINE.md` §2's `Newsletter` primitive — this
 * milestone's own explicit "Newsletter — UI-only" build item, read
 * literally: a real, accessible, working form UI with **no subscription
 * backend behind it** (no email-marketing integration exists on the
 * Gateway or Commerce backend today). Submitting shows an honest "not
 * available yet" message — never a fabricated "You're subscribed!"
 * success state, per this engagement's own anti-fabrication rule applied
 * to a form submission specifically, not just a data value.
 */
export interface NewsletterProps {
  heading?: string;
  description?: string;
}

export function Newsletter({ heading = 'Stay in the loop', description = 'Get updates on new arrivals and offers.' }: NewsletterProps) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-subtle px-6 py-10 text-center">
      <Text as="h2" variant="heading">
        {heading}
      </Text>
      <Text as="p" variant="body" className="max-w-md text-text-secondary">
        {description}
      </Text>

      {submitted ? (
        <Text as="p" variant="body-strong" role="status" className="mt-2 text-text-primary">
          Newsletter sign-ups aren&apos;t available yet — please check back soon.
        </Text>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <Input id="newsletter-email" type="email" required placeholder="you@example.com" className="flex-1" />
          <Button type="submit" variant="primary">
            Subscribe
          </Button>
        </form>
      )}
    </div>
  );
}
