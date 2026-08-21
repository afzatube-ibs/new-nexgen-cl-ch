import { describe, expect, it } from 'vitest';
import { mintPreviewToken, verifyPreviewToken } from '../../../src/preview/token.js';

const SECRET = 'a'.repeat(32);
const OPTIONS = { kind: 'cms' as const, targetId: 'page-123', ttlSeconds: 3600, secret: SECRET, baseUrl: 'http://localhost:4000' };

describe('preview/token', () => {
  it('mints a token whose URL embeds the token itself', () => {
    const minted = mintPreviewToken(OPTIONS);
    expect(minted.url).toContain(encodeURIComponent(minted.token));
    expect(minted.context.kind).toBe('cms');
    expect(minted.context.targetId).toBe('page-123');
  });

  it('verifies a freshly-minted token as valid, resolving the same kind/targetId', () => {
    const minted = mintPreviewToken(OPTIONS);
    const result = verifyPreviewToken(minted.token, SECRET);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.context.kind).toBe('cms');
      expect(result.context.targetId).toBe('page-123');
    }
  });

  it('rejects a token verified against the wrong secret', () => {
    const minted = mintPreviewToken(OPTIONS);
    const result = verifyPreviewToken(minted.token, 'b'.repeat(32));
    expect(result).toEqual({ valid: false, reason: 'signature_mismatch' });
  });

  it('rejects a tampered payload even with a correctly-shaped signature', () => {
    const minted = mintPreviewToken(OPTIONS);
    const [, signature] = minted.token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ kind: 'theme', targetId: 'someone-elses-page' })).toString('base64url');
    const result = verifyPreviewToken(`${tamperedPayload}.${signature}`, SECRET);
    expect(result.valid).toBe(false);
  });

  it('rejects an expired token', () => {
    const minted = mintPreviewToken({ ...OPTIONS, ttlSeconds: -1 }); // already expired the moment it's minted
    const result = verifyPreviewToken(minted.token, SECRET);
    expect(result).toEqual({ valid: false, reason: 'expired' });
  });

  it('rejects a malformed token with no separator', () => {
    expect(verifyPreviewToken('not-a-real-token', SECRET)).toEqual({ valid: false, reason: 'malformed' });
  });

  it('every previewKind mints and verifies correctly', () => {
    for (const kind of ['cms', 'theme', 'landing', 'draft'] as const) {
      const minted = mintPreviewToken({ ...OPTIONS, kind });
      const result = verifyPreviewToken(minted.token, SECRET);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.context.kind).toBe(kind);
    }
  });
});
