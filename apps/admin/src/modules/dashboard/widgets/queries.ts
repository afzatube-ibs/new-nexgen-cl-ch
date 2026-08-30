import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listPaymentMethods, listShippingProviders, listShippingZones, listNotificationProviders, listProducts } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/**
 * Production Completion Plan v2, Milestone 12 (Production Readiness
 * Indicators) — every one of these reads a real, already-existing (or,
 * for Notifications, newly-exposed for this exact reason) per-module
 * endpoint; nothing here is a new domain concept, only new composition,
 * mirroring `orders/widgets/queries.ts`'s own established shape.
 *
 * Cash On Delivery / Bank Transfer (Payments) and the manual courier
 * (Shipping) need no external credentials at all — both are always
 * "available" regardless of merchant configuration, so counting them
 * toward "a gateway/courier is configured" would make this check
 * trivially, permanently true and defeat its own purpose. Each hook
 * below excludes them, checking specifically for a REAL, credentialed
 * integration — exactly what "missing payment gateway credentials" /
 * "only one shipping zone is configured" (this plan's own named
 * findings) are actually about.
 */

const NO_CREDENTIAL_GATEWAYS = new Set(['cod', 'bank_transfer']);
const NO_CREDENTIAL_COURIERS = new Set(['manual']);

export interface PaymentReadiness {
  hasOnlineGateway: boolean;
}

export function usePaymentReadiness(): UseQueryResult<PaymentReadiness> {
  return useQuery({
    queryKey: ['readiness-payments'],
    queryFn: async () => {
      const { data } = await listPaymentMethods(apiClient, { all: true });
      return { hasOnlineGateway: data.some((gateway) => gateway.available && !NO_CREDENTIAL_GATEWAYS.has(gateway.code)) };
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
      // `ShippingZoneController::index` has no `per_page` override (unlike
      // Catalog's own ProductController) — this reads its default page,
      // real either way for the one thing this check needs: `meta.total`.
      const [providers, zones] = await Promise.all([listShippingProviders(apiClient), listShippingZones(apiClient)]);
      return {
        hasRealCourier: providers.data.some((provider) => provider.available && !NO_CREDENTIAL_COURIERS.has(provider.code)),
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
