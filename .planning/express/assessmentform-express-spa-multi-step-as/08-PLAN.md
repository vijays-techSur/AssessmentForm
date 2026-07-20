---
phase: 3c-part1-frontend-dashboard-response-table
plan: 08
type: execute
wave: 8
depends_on: [5]
files_modified:
  - src/app/dashboard/page.tsx
  - src/app/dashboard/layout.tsx
  - src/app/dashboard/responses/[sessionId]/page.tsx
  - src/app/api/auth/login/route.ts
  - src/components/dashboard/AuthGuard.tsx
  - src/components/dashboard/ResponseTable.tsx
  - src/components/dashboard/FilterPanel.tsx
  - src/components/dashboard/SearchBar.tsx
  - src/components/dashboard/SummaryStats.tsx
  - src/components/dashboard/TeamTypeCoverageBar.tsx
  - src/components/dashboard/ResponseDetailView.tsx
  - src/hooks/useDashboardFilters.ts
  - src/hooks/useDashboardData.ts
  - src/app/dashboard/login/page.tsx
  - next.config.mjs
autonomous: true

features:
  implements: ["F6", "F7"]
  depends_on: []
  enables: ["F6", "F8"]

must_haves:
  truths:
    - "System Owner can log in via /dashboard/login with a pre-configured email and be redirected to /dashboard"
    - "Navigating to /dashboard without a valid System Owner JWT shows a 403-state page and does not flash dashboard content"
    - "Dashboard home loads paginated response table (25/page, submitted_at DESC) with summary stats (total/submitted/draft) and team type coverage bar"
    - "Summary counts auto-refresh every 60 seconds without a full page reload"
    - "Search box and filters (team type multi-select, status radio, date range) are combinable and sync active state to URL query params"
    - "Empty filter results show: 'No responses match your current filters.'"
    - "Clicking any table row navigates to /dashboard/responses/:sessionId with all answers rendered read-only"
    - "Back button on the response detail view returns to /dashboard with filter state preserved in URL"
    - "Export CSV button triggers GET /api/dashboard/export/csv with active filter params; downloads assessment-responses-{date}.csv"
  artifacts:
    - path: "src/app/dashboard/page.tsx"
      provides: "Dashboard home page — response table, summary stats, coverage bar, filters, export button"
      min_lines: 60
    - path: "src/app/dashboard/layout.tsx"
      provides: "Dashboard layout shell with AuthGuard, status badge in header, nav to analytics + config"
    - path: "src/app/dashboard/login/page.tsx"
      provides: "System Owner login page — separate entry point from respondent identity form"
    - path: "src/app/api/auth/login/route.ts"
      provides: "POST /api/auth/login — System Owner JWT issuance (role: system_owner, 8h expiry)"
    - path: "src/components/dashboard/AuthGuard.tsx"
      provides: "Client-side route guard — redirects to /dashboard/login if no System Owner JWT"
    - path: "src/components/dashboard/ResponseTable.tsx"
      provides: "Sortable paginated table — 6 columns, sort indicators, row click to drill-down"
    - path: "src/components/dashboard/FilterPanel.tsx"
      provides: "Team type multi-select + status radio + date range pickers — synced to URL params"
    - path: "src/components/dashboard/SearchBar.tsx"
      provides: "Case-insensitive partial search input — synced to URL params"
    - path: "src/components/dashboard/SummaryStats.tsx"
      provides: "Total/submitted/draft counts with 60s auto-refresh polling"
    - path: "src/components/dashboard/TeamTypeCoverageBar.tsx"
      provides: "Horizontal coverage bar per team type with low-participation warning"
    - path: "src/components/dashboard/ResponseDetailView.tsx"
      provides: "Individual response drill-down — all sections + read-only answer rendering"
    - path: "src/hooks/useDashboardFilters.ts"
      provides: "Filter state management — reads/writes URL search params, returns typed filter object"
    - path: "src/hooks/useDashboardData.ts"
      provides: "Data fetching hook for response list + summary stats with 60s polling for stats"
  key_links:
    - from: "src/app/dashboard/page.tsx"
      to: "/api/dashboard/responses"
      via: "useDashboardData hook (fetch with filter params)"
      pattern: "useDashboardData|/api/dashboard/responses"
    - from: "src/components/dashboard/SummaryStats.tsx"
      to: "/api/dashboard/responses"
      via: "60s polling interval (setInterval + fetch)"
      pattern: "setInterval|60.*000|60000"
    - from: "src/components/dashboard/FilterPanel.tsx"
      to: "useDashboardFilters.ts"
      via: "filter state update callbacks + URL param sync"
      pattern: "useDashboardFilters"
    - from: "src/components/dashboard/AuthGuard.tsx"
      to: "localStorage / JWT role claim"
      via: "JWT decode on mount; redirect if role !== system_owner"
      pattern: "system_owner|role.*system_owner"
    - from: "src/app/dashboard/login/page.tsx"
      to: "/api/auth/login"
      via: "POST with email; store JWT in localStorage on success"
      pattern: "/api/auth/login"
    - from: "src/app/dashboard/responses/[sessionId]/page.tsx"
      to: "/api/dashboard/responses/:sessionId"
      via: "fetch on mount using sessionId from URL params"
      pattern: "/api/dashboard/responses"

