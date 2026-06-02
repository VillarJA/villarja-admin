# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build — always run before committing
npm run lint     # ESLint
```

No test suite is configured yet.

## Stack specifics

**Next.js 16** has breaking changes from earlier versions:
- Route protection uses `src/proxy.ts` (not `middleware.ts`) — the exported function must be named `proxy`, not `middleware`
- Read `node_modules/next/dist/docs/` before touching routing, layouts, or data-fetching APIs

**Tailwind v4** — no `tailwind.config.js`. Configuration lives in `src/app/globals.css` via `@import "tailwindcss"` and `@theme` blocks. The `@import url(...)` for Google Fonts must come *before* `@import "tailwindcss"` or the build emits a CSS warning.

**React 19** — `use(params)` is the correct way to unwrap `params` in dynamic route pages (e.g. `[id]/page.tsx`), not direct destructuring.

## Architecture

All pages are Client Components (`'use client'`) — there are no Server Components with data fetching. Auth state lives in `localStorage` (token key: `vja_admin_token`) and is mirrored to a cookie of the same name so `src/proxy.ts` can enforce route protection on the server.

```
src/
  proxy.ts              # route protection (reads vja_admin_token cookie)
  lib/
    auth.ts             # token read/write/clear (localStorage + cookie)
    api.ts              # HTTP client — prepends Bearer token, redirects on 401
    data.ts             # all mock data (CLIENTES, FACTURAS, etc.) + formatters
  types/index.ts        # shared TypeScript types
  app/
    globals.css         # design tokens (CSS custom properties) + all component classes
    layout.tsx          # root layout — imports globals.css, sets lang="es"
    page.tsx            # redirects / → /admin/dashboard
    login/page.tsx      # login form; "demo" button bypasses the real API
    admin/
      layout.tsx        # checks isAuthenticated(), renders AdminLayout
      dashboard/        # KPIs, line chart, donut chart, DGII services
      clientes/         # paginated table; [id]/ = detail with API key + sequences tabs
      facturas/         # global e-CF table with status chip filters
      contingencia/     # queue + event history
      planes/           # plan cards + revenue table
      configuracion/    # tabbed settings (cuenta / DGII / seguridad / auditoría)
  components/
    Icons.tsx           # single Icon component backed by inline SVG path map
    layout/
      AdminLayout.tsx   # wires Sidebar + Topbar + dark-mode toggle + logout
      Sidebar.tsx       # NAV groups; "Próximamente" items rendered disabled
      Topbar.tsx        # breadcrumb, search, dark-mode, notifications, logout
      Logo.tsx          # loads logo from villarja.com with monogram fallback
    ui/                 # Badge, PlanPill, EstadoBadge, CoMark, KPICard, Pagination, Select, Toast
    charts/             # LineChart and DonutChart (SVG, no recharts — recharts is installed but unused)
```

## Design system

All visual tokens are CSS custom properties declared in `globals.css` (`:root` + `[data-theme="dark"]`). Components use these via inline `style` props or the named CSS classes (`.card`, `.btn`, `.badge`, `.kpi`, `.tbl`, etc.) — not Tailwind utility classes. Dark mode is toggled by setting `data-theme="dark"` on `<html>`.

Brand colours: `--brand: #a60005` (red), `--navy: #1a1a2e` (dark blue).

## Skills

Skills installed for this project (all global, available automatically):

| Skill | Cuándo usar |
|-------|-------------|
| `ui-ux-pro-max` | Al construir cualquier UI — activa automáticamente, categoría **Invoice & Billing Tool** |
| `minimalist-skill` | Variante de taste-skill para admin panels — clean, bento-grid, sin gradientes |
| `output-skill` | Si Claude empieza a dejar código incompleto |
| `redesign-skill` | Al auditar/refactorizar UI existente |
| `impeccable` | `/impeccable audit` antes de entregar módulos, `/impeccable polish` al final del sprint |
| `git-guardrails-claude-code` | Activa automáticamente — bloquea `git push --force`, `git reset --hard`, etc. |
| `superpowers:*` | Flujo completo: brainstorming → worktrees → plan → subagents → TDD → review |

**Diales recomendados para este proyecto** (admin panel interno Villar JA):
- DESIGN_VARIANCE = 2 (limpio, consistente)
- MOTION_INTENSITY = 1 (sin animaciones complejas)
- VISUAL_DENSITY = 5 (dashboard balanceado)

## Mock data vs. real API

`src/lib/data.ts` contains all mock data used by the pages. `src/lib/api.ts` defines `adminApi` with the real endpoint calls (`POST /admin/login`, `GET /admin/companies`, etc.) — pages currently import from `data.ts` directly. To wire a page to the real API, replace the `data.ts` import with a `useEffect` call to `adminApi`.

The backend base URL is `NEXT_PUBLIC_API_URL` (defaults to `https://ecf.villarja.com`).
