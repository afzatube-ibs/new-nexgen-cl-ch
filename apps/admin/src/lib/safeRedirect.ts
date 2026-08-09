/**
 * Guards the post-login `returnTo` redirect (ProtectedRoute.tsx sets it,
 * LoginPage.tsx consumes it) against open-redirect payloads — independent
 * of react-router's own fix for its backslash-based `<Link>`/`useNavigate`
 * bypass (GHSA-wrjc-x8rr-h8h6), since this value originates from a URL
 * query parameter an attacker fully controls (a crafted deep-link sent to
 * a victim). A leading `//` or `/\` is browser-parsed as a
 * protocol-relative external URL, not an in-app path — rejected here
 * before it ever reaches `navigate()`.
 */
export function safeRelativePath(candidate: string | null): string {
  const fallback = '/';
  if (!candidate) return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;
  if (candidate.includes('://')) return fallback;
  return candidate;
}
