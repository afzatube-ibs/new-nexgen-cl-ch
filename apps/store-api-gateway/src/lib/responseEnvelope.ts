/**
 * The Gateway's own success envelope — mirrors API:RESPONSE_ENVELOPE's
 * already-Accepted platform-wide shape: a clear separation between the
 * substantive result (`data`) and metadata about the response itself
 * (`meta` — pagination, request id, cache status). No module (and now no
 * Gateway route) invents its own ad hoc shape.
 */

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface ResponseMeta {
  requestId: string;
  /** 'HIT' | 'MISS' | 'STALE' — present only when this response passed through the cache layer (§4). */
  cache?: 'HIT' | 'MISS' | 'STALE';
  pagination?: PaginationMeta;
}

export interface SuccessEnvelope<T> {
  data: T;
  meta: ResponseMeta;
}

export function envelope<T>(data: T, meta: ResponseMeta): SuccessEnvelope<T> {
  return { data, meta };
}
