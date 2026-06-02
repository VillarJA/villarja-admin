# Villarja Admin Portal — Supabase Full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace every hardcoded value and no-op toast button with real Supabase reads/writes, and create the three missing tables needed to persist portal config, plan definitions, and contingency history.

**Architecture:** All mutations go directly through Supabase JS client (bypasses the CORS-blocked backend). New modal components handle form state. `data-layer.ts` gets mutation exports alongside the existing read functions. Chart data is aggregated from `ecf_documents` at query time.

**Tech Stack:** Next.js 16, React 19, Supabase JS v2.107.0, TypeScript, no new npm packages.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/001_portal_config.sql` | CREATE | Single-row config table for configuracion tab |
| `supabase/migrations/002_subscription_plans.sql` | CREATE | Plan catalog table + seed |
| `supabase/migrations/003_contingencia_eventos.sql` | CREATE | Contingency event history |
| `src/lib/data-layer.ts` | MODIFY | Add chart aggregates + all mutation fns |
| `src/components/modals/NuevoClienteModal.tsx` | CREATE | Form + Supabase INSERT |
| `src/components/modals/CambiarPlanModal.tsx` | CREATE | Plan selector + Supabase UPDATE |
| `src/components/modals/CrearSecuenciaModal.tsx` | CREATE | Sequence form + Supabase INSERT |
| `src/app/admin/dashboard/page.tsx` | MODIFY | Use real chart data |
| `src/app/admin/clientes/page.tsx` | MODIFY | Wire modal + CSV export |
| `src/app/admin/clientes/[id]/page.tsx` | MODIFY | Wire all actions |
| `src/app/admin/planes/page.tsx` | MODIFY | Real counts from DB |
| `src/app/admin/facturas/page.tsx` | MODIFY | CSV export + dynamic date |
| `src/app/admin/configuracion/page.tsx` | MODIFY | Load/save from Supabase |
| `src/app/admin/contingencia/page.tsx` | MODIFY | Real history + real KPIs |

---

### Task 1: SQL Migration — portal_config

**Files:** Create `supabase/migrations/001_portal_config.sql`

Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query):

```sql
CREATE TABLE IF NOT EXISTS portal_config (
  id boolean PRIMARY KEY DEFAULT true,
  CONSTRAINT single_row CHECK (id = true),
  admin_name text NOT NULL DEFAULT 'Villar JA — Admin',
  admin_email text NOT NULL DEFAULT 'admin@villarja.com',
  razon_social text NOT NULL DEFAULT 'Villar JA Data y Tecnología, SRL',
  rnc text NOT NULL DEFAULT '133-29871-4',
  ambiente_activo text NOT NULL DEFAULT 'eCF',
  url_recepcion text NOT NULL DEFAULT 'https://ecf.dgii.gov.do/fe/recepcion/api/ecf',
  url_consulta_estado text NOT NULL DEFAULT 'https://ecf.dgii.gov.do/fe/consultaestado',
  url_autenticacion text NOT NULL DEFAULT 'https://ecf.dgii.gov.do/fe/autenticacion/api/semilla',
  timeout_recepcion integer NOT NULL DEFAULT 30,
  cors_origins text NOT NULL DEFAULT 'https://app.villarja.com',
  forzar_https boolean NOT NULL DEFAULT true,
  rate_limiting boolean NOT NULL DEFAULT true,
  tfa_admin boolean NOT NULL DEFAULT true,
  rotacion_llaves boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO portal_config (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE portal_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated" ON portal_config FOR ALL USING (auth.role() = 'authenticated');
```

### Task 2: SQL Migration — subscription_plans

**Files:** Create `supabase/migrations/002_subscription_plans.sql`

```sql
CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  precio integer NOT NULL,
  facturas_limite integer NOT NULL,
  tipos_ecf text NOT NULL,
  empresas_limite integer NOT NULL,
  descripcion text,
  popular boolean DEFAULT false,
  features text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated" ON subscription_plans FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO subscription_plans VALUES
  ('basico','Básico',2500,500,'31, 32, 34',1,'Para emisores de bajo volumen',false,
   ARRAY['500 e-CF / mes','Tipos 31, 32, 34','1 empresa (RNC)','Soporte por correo','Ambiente testeCF + eCF']),
  ('pro','Pro',8900,5000,'31, 32, 33, 34, 41, 43',3,'El más elegido por las PYMEs',true,
   ARRAY['5,000 e-CF / mes','Tipos 31–34, 41, 43','Hasta 3 empresas','Soporte prioritario','Webhooks + reportes','Contingencia automática']),
  ('enterprise','Enterprise',29500,50000,'Todos los tipos e-CF',25,'Alto volumen y multi-empresa',false,
   ARRAY['50,000 e-CF / mes','Todos los tipos e-CF','Hasta 25 empresas','SLA 99.9% + soporte 24/7','Gerente de cuenta','Integración dedicada'])
ON CONFLICT DO NOTHING;
```

### Task 3: SQL Migration — contingencia_eventos

**Files:** Create `supabase/migrations/003_contingencia_eventos.sql`

```sql
CREATE TABLE IF NOT EXISTS contingencia_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('ok', 'cont')),
  evento text NOT NULL,
  detalle text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE contingencia_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated" ON contingencia_eventos FOR ALL USING (auth.role() = 'authenticated');
```

### Task 4: Extend data-layer.ts

Add to `src/lib/data-layer.ts`:
- `getChartData30d()` — daily invoice counts from ecf_documents
- `getDonutTipos()` — GROUP BY tipo_ecf for current month
- `getPortalConfig()` / `upsertPortalConfig()`
- `getPlanes()` — subscription_plans + client counts per plan
- `getContingenciaHist()` — queries contingencia_eventos
- `createCompany()` — INSERT companies with generated API key
- `updateCompanyEstado()` — UPDATE estado
- `updateCompanyPlan()` — UPDATE plan
- `regenerateApiKey()` — generate key + UPDATE
- `createSecuencia()` — INSERT sequences
- `writeAuditLog()` — INSERT audit_log

### Task 5–13: Page updates

See implementation below. Each page modification replaces toasts with real calls.
