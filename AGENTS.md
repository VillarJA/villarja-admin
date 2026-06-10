<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<claude-mem-context>
# Memory Context

# [villarja-admin-portal] recent context, 2026-06-10 12:38pm AST

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (17,775t read) | 652,284t work | 97% savings

### Jun 10, 2026
S1040 Add XML download capability to CertificacionModal so admins can download signed XMLs for manual upload to the DGII certecf portal (required for tipo 32 &lt; RD$250K Step 2 manual upload) (Jun 10, 7:07 AM)
S1041 Fix DGII eCF XML rejection: "La estructura del archivo XML no es válido" for Factura de Consumo Electrónica &lt;250Mil — portal expects full eCF format, not RFCE summary (Jun 10, 7:24 AM)
S1042 Fix rechazo de Facturas de Consumo menores a 250,000 DOP al subir XML manualmente al portal DGII de certificación (T32 RFCE) (Jun 10, 8:58 AM)
S1043 Fix "S/D" placeholder appearing on printed ECF documents — add DireccionEmisor, Provincia, and Municipio fields to company creation form and ECF API fallback logic (Jun 10, 9:09 AM)
S1044 Test RFCE XML download to verify ECF XML now contains correct Emisor fields (no S/D placeholders) (Jun 10, 9:29 AM)
S1045 Fix DGII eCF certification test set rejections caused by IndicadorMontoGravado field validation errors — value 0 being sent when dataset expected empty, and vice versa (Jun 10, 9:45 AM)
S1046 Impeccable audit of villarja-admin-portal — comprehensive technical quality audit across accessibility, performance, theming, responsive design, and anti-patterns (Jun 10, 10:26 AM)
S1047 /impeccable audit on villarja-admin-portal — comprehensive accessibility, performance, theming, and responsive audit across all components and global stylesheet (Jun 10, 10:52 AM)
S1048 Impeccable audit of villarja-admin-portal — full technical quality scan across 5 dimensions with scored report (Jun 10, 11:12 AM)
11628 12:02p 🔴 certification.controller.ts: Replaced Live Clock FechaHoraFirma with Stable Noon Timestamp Derived from FechaEmision
11629 " 🔴 RFCE Certification: Removed Stale XML Cache Check — Always Rebuild XML on Each Submission
11630 " 🔴 XML Download Path in certification.controller.ts Also Patched to Always Rebuild Instead of Using Cached XML
11631 12:03p 🟣 Unit Test Added: Verifies Stable Certification Signature Timestamp Derived from FechaEmision
11632 " 🔵 All 5 Unit Tests Pass After Stable Timestamp Fix in certification.controller.ts
11633 " 🔵 villarja-ecf-api TypeScript Build Passes Clean After All certification.controller.ts Changes
11634 " ✅ Committed: "fix: rebuild certification manual xml from current set" — villarja-ecf-api master 19483c2
11635 " ✅ Fix Pushed to GitHub: villarja-ecf-api master a09c9d1..19483c2
11636 12:06p 🔵 Post-Fix Generated XML for E320000000012 Confirms MunicipioComprador and Stable Timestamp Are Present
11637 " 🔵 Impeccable Audit Skill — Reference Documentation Structure
11638 12:07p 🔵 DGII Test Data Stores Municipio as "#e" Placeholder — XML Builder Resolves It to MunicipioComprador=030307
11639 " 🔵 villarja-admin-portal Missing PRODUCT.md and DESIGN.md
11640 " 🔵 villarja-admin-portal Component Inventory
11641 12:08p 🔵 villarja-admin-portal Design System — globals.css Full Token Inventory
11642 " 🔵 villarja-admin-portal App Route Structure
11643 " 🔵 All 4 TipoeCF=32 Certification Cases Now Show estado="accepted" After Fix
11644 12:09p 🔵 No Hard-Coded Hex Colors in TSX Components — Theming Score Positive
11645 " 🔵 LineChart Has Hardcoded SVG Width (W=760) — Responsive Issue
11646 " 🔵 Dashboard Page Uses KPI Card Grid — Anti-Pattern Present
11647 " 🔵 CertificacionModal — Complex DGII Certification Test Workflow
11648 " 🔵 KPICard Has No ARIA Semantics — Accessibility Gap
11649 " 🔵 ToggleRow Switch Button Missing role="switch" and aria-checked — WCAG Violation
11650 12:13p 🔵 Fluxymed Certification Modal Step Audit Initiated
11651 " 🔵 Fluxymed vs VillarJA Certification Modal Audit Plan
11652 12:14p 🔵 VillarJA CertificacionTab: 15-Step Certification Flow Structure
11653 " 🔵 VillarJA CertificacionModal: Step 2 Test Set Upload & Send Flow
11654 " 🔵 Fluxymed Certification: 15-Step Wizard Structure in cert-client.tsx
11655 " 🔵 Fluxymed certification-actions.ts: Server Actions for 15-Step DGII Wizard
11656 12:15p 🔵 VillarJA CertificacionTab: Step 3 Uses AprobacionModal; Step 8 Tests Digital Signature
11657 " 🔵 VillarJA AprobacionModal: Step 3 Commercial Approval Excel Upload & Send
11658 " 🔵 Fluxymed Step 5 PDF Generator: RI Generation with 10MB Size Cap and DGII Slot Mapping
11659 " 🔵 Fluxymed Certification Session Initialization: Step 1 Auto-Completed, Paso4 State Pre-Built
11660 12:16p 🔵 VillarJA ECF API: Certification Progress Stored as companies Table Array; No Step Validation
11661 " 🔵 VillarJA ECF API: Case Rejection Resets All Sibling Cases; XML Download Re-Signs On-Demand
11662 12:17p 🔵 Fluxymed Steps 9 & 11: Real Receptor Logs Table vs VillarJA Textual Instructions
11663 " 🔵 Fluxymed Certification renderStepContent: Complete Component Mapping for All 15 Steps
11664 " ✅ Smoothed CSS animation easing curves across KPI and badge elements
11665 " 🔵 Audit Finding: VillarJA Steps 7/12 Show 3 URLs; Fluxymed Shows 4 (Missing Token URL)
11666 " ✅ Replaced hardcoded color values with CSS variable for dashboard text colors
11667 12:18p ✅ Added aria-label accessibility attribute to client search input
11668 " ✅ Enhanced toggle switch accessibility and theme support in configuration page
11669 " ✅ Made donut chart legend items keyboard accessible by converting to button elements
11670 12:19p ✅ Replaced hardcoded brand gradient color with CSS variable in logo elements
11671 " 🔄 Moved KPI grid layout from inline styles to CSS class
11672 " ✅ Added keyboard navigation support to clients table rows
11673 " 🔄 Converted XLSX library to dynamic import for lazy loading
11674 " 🔄 Moved chart grid layout from inline styles to CSS class
11675 " ✅ Added keyboard focus indicators and responsive grid classes to globals.css
11676 " 🔄 Completed dashboard grid layout refactoring by removing final inline style
11677 12:20p ✅ Added keyboard navigation to dashboard invoice table rows
S1049 /impeccable audit — comprehensive cleanup of animation easing, color hardcoding, accessibility, responsive design, and code splitting (Jun 10, 12:22 PM)
**Investigated**: Animation curves in globals.css (kpiPop, badgePop); hardcoded colors in logo gradients and component styles; accessibility patterns in interactive elements (toggles, tables, search inputs, chart legends); layout definitions across dashboard pages; Excel import loading strategy in certification modal

