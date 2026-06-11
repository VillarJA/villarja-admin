<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<claude-mem-context>
# Memory Context

# [villarja-admin-portal] recent context, 2026-06-10 2:42pm AST

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (19,539t read) | 885,355t work | 98% savings

### Jun 10, 2026
S1042 Fix rechazo de Facturas de Consumo menores a 250,000 DOP al subir XML manualmente al portal DGII de certificación (T32 RFCE) (Jun 10, 8:58 AM)
S1043 Fix "S/D" placeholder appearing on printed ECF documents — add DireccionEmisor, Provincia, and Municipio fields to company creation form and ECF API fallback logic (Jun 10, 9:09 AM)
S1044 Test RFCE XML download to verify ECF XML now contains correct Emisor fields (no S/D placeholders) (Jun 10, 9:29 AM)
S1045 Fix DGII eCF certification test set rejections caused by IndicadorMontoGravado field validation errors — value 0 being sent when dataset expected empty, and vice versa (Jun 10, 9:45 AM)
S1046 Impeccable audit of villarja-admin-portal — comprehensive technical quality audit across accessibility, performance, theming, responsive design, and anti-patterns (Jun 10, 10:26 AM)
S1047 /impeccable audit on villarja-admin-portal — comprehensive accessibility, performance, theming, and responsive audit across all components and global stylesheet (Jun 10, 10:52 AM)
S1048 Impeccable audit of villarja-admin-portal — full technical quality scan across 5 dimensions with scored report (Jun 10, 11:12 AM)
S1049 /impeccable audit — comprehensive cleanup of animation easing, color hardcoding, accessibility, responsive design, and code splitting (Jun 10, 12:12 PM)
S1050 Commit + push impeccable audit fixes for villarja-admin-portal (Jun 10, 12:22 PM)
11700 12:50p 🔵 Wizard Step Progress IS Persisted in DB via companies Table Columns
11701 " 🔵 DGII Certification Controller: Full Logic for e-CF Test Set, RFCE, and Send Order
11704 12:53p 🔵 Admin Portal Has Own dgii-docs Copy With XSD Files and Page Screenshots
11705 " 🔵 AprobacionModal is Step 3 of certeCF — State Is Purely In-Memory
11706 " 🔵 CertificacionModal Handles DGII Test Set (Not the 15-Step Progress) — Fully API-Backed
11707 " 🔵 villarja-ecf-api Full Route Surface Including PDF, Catálogos, and All DGII Proxy Endpoints
11708 " 🔵 Initial DB Schema: Companies Table Has url_recepcion, url_aprobacion, url_autenticacion Fields
11709 1:01p ⚖️ DGII e-CF Wizard 15-Step Audit Plan — Steps 3–15 Realignment
11710 " 🟣 AprobacionModal Step 3 — onAllSent Callback and useEffect Added for State Persistence
11711 1:02p 🟣 Step 3 AprobacionModal — localStorage Persistence and Auto-Completion Signal Implemented
11712 " 🟣 Step 3 AprobacionModal — All-Done Banner and localStorage Cache Clear on New Excel
11713 " 🟣 CertificacionTab — Token URL Added and Full DGII e-CF Type Registry Defined
11714 1:03p 🟣 TypeCheckRow Component Added for Per-Type e-CF Checklist in Steps 5–6
11715 " 🟣 checkedRITypes State Added to CertificacionTab for Steps 5–6 Per-Type Checklist
11716 " 🟣 Step 3 Auto-Completion Fully Wired — onAllSent Triggers markStep(3) in CertificacionTab
11717 " ✅ Step 3 Wizard Copy Aligned with DGII ACECF Terminology and Auto-Complete Explained
11718 1:04p 🟣 Step 4 Simulation — Prerequisite Warning and Per-Type e-CF Reference Table Added
11719 1:06p 🟣 Step 5 Redesigned — Prerequisite Alert, TypeCheckRow for T31, and Corrected PDF Instructions
11720 " 🟣 Step 6 Redesigned — ECF_TYPES_RI Checklist for Types 32–47 with Per-Type TypeCheckRow
11721 " 🟣 Step 7 Updated — 4 URLs Exposed (Added Autenticación Token URL)
11722 " 🟣 Steps 9, 10, 11 Updated — ARECF/ACECF Terminology, Active URL Cards, Paso 7 Back-reference Added
11723 1:07p 🟣 Step 12 Updated — 4 Production URLCards with Token Endpoint and Consistency Note Added
S1051 DGII e-CF Certification Wizard Audit and Redesign — Steps 3–12 full overhaul with persistence, 4-URL registration, interactive RI checklist, ARECF/ACECF terminology, and prerequisite alerts (Jun 10, 1:08 PM)
11728 1:20p 🔵 villarja-admin-portal has only AGENTS.md modified
11729 " 🔵 villarja-admin-portal: existing feature coverage mapped via codebase search
11730 1:21p 🔵 CertificacionTab implements all 15 DGII certification steps with full UI logic
11731 " 🔵 villarja-ecf-api backend has PDF generation, updateProgress, and checkCaseStatus endpoints
11732 " 🔵 AprobacionModal implements Step 3 ACECF Excel import with localStorage persistence
11733 " 🔵 DGII XSD Schema Contains Invalid Regex Pattern in Date Validation
11735 " 🔵 villarja-ecf-api Project Structure for ACECF Document Type
11734 " 🔵 villarja-admin-portal API routes are thin proxies to villarja-ecf-api backend
11736 " 🔵 Client detail page has 4 tabs: Secuencias, Facturas, Recepciones, Certificación with full CRUD
11737 1:22p 🔵 XSD Files Exist in Two Locations: dgii-docs/xsd/ (originals) and src/xsd/ (active)
11738 " 🔵 CertificacionModal exists alongside CertificacionTab, handles test-set case status checks
11739 " 🔵 XSD Validation Architecture: xmllint-wasm with Multi-Path Fallback Resolution
11740 " 🔵 Exact Location of Invalid XSD Regex: DateValidation simpleType at Line 72
11741 " 🔵 CertificacionModal manages Step 2 DGII test-set: import, send, async poll, XML download, and reset
11742 " 🔵 KNOWN_DGII_SCHEMA_FIXES Mechanism Already Exists for Patching Broken DGII Schemas at Runtime
11743 1:23p 🔵 villarja-ecf-api PDF generation uses XML parsing with DB fallback for missing fields
11744 " 🔵 villarja-admin-portal missing DGII root certificate (.cer) upload requirement for Step 8
11745 1:24p 🔵 Both XSD Copies Contain Identical Broken Pattern — Confirming Bug is in Original DGII-Issued Schema
11746 " 🔴 Fixed Invalid XSD Regex in ACECF_v_1_0.xsd DateValidation Pattern
11747 " 🔴 Applied Same DateValidation Regex Fix to dgii-docs/xsd/ACECF_v_1_0.xsd Reference Copy
11748 1:25p 🔵 RFCE_32_v_1_0.xsd Contains Three Additional Invalid Non-Capturing Group Patterns
11749 " 🔵 RFCE_32_v_1_0.xsd FechaType Has Two Bugs: Invalid (?:19|20) and Erroneous $ in Character Class
11750 " 🔵 RFCE_32_v_1_0.xsd Decimal Types Confirmed: Three Types Use Invalid (?:.[0-9]{2})? Optional Group
11751 " 🔴 Fixed Invalid (?:19|20) Non-Capturing Group in RFCE_32_v_1_0.xsd FechaType
11752 " 🔴 Fixed All Three Decimal Type Non-Capturing Groups in RFCE_32_v_1_0.xsd with Escaped Dot
11753 1:26p 🔵 Glob Pattern Limitation: Relative Sub-Path Patterns Fail to Match When Combined with Explicit Base Path
11754 " 🔵 dgii-docs/xsd/RFCE_32_v_1_0.xsd Still Has the Broken (?:19|20) Pattern — Not Yet Patched
11755 " 🔴 Fixed (?:19|20) in dgii-docs/xsd/RFCE_32_v_1_0.xsd FechaType — Three Decimal Patterns Still Unpatched in Reference Copy

Access 885k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>