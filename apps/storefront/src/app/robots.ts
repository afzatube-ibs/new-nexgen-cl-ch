import type { MetadataRoute } from 'next';

/** `STORE_FRONTEND_ARCHITECTURE.md` §5 — disallows the routes with no reason to be crawled. `/cart`, `/checkout`, and `/orders/lookup` shipped real in Beta Sprint 3 (Cart/Checkout/Order Success Engine); `/account/*` still doesn't exist (Category B, later) — all were pre-declared here from the start so each became correct automatically the moment it shipped, rather than an easy-to-forget follow-up edit. */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cart', '/checkout', '/account', '/orders', '/api'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
