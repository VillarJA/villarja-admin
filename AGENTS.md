<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<claude-mem-context>
# Memory Context

# [villarja-admin-portal] recent context, 2026-06-09 11:12pm AST

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (20,071t read) | 286,846t work | 93% savings

### Jun 9, 2026
S1020 Review and fix portal: tab icons, client certification status display, XML data sources, API validation, and Fluxgo Wizard replacement (Jun 9, 1:31 PM)
S1021 DGII certeCF certification UI: Step 3 approval test set modal + markStep error handling + badge CSS fixes, committed and pushed (Jun 9, 1:41 PM)
S1022 Fix Vercel deploy failure caused by missing `certStatus` field in Company type (Jun 9, 1:55 PM)
S1023 Fix "Ruta no encontrada: POST /api/v1/certification/progress" error on "Marcar como completado" button (Jun 9, 2:15 PM)
11147 2:19p 🔵 Missing API Route: POST /api/v1/certification/progress
11148 2:20p 🔵 Certification Progress API Committed But Not Pushed to Origin
11149 " 🔴 Deployed Certification Progress API Fix to Production
S1024 Fix "No autenticado" error appearing in the villarja-admin-portal when accessing certification progress endpoints (Jun 9, 2:20 PM)
11152 10:15p 🔵 Authentication Error: "No autenticado" Appearing in UI
11155 10:16p 🔵 villarja-ecf-api Has No TypeScript Source Files in Expected Locations
11156 " 🔵 villarja-ecf-api Full TypeScript Project Structure Mapped
11158 10:17p 🔵 villarja-ecf-api Express App Architecture and Route Authentication Model
11159 " 🔵 villarja-ecf-api API Key Auth Uses PostgreSQL RLS Context Per Request
11167 10:19p 🔵 villarja-ecf-api Full API Route Surface at /api/v1
11169 10:20p 🔵 Root Cause Found: "No autenticado" Comes from Certification Progress Endpoints Checking Wrong Auth Context
11170 " 🔴 Fixed "No autenticado" Bug in Certification Progress Endpoints
11173 10:21p 🔴 Certification Progress Fix Committed to villarja-ecf-api (commit 197c4b9)
11174 " ✅ Certification Progress Fix Pushed to GitHub — Render Auto-Deploy Triggered
S1025 Fix "No autenticado" error on certification progress endpoints — diagnosed, fixed, committed, pushed, and DB verified (Jun 9, 10:21 PM)
11177 10:23p 🔵 villarja-ecf-api Production Database Already Up to Date
S1027 Fix DGII eCF certification step 2: empty XML fields causing rejections, cases stuck at "enviado", and DGII rejection log not visible in admin portal (Jun 9, 10:23 PM)
11182 10:30p 🔵 DGII eCF Test Suite Rejection: Missing Required Fields in Step 2 Wizard
11183 " 🔵 eCF Certification Wizard Architecture: 15-Step DGII Process in villarja-admin-portal
11184 10:31p 🔵 CertificacionModal: Excel Parsed with '#e' Defaults; DGII Error Messages Truncated in UI
11185 " 🔵 Root Cause: Certification Cases Show 'sent' but Never Poll DGII for Acceptance; Column Header Mismatch Likely Empties Key Fields
11186 10:32p 🔵 dgii-client.service.ts: consultarResultado Exists but Is Never Called After sendCase
11188 10:35p 🔵 ECF API Route Map: No Status-Poll Endpoint for Certification Cases
11193 10:37p 🔴 certification.controller.ts: Import consultarResultado to Enable Post-Send DGII Status Polling
11194 10:38p 🔴 Fix DGII Excel Column Header Mismatch: normalizeExcelKey Strips Accents and Whitespace
11195 " ✅ normalizeExcelKey: Add ESLint Disable Comment for Unicode Regex
11196 10:39p 🔴 Fix Unicode Combining Character Encoding in normalizeExcelKey Regex
11197 " 🔴 normalizeExcelKey: Replace Literal Unicode Chars with \u0300-\u036f Escape Range
11199 10:40p 🔵 normalizeExcelKey Regex Still Shows Literal Unicode in Read Output After Python Replacement
11200 " 🔵 Confirmed: normalizeExcelKey Regex Uses Proper \u0300-\u036f Escape Sequences in Source File
11201 " 🔴 importTestSet: normalizeTestCaseKeys Now Applied at Import Time Before DB Storage
11202 " 🔴 sendCase: Inline DGII Error Field Now Triggers Immediate Rejection and Reset
11203 10:41p 🟣 New checkCaseStatus Endpoint: POST /certification/cases/:caseId/check Polls DGII for Final Acceptance
11204 " 🟣 Route Registered: POST /certification/cases/:caseId/check Now Live in ECF API
11205 " 🟣 Admin Portal Proxy Route Created: /api/certification/cases/[caseId]/check
11206 10:43p 🟣 CertificacionModal.tsx fully updated with DGII status verification and full error display
S1028 Fix DGII eCF certification step 2: empty XML fields causing rejections, cases stuck at "enviado", DGII rejection log not visible — all fixes implemented, committed, and pushed to GitHub (Jun 9, 10:46 PM)
S1030 After completing DGII certification fixes, investigated why a company might not appear in the clientes list — found silent error swallowing in getClientes() and improved error visibility + added manual refresh (Jun 9, 10:48 PM)
S1031 Full session: fix DGII eCF certification rejections (empty XML fields, silent errors, no status polling) + improve clientes page error visibility (Jun 9, 11:03 PM)
11231 11:08p 🔵 Clientes no visibles en UI tras correcciones de seguridad en Supabase
11232 " 🔵 Supabase RLS on `companies` table blocking client visibility after security changes
11233 11:09p 🔵 RLS policy requires `auth.role() = 'authenticated'` — anon key alone is insufficient to read `companies`
11234 " 🔵 No service role key — entire portal relies on anon key + Supabase Auth session for RLS access
11235 11:10p 🔵 Demo login bypasses Supabase Auth — causes silent RLS block on all `companies` queries
11236 " 🔵 No existen rutas API admin en src/app/api/admin/
11237 " 🟣 Creado cliente Supabase con Service Role Key para bypass de RLS
11238 " 🔵 Two parallel auth systems are decoupled — custom token guards routes but does not establish Supabase session for RLS
11239 " 🟣 Nueva ruta API GET /api/admin/companies con Service Role Key
11240 " 🟣 Nueva ruta API GET /api/admin/companies/[id] para detalle de empresa
11242 11:11p 🔵 data-layer.ts usa cliente anon de Supabase para getClientes(), sujeto a RLS
11241 " 🔵 Live probe confirmed: RLS silently returns empty array (not an error) for anon key queries on `companies`
11243 " 🔐 Logout only clears custom token — Supabase Auth session is never signed out
11244 " 🔴 getClientes() y getClienteById() migradas a rutas API con Service Role Key
11245 " 🔵 Dashboard silently shows zero KPIs when RLS blocks — no error handling unlike the clientes page fix
11246 " ✅ SUPABASE_SERVICE_ROLE_KEY añadida como placeholder vacío en .env.local
11247 11:12p 🔴 `getClientes()` refactored to use server-side API route with service role key instead of direct anon-key Supabase query

Access 287k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>