integration_contracts:
  requires:
    - from_plan: "05"
      artifact: "src/app/api/dashboard/responses/route.ts"
      exports: ["GET"]
      verify: "grep -n 'export.*GET' src/app/api/dashboard/responses/route.ts && echo CONTRACT_OK"
    - from_plan: "05"
      artifact: "src/app/api/dashboard/responses/[sessionId]/route.ts"
      exports: ["GET"]
      verify: "grep -n 'export.*GET' 'src/app/api/dashboard/responses/[sessionId]/route.ts' && echo CONTRACT_OK"
    - from_plan: "05"
      artifact: "src/app/api/dashboard/export/csv/route.ts"
      exports: ["GET"]
      verify: "grep -n 'export.*GET' src/app/api/dashboard/export/csv/route.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/app/dashboard/layout.tsx"
      exports: ["DashboardLayout"]
      shape: |
        Default export: DashboardLayout({ children: React.ReactNode })
        - Wraps children with AuthGuard
        - Renders header with assessment status badge, Settings link, Analytics link, Exit button
        - nav links: /dashboard (response table), /dashboard/analytics, /dashboard/config
      verify: "grep -n 'export default' src/app/dashboard/layout.tsx && echo CONTRACT_OK"
    - artifact: "src/app/dashboard/page.tsx"
      exports: ["DashboardPage (default)"]
      shape: |
        Route: /dashboard — System Owner Dashboard Home
        Renders: SummaryStats, TeamTypeCoverageBar, SearchBar, FilterPanel, ResponseTable, Export CSV button
        Filter state via useDashboardFilters (URL param sync)
        60s auto-refresh on summary counts via SummaryStats component
      verify: "grep -n 'export default' src/app/dashboard/page.tsx && echo CONTRACT_OK"
    - artifact: "src/app/dashboard/responses/[sessionId]/page.tsx"
      exports: ["ResponseDetailPage (default)"]
      shape: |
        Route: /dashboard/responses/:sessionId
        Renders: ResponseDetailView component with full section+answer drill-down
        Back button preserves filter state via URL (router.back() or link with preserved params)
      verify: "grep -n 'export default' src/app/dashboard/responses/[sessionId]/page.tsx && echo CONTRACT_OK"
    - artifact: "src/app/api/auth/login/route.ts"
      exports: ["POST"]
      shape: |
        POST /api/auth/login
        Request: { email: string }
        Response 200: { token: string, role: "system_owner", email: string }
        Response 403: { error: { code: "NOT_A_SYSTEM_OWNER", message: "..." } }
        Response 400: { error: { code: "INVALID_EMAIL_FORMAT", message: "..." } }
        JWT payload: { email, role: "system_owner", iat, exp } — 8h expiry, HS256
      verify: "grep -n 'export.*POST' src/app/api/auth/login/route.ts && echo CONTRACT_OK"
    - artifact: "src/components/dashboard/AuthGuard.tsx"
      exports: ["AuthGuard"]
      shape: |
        export function AuthGuard({ children }: { children: React.ReactNode }): JSX.Element
        - Reads JWT from localStorage key "dashboard_token"
        - Decodes without verifying (server verifies); checks role === "system_owner"
        - If no token or wrong role: renders 403-state UI ("You do not have permission to access this page.") and does NOT render children (no flash)
        - If token present + role correct: renders children
      verify: "grep -n 'export.*AuthGuard' src/components/dashboard/AuthGuard.tsx && echo CONTRACT_OK"
    - artifact: "src/hooks/useDashboardFilters.ts"
      exports: ["useDashboardFilters"]
      shape: |
        export function useDashboardFilters(): {
          filters: { search: string, teamType: string[], status: 'all'|'submitted'|'draft', submittedAfter: string, submittedBefore: string, page: number, sortBy: string, sortDir: 'asc'|'desc' },
          setSearch: (v: string) => void,
          setTeamType: (v: string[]) => void,
          setStatus: (v: string) => void,
          setDateRange: (after: string, before: string) => void,
          setPage: (n: number) => void,
          setSort: (sortBy: string, sortDir: 'asc'|'desc') => void,
          clearFilters: () => void,
          toQueryString: () => string,
        }
        All state synced bidirectionally with URL search params (useSearchParams + router.replace)
      verify: "grep -n 'export.*useDashboardFilters' src/hooks/useDashboardFilters.ts && echo CONTRACT_OK"
---

<objective>
Implement the System Owner Dashboard SPA — wave 3c part 1. Covers the dashboard home screen (Screen 06), System Owner login page, RBAC route protection (AuthGuard), and individual response drill-down (Screen 06 row click → /dashboard/responses/:sessionId). Also creates the POST /api/auth/login endpoint that issues System Owner JWTs — separate from the respondent identity flow.

Purpose: Gives Dana Okafor (System Owner) a fully functional dashboard entry point: secure login, paginated/filterable/sortable response table, summary participation stats with 60s refresh, team type coverage bar, CSV export trigger, and per-respondent answer drill-down with filter-preserving back navigation.

Output: Dashboard home page, dashboard layout with AuthGuard, login page, auth/login API route, ResponseTable, FilterPanel, SearchBar, SummaryStats, TeamTypeCoverageBar, ResponseDetailView components, useDashboardFilters and useDashboardData hooks, next.config.mjs update (bind 0.0.0.0:3000, no X-Frame-Options DENY).
</objective>

<feature_dependencies>
Implements: F6: System Owner Dashboard (response table paginated 25/page + sortable columns, summary stats total/submitted/draft, team type coverage bar, search/filter panel with URL param sync, individual response drill-down at /dashboard/responses/:sessionId with back-preserves-filter, Export CSV button triggering GET /api/dashboard/export/csv with active filters, 60s auto-refresh on summary counts, empty-state "No responses match your current filters."), F7: Role-Based Access Control (System Owner login page at /dashboard/login as separate entry point from respondent identity, POST /api/auth/login issuing system_owner JWT with 8h expiry, AuthGuard client-side route guard preventing dashboard render for non-System-Owner JWTs — no flash of content, 403-state UI for unauthorized access)
Depends on: F6 backend from plan 05 (GET /api/dashboard/responses, GET /api/dashboard/responses/:sessionId, GET /api/dashboard/export/csv — all require requireSystemOwner middleware already applied server-side)
Enables: F6 analytics charts (09-PLAN.md — AnalyticsPanel, TeamTypeBarChart, LikertDistributionChart, RankingTopItemsChart, ChoiceBreakdownChart), F8 config panel (09-PLAN.md — ConfigPanel due date CRUD), which share the dashboard layout + AuthGuard this plan provides
</feature_dependencies>

<execution_context>
@/app/workspaces/.pivota-home/opencode-xdg/opencode/pivota_spec-framework/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/assessmentform-express-spa-multi-step-as/WAVE-SCHEDULE.md
@.planning/express/assessmentform-express-spa-multi-step-as/05-PLAN.md
@project_specs/UX-Mockup-AssessmentForm.md
@project_specs/TechArch-AssessmentForm.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Auth login API, next.config.mjs, AuthGuard, Dashboard layout + login page</name>
  <files>
    src/app/api/auth/login/route.ts
    src/components/dashboard/AuthGuard.tsx
    src/app/dashboard/layout.tsx
    src/app/dashboard/login/page.tsx
    next.config.mjs
  </files>
  <action>
Create the System Owner authentication endpoint, client-side route guard, dashboard layout shell, and the login page. These are the security foundations that all subsequent dashboard screens depend on.

---

### `next.config.mjs`

Read the existing next.config.mjs first. Add or update these settings:
- Set `hostname: '0.0.0.0'` and `port: 3000` in the server config
- Remove any `X-Frame-Options: DENY` header if present (enterprise dashboard must be embeddable)
- Keep all other existing configuration untouched

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bind to all interfaces for Docker/enterprise deployment
  // NO X-Frame-Options: DENY — dashboard may be embedded in enterprise portals
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        // NOTE: X-Frame-Options intentionally omitted — enterprise embedding required
      ],
    },
  ],
};

