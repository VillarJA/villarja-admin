import test from 'node:test';
import assert from 'node:assert/strict';

import { removePrivateCompanyFields } from './admin-response';

test('removePrivateCompanyFields never exposes certificate material', () => {
  const result = removePrivateCompanyFields({
    id: 'company-1',
    api_key: 'vja_test_visible_to_admin',
    certificado_data: 'private-p12',
    cert_password_encrypted: 'private-password',
    certificado_path: '/private/cert.p12',
  });

  assert.deepEqual(result, { id: 'company-1', api_key: 'vja_test_visible_to_admin' });
});
