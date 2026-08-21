/**
 * Signed preview token mint/verify — the identical HMAC discipline
 * `context/guestSession.ts` (Slice 1) already established, applied here to
 * a structured payload instead of a bare identity: sign what the token
 * claims, reject silently-tampered claims, never trust an unsigned value.
 * A base64url-encoded `<payload>.<signature>` — self-contained (no server-
 * side session lookup required to verify), by design: a "shareable preview
 * URL" (this slice's own requirement) must remain valid even from a
 * different device than the one that minted it.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { MintedPreview, PreviewContext, PreviewKind } from './types.js';

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export interface MintPreviewOptions {
  kind: PreviewKind;
  targetId: string;
  ttlSeconds: number;
  secret: string;
  baseUrl: string;
}

export function mintPreviewToken(options: MintPreviewOptions): MintedPreview {
  const now = Date.now();
  const context: PreviewContext = {
    kind: options.kind,
    targetId: options.targetId,
    issuedAt: now,
    expiresAt: now + options.ttlSeconds * 1000,
  };
  const payload = base64url(JSON.stringify({ id: randomUUID(), ...context }));
  const signature = sign(payload, options.secret);
  const token = `${payload}.${signature}`;

  return {
    token,
    url: `${options.baseUrl.replace(/\/+$/, '')}/v1/preview/resolve?token=${encodeURIComponent(token)}`,
    context,
  };
}

export type VerifyPreviewResult = { valid: true; context: PreviewContext } | { valid: false; reason: 'malformed' | 'signature_mismatch' | 'expired' };

export function verifyPreviewToken(token: string, secret: string): VerifyPreviewResult {
  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex <= 0) return { valid: false, reason: 'malformed' };

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = sign(payload, secret);

  const expectedBuf = Buffer.from(expectedSignature, 'base64url');
  const actualBuf = Buffer.from(signature, 'base64url');
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return { valid: false, reason: 'signature_mismatch' };
  }

  let parsed: PreviewContext & { id: string };
  try {
    parsed = JSON.parse(fromBase64url(payload)) as PreviewContext & { id: string };
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  if (Date.now() > parsed.expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, context: { kind: parsed.kind, targetId: parsed.targetId, issuedAt: parsed.issuedAt, expiresAt: parsed.expiresAt } };
}
