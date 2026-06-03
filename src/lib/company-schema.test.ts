import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLegacyCompanyInsertPayload,
  normalizeCompanyAmbiente,
  normalizeCompanyEstado,
} from './company-schema.ts';

test('buildLegacyCompanyInsertPayload omits modern-only company columns', () => {
  const payload = buildLegacyCompanyInsertPayload(
    {
      rnc: '101234567',
      razonSocial: 'Empresa Nueva SRL',
      alias: 'EMPNUEVA',
      plan: 'Pro',
      ambiente: 'testeCF',
    },
    'vja_test_123',
    5000,
  );

  assert.equal(payload.rnc, '101234567');
  assert.equal(payload.razon_social, 'Empresa Nueva SRL');
  assert.equal(payload.nombre_comercial, 'EMPNUEVA');
  assert.equal(payload.plan, 'pro');
  assert.equal(payload.ambiente, 'testecf');
  assert.equal(payload.api_key, 'vja_test_123');
  assert.equal(payload.limite_facturas_mes, 5000);
  assert.equal(payload.activa, false);
  assert.equal(payload.direccion, 'Pendiente de completar');
  assert.equal(payload.notas, '[portal_estado:Pendiente]');
  assert.ok(!('estado' in payload));
  assert.ok(!('facturas_mes' in payload));
  assert.ok(!('certificado_estado' in payload));
  assert.ok(!('certificado_vence' in payload));
});

test('normalizeCompanyEstado prefers legacy portal marker before activa flag', () => {
  assert.equal(
    normalizeCompanyEstado({ activa: false, notas: '[portal_estado:Suspendido]' }),
    'Suspendido',
  );
  assert.equal(
    normalizeCompanyEstado({ activa: false, notas: '[portal_estado:Pendiente]' }),
    'Pendiente',
  );
  assert.equal(
    normalizeCompanyEstado({ activa: true }),
    'Activo',
  );
});

test('normalizeCompanyAmbiente maps legacy stored values to portal labels', () => {
  assert.equal(normalizeCompanyAmbiente('testecf'), 'testeCF');
  assert.equal(normalizeCompanyAmbiente('certecf'), 'certeCF');
  assert.equal(normalizeCompanyAmbiente('ecf'), 'eCF');
});
