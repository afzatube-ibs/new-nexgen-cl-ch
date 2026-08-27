/**
 * Beta Sprint 5 — the Gateway's own write-capable path to the real
 * backend, distinct from `BackendClient` (Category A, read-only,
 * Catalog/Search) by design: this client carries a second, separately
 * provisioned Sanctum credential (`BACKEND_CHECKOUT_SERVICE_TOKEN`) for a
 * real, dedicated "Checkout Service Account" (backend), holding only
 * `checkout.sessions.view`/`.manage`, `shipping.rates.view`,
 * `payments.payments.manage`, and `orders.orders.view` — never the
 * broader Category-A token's own scope, and never any human staff
 * account's own token. Two separate credentials, two separate blast
 * radii, per this platform's own SECURITY:DEFENSE_IN_DEPTH — exactly the
 * write-scoped precursor `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8
 * step 2 named, not a new auth model.
 *
 * Every real backend call this client makes is on behalf of an anonymous
 * shopper — `actorId` on the real backend side always resolves to this
 * Checkout Service Account's own user id (real, honest audit
 * attribution: "the Gateway acted on a guest's behalf"), exactly the
 * `?string $actorId` seam `StartCheckoutAction` and every sibling Action
 * already carry.
 *
 * Same real-request discipline as `BackendClient`: a per-module circuit
 * breaker, this request's own correlation id propagated, a hard timeout
 * — this module owns no business logic of its own, only how to reach the
 * real Checkout/Shipping/Payments/Orders endpoints and shape their real
 * response envelopes.
 */
import type { FastifyBaseLogger } from 'fastify';
import { CircuitBreaker } from '../lib/circuitBreaker.js';
import { BackendUpstreamError } from '../lib/errors.js';

export type CheckoutBackendModule = 'checkout' | 'shipping' | 'payments' | 'orders';

export interface CheckoutBackendClientOptions {
  baseUrl: string;
  serviceToken: string;
  logger: FastifyBaseLogger;
  timeoutMs?: number;
}

export interface CheckoutBackendRequestOptions {
  module: CheckoutBackendModule;
  path: string;
  query?: Record<string, string | number | undefined>;
  correlationId: string;
}

export interface CheckoutBackendMutationOptions extends CheckoutBackendRequestOptions {
  body?: Record<string, unknown>;
}

export class CheckoutBackendClient {
  private readonly baseUrl: string;
  private readonly serviceToken: string;
  private readonly logger: FastifyBaseLogger;
  private readonly timeoutMs: number;
  private readonly breakers = new Map<CheckoutBackendModule, CircuitBreaker>();

  constructor(options: CheckoutBackendClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.serviceToken = options.serviceToken;
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs ?? 8000;
  }

  private breakerFor(module: CheckoutBackendModule): CircuitBreaker {
    let breaker = this.breakers.get(module);
    if (!breaker) {
      breaker = new CircuitBreaker(module, { failureThreshold: 5, resetTimeoutMs: 30_000 });
      this.breakers.set(module, breaker);
    }
    return breaker;
  }

  circuitStateFor(module: CheckoutBackendModule): string {
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

  private async request<T>(method: 'GET' | 'POST' | 'PUT', options: CheckoutBackendMutationOptions): Promise<T> {
    const breaker = this.breakerFor(options.module);
    if (!breaker.canProceed()) {
      throw new BackendUpstreamError(null, `circuit_open:${options.module}`);
    }

    const url = this.buildUrl(options.path, options.query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.serviceToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Correlation-Id': options.correlationId,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        breaker.recordFailure();
        const body = await response.text().catch(() => undefined);
        throw new BackendUpstreamError(response.status, `Backend ${options.module} responded ${response.status}`, body);
      }

      // A 204 (e.g. removing a checkout item) has no body to parse.
      if (response.status === 204) {
        breaker.recordSuccess();
        return undefined as T;
      }

      const json = (await response.json()) as T;
      breaker.recordSuccess();
      return json;
    } catch (error) {
      if (error instanceof BackendUpstreamError) throw error;
      breaker.recordFailure();
      const isAbort = error instanceof Error && error.name === 'AbortError';
      this.logger.warn({ err: error, module: options.module, path: options.path }, 'Checkout backend call failed');
      throw new BackendUpstreamError(null, isAbort ? `Backend ${options.module} timed out` : `Backend ${options.module} unreachable`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async get<T>(options: CheckoutBackendRequestOptions): Promise<T> {
    return this.request<T>('GET', options);
  }

  async post<T>(options: CheckoutBackendMutationOptions): Promise<T> {
    return this.request<T>('POST', options);
  }

  async put<T>(options: CheckoutBackendMutationOptions): Promise<T> {
    return this.request<T>('PUT', options);
  }
}
