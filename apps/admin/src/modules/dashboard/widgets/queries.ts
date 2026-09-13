import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getPriceList,
  getStoreAppearance,
  listCmsMenus,
  listCmsPages,
  listNotificationProviders,
  listPaymentMethods,
  listPriceLists,
  listProducts,
  listShippingProviders,
  listShippingZones,
  listStockItems,
  listStores,
  listWarehouses,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/**
 * Merchant launch readiness is composed from existing module APIs rather
 * than a parallel "onboarding state" table. Every check below therefore
 * changes immediately when the merchant fixes the underlying configuration.
 *
 * Cash On Delivery and Bank Transfer require no third-party merchant API
 * credentials. `/payments/methods` exposes Bank Transfer to Storefront as
 * `banktransfer` (payment records themselves use `bank_transfer`), so the
 * registry code — not the stored-payment code — belongs in this set.
 */
const NO_CREDENTIAL_GATEWAYS = new Set(['cod', 'banktransfer']);
const NO_CREDENTIAL_COURIERS = new Set(['manual']);

export interface PaymentReadiness {
  hasAnyGateway: boolean;
  hasOnlineGateway: boolean;
}

export function usePaymentReadiness(): UseQueryResult<PaymentReadiness> {
  return useQuery({
    queryKey: ['readiness-payments'],
    queryFn: async () => {
      const { data } = await listPaymentMethods(apiClient, { all: true });
      return {
        hasAnyGateway: data.some((gateway) => gateway.available),
        hasOnlineGateway: data.some(
          (gateway) => gateway.available && !NO_CREDENTIAL_GATEWAYS.has(gateway.code),
        ),
      };
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export interface ShippingReadiness {
  hasRealCourier: boolean;
  zoneCount: number;
}

export function useShippingReadiness(): UseQueryResult<ShippingReadiness> {
  return useQuery({
    queryKey: ['readiness-shipping'],
    queryFn: async () => {
      const [providers, zones] = await Promise.all([
        listShippingProviders(apiClient),
        listShippingZones(apiClient),
      ]);
      return {
        hasRealCourier: providers.data.some(
          (provider) => provider.available && !NO_CREDENTIAL_COURIERS.has(provider.code),
        ),
        zoneCount: zones.meta?.total ?? zones.data.length,
      };
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export interface NotificationReadiness {
  hasProvider: boolean;
}

export function useNotificationReadiness(): UseQueryResult<NotificationReadiness> {
  return useQuery({
    queryKey: ['readiness-notifications'],
    queryFn: async () => {
      const { data } = await listNotificationProviders(apiClient);
      return { hasProvider: data.some((provider) => provider.available) };
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export interface CatalogReadiness {
  activeProductCount: number;
}

export function useCatalogReadiness(): UseQueryResult<CatalogReadiness> {
  return useQuery({
    queryKey: ['readiness-catalog'],
    queryFn: async () => {
      const response = await listProducts(apiClient, { status: 'active', perPage: 1 });
      return { activeProductCount: response.meta?.total ?? response.data.length };
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export interface StorefrontReadiness {
  hasStore: boolean;
  identityReady: boolean;
  appearancePublished: boolean | undefined;
  homepagePublished: boolean | undefined;
  navigationPublished: boolean | undefined;
}

/**
 * Store identity is the prerequisite for the three Storefront checks. Once
 * the real Store is known, Appearance/CMS are read independently with
 * `Promise.allSettled`: lacking one permission turns only that row into
 * "couldn't check" instead of hiding good evidence from the other modules.
 */
export function useStorefrontReadiness(): UseQueryResult<StorefrontReadiness> {
  return useQuery({
    queryKey: ['readiness-storefront'],
    queryFn: async () => {
      const stores = await listStores(apiClient);
      const store = stores[0];

      if (!store) {
        return {
          hasStore: false,
          identityReady: false,
          appearancePublished: false,
          homepagePublished: false,
          navigationPublished: false,
        };
      }

      const identityReady =
        store.status === 'active' &&
        Boolean(store.name.trim()) &&
        Boolean(store.currencyCode.trim()) &&
        Boolean(store.locale.trim()) &&
        Boolean(store.timezone.trim()) &&
        Boolean(store.contactEmail.trim()) &&
        Boolean(store.address.line1.trim()) &&
        Boolean(store.address.city.trim()) &&
        Boolean(store.address.countryCode.trim());

      const [appearanceResult, pagesResult, menusResult] = await Promise.allSettled([
        getStoreAppearance(apiClient, store.id),
        listCmsPages(apiClient, store.id),
        listCmsMenus(apiClient, store.id),
      ]);

      return {
        hasStore: true,
        identityReady,
        appearancePublished:
          appearanceResult.status === 'fulfilled' ? appearanceResult.value.isPublished : undefined,
        homepagePublished:
          pagesResult.status === 'fulfilled'
            ? pagesResult.value.some((page) => page.slug === 'home' && page.isPublished)
            : undefined,
        navigationPublished:
          menusResult.status === 'fulfilled'
            ? menusResult.value.some(
                (menu) =>
                  menu.handle === 'main-navigation' && menu.isPublished && menu.items.length > 0,
              )
            : undefined,
      };
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export interface PricingReadiness {
  hasActiveDefaultList: boolean;
  pricedSkuCount: number;
}

/**
 * Checkout resolves prices only from an active default list for the store's
 * currency. The list endpoint identifies that authoritative list; its detail
 * endpoint is the one real place that returns entries. We intentionally do
 * not claim whole-catalog price coverage here — the existing Missing Prices
 * tool remains the precise merchant workflow for that audit.
 */
export function usePricingReadiness(): UseQueryResult<PricingReadiness> {
  return useQuery({
    queryKey: ['readiness-pricing'],
    queryFn: async () => {
      const lists = await listPriceLists(apiClient, { status: 'active' });
      const defaultList = lists.data.find((priceList) => priceList.isDefault);
      if (!defaultList) return { hasActiveDefaultList: false, pricedSkuCount: 0 };

      const detail = await getPriceList(apiClient, defaultList.id);
      return {
        hasActiveDefaultList: true,
        pricedSkuCount: detail.entries?.length ?? 0,
      };
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export interface InventoryReadiness {
  hasActiveWarehouse: boolean;
  hasAvailableStock: boolean;
}

/**
 * Inventory readiness uses an active/default warehouse and compares two real
 * server-side totals: every StockItem in that warehouse vs. those whose
 * computed available quantity (`on_hand - reserved`) is <= 0. If the totals
 * differ, at least one SKU genuinely has positive available stock without
 * downloading an unbounded stock ledger into the Dashboard.
 */
export function useInventoryReadiness(): UseQueryResult<InventoryReadiness> {
  return useQuery({
    queryKey: ['readiness-inventory'],
    queryFn: async () => {
      const warehouses = await listWarehouses(apiClient, { status: 'active' });
      const warehouse = warehouses.data.find((candidate) => candidate.isDefault) ?? warehouses.data[0];
      if (!warehouse) return { hasActiveWarehouse: false, hasAvailableStock: false };

      const [allStock, unavailableStock] = await Promise.all([
        listStockItems(apiClient, { warehouseId: warehouse.id, perPage: 1 }),
        listStockItems(apiClient, { warehouseId: warehouse.id, quantityLte: 0, perPage: 1 }),
      ]);
      const total = allStock.meta?.total ?? allStock.data.length;
      const unavailable = unavailableStock.meta?.total ?? unavailableStock.data.length;

      return {
        hasActiveWarehouse: true,
        hasAvailableStock: total > unavailable,
      };
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}