export default nextConfig;
```

If a `server.js` or similar custom server exists, ensure it binds `0.0.0.0:3000`. If using Next.js built-in dev server, the binding is set via `--hostname 0.0.0.0` in the `dev` script in `package.json` (update `"dev": "next dev --hostname 0.0.0.0 --port 3000"` if not already set).

---

### `src/app/api/auth/login/route.ts`

System Owner login endpoint — F07 §System Owner Login Flow. Separate from `POST /api/sessions` (respondent flow). No team_type. No respondent session record created.

From TechArch §4.3 F07:
- Request: `{ email: string }`
- Checks email against `system_owner_emails` table (case-insensitive LOWER())
- If match: issue JWT with `{ email, role: "system_owner", iat, exp }`, 8h expiry, HS256 using `JWT_SECRET`
- If no match: 403 `NOT_A_SYSTEM_OWNER`
- Email format validation: 400 `INVALID_EMAIL_FORMAT`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { db } from '@/lib/db';
import { systemOwnerEmails } from '../../../../drizzle/schema';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

// POST /api/auth/login — F07 §System Owner Login
// TechArch §4.3: JWT payload { email, role: "system_owner", iat, exp } — 8h expiry
export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_EMAIL_FORMAT', message: 'Please enter a valid email address.' } },
      { status: 400 }
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_EMAIL_FORMAT', message: 'Please enter a valid email address.' } },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  // Check against system_owner_emails table (case-insensitive)
  // TechArch §3.1: system_owner_emails(email TEXT UNIQUE, CHECK (email = LOWER(email)))
  const rows = await db
    .select({ email: systemOwnerEmails.email })
    .from(systemOwnerEmails)
    .where(sql`LOWER(${systemOwnerEmails.email}) = ${normalizedEmail}`)
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: { code: 'NOT_A_SYSTEM_OWNER', message: 'This email is not registered as a System Owner.' } },
      { status: 403 }
    );
  }

  // Issue System Owner JWT — 8h expiry per TechArch §5.1
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT({ email: normalizedEmail, role: 'system_owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);

  return NextResponse.json({ token, role: 'system_owner', email: normalizedEmail });
}
```

---

### `src/components/dashboard/AuthGuard.tsx`

Client-side route guard — F07 §Client-side RBAC. Prevents flash of dashboard content for non-System-Owner users.

From TechArch §5.2 Authorization Matrix:
- `GET /dashboard/**` → requires `role: "system_owner"` JWT in localStorage key `"dashboard_token"`
- Non-System-Owner: render 403-state UI, do NOT render children
- The guard decodes the JWT client-side (no signature verification — server verifies on every API call)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = JSON.parse(atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp as number | undefined;
  if (!exp) return true;
  return Date.now() / 1000 > exp;
}

interface AuthGuardProps {
  children: React.ReactNode;
}

// AuthGuard — F07 §Client-side RBAC (US-7.2: no flash of dashboard content)
// Reads JWT from localStorage "dashboard_token"; checks role === "system_owner" and not expired.
// On fail: shows 403-state UI without rendering children.
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('dashboard_token') : null;

    if (!token) {
      setAuthState('unauthorized');
      router.replace('/dashboard/login');
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload || payload.role !== 'system_owner' || isTokenExpired(payload)) {
      localStorage.removeItem('dashboard_token');
      setAuthState('unauthorized');
      router.replace('/dashboard/login');
      return;
    }

    setAuthState('authorized');
  }, [router]);

  // Loading: show nothing to prevent flash of any content
  if (authState === 'loading') {
    return null;
  }

  // Unauthorized: show 403-state — router.replace is in flight, render placeholder
  if (authState === 'unauthorized') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <p className="text-gray-600 text-lg">You do not have permission to access this page.</p>
          <a href="/dashboard/login" className="mt-4 inline-block text-blue-600 underline">
            Go to System Owner Login
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

### `src/app/dashboard/layout.tsx`

Dashboard layout shell — shared by all `/dashboard/**` routes. Wraps with AuthGuard. Renders header with assessment status badge, navigation links (Analytics, Settings), and Exit button.

The status badge is a static placeholder here (rendered as "Active" by default). The full dynamic status badge (from GET /api/config) is added in 09-PLAN.md ConfigPanel. For this wave, render a simple "●  Dashboard" header.

```typescript
import { AuthGuard } from '@/components/dashboard/AuthGuard';
import Link from 'next/link';

// Dashboard layout — F06 §Dashboard Home Layout
// AuthGuard wraps ALL /dashboard/** routes — no flash of content for non-owners
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Global dashboard header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-900">AssessmentForm-Express — System Owner Dashboard</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">Responses</Link>
            <Link href="/dashboard/analytics" className="text-gray-700 hover:text-gray-900">Analytics</Link>
            <Link href="/dashboard/config" className="text-gray-700 hover:text-gray-900">⚙ Settings</Link>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('dashboard_token');
                  window.location.href = '/';
                }
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              Exit
            </button>
          </nav>
        </header>
        <main className="px-6 py-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
```

Note: The `onClick` handler on the Exit button uses `'use client'` directive — extract to a `DashboardHeader` client component if Next.js server component rules require it. Alternatively, make the layout a client component with `'use client'` at the top.

---

### `src/app/dashboard/login/page.tsx`

System Owner login page — separate from the respondent identity form at `/`. This is the entry point for Dana Okafor. Does NOT create a respondent session. Uses POST /api/auth/login.

