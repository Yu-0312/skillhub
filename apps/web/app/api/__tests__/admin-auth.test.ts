import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

import { requireAdmin } from '@/lib/admin-auth';

function createRequest(authorization?: string): NextRequest {
  const headers = new Headers();
  if (authorization) headers.set('authorization', authorization);

  return new NextRequest('http://localhost:3000/api/review/submit', {
    method: 'POST',
    headers,
  });
}

describe('requireAdmin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockAuth.mockReset();
  });

  it('rejects an invalid bearer token without a session', async () => {
    vi.stubEnv('REVIEW_API_KEY', 'valid-key');
    mockAuth.mockResolvedValue(null);

    const result = await requireAdmin(createRequest('Bearer invalid-key'));

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it('accepts the configured API key', async () => {
    vi.stubEnv('REVIEW_API_KEY', 'valid-key');

    const result = await requireAdmin(createRequest('Bearer valid-key'));

    expect(result).toEqual({ authorized: true, username: 'api-key' });
  });

  it('rejects a bearer token when no API key is configured', async () => {
    vi.stubEnv('REVIEW_API_KEY', '');
    mockAuth.mockResolvedValue(null);

    const result = await requireAdmin(createRequest('Bearer anything'));

    expect(result.authorized).toBe(false);
  });
});
