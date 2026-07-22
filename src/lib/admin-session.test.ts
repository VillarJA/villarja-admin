import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { getSupabaseAccessToken, hasAdminRole } from './admin-session';

function request(headers?: HeadersInit): Parameters<typeof getSupabaseAccessToken>[0] {
  return new NextRequest('http://localhost/api/admin/query', { headers });
}

test('getSupabaseAccessToken prefers a Bearer token', () => {
  assert.equal(getSupabaseAccessToken(request({ Authorization: 'Bearer session-token' })), 'session-token');
});

test('getSupabaseAccessToken rejects malformed authorization headers', () => {
  assert.equal(getSupabaseAccessToken(request({ Authorization: 'Basic session-token' })), null);
});

test('hasAdminRole only accepts the server-controlled admin claim', () => {
  assert.equal(hasAdminRole({ role: 'admin' }), true);
  assert.equal(hasAdminRole({ role: 'operator' }), false);
  assert.equal(hasAdminRole({}), false);
  assert.equal(hasAdminRole(null), false);
});
