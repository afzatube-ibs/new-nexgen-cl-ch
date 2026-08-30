/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * Gateway's third real backend credential path, Category C: distinct from
 * `BackendClient` (Category A, one fixed, read-only service credential)
 * and `CheckoutBackendClient` (Category B, one fixed, write-scoped
 * service credential) in the one way that actually matters — this client
 * holds NO credential of its own at all. Every call carries the real,
 * live customer's own Sanctum bearer token, forwarded exactly as
 * received (never inspected, decoded, or cached by this Gateway — a pure
 * relay), per the confirmed transport design: the Storefront's own
 * Next.js server reads its own httpOnly session cookie and forwards the
 * token as this request's own `Authorization` header — the browser never
 * holds or sees a bearer token directly.
 *
 * The real backend's own `Http\Middleware\EnsureCustomerPrincipal`
 * (Commerce\Customers) is the actual authorization boundary — this
 * Gateway performs no authorization decision of its own for these routes,
 * per Rules §1 ("Gateway orchestrates. Commerce owns business logic.").
 *
 * Same real-request discipline as its two siblings: a per-module circuit
 * breaker, this request's own correlation id propagated, a hard timeout.
 */
import type { FastifyBaseLogger } from 'fastify';
import { CircuitBreaker } from '../lib/circuitBreaker.js';
import { BackendUpstreamError } from '../lib/errors.js';

// `reviews` added Milestone 11 (Reviews Foundation) — the real
// customer-authenticated `POST reviews` submission (`routes/reviews.ts`),
// forwarding the caller's own token exactly like every other module here.
export type CustomerBackendModule = 'customers' | 'orders' | 'reviews';

export interface CustomerBackendClientOptions {
  baseUrl: string;
  logger: FastifyBaseLogger;
  timeoutMs?: number;
}

export interface CustomerBackendRequestOptions {
  module: CustomerBackendModule;
  path: string;
  /**
   * The real, live customer's own Sanctum bearer token — never this
   * Gateway's own credential. Omitted only for the two genuinely public,
   * pre-authentication backend routes this client also calls
   * (`customers/register`, `customers/login`) — every other route this
   * client reaches requires one, enforced backend-side by
   * `EnsureCustomerPrincipal`, never assumed here.
   */
  customerToken?: string;
  query?: Record<string, string | number | undefined>;
  correlationId: string;
}

export interface CustomerBackendMutationOptions extends CustomerBackendRequestOptions {
  body?: Record<string, unknown>;
}

export class CustomerBackendClient {
  private readonly baseUrl: string;
  private readonly logger: FastifyBaseLogger;
  private readonly timeoutMs: number;
  private readonly breakers = new Map<CustomerBackendModule, CircuitBreaker>();

  constructor(options: CustomerBackendClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs ?? 8000;
  }

  private breakerFor(module: CustomerBackendModule): CircuitBreaker {
    let breaker = this.breakers.get(module);
    if (!breaker) {
      breaker = new CircuitBreaker(module, { failureThreshold: 5, resetTimeoutMs: 30_000 });
      this.breakers.set(module, breaker);
    }
    return breaker;
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

  private async request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', options: CustomerBackendMutationOptions): Promise<T> {
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
          ...(options.customerToken ? { Authorization: `Bearer ${options.customerToken}` } : {}),
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
      this.logger.warn({ err: error, module: options.module, path: options.path }, 'Customer backend call failed');
      throw new BackendUpstreamError(null, isAbort ? `Backend ${options.module} timed out` : `Backend ${options.module} unreachable`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async get<T>(options: CustomerBackendRequestOptions): Promise<T> {
    return this.request<T>('GET', options);
  }

  async post<T>(options: CustomerBackendMutationOptions): Promise<T> {
    return this.request<T>('POST', options);
  }

  async patch<T>(options: CustomerBackendMutationOptions): Promise<T> {
    return this.request<T>('PATCH', options);
  }

  async delete<T>(options: CustomerBackendMutationOptions): Promise<T> {
    return this.request<T>('DELETE', options);
  }
}
