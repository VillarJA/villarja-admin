<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<claude-mem-context>
# Memory Context

# [villarja-admin-portal] recent context, 2026-06-03 2:29pm AST

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (15,862t read) | 1,254,775t work | 99% savings

### Jun 3, 2026
S902 Admin portal audit and fix: remove all hardcoded data, update login branding for multi-tenant scope (FluxyMed/FluxyGo), validate all buttons/pages, add animations, and write Playwright QA tests (Jun 3, 9:03 AM)
S903 Admin portal audit and fix: remove hardcoded data, rebrand login as multi-tenant portal (FluxyMed/FluxyGo), fix all stub buttons, add animations, write Playwright QA tests — then push to GitHub (Jun 3, 9:26 AM)
S904 Fix Vercel build failure caused by @playwright/test module not found in e2e/helpers.ts (Jun 3, 9:28 AM)
S905 Fix Vercel build failure: exclude Playwright files from Next.js TypeScript compilation (Jun 3, 9:35 AM)
S906 User asked whether the "superpower" skill always loads in this project when a prompt is launched (Jun 3, 9:40 AM)
S908 Audit del módulo clientes de villarja-admin-portal: verificar almacenamiento, migraciones, formulario de nuevo cliente (API keys por ambiente), y funcionalidad de botones (Jun 3, 9:54 AM)
S910 Run pending Supabase migrations for villarja-admin-portal and answer whether it's safe to change ambiente type on the same API key (Jun 3, 10:47 AM)
S912 Comprehensive validation of client management system focusing on data storage, API key generation per DGII environment, and UI functionality — implemented complete per-environment API key prefix system (vja_test_, vja_cert_, vja_live_) with automatic regeneration on environment change. (Jun 3, 11:52 AM)
9417 12:06p 🔵 DGII compliance constants: XSD schemas per tipo_ecf, buyer requirements, taxes, measurement units
9418 " 🔵 Token lifecycle: OAuth2-style semilla→sign→validate flow with 1-hour caching and 5-min reuse threshold
9419 " 🔵 API key validation: plain UUID lookup by exact match; environment determined by company.ambiente field, not key prefix
9420 12:11p 🔴 Fixed security gap: API key validation now checks company activa status
9421 " ✅ Added crypto.randomBytes import to admin controller in preparation for API key format standardization
9422 " ✅ Extended generateApiKey to support vja_cert prefix for certeCF environment
9423 " 🟣 Implemented environment-specific API key generation in backend admin controller
9424 12:12p ✅ Updated createCompany() to use environment-specific API key generation
9425 12:13p 🟣 Enhanced updateCompany() with automatic API key regeneration on ambiente change
9426 " ✅ Updated resetApiKey() to generate environment-specific keys
9427 " ✅ Added environment-to-prefix mapping and enhanced API key functions in frontend data layer
9429 " ✅ Integrated CambiarAmbienteModal into client detail page
9430 12:14p ✅ Added environment modal state to client detail page
9431 " ✅ Updated handleRegenerateKey to pass company ambiente to regenerateApiKey
9432 " ✅ Added "Cambiar Ambiente" button to client detail page header
9433 12:15p ✅ Added CambiarAmbienteModal rendering and handlers to client detail page
S914 Validate client storage, migrations, client form (API key per billing environment), and all buttons/functions in villarja-admin-portal (Jun 3, 12:18 PM)
9446 12:24p 🔵 Bug Report: Detail Page Fails to Load
9447 " 🟣 DGII RNC/Cedula Lookup on New Client Creation
9448 12:25p 🔵 Client Detail Page Structure in villarja-admin-portal
9449 " 🔵 Environment Configuration: Two Supabase Projects in villarja-admin-portal
9450 12:26p 🔵 Build Passes Clean — Detail Page Bug is Runtime, Not Compile-Time
9451 12:28p 🔵 PLAN_LIMITS Constant Defines Three Subscription Tiers in data.ts
9452 12:29p 🔵 NuevoClienteModal Current Structure — Target for DGII Padron Lookup Feature
9453 12:35p 🔴 Plan normalization and null-safety fixes in villarja-admin-portal
9454 " 🔵 villarja-admin-portal Supabase and API configuration confirmed
9455 " ✅ Second Supabase project added for DGII RNC/Cédula padrón lookup
9456 " 🟣 DGII RNC padrón lookup module created at src/lib/padron.ts
9457 12:36p 🟣 NuevoClienteModal upgraded with live DGII padrón RNC lookup and auto-fill
9458 12:37p 🔵 Next.js build fails on Windows with EPERM file lock on .next/static
9459 " 🔵 TypeScript type-check passes with zero errors after all changes
9460 " ✅ Committed plan normalization bugfix and DGII padrón feature to master (eb64c36)
9461 12:38p ✅ Pushed commit eb64c36 to GitHub remote VillarJA/villarja-admin-portal master
9462 12:41p 🔵 Confirmed rnc_contribuyentes table schema and DGII padrón anon key
9463 " 🔴 Fixed padron.ts mapper to match actual rnc_contribuyentes column names
9464 " 🟣 NuevoClienteModal adds 'suspended' padrón status and actividad económica tracking
9465 12:42p 🟣 NuevoClienteModal RNC lookup handler wired to suspended state and actividad económica
9466 " 🟣 NuevoClienteModal displays actividad económica inline and warns on suspended DGII taxpayers
9467 12:43p ✅ Committed corrected DGII padrón column mapping to master (b1cbfa3)
9468 12:44p ✅ Pushed b1cbfa3 to GitHub — DGII padrón integration complete on master
S915 Validate client storage/migrations, client form API key per billing environment, and all buttons/functions — villarja-admin-portal (Jun 3, 12:44 PM)
9473 1:40p 🔵 Supabase companies table uses legacy schema incompatible with portal migrations
9474 " 🔴 createCompany now auto-detects legacy schema and falls back to compatible insert payload
9475 " 🔴 Deleted hardcoded test company "Empresa Test SRL" from Supabase production database
9476 " ✅ data-layer getClientes/getFacturas/getSecuencias no longer fall back to mock data on Supabase errors
9477 " ✅ mapCompany now handles legacy companies schema with alias fallback and certificate path detection
9480 1:41p 🔵 Second npm build attempt failed with EPERM file lock on .next/static/chunks directory
9486 1:45p 🔵 updateCompanyPlan and updateCompanyAmbiente lack legacy schema normalization — may store wrong casing
9487 1:46p 🔵 Dev server not running; EPERM build failure caused by OneDrive sync locking .next directory
9493 1:47p ✅ Removed all mock data fallbacks from data-layer when Supabase is unconfigured
9495 1:48p ✅ Final verification: 3 tests passing, ESLint clean across all 7 modified source files after demo-data removal
9497 " ✅ Production build passes exit 0 after all schema-compatibility and demo-data removal changes

Access 1255k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>