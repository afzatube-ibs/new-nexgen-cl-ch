import { mapErrorResponse, NetworkOrParseError, type ApiErrorBody } from './errors.js';

export type TokenProvider = () => string | null;
export type UnauthenticatedHandler = () => void;

export interface ApiClientOptions {
  /** e.g. `http://localhost:8080/api/v1` — apps/admin's `VITE_API_BASE_URL`. */
  baseUrl: string;
  /** Reads the current Sanctum bearer token from wherever it's stored (see auth store). Never read directly from `localStorage` here — this package has no storage opinion of its own. */
  getToken: TokenProvider;
  /** Invoked once, exactly when a 401 is received, so the caller (apps/admin's auth layer) can clear the session and redirect to login — this package never touches routing or storage itself. */
  onUnauthenticated?: UnauthenticatedHandler;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildQueryString(query: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Thin, hand-maintained fetch wrapper against apps/backend's REST API
 * (06_API_STANDARD.md) — no codegen yet (ADR-0005's own named debt). Owns:
 * base URL resolution, bearer-token injection, JSON (de)serialization, and
 * mapping the backend's one consistent error envelope to the typed error
 * hierarchy in errors.ts. Owns nothing about *where* the token is stored or
 * what happens on 401 beyond invoking the caller-supplied hook — those are
 * apps/admin's own session-management concerns (docs/frontend/
 * ADMIN_SHELL_ARCHITECTURE.md §7).
 */
export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  private async request<T>(method: string, path: string, body?: unknown, requestOptions?: RequestOptions): Promise<T> {
    const url = `${this.options.baseUrl}${path}${buildQueryString(requestOptions?.query)}`;
    const token = this.options.getToken();

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: requestOptions?.signal,
      });
    } catch (cause) {
      throw new NetworkOrParseError('The request could not be completed — check your network connection.', cause);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    let json: unknown;
    const text = await response.text();
    try {
      json = text.length > 0 ? JSON.parse(text) : undefined;
    } catch (cause) {
      throw new NetworkOrParseError('The server returned a response that was not valid JSON.', cause);
    }

    if (!response.ok) {
      const errorBody = (json as { error?: ApiErrorBody } | undefined)?.error ?? {
        type: 'unknown',
        message: response.statusText || 'An unknown error occurred.',
      };
      const mapped = mapErrorResponse(response.status, errorBody, response.headers.get('Retry-After'));
      if (response.status === 401) this.options.onUnauthenticated?.();
      throw mapped;
    }

    return json as T;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  /**
   * `body` is optional because most DELETEs carry none, but Catalog's
   * archive/destroy endpoints require `{ expected_version }` in a JSON body
   * (`ExpectedVersionRequest`, apps/backend) — found while wiring the
   * Catalog module (Phase 2.2): this method previously had no way to send
   * one. Laravel merges a JSON body into request input regardless of HTTP
   * verb (`Request::shouldMergeJson()` only checks the Content-Type header),
   * so this is a real, backend-supported shape, not a workaround.
   */
  delete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, body, options);
  }
}