**Learned**: The codebase had scattered hardcoded color values and inline grid definitions reducing maintainability; animation easing was inconsistent (overshoot curves mixed with standard ease-out); interactive elements lacked semantic ARIA attributes and keyboard navigation; responsive design was missing entirely; heavy dependencies like XLSX were loaded statically even when unused. CSS variable system was already established but underutilized.

**Completed**: — Animation: unified kpiPop and badgePop easing curves to cubic-bezier(0.16, 1, 0.3, 1)
    — Colors: replaced #d33 with var(--brand-600), #9092a8 with var(--side-text-dim), #fff toggle knob with var(--surface)
    — Accessibility: added role="switch", aria-checked, aria-label to toggle buttons; added tabIndex={0} + onKeyDown(Enter) to 2 tables; added aria-label to search input; converted DonutChart legend divs to keyboard-focusable buttons; added :focus-visible rings for 11 element classes
    — Responsive: created .grid-kpi (4→2→1 col at breakpoints) and .grid-2col (2-col→1-col) classes; migrated all 3 dashboard grid layouts from inline styles to these classes
    — Performance: converted XLSX import to dynamic on-demand import in CertificacionModal
    — Build: production build passed clean (29s compile, TypeScript OK, 22 pages generated)

**Next Steps**: Session appears complete; build verified clean. If continuing, next targets would be: audit other components for remaining hardcoded colors or inline styles; extend keyboard navigation pattern to other clickable elements (modal buttons, pagination); review other charts/tables for same accessibility treatment; consider dark-mode validation of all color variable changes.


Access 652k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>