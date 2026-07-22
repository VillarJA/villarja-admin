-- The admin portal now uses server-side routes with the service role. Browser
-- clients must never read or mutate administrative data through the anon key.
DO $$
DECLARE
  target_table text;
  target_policy text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'companies', 'sequences', 'audit_log', 'portal_config', 'subscription_plans',
    'ecf_documents', 'received_ecf_documents', 'contingencia_cola', 'contingencia_eventos',
    'certification_cases', 'certification_progress', 'certification_simulation_cases',
    'company_dgii_root_certificates'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
      FOR target_policy IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = target_table
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', target_policy, target_table);
      END LOOP;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