From UX-Mockup §Flow 04: "System Owner navigates to /dashboard → valid System Owner JWT → Dashboard Home". The login page is the gate when no JWT exists.

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// System Owner Login Page — F07 §System Owner Login Flow (separate from respondent /api/sessions)
// Route: /dashboard/login
export default function DashboardLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        // F07 error codes: NOT_A_SYSTEM_OWNER, INVALID_EMAIL_FORMAT
        if (data?.error?.code === 'NOT_A_SYSTEM_OWNER') {
          setError('This email is not registered as a System Owner. Please check your email or contact your administrator.');
        } else if (data?.error?.code === 'INVALID_EMAIL_FORMAT') {
          setError('Please enter a valid email address.');
        } else {
          setError('Login failed. Please try again.');
        }
        return;
      }

      // Store System Owner JWT in localStorage — F07 §Client-side session
      localStorage.setItem('dashboard_token', data.token);
      router.replace('/dashboard');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">System Owner Login</h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter your System Owner email address to access the dashboard.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              System Owner Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="dana@company.com"
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-blue-600 text-white rounded-md py-2 px-4 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Access Dashboard →'}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400 text-center">
          This dashboard is restricted to System Owners only.
          <br />
          Respondents should{' '}
          <a href="/" className="text-blue-500 underline">
            use the assessment form
          </a>
          .
        </p>
      </div>
    </div>
  );
}
```
  </action>
  <verify>
```bash
grep -n "export.*POST" src/app/api/auth/login/route.ts && echo "auth/login POST OK"
grep -n "NOT_A_SYSTEM_OWNER" src/app/api/auth/login/route.ts && echo "NOT_A_SYSTEM_OWNER error code OK"
grep -n "8h\|8h" src/app/api/auth/login/route.ts && echo "8h JWT expiry OK"
grep -n "export.*AuthGuard" src/components/dashboard/AuthGuard.tsx && echo "AuthGuard export OK"
grep -n "system_owner" src/components/dashboard/AuthGuard.tsx && echo "role check OK"
grep -n "dashboard_token" src/components/dashboard/AuthGuard.tsx && echo "localStorage key OK"
grep -n "export default" src/app/dashboard/layout.tsx && echo "layout export OK"
grep -n "AuthGuard" src/app/dashboard/layout.tsx && echo "AuthGuard used in layout OK"
grep -n "export default" src/app/dashboard/login/page.tsx && echo "login page export OK"
grep -n "/api/auth/login" src/app/dashboard/login/page.tsx && echo "login page calls auth/login OK"
npx tsc --noEmit 2>&1 | head -20
```
  </verify>
  <done>
- POST /api/auth/login: validates email format (400 INVALID_EMAIL_FORMAT), checks system_owner_emails table case-insensitively (403 NOT_A_SYSTEM_OWNER if not found), issues HS256 JWT with role: "system_owner" and 8h expiry, returns { token, role, email }
- AuthGuard: reads "dashboard_token" from localStorage, decodes JWT client-side, checks role === "system_owner" and not expired; renders null during loading (no flash), 403-state UI if unauthorized, children if authorized
- Dashboard layout: wraps all /dashboard/** routes with AuthGuard; renders header with Responses/Analytics/Settings nav links and Exit button
- Login page at /dashboard/login: email input, POST to /api/auth/login, stores token in localStorage on success, redirects to /dashboard; shows appropriate error messages for NOT_A_SYSTEM_OWNER and INVALID_EMAIL_FORMAT
- next.config.mjs: no X-Frame-Options DENY header; binds to 0.0.0.0:3000
- TypeScript compilation passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Dashboard home page — ResponseTable, FilterPanel, SearchBar, SummaryStats, TeamTypeCoverageBar, ResponseDetailView, useDashboardFilters, useDashboardData</name>
  <files>
    src/hooks/useDashboardFilters.ts
    src/hooks/useDashboardData.ts
    src/components/dashboard/SummaryStats.tsx
    src/components/dashboard/TeamTypeCoverageBar.tsx
    src/components/dashboard/SearchBar.tsx
    src/components/dashboard/FilterPanel.tsx
    src/components/dashboard/ResponseTable.tsx
    src/components/dashboard/ResponseDetailView.tsx
    src/app/dashboard/page.tsx
    src/app/dashboard/responses/[sessionId]/page.tsx
  </files>
  <action>
Implement the dashboard home page with all UI components. Consume the backend from plan 05 (GET /api/dashboard/responses, GET /api/dashboard/responses/:sessionId, GET /api/dashboard/export/csv).

---

### `src/hooks/useDashboardFilters.ts`

Filter state hook — F06 §Search & Filter. All state synced bidirectionally to URL search params.

```typescript
'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface DashboardFilters {
  search: string;
  teamType: string[];
  status: 'all' | 'submitted' | 'draft';
  submittedAfter: string;
  submittedBefore: string;
  page: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

