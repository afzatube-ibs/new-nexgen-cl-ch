/**
 * The one and only path this Gateway ever uses to reach the real backend —
 * STORE_FRONTEND_ARCHITECTURE.md §3.2's Category-A service credential,
 * held server-side only, never sent to a browser. Every call:
 *   - carries the scoped Storefront Service Sanctum token (view-only
 *     permissions — see PHASE_4_1_STORE_API_GATEWAY_SLICE1_REPORT.md §
 *     "Storefront Service account" for exactly which)
 *   - is wrapped in a per-module circuit breaker (§3.2 of
 *     STORE_API_GATEWAY_ARCHITECTURE.md)
 *   - propagates this request's own correlation id (API:CORRELATION,
 *     already-Accepted platform-wide) to the backend, and reads it back
 *   - times out rather than hanging a Gateway request indefinitely
 *
 * This module owns NO business logic — Rules §1: "Gateway orchestrates.
 * Commerce owns business logic." It only knows how to call real read-only
 * backend contracts and shape their response envelopes; every commerce or
 * publishing decision remains entirely the real backend's own.
 */
import type { FastifyBaseLogger } from 'fastify';
import { CircuitBreaker } from '../lib/circuitBreaker.js';
import { BackendUpstreamError } from '../lib/errors.js';
import type { BackendItemResponse, BackendListResponse } from './types.js';

export type BackendModule = 'catalog' | 'search' | 'branding' | 'pricing' | 'inventory' | 'reviews' | 'cms';

export interface BackendClientOptions {
  baseUrl: string;
  serviceToken: string;
  logger: FastifyBaseLogger;
  timeoutMs?: number;
}

export interface BackendRequestOptions {
  module: BackendModule;
  path: string;
  query?: Record<string, string | number | undefined>;
  correlationId: string;
}

export class BackendClient {
  private readonly baseUrl: string;
  private readonly serviceToken: string;
  private readonly logger: FastifyBaseLogger;
  private readonly timeoutMs: number;
  private readonly breakers = new Map<BackendModule, CircuitBreaker>();

  constructor(options: BackendClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.serviceToken = options.serviceToken;
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  private breakerFor(module: BackendModule): CircuitBreaker {
    let breaker = this.breakers.get(module);
    if (!breaker) {
      breaker = new CircuitBreaker(module, { failureThreshold: 5, resetTimeoutMs: 30_000 });
      this.breakers.set(module, breaker);
    }
    return breaker;
  }

  circuitStateFor(module: BackendModule): string {
    return this.breakerFor(module).getState();
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\/+/, '')}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async fetchJson<T>(options: BackendRequestOptions): Promise<T> {
    const breaker = this.breakerFor(options.module);
    if (!breaker.canProceed()) {
      throw new BackendUpstreamError(null, `circuit_open:${options.module}`);
    }

    const url = this.buildUrl(options.path, options.query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.serviceToken}`,
          Accept: 'application/json',
          'X-Correlation-Id': options.correlationId,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        breaker.recordFailure();
        const body = await response.text().catch(() => undefined);
        throw new BackendUpstreamError(response.status, `Backend ${options.module} responded ${response.status}`, body);
      }

      const json = (await response.json()) as T;
      breaker.recordSuccess();
      return json;
    } catch (error) {
      if (error instanceof BackendUpstreamError) throw error;
      breaker.recordFailure();
      const isAbort = error instanceof Error && error.name === 'AbortError';
      this.logger.warn({ err: error, module: options.module, path: options.path }, 'Backend call failed');
      throw new BackendUpstreamError(null, isAbort ? `Backend ${options.module} timed out` : `Backend ${options.module} unreachable`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async getList<T>(options: BackendRequestOptions): Promise<BackendListResponse<T>> {
    return this.fetchJson<BackendListResponse<T>>(options);
  }

  async getItem<T>(options: BackendRequestOptions): Promise<BackendItemResponse<T>> {
    return this.fetchJson<BackendItemResponse<T>>(options);
  }
}
