/**
 * Guest session / anonymous identity — this slice's own explicit scope:
 * "NO customer login. NO merchant login. Guest only." Directly implements
 * CDP_ARCHITECTURE.md §3.1's Device Identity tier and §3.2's cookie
 * strategy: one first-party, server-set identifier, never a third-party
 * cookie, never client-JS-generated (a client-generated id is trivially
 * spoofable and would make every downstream signal built on it worthless).
 *
 * The cookie value is a signed token (`<uuid>.<hmac>`), not a bare UUID —
 * so a tampered or forged cookie is detected and rejected server-side
 * rather than silently trusted, per SECURITY:PHILOSOPHY's "nothing is
 * trusted implicitly."
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export interface GuestIdentity {
  /** CDP_ARCHITECTURE.md §3.1's Device Identity — durable across visits. */
  deviceId: string;
  /** True when this request had to mint a new identity (no valid cookie presented). */
  isNew: boolean;
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function verify(value: string, signature: string, secret: string): boolean {
  const expected = sign(value, secret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export function mintGuestToken(secret: string): { deviceId: string; token: string } {
  const deviceId = randomUUID();
  const signature = sign(deviceId, secret);
  return { deviceId, token: `${deviceId}.${signature}` };
}

/**
 * Resolves the guest identity for a request. Returns a fresh identity
 * (isNew: true) for a missing OR tampered cookie — a forged cookie is
 * never trusted, but it is also never treated as a hard error toward the
 * visitor: they simply get a new, valid identity, per this Gateway's own
 * "always renders something, never a broken page" inherited discipline.
 */
export function resolveGuestIdentity(cookieValue: string | undefined, secret: string): GuestIdentity & { token?: string } {
  if (cookieValue) {
    const separatorIndex = cookieValue.lastIndexOf('.');
    if (separatorIndex > 0) {
      const deviceId = cookieValue.slice(0, separatorIndex);
      const signature = cookieValue.slice(separatorIndex + 1);
      if (verify(deviceId, signature, secret)) {
        return { deviceId, isNew: false };
      }
    }
  }
  const minted = mintGuestToken(secret);
  return { deviceId: minted.deviceId, isNew: true, token: minted.token };
}