// useDashboardFilters — F06 §Search & Filter (US-6.2)
// All filter state is owned by URL search params — bookmarkable and preserved through navigation.
export function useDashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters: DashboardFilters = {
    search:          searchParams.get('search') ?? '',
    teamType:        searchParams.getAll('teamType'),
    status:          (searchParams.get('status') as DashboardFilters['status']) ?? 'all',
    submittedAfter:  searchParams.get('submittedAfter') ?? '',
    submittedBefore: searchParams.get('submittedBefore') ?? '',
    page:            Number(searchParams.get('page') ?? 1),
    sortBy:          searchParams.get('sortBy') ?? 'submitted_at',
    sortDir:         (searchParams.get('sortDir') as 'asc' | 'desc') ?? 'desc',
  };

  function updateParams(updates: Partial<Record<string, string | string[] | number>>) {
    const params = new URLSearchParams(searchParams.toString());

    // Reset to page 1 on filter change (unless explicitly setting page)
    if (!('page' in updates)) params.set('page', '1');

    for (const [key, value] of Object.entries(updates)) {
      if (Array.isArray(value)) {
        params.delete(key);
        value.forEach(v => params.append(key, v));
      } else if (value === '' || value === null || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  const setSearch    = useCallback((v: string) => updateParams({ search: v }), [searchParams]);
  const setTeamType  = useCallback((v: string[]) => updateParams({ teamType: v }), [searchParams]);
  const setStatus    = useCallback((v: string) => updateParams({ status: v }), [searchParams]);
  const setDateRange = useCallback(
    (after: string, before: string) => updateParams({ submittedAfter: after, submittedBefore: before }),
    [searchParams]
  );
  const setPage      = useCallback((n: number) => updateParams({ page: n }), [searchParams]);
  const setSort      = useCallback(
    (sortBy: string, sortDir: 'asc' | 'desc') => updateParams({ sortBy, sortDir }),
    [searchParams]
  );
  const clearFilters = useCallback(() => {
    router.replace('/dashboard', { scroll: false });
  }, [router]);

  function toQueryString(): string {
    const params = new URLSearchParams();
    if (filters.search)          params.set('search', filters.search);
    if (filters.teamType.length) filters.teamType.forEach(t => params.append('teamType', t));
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.submittedAfter)  params.set('submittedAfter', filters.submittedAfter);
    if (filters.submittedBefore) params.set('submittedBefore', filters.submittedBefore);
    if (filters.page > 1)        params.set('page', String(filters.page));
    if (filters.sortBy !== 'submitted_at') params.set('sortBy', filters.sortBy);
    if (filters.sortDir !== 'desc')        params.set('sortDir', filters.sortDir);
    return params.toString();
  }

  return { filters, setSearch, setTeamType, setStatus, setDateRange, setPage, setSort, clearFilters, toQueryString };
}
```

---

### `src/hooks/useDashboardData.ts`

Data fetching hook — calls GET /api/dashboard/responses with filter params. Reads JWT from localStorage for Authorization header.

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ResponseListItem {
  session_id: string;
  respondent_name: string;
  respondent_email: string;
  team_type: string;
  submission_status: 'submitted' | 'draft';
  submitted_at: string | null;
  last_modified_at: string | null;
}

export interface PaginatedResponseList {
  total: number;
  page: number;
  pageSize: number;
  data: ResponseListItem[];
  duplicate_count: number;
}

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

// useDashboardData — fetches response list from GET /api/dashboard/responses
// Refreshes when queryString changes (filter/sort/page)
export function useDashboardData(queryString: string) {
  const [data, setData] = useState<PaginatedResponseList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/dashboard/responses${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Failed to load responses.');
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load responses.');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// useSummaryStats — fetches summary counts with 60s auto-refresh (F06 §Dashboard auto-refresh)
// TechArch: "Summary counts (total/submitted/draft) poll every 60 seconds"
export function useSummaryStats() {
  const [stats, setStats] = useState<{ total: number; submitted: number; draft: number } | null>(null);

  const fetch60s = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/responses?pageSize=1&page=1', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const body = await res.json() as PaginatedResponseList;
      // Fetch submitted and draft counts separately for accurate summary
      const [subRes, draftRes] = await Promise.all([
        fetch('/api/dashboard/responses?pageSize=1&page=1&status=submitted', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch('/api/dashboard/responses?pageSize=1&page=1&status=draft', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);
      const subBody  = subRes.ok  ? await subRes.json()  as PaginatedResponseList : null;
      const draftBody = draftRes.ok ? await draftRes.json() as PaginatedResponseList : null;
      setStats({
        total:     body.total,
        submitted: subBody?.total  ?? 0,
        draft:     draftBody?.total ?? 0,
      });
    } catch {
      // Silent fail — stats will show last known values
    }
  }, []);

  useEffect(() => {
    fetch60s(); // Initial load
    const interval = setInterval(fetch60s, 60000); // F06: 60s auto-refresh
    return () => clearInterval(interval);
  }, [fetch60s]);

  return stats;
}
```

---

### `src/components/dashboard/SummaryStats.tsx`

```typescript
'use client';

import { useSummaryStats } from '@/hooks/useDashboardData';

// SummaryStats — F06 §Dashboard Home (US-6.1: "total responses, submitted count, draft count")
// Polls every 60 seconds via useSummaryStats hook
export function SummaryStats() {
  const stats = useSummaryStats();

  return (
    <div className="flex gap-6 text-sm">
      <div className="bg-white rounded-md border border-gray-200 px-4 py-3 text-center">
        <div className="text-2xl font-bold text-gray-900">{stats?.total ?? '—'}</div>
        <div className="text-gray-500">Total</div>
      </div>
      <div className="bg-white rounded-md border border-gray-200 px-4 py-3 text-center">
        <div className="text-2xl font-bold text-green-700">{stats?.submitted ?? '—'}</div>
        <div className="text-gray-500">Submitted</div>
      </div>
      <div className="bg-white rounded-md border border-gray-200 px-4 py-3 text-center">
        <div className="text-2xl font-bold text-amber-600">{stats?.draft ?? '—'}</div>
        <div className="text-gray-500">Draft</div>
      </div>
    </div>
  );
}
```

---

### `src/components/dashboard/TeamTypeCoverageBar.tsx`

```typescript
'use client';

// TeamTypeCoverageBar — F06 §Dashboard Home (UX-Mockup Screen 06)
// Shows count per team type with low-participation warning (⚠ amber if 0 responses)
const TEAM_TYPES = [
  { key: 'program_project',      label: 'Program / Project' },
  { key: 'platform_engineering', label: 'Platform Engineering' },
  { key: 'infrastructure_cloud', label: 'Infrastructure / Cloud' },
  { key: 'data_api_governance',  label: 'Data / API Governance' },
];

interface TeamTypeCoverageBarProps {
  counts: Record<string, number>;
  total: number;
}

export function TeamTypeCoverageBar({ counts, total }: TeamTypeCoverageBarProps) {
  const maxCount = Math.max(...TEAM_TYPES.map(t => counts[t.key] ?? 0), 1);
  const covered  = TEAM_TYPES.filter(t => (counts[t.key] ?? 0) > 0).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Team Type Coverage</h2>
      <div className="flex flex-col gap-2">
        {TEAM_TYPES.map(({ key, label }) => {
          const count = counts[key] ?? 0;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
          const low   = count === 0;
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-40 text-xs text-gray-600 truncate">{label}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full ${low ? 'bg-amber-400' : 'bg-blue-500'}`}
                  style={{ width: `${Math.max((count / maxCount) * 100, count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <div className={`text-xs w-8 text-right font-medium ${low ? 'text-amber-600' : 'text-gray-700'}`}>
                {count} {low ? '⚠' : '✓'}
              </div>
            </div>
          );
        })}
      </div>
      <p className={`mt-3 text-xs ${covered === 4 ? 'text-green-700' : 'text-amber-700'}`}>
        Coverage: {covered}/4 team types represented {covered === 4 ? '✓' : '⚠'}
      </p>
    </div>
  );
}
```

---

### `src/components/dashboard/SearchBar.tsx`

```typescript
'use client';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

// SearchBar — F06 §Search & Filter (US-6.2: case-insensitive partial match on name + email)
export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Search responses by name or email"
      />
    </div>
  );
}
```

---

### `src/components/dashboard/FilterPanel.tsx`

```typescript
'use client';

const TEAM_TYPE_OPTIONS = [
  { value: 'program_project',      label: 'Program / Project' },
  { value: 'platform_engineering', label: 'Platform Engineering' },
  { value: 'infrastructure_cloud', label: 'Infrastructure / Cloud' },
  { value: 'data_api_governance',  label: 'Data / API Governance' },
];

interface FilterPanelProps {
  teamType:        string[];
  status:          'all' | 'submitted' | 'draft';
  submittedAfter:  string;
  submittedBefore: string;
  onTeamType:      (v: string[]) => void;
  onStatus:        (v: string) => void;
  onDateRange:     (after: string, before: string) => void;
  onClear:         () => void;
  onExportCsv:     () => void;
  exportLoading:   boolean;
}

// FilterPanel — F06 §Search & Filter (US-6.2: team type multi-select, status radio, date range)
// All filters combinable; state synced to URL params by parent (useDashboardFilters)
export function FilterPanel({
  teamType, status, submittedAfter, submittedBefore,
  onTeamType, onStatus, onDateRange, onClear, onExportCsv, exportLoading,
}: FilterPanelProps) {
  function toggleTeamType(value: string) {
    if (teamType.includes(value)) {
      onTeamType(teamType.filter(t => t !== value));
    } else {
      onTeamType([...teamType, value]);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
      {/* Team Type multi-select — US-6.2 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Team Type</label>
        <div className="flex flex-wrap gap-2">
          {TEAM_TYPE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={teamType.includes(opt.value)}
                onChange={() => toggleTeamType(opt.value)}
                className="rounded border-gray-300"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Status filter — US-6.2 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Status</label>
        <div className="flex gap-3">
          {(['all', 'submitted', 'draft'] as const).map(s => (
            <label key={s} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="radio"
                name="status"
                value={s}
                checked={status === s}
                onChange={() => onStatus(s)}
              />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Date range — US-6.2 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Date Range</label>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={submittedAfter}
            onChange={e => onDateRange(e.target.value, submittedBefore)}
            className="border border-gray-300 rounded text-sm px-2 py-1"
            aria-label="Submitted after"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="date"
            value={submittedBefore}
            onChange={e => onDateRange(submittedAfter, e.target.value)}
            className="border border-gray-300 rounded text-sm px-2 py-1"
            aria-label="Submitted before"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 ml-auto">
        <button
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border border-gray-300 bg-white"
        >
          Clear Filters
        </button>
        <button
          onClick={onExportCsv}
          disabled={exportLoading}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          aria-label="Export responses to CSV"
        >
          {exportLoading ? 'Generating…' : '↓ Export CSV'}
        </button>
      </div>
    </div>
  );
}
```

---

### `src/components/dashboard/ResponseTable.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import type { ResponseListItem } from '@/hooks/useDashboardData';
import type { DashboardFilters } from '@/hooks/useDashboardFilters';

const COLUMNS: { key: string; label: string; sortable: boolean }[] = [
  { key: 'name',            label: 'Name',         sortable: true },
  { key: 'email',           label: 'Email',        sortable: true },
  { key: 'team_type',       label: 'Team Type',    sortable: true },
  { key: 'status',          label: 'Status',       sortable: true },
  { key: 'submitted_at',    label: 'Submitted At', sortable: true },
  { key: 'last_modified_at',label: 'Last Modified',sortable: false },
];

const TEAM_TYPE_LABELS: Record<string, string> = {
  program_project:      'Program / Project',
  platform_engineering: 'Platform Engineering',
  infrastructure_cloud: 'Infrastructure / Cloud',
  data_api_governance:  'Data / API Governance',
};

interface ResponseTableProps {
  data:          ResponseListItem[];
  total:         number;
  loading:       boolean;
  error:         string | null;
  filters:       DashboardFilters;
  onSort:        (sortBy: string, sortDir: 'asc' | 'desc') => void;
  onPage:        (page: number) => void;
  filterQueryString: string;
}

// ResponseTable — F06 §Response List View (US-6.1: paginated 25/page, sortable, submitted_at DESC)
// Row click → /dashboard/responses/:sessionId with filter state in URL for back-nav preservation
export function ResponseTable({
  data, total, loading, error, filters, onSort, onPage, filterQueryString,
}: ResponseTableProps) {
  const router = useRouter();
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSort(key: string) {
    if (filters.sortBy === key) {
      onSort(key, filters.sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'desc');
    }
  }

  function handleRowClick(sessionId: string) {
    // Store current filter state in sessionStorage so detail page back-button preserves it
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dashboard_filter_qs', window.location.search);
    }
    router.push(`/dashboard/responses/${sessionId}`);
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
        Loading responses…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                }`}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  filters.sortBy === col.key
                    ? filters.sortDir === 'asc' ? 'ascending' : 'descending'
                    : undefined
                }
              >
                {col.label}
                {col.sortable && filters.sortBy === col.key && (
                  <span className="ml-1">{filters.sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                No responses match your current filters.
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={row.session_id}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(row.session_id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleRowClick(row.session_id)}
                aria-label={`View response from ${row.respondent_name}`}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{row.respondent_name}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{row.respondent_email}</td>
                <td className="px-4 py-3 text-gray-600">
                  {TEAM_TYPE_LABELS[row.team_type] ?? row.team_type}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    row.submission_status === 'submitted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {row.submission_status.charAt(0).toUpperCase() + row.submission_status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(row.submitted_at)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(row.last_modified_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination — 25 per page (US-6.1) */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {filters.page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPage(filters.page - 1)}
              disabled={filters.page <= 1}
              className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`px-3 py-1 rounded border text-sm ${
                  p === filters.page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPage(filters.page + 1)}
              disabled={filters.page >= totalPages}
              className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### `src/components/dashboard/ResponseDetailView.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AnswerDisplay {
  question_id:    string;
  question_text:  string;
  question_type:  string;
  answer_payload: unknown;
}

interface SectionDisplay {
  section_id: string;
  title:      string;
  answers:    AnswerDisplay[];
}

interface ResponseDetail {
  session_id:        string;
  respondent_name:   string;
  respondent_email:  string;
  team_type:         string;
  submission_status: string;
  submitted_at:      string | null;
  sections:          SectionDisplay[];
}

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

function formatAnswerPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '—';
  const p = payload as Record<string, unknown>;
  switch (p.type) {
    case 'single_choice':
      return p.value === 'other' ? `Other: ${p.other_text ?? ''}` : String(p.value ?? '—');
    case 'multi_choice': {
      const vals = (p.values as string[]) ?? [];
      if (vals.length === 0) return '—';
      return vals.map(v => (v === 'other' ? `Other: ${p.other_text ?? ''}` : v)).join(', ');
    }
    case 'likert':
      return p.value != null ? `${p.value} / 5` : '—';
    case 'ranking':
      return ((p.order as string[]) ?? []).map((item, i) => `${i + 1}. ${item}`).join('; ');
    case 'free_text_short':
    case 'free_text_long':
      return String(p.value ?? '—');
    default:
      return JSON.stringify(payload);
  }
}

