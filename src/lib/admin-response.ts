const PRIVATE_COMPANY_FIELDS = new Set([
  'certificado_data',
  'certificado_password',
  'cert_password_encrypted',
  'certificado_path',
]);

export function removePrivateCompanyFields<T>(row: T): T {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const safe = { ...(row as Record<string, unknown>) };
  for (const field of PRIVATE_COMPANY_FIELDS) delete safe[field];
  return safe as T;
}
