import { describe, expect, it } from 'vitest';
import { mintGuestToken, resolveGuestIdentity } from '../../src/context/guestSession.js';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';

describe('context/guestSession', () => {
  it('mints a new, valid identity when no cookie is presented', () => {
    const resolved = resolveGuestIdentity(undefined, SECRET);
    expect(resolved.isNew).toBe(true);
    expect(resolved.deviceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolved.token).toContain(resolved.deviceId);
  });

  it('resolves the SAME identity from a previously-minted, valid cookie (durable across visits, per CDP_ARCHITECTURE.md §3.1)', () => {
    const minted = mintGuestToken(SECRET);
    const resolved = resolveGuestIdentity(minted.token, SECRET);
    expect(resolved.isNew).toBe(false);
    expect(resolved.deviceId).toBe(minted.deviceId);
  });

  it('rejects a tampered device id (signature no longer matches) and issues a fresh identity instead of trusting it', () => {
    const minted = mintGuestToken(SECRET);
    const [, signature] = minted.token.split('.');
    const tampered = `${'11111111-1111-1111-1111-111111111111'}.${signature}`;
    const resolved = resolveGuestIdentity(tampered, SECRET);
    expect(resolved.isNew).toBe(true);
    expect(resolved.deviceId).not.toBe('11111111-1111-1111-1111-111111111111');
  });

  it('rejects a cookie signed with a different secret (forged token)', () => {
    const minted = mintGuestToken('a-completely-different-secret-value-here');
    const resolved = resolveGuestIdentity(minted.token, SECRET);
    expect(resolved.isNew).toBe(true);
    expect(resolved.deviceId).not.toBe(minted.deviceId);
  });

  it('rejects a malformed cookie value with no separator', () => {
    const resolved = resolveGuestIdentity('not-a-valid-token-shape', SECRET);
    expect(resolved.isNew).toBe(true);
  });
});
