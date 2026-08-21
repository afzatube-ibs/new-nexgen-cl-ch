/**
 * Media / image URL generation — STORE_API_GATEWAY_ARCHITECTURE.md's own
 * "Media: Image URL generation, Responsive image URLs, CDN abstraction,
 * Future optimization hooks" requirement, and the concrete implementation
 * of PERFORMANCE_FOUNDATION.md §2/§7's already-Accepted image strategy at
 * the Gateway layer.
 *
 * The real Media module (confirmed: `MediaAsset::url()`, already embedded
 * directly into ProductImageResource/BrandResource's own `url`/`logoUrl`
 * fields) is the single source of truth for where an asset physically
 * lives — this module never invents a second asset path. Its job is only
 * to shape what the Gateway hands the Storefront: a base URL plus a
 * `next/image`-ready responsive descriptor set, per
 * STORE_FRONTEND_ARCHITECTURE.md §8's "asset pipeline" note.
 */

/** The widths a Theme Package's default primitives (STOREFRONT_COMPONENT_ENGINE.md §3) are expected to request. */
const RESPONSIVE_WIDTHS = [320, 640, 768, 1024, 1280, 1920] as const;

export interface ResponsiveImage {
  /** The Media module's own, unmodified URL — always safe to use as-is. */
  src: string;
  /** width→URL pairs for a `srcset`; today these all resolve to `src` itself since no separate resizing service exists yet (see CDN abstraction note below) — the shape is real, the optimization is a named future hook. */
  srcSet: Array<{ width: number; url: string }>;
  alt: string;
}

/**
 * CDN abstraction: today, a pass-through (the Media module's own URL is
 * already served from whatever origin PERFORMANCE_FOUNDATION.md §7 already
 * confirmed is R2/S3-compatible-ready). This function is the one seam a
 * future CDN/image-resizing-proxy integration touches — every call site in
 * this Gateway goes through it rather than reading `media.url()` directly,
 * so that future change is additive here, never a call-site-by-call-site
 * migration.
 */
function toCdnUrl(rawUrl: string, _width?: number): string {
  // Future optimization hook: once a resizing proxy/CDN exists, this is
  // where `?w=${width}` (or an equivalent query/path convention) would be
  // appended. Deliberately not built yet — no such service exists to call.
  return rawUrl;
}

export function buildResponsiveImage(rawUrl: string, alt: string): ResponsiveImage {
  return {
    src: toCdnUrl(rawUrl),
    srcSet: RESPONSIVE_WIDTHS.map((width) => ({ width, url: toCdnUrl(rawUrl, width) })),
    alt,
  };
}

export function buildResponsiveImageOrNull(rawUrl: string | null | undefined, alt: string | null | undefined): ResponsiveImage | null {
  if (!rawUrl) return null;
  return buildResponsiveImage(rawUrl, alt ?? '');
}
