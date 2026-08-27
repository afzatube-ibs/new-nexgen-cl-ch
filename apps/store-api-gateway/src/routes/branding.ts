/**
 * Beta Experience Pack 1 — the real Store Branding a customer's own
 * Storefront reads (`APPEARANCE_WORKSPACE_SPECIFICATION.md` §4, Pack 1).
 * Two real backend calls, composed: `GET stores` (Phase 1's own real
 * single-store scope — the same call `WorkspaceSwitcher.tsx` already
 * makes, Admin-side) to resolve the store id, then `GET stores/{id}/
 * appearance` for that store's own real `published` view — never the
 * draft fields, which may hold an in-progress, unreviewed merchant edit
 * (`StoreAppearanceResource`'s own `published` key, apps/backend). If the
 * store has never published anything (`published: null`), this route
 * returns a real, honest set of platform defaults — never a fabricated
 * "customized" look that was never actually published.
 */
import type { FastifyInstance } from 'fastify';
import type { GatewayServices } from '../server.js';
import { serveCacheable, buildCacheKey } from '../lib/cacheHelper.js';
import { toGatewayError } from '../lib/errors.js';

interface BackendStoreListItem {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string | null;
}

interface BackendMediaAsset {
  url: string;
  altText: string | null;
}

interface BackendPublishedAppearance {
  logo: BackendMediaAsset | null;
  favicon: BackendMediaAsset | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  typographyPreset: string;
  buttonStyle: 'solid' | 'outline' | 'soft';
  announcementEnabled: boolean;
  announcementText: string | null;
  social: {
    whatsappNumber: string | null;
    messengerUrl: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
  };
  businessHours: unknown;
}

interface BackendStoreAppearance {
  published: BackendPublishedAppearance | null;
}

export interface StorefrontBranding {
  storeName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  logo: { url: string; alt: string } | null;
  favicon: { url: string } | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  borderRadius: BackendPublishedAppearance['borderRadius'];
  typographyPreset: string;
  buttonStyle: BackendPublishedAppearance['buttonStyle'];
  announcement: { enabled: boolean; text: string | null };
  social: BackendPublishedAppearance['social'];
}

/** The real, honest default a store with nothing ever published falls back to — matching every other primitive's own "always renders something real, never a blank/fabricated result" guarantee (`STOREFRONT_COMPONENT_ENGINE.md` §3). */
function defaultBranding(storeName: string, supportEmail: string | null = null, supportPhone: string | null = null): StorefrontBranding {
  return {
    storeName,
    supportEmail,
    supportPhone,
    logo: null,
    favicon: null,
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
    borderRadius: 'md',
    typographyPreset: 'inter-default',
    buttonStyle: 'solid',
    announcement: { enabled: false, text: null },
    social: { whatsappNumber: null, messengerUrl: null, facebookUrl: null, instagramUrl: null, tiktokUrl: null, youtubeUrl: null },
  };
}

function toBranding(store: BackendStoreListItem, appearance: BackendStoreAppearance): StorefrontBranding {
  if (!appearance.published) return defaultBranding(store.name, store.contactEmail, store.contactPhone);
  const p = appearance.published;
  return {
    storeName: store.name,
    supportEmail: store.contactEmail,
    supportPhone: store.contactPhone,
    logo: p.logo ? { url: p.logo.url, alt: p.logo.altText ?? store.name } : null,
    favicon: p.favicon ? { url: p.favicon.url } : null,
    primaryColor: p.primaryColor,
    secondaryColor: p.secondaryColor,
    accentColor: p.accentColor,
    borderRadius: p.borderRadius,
    typographyPreset: p.typographyPreset,
    buttonStyle: p.buttonStyle,
    announcement: { enabled: p.announcementEnabled, text: p.announcementText },
    social: p.social,
  };
}

export function registerBrandingRoutes(app: FastifyInstance, services: GatewayServices, prefix: string): void {
  const { backend, cache } = services;

  app.get(`${prefix}/branding`, async (request, reply) => {
    const cacheKey = buildCacheKey('branding', {});

    await serveCacheable(
      request,
      reply,
      cache,
      { key: cacheKey, ttlSeconds: 120, staleWhileRevalidateSeconds: 600, browserMaxAgeSeconds: 60, tags: ['branding'] },
      async () => {
        try {
          const stores = await backend.getList<BackendStoreListItem>({ module: 'branding', path: 'stores', correlationId: request.id });
          const store = stores.data[0];
          if (!store) {
            // Phase 1's own real, single-store scope — no store has ever
            // been created yet. Real, honest fallback, never a fabricated
            // store name.
            return { data: defaultBranding('Store') };
          }

          const appearance = await backend.getItem<BackendStoreAppearance>({
            module: 'branding',
            path: `stores/${store.id}/appearance`,
            correlationId: request.id,
          });

          return { data: toBranding(store, appearance.data) };
        } catch (error) {
          throw toGatewayError(error, 'branding');
        }
      },
    );
  });
}