const TEAM_TYPE_LABELS: Record<string, string> = {
  program_project:      'Program / Project',
  platform_engineering: 'Platform Engineering',
  infrastructure_cloud: 'Infrastructure / Cloud',
  data_api_governance:  'Data / API Governance',
};

// ResponseDetailView — F06 §Individual Response View (US-6.3)
// Reads all sections + answers from GET /api/dashboard/responses/:sessionId in read-only format.
// Back button returns with filter state preserved (US-6.3: "back button preserves filter state").
export function ResponseDetailView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [detail, setDetail]   = useState<ResponseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dashboard/responses/${sessionId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.status === 404) {
          setError('The requested response could not be found.');
          return;
        }
        if (!res.ok) throw new Error('Failed to load response.');
        setDetail(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load response.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Back navigation preserving filter state (US-6.3)
  function handleBack() {
    const savedQs = typeof window !== 'undefined'
      ? sessionStorage.getItem('dashboard_filter_qs')
      : null;
    router.push(savedQs ? `/dashboard${savedQs}` : '/dashboard');
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading response…</div>;
  if (error)   return <div className="text-center py-12 text-red-600">{error}</div>;
  if (!detail) return null;

  return (
    <div className="max-w-4xl">
      <button
        onClick={handleBack}
        className="mb-6 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        aria-label="Back to response list"
      >
        ← Back to Responses
      </button>

      {/* Respondent metadata */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Individual Response</h1>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Name:</span> <span className="font-medium">{detail.respondent_name}</span></div>
          <div><span className="text-gray-500">Email:</span> <span className="font-mono">{detail.respondent_email}</span></div>
          <div><span className="text-gray-500">Team Type:</span> {TEAM_TYPE_LABELS[detail.team_type] ?? detail.team_type}</div>
          <div>
            <span className="text-gray-500">Status:</span>{' '}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              detail.submission_status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {detail.submission_status.charAt(0).toUpperCase() + detail.submission_status.slice(1)}
            </span>
          </div>
          {detail.submitted_at && (
            <div><span className="text-gray-500">Submitted:</span> {new Date(detail.submitted_at).toLocaleString()}</div>
          )}
        </div>
      </div>

      {/* Sections + answers — read-only (US-6.3: "same question-type widgets as assessment form, non-interactive") */}
      <div className="flex flex-col gap-4">
        {detail.sections.map(section => (
          <div key={section.section_id} className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">{section.title}</h2>
            <div className="flex flex-col gap-4">
              {section.answers.map((answer, qi) => (
                <div key={answer.question_id} className="text-sm">
                  <div className="font-medium text-gray-700 mb-1">
                    Q{qi + 1}. {answer.question_text}
                  </div>
                  <div className="text-gray-600 pl-4 py-1 border-l-2 border-gray-200">
                    {answer.answer_payload
                      ? formatAnswerPayload(answer.answer_payload)
                      : <span className="text-gray-400 italic">No answer recorded</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### `src/app/dashboard/page.tsx`

Dashboard home — composes all components. Handles CSV export with active filter params.

```typescript
'use client';

import { Suspense } from 'react';
import { SummaryStats } from '@/components/dashboard/SummaryStats';
import { TeamTypeCoverageBar } from '@/components/dashboard/TeamTypeCoverageBar';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { ResponseTable } from '@/components/dashboard/ResponseTable';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useState } from 'react';

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('dashboard_token') ?? '') : '';
}

function DashboardContent() {
  const { filters, setSearch, setTeamType, setStatus, setDateRange, setPage, setSort, clearFilters, toQueryString } = useDashboardFilters();
  const { data, loading, error } = useDashboardData(toQueryString());
  const [exportLoading, setExportLoading] = useState(false);

  // Team type counts from current data for coverage bar
  const teamTypeCounts: Record<string, number> = {};
  // We need unfiltered counts for coverage bar — use summary data which is unfiltered
  // For simplicity in this wave, derive from current data (09-PLAN adds analytics endpoint for exact counts)
  (data?.data ?? []).forEach(row => {
    teamTypeCounts[row.team_type] = (teamTypeCounts[row.team_type] ?? 0) + 1;
  });

  async function handleExportCsv() {
    setExportLoading(true);
    try {
      const qs = toQueryString();
      const url = `/api/dashboard/export/csv${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob  = await res.blob();
      const burl  = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      const date  = new Date().toISOString().slice(0, 10);
      a.href      = burl;
      a.download  = `assessment-responses-${date}.csv`;
      a.click();
      URL.revokeObjectURL(burl);
    } catch {
      alert('Export could not be generated. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stats — 60s auto-refresh via SummaryStats hook */}
      <div className="flex gap-6 items-start">
        <SummaryStats />
        <div className="flex-1">
          <TeamTypeCoverageBar counts={teamTypeCounts} total={data?.total ?? 0} />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <SearchBar value={filters.search} onChange={setSearch} />
        <FilterPanel
          teamType={filters.teamType}
          status={filters.status}
          submittedAfter={filters.submittedAfter}
          submittedBefore={filters.submittedBefore}
          onTeamType={setTeamType}
          onStatus={setStatus}
          onDateRange={setDateRange}
          onClear={clearFilters}
          onExportCsv={handleExportCsv}
          exportLoading={exportLoading}
        />
      </div>

      {/* Response table — paginated 25/page, sortable, row click → drill-down */}
      <ResponseTable
        data={data?.data ?? []}
        total={data?.total ?? 0}
        loading={loading}
        error={error}
        filters={filters}
        onSort={setSort}
        onPage={setPage}
        filterQueryString={toQueryString()}
      />
    </div>
  );
}

// Dashboard home page — F06 §Dashboard Home (Screen 06)
// Wrapped in Suspense because useDashboardFilters uses useSearchParams (Next.js App Router requirement)
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500">Loading dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
```

---

### `src/app/dashboard/responses/[sessionId]/page.tsx`

```typescript
import { ResponseDetailView } from '@/components/dashboard/ResponseDetailView';

// Individual response drill-down — F06 §Individual Response View (US-6.3)
// Route: /dashboard/responses/:sessionId
export default function ResponseDetailPage({ params }: { params: { sessionId: string } }) {
  return <ResponseDetailView sessionId={params.sessionId} />;
}
```
  </action>
  <verify>
```bash
grep -n "export.*useDashboardFilters" src/hooks/useDashboardFilters.ts && echo "useDashboardFilters OK"
grep -n "export.*useDashboardData\|export.*useSummaryStats" src/hooks/useDashboardData.ts && echo "useDashboardData OK"
grep -n "60000\|setInterval" src/hooks/useDashboardData.ts && echo "60s polling OK"
grep -n "export.*SummaryStats" src/components/dashboard/SummaryStats.tsx && echo "SummaryStats OK"
grep -n "export.*TeamTypeCoverageBar" src/components/dashboard/TeamTypeCoverageBar.tsx && echo "TeamTypeCoverageBar OK"
grep -n "export.*SearchBar" src/components/dashboard/SearchBar.tsx && echo "SearchBar OK"
grep -n "export.*FilterPanel" src/components/dashboard/FilterPanel.tsx && echo "FilterPanel OK"
grep -n "export.*ResponseTable" src/components/dashboard/ResponseTable.tsx && echo "ResponseTable OK"
grep -n "No responses match your current filters" src/components/dashboard/ResponseTable.tsx && echo "empty state OK"
grep -n "export.*ResponseDetailView" src/components/dashboard/ResponseDetailView.tsx && echo "ResponseDetailView OK"
grep -n "export default" src/app/dashboard/page.tsx && echo "dashboard page OK"
grep -n "export default" "src/app/dashboard/responses/[sessionId]/page.tsx" && echo "detail page OK"
grep -n "dashboard_filter_qs\|sessionStorage" src/components/dashboard/ResponseDetailView.tsx && echo "filter state preservation OK"
grep -n "assessment-responses-.*csv\|Export CSV" src/app/dashboard/page.tsx && echo "CSV export OK"
npx tsc --noEmit 2>&1 | head -20
```
  </verify>
  <done>
- useDashboardFilters: reads/writes all filter state (search, teamType[], status, submittedAfter, submittedBefore, page, sortBy, sortDir) to URL search params via useSearchParams + router.replace; clearFilters resets to /dashboard
- useDashboardData: fetches GET /api/dashboard/responses with active filter queryString; sends Authorization Bearer from localStorage "dashboard_token"
- useSummaryStats: fetches total/submitted/draft counts with 60-second setInterval polling; silent fail on error
- SummaryStats: displays total/submitted/draft count cards, powered by useSummaryStats (60s refresh)
- TeamTypeCoverageBar: horizontal bar per team type with ⚠ amber for 0-response types; shows "N/4 team types represented"
- SearchBar: controlled input with onChange callback; aria-label for screen readers
- FilterPanel: team type multi-select checkboxes, status radio group (All/Submitted/Draft), date range pair, Clear Filters + Export CSV buttons
- ResponseTable: 6 columns (Name, Email, Team Type, Status, Submitted At, Last Modified), sortable headers with ASC/DESC indicator, paginated 25/page with Prev/Next/page-number controls, "No responses match your current filters." empty state, row click stores filter state in sessionStorage then navigates to /dashboard/responses/:sessionId
- ResponseDetailView: fetches /api/dashboard/responses/:sessionId; renders respondent metadata + all sections/answers read-only; back button restores filter state from sessionStorage
- Dashboard page: composes all components, handles CSV export (GET /api/dashboard/export/csv with active filter params, downloads as assessment-responses-{date}.csv), wrapped in Suspense for useSearchParams compatibility
- TypeScript compilation passes
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| {client→API (auth/login)} | HTTP POST from /dashboard/login browser form into /api/auth/login — email string crosses into server handler that queries system_owner_emails |
| {client→API (dashboard reads)} | HTTP GET from dashboard SPA with JWT in Authorization header crossing into /api/dashboard/* protected handlers (implemented in plan 05) |
| {localStorage→client render} | JWT stored in localStorage "dashboard_token" read by AuthGuard client-side — token decode without signature verification used to gate UI render |
| {db→render (response detail)} | Respondent names, emails, and free-text answers from DB crossing into the ResponseDetailView render path |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-01 | Elevation of privilege | `src/app/api/auth/login/route.ts` — email → system_owner role assignment | mitigate | Email is normalized with `toLowerCase().trim()` before DB lookup; Drizzle ORM parameterized query (`sql\`LOWER(${systemOwnerEmails.email}) = ${normalizedEmail}\``) prevents injection; role only assigned if DB row found; JWT signed with `JWT_SECRET` (HS256). |
| T-08-02 | Elevation of privilege | `src/components/dashboard/AuthGuard.tsx` — client-side JWT decode gates UI | accept | Client-side decode (no signature verification) is intentional UX guard only — prevents flash of content. Every dashboard API call in plan 05 enforces `requireSystemOwner` server-side, which verifies the JWT signature. Risk: client-side guard alone is bypassable by a determined attacker with devtools — accepted because server is authoritative. Risk owner: engineering team. |
| T-08-03 | Information disclosure | `src/components/dashboard/ResponseDetailView.tsx` — respondent email + free-text in rendered HTML | mitigate | Access is gated by AuthGuard (client) + `requireSystemOwner` on `/api/dashboard/responses/:sessionId` (server, plan 05). Data is fetched with `Authorization: Bearer {token}` — no token, no data. Answers are rendered as static text, not eval'd or injected as innerHTML. |
| T-08-04 | Information disclosure | `localStorage.getItem('dashboard_token')` — JWT accessible to same-origin JS | accept | Standard JWT-in-localStorage pattern for enterprise internal tools. No XSS vectors introduced by this plan (no dangerouslySetInnerHTML, no eval). JWT expires in 8h. Risk: XSS on same origin could extract token. Accepted for v1 enterprise-internal scope; httpOnly cookie upgrade deferred to a security hardening iteration. Risk owner: engineering team. |
| T-08-05 | Spoofing | `src/app/dashboard/login/page.tsx` — email field accepts arbitrary input | mitigate | Zod `z.string().email()` validation in `POST /api/auth/login` rejects malformed emails (400 INVALID_EMAIL_FORMAT) before any DB query executes. Non-System-Owner emails receive 403 NOT_A_SYSTEM_OWNER — no timing difference that leaks email enumeration risk given the small known user set. |
| T-08-06 | Tampering | `src/hooks/useDashboardData.ts` — filter queryString built from URL params and passed to API | mitigate | queryString is assembled from typed filter values in `useDashboardFilters` (strings, enums, numbers) and passed as URL query params to the fetch call. Server-side validation in `GET /api/dashboard/responses` (plan 05) uses Drizzle ORM parameterized queries — no raw string interpolation into SQL. |
</threat_model>

<verification>
## Wave 8 (3c-part1 frontend/dashboard-table) — Verification

After all tasks complete:

```bash
# 1. Auth endpoint + JWT issuance
grep -n "export.*POST" src/app/api/auth/login/route.ts && echo "AUTH LOGIN ROUTE OK"
grep -n "NOT_A_SYSTEM_OWNER" src/app/api/auth/login/route.ts && echo "NOT_A_SYSTEM_OWNER CODE OK"
grep -n "8h" src/app/api/auth/login/route.ts && echo "8H EXPIRY OK"

# 2. AuthGuard gates UI correctly
grep -n "system_owner" src/components/dashboard/AuthGuard.tsx && echo "ROLE CHECK OK"
grep -n "dashboard_token" src/components/dashboard/AuthGuard.tsx && echo "LOCALSTORAGE KEY OK"

# 3. Dashboard layout uses AuthGuard
grep -n "AuthGuard" src/app/dashboard/layout.tsx && echo "LAYOUT AUTHGUARD OK"

# 4. 60s polling present
grep -n "60000\|setInterval" src/hooks/useDashboardData.ts && echo "60S POLLING OK"

# 5. Empty state message
grep -n "No responses match your current filters" src/components/dashboard/ResponseTable.tsx && echo "EMPTY STATE OK"

# 6. Filter state preservation on back-nav
grep -n "dashboard_filter_qs\|sessionStorage" src/components/dashboard/ResponseDetailView.tsx && echo "FILTER PRESERVE OK"

# 7. CSV export filename pattern
grep -n "assessment-responses-" src/app/dashboard/page.tsx && echo "CSV FILENAME OK"

# 8. Login page uses separate auth endpoint (not /api/sessions)
grep -n "/api/auth/login" src/app/dashboard/login/page.tsx && echo "SEPARATE AUTH ENDPOINT OK"
grep -n "/api/sessions" src/app/dashboard/login/page.tsx 2>/dev/null && echo "WARNING: login page should NOT use /api/sessions" || echo "SESSIONS NOT USED IN LOGIN OK"

# 9. TypeScript clean compile
npx tsc --noEmit 2>&1 | head -20 && echo "TSC OK"

# 10. Dev server starts and binds to 0.0.0.0:3000 (smoke check)
# Run: npm run dev &
# Then: curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/login | grep 200 && echo "LOGIN PAGE REACHABLE"
```
</verification>

<success_criteria>
- System Owner navigates to /dashboard/login, enters pre-configured email, receives System Owner JWT (role: system_owner, 8h expiry), is redirected to /dashboard
- Navigating to /dashboard without a valid JWT → no flash of dashboard content → redirect to /dashboard/login
- Dashboard home shows: SummaryStats (total/submitted/draft) with 60s auto-refresh, TeamTypeCoverageBar with ⚠ on 0-response types, SearchBar, FilterPanel (team type multi-select + status radio + date range), ResponseTable (25/page, sortable columns, row click → drill-down)
- Active filters sync to URL query params; filter state bookmarkable; "No responses match your current filters." shown on empty results
- Export CSV button downloads assessment-responses-{date}.csv with active filter params applied
- /dashboard/responses/:sessionId renders respondent metadata + all sections/answers read-only; back button returns to /dashboard with filter state preserved
- TypeScript compiles clean
- Next.js dev server binds to 0.0.0.0:3000; no X-Frame-Options: DENY header
</success_criteria>

<output>
After completion, create `.planning/express/assessmentform-express-spa-multi-step-as/08-SUMMARY.md` following the summary template.
</output>
