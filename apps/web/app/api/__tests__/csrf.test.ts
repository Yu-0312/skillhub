import { describe, expect, it } from 'vitest';
import { hasBearerAuth, requiresCsrfProtection, shouldProtectPath } from '@/lib/csrf';

function requestWithAuthorization(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set('authorization', authorization);
  return new Request('http://localhost/api/ratings', { headers });
}

describe('hasBearerAuth', () => {
  it('detects a bearer token', () => {
    expect(hasBearerAuth(requestWithAuthorization('Bearer test-api-key'))).toBe(true);
  });

  it('is case-insensitive for the scheme', () => {
    expect(hasBearerAuth(requestWithAuthorization('bearer test-api-key'))).toBe(true);
  });

  it('ignores non-bearer authorization schemes', () => {
    expect(hasBearerAuth(requestWithAuthorization('Basic dXNlcjpwYXNz'))).toBe(false);
  });

  it('rejects an empty bearer token', () => {
    expect(hasBearerAuth(requestWithAuthorization('Bearer'))).toBe(false);
    expect(hasBearerAuth(requestWithAuthorization('Bearer   '))).toBe(false);
  });

  it('returns false without an authorization header', () => {
    expect(hasBearerAuth(requestWithAuthorization())).toBe(false);
  });
});

describe('shouldProtectPath', () => {
  it.each([
    '/api/favorites',
    '/api/favorites/check',
    '/api/ratings',
    '/api/skills/removal-request',
    '/api/skills/repo-removal-request',
    '/api/skills/add-request',
    '/api/skills/install',
    '/api/newsletter/subscribe',
    '/api/newsletter/unsubscribe',
    '/api/early-access',
    '/api/review/submit',
  ])('protects %s', (pathname) => {
    expect(shouldProtectPath(pathname)).toBe(true);
  });

  it('does not protect unrelated paths', () => {
    expect(shouldProtectPath('/api/skills')).toBe(false);
    expect(shouldProtectPath('/browse')).toBe(false);
  });
});

describe('requiresCsrfProtection', () => {
  it('skips safe methods', () => {
    expect(requiresCsrfProtection('GET')).toBe(false);
    expect(requiresCsrfProtection('HEAD')).toBe(false);
    expect(requiresCsrfProtection('OPTIONS')).toBe(false);
  });

  it('requires protection for state-changing methods', () => {
    expect(requiresCsrfProtection('POST')).toBe(true);
    expect(requiresCsrfProtection('delete')).toBe(true);
  });
});
