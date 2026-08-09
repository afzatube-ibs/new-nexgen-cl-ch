/**
 * Future-ready Hooks (Phase 2.1 objective §9): named, typed extension
 * points for capabilities the accepted architecture anticipates but this
 * phase explicitly does not build — Themes, Extensions/Marketplace,
 * Updates, Media Manager, Localization, Notifications. Every export below
 * is a TYPE ONLY. There is deliberately zero runtime code in this
 * directory: a stub function that "does nothing yet" would be exactly the
 * "placeholder implementation" Phase 2.1's own quality bar forbids. A type
 * costs nothing to be wrong about later and cannot be mistaken for a real
 * implementation — the correct shape for "prepared, not built."
 *
 * A future module implements the relevant contract and registers itself
 * through the same `registerModule()` mechanism every other module uses
 * (`src/registry/moduleRegistry.ts`) — none of these contracts require a
 * change to the Admin Engine itself to become real.
 */

/**
 * Themes — the Admin Engine has no rendering pipeline of its own
 * (docs/frontend/THEME_ENGINE_ARCHITECTURE.md's Core → Storefront Engine →
 * Theme Engine → Theme Package layering is storefront-only, per ADR-0009's
 * `packages/storefront-engine` boundary). What the Admin Engine will need,
 * once a Storefront exists, is an "Appearance" settings module that lets an
 * operator choose/configure the active theme — this is that module's
 * future contract, registering one `SettingsPanelDefinition` (already a
 * real mechanism, `src/registry/types.ts`) backed by this shape.
 */
export interface ThemeManagementContract {
  listAvailableThemes: () => Promise<{ id: string; name: string; thumbnailUrl: string | null }[]>;
  getActiveThemeId: () => Promise<string | null>;
  activateTheme: (themeId: string) => Promise<void>;
}

/**
 * Extensions / Marketplace — mirrors docs/RELEASE_MANAGEMENT.md §8's Update
 * Engine Preparation design principles (the same provider-trio pattern this
 * platform already uses for Payments/Shipping/Notifications/Search) rather
 * than inventing a separate shape. A future "Marketplace" module implements
 * this against a real Update Server once one exists.
 */
export interface MarketplaceExtensionContract {
  listInstalled: () => Promise<{ id: string; name: string; version: string; enabled: boolean }[]>;
  listAvailable: () => Promise<{ id: string; name: string; latestVersion: string; requiresCoreVersion: string }[]>;
  install: (extensionId: string) => Promise<void>;
  setEnabled: (extensionId: string, enabled: boolean) => Promise<void>;
}

/** Updates — the admin-facing counterpart of docs/RELEASE_MANAGEMENT.md §8: checking for and applying a platform update from within the Admin Engine itself, once an Update Server exists. */
export interface UpdateEngineContract {
  checkForUpdate: () => Promise<{ currentVersion: string; latestVersion: string; updateAvailable: boolean }>;
  applyUpdate: () => Promise<void>;
}

/**
 * Media Manager — the backend's real Media module (`GET/POST /api/v1/media`,
 * per PROJECT_STATUS.md) already exists; what Phase 2.1 does not yet build
 * is the Admin Engine's own reusable `<MediaPicker>` UI every future
 * module (Catalog product images, CMS, Theme thumbnails) will consume. This
 * contract is that component's future props shape, so Catalog's own Phase
 * 2.1+ implementation isn't blocked on guessing it later.
 */
export interface MediaPickerContract {
  multiple: boolean;
  accept: ('image' | 'pdf')[];
  onSelect: (selected: { id: string; url: string; filename: string }[]) => void;
}

/** Localization — the admin operator's own UI language (distinct from the backend's Localization & Currency module, which governs store-facing locale/currency). A future "Language" control in the Header/Settings implements this. */
export interface LocalizationContract {
  listAvailableLocales: () => Promise<{ code: string; label: string }[]>;
  getCurrentLocale: () => string;
  setLocale: (localeCode: string) => Promise<void>;
}

/**
 * Notifications — extends `src/shell/NotificationCenter.tsx`'s already-built
 * placeholder trigger with the real panel data source
 * (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §9 names this exact gap). Backed
 * by the Notifications module's already-real `GET /api/v1/notifications`.
 */
export interface NotificationCenterDataContract {
  fetchUnreadCount: () => Promise<number>;
  fetchRecent: (limit: number) => Promise<{ id: string; title: string; createdAt: string; readAt: string | null }[]>;
  markAsRead: (notificationId: string) => Promise<void>;
}
