---
phase: 4c-bugfix-polish
plan: 12
type: execute
wave: 12
depends_on: [11]
files_modified:
  - package.json
  - scripts/start.sh
  - .pivota/start-dev.sh
  - docker-compose.yml
  - playwright.config.ts
  - next.config.ts
  - src/lib/db.ts
  - src/hooks/useAutoSave.ts
  - src/app/assessment/page.tsx
  - src/app/api/sessions/route.ts
  - src/app/api/sessions/[sessionId]/route.ts
  - src/lib/validation.ts
  - src/types/session.ts
  - src/components/AppNav.tsx
  - src/app/layout.tsx
  - src/app/dashboard/components/DashboardHeader.tsx
  - drizzle/seed.ts
  - drizzle/migrations/0000_initial.sql
  - e2e/f0-workflow.spec.ts
  - e2e/f1-identity-session.spec.ts
  - e2e/f2-question-types.spec.ts
  - e2e/f3-section-routing.spec.ts
  - e2e/f4-autosave.spec.ts
  - e2e/f5-deduplication-editwindow.spec.ts
  - e2e/f6-dashboard.spec.ts
  - e2e/f7-rbac.spec.ts
  - e2e/f8-config.spec.ts
  - e2e/f9-confirmation.spec.ts
  - e2e/journeys/jrn-01-marcus.spec.ts
  - e2e/journeys/jrn-02-priya.spec.ts
  - e2e/journeys/jrn-03-dana.spec.ts
  - e2e/smoke/cross-browser.spec.ts
  - project_specs/TechArch-AssessmentForm.md
autonomous: true

features:
  implements: ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9"]
  depends_on: ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9"]
  enables: []

must_haves:
  truths:
    - "Application starts on port 4000 (not 3000); package.json dev/start scripts, start.sh, start-dev.sh, docker-compose.yml, playwright.config.ts, and all e2e tests reference 4000"
    - "NODE_TLS_REJECT_UNAUTHORIZED=0 is exported at process level before Node.js initialises; it is NOT in .env.local"
    - "DB search_path is set via connection string URL parameter (options=-csearch_path%3Dassessmentform%2Cpublic) in buildConnectionString(); the pool 'connect' event handler is removed"
    - "start-dev.sh runs npm ci (or npm install) via INSTALL_CMD sentinel before starting the app; node_modules presence is checked to skip reinstall on warm boots"
    - "next dev is invoked as ./node_modules/.bin/next dev everywhere; npx next is not used"
    - "next.config.ts includes allowedDevOrigins: ['*.preview.pivota-ng.pivota.dev'] for Pivota Preview iframe embedding"
    - "useAutoSave hook stores all save parameters in refs; performSave reads exclusively from refs and has an empty dependency array []"
    - "performSave returns Promise<boolean>; triggerSave returns Promise<boolean>; handleNext and handlePrevious in AssessmentWizard check the return value and display a red error banner on false"
    - "ResponseItemSchema uses z.string().min(1) for question_id (not z.string().uuid()); seed deterministic IDs are accepted by the API"
    - "createOrResumeSession and getSessionById API routes return team_type in their response body; SessionResponse interface includes team_type"
    - "AssessmentWizard falls back to session.team_type when localStorage is empty; team_type is written to localStorage after retrieval"
    - "AppNav component exists at src/components/AppNav.tsx and is mounted in root layout.tsx; it is hidden on /dashboard/* routes"
    - "AppNav shows brand name, a System Owner Dashboard link, and a Logout button when a respondent token exists in localStorage"
    - "DashboardHeader has a Logout button (replacing the former Exit button) and Responses/Analytics/Settings tabs with hover states"
    - "drizzle/seed.ts seeds admin@assessmentform.dev as a system owner; vijay@gmail.com is not present in system_owner_emails"
    - "Migration SQL references assessmentform schema in FK constraints (REFERENCES \"assessmentform\".\"questions\"), not public schema"
  artifacts:
    - path: "package.json"
      provides: "dev and start scripts targeting port 4000"
      contains: "4000"
    - path: "scripts/start.sh"
      provides: "Process-level NODE_TLS_REJECT_UNAUTHORIZED export and ./node_modules/.bin/next invocation"
      contains: "NODE_TLS_REJECT_UNAUTHORIZED"
    - path: ".pivota/start-dev.sh"
      provides: "npm ci sentinel logic and ./node_modules/.bin/next dev invocation"
      contains: "npm ci"
    - path: "docker-compose.yml"
      provides: "app service port mapping 4000:4000"
      contains: "4000:4000"
    - path: "playwright.config.ts"
      provides: "baseURL targeting http://localhost:4000"
      contains: "localhost:4000"
    - path: "next.config.ts"
      provides: "allowedDevOrigins for Pivota Preview iframes"
      contains: "allowedDevOrigins"
    - path: "src/lib/db.ts"
      provides: "buildConnectionString() with search_path URL parameter; no pool 'connect' event handler"
      contains: "search_path"
    - path: "src/hooks/useAutoSave.ts"
      provides: "Ref-based save params; performSave with empty dep array returning Promise<boolean>"
      contains: "useRef"
    - path: "src/app/assessment/page.tsx"
      provides: "handleNext/handlePrevious checking triggerSave return value; red error banner on failure"
      contains: "triggerSave"
    - path: "src/lib/validation.ts"
      provides: "ResponseItemSchema with z.string().min(1) for question_id"
      contains: "min(1)"
    - path: "src/types/session.ts"
      provides: "SessionResponse interface with team_type field"
      contains: "team_type"
    - path: "src/app/api/sessions/route.ts"
      provides: "POST handler returning team_type in response body"
      contains: "team_type"
    - path: "src/app/api/sessions/[sessionId]/route.ts"
      provides: "GET handler returning team_type in response body"
      contains: "team_type"
    - path: "src/components/AppNav.tsx"
      provides: "Global sticky nav bar: brand, dashboard link, logout button"
      exports: ["AppNav"]
    - path: "src/app/layout.tsx"
      provides: "AppNav mounted in root layout, hidden on /dashboard routes"
      contains: "AppNav"
    - path: "drizzle/seed.ts"
      provides: "system owner seed for admin@assessmentform.dev; no vijay@gmail.com system owner"
      contains: "admin@assessmentform.dev"
    - path: "drizzle/migrations/0000_initial.sql"
      provides: "FK constraints referencing assessmentform schema"
      contains: "assessmentform"
  key_links:
    - from: "src/hooks/useAutoSave.ts"
      to: "src/app/assessment/page.tsx"
      via: "triggerSave (Promise<boolean>) consumed by handleNext/handlePrevious to gate navigation"
      pattern: "triggerSave.*boolean|Promise.*boolean"
    - from: "src/lib/db.ts"
      to: "PostgreSQL assessmentform schema"
      via: "buildConnectionString appends options=-csearch_path%3Dassessmentform%2Cpublic to DATABASE_URL"
      pattern: "search_path"
    - from: "src/components/AppNav.tsx"
      to: "src/app/layout.tsx"
      via: "AppNav imported and rendered in root layout; usePathname hides it on /dashboard/*"
      pattern: "AppNav"
    - from: "src/app/api/sessions/route.ts"
      to: "src/types/session.ts"
      via: "POST handler returns SessionResponse including team_type"
      pattern: "team_type"

integration_contracts:
  requires:
    - from_plan: "11"
      artifact: "playwright.config.ts"
      exports: ["baseURL=http://localhost:3000 (to be updated to :4000)", "chromium project", "firefox project"]
      verify: "grep -n 'baseURL' playwright.config.ts && echo CONTRACT_OK"
    - from_plan: "10"
      artifact: "docker-compose.yml"
      exports: ["app service port mapping"]
      verify: "grep -n 'ports' docker-compose.yml && echo CONTRACT_OK"
    - from_plan: "10"
      artifact: "src/lib/db.ts"
      exports: ["buildConnectionString()", "pool"]
      verify: "grep -n 'buildConnectionString' src/lib/db.ts && echo CONTRACT_OK"
  provides:
    - artifact: "playwright.config.ts"
      exports: ["baseURL=http://localhost:4000"]
      shape: "baseURL: 'http://localhost:4000'"
      verify: "grep -n 'localhost:4000' playwright.config.ts && echo CONTRACT_OK"
    - artifact: "src/lib/db.ts"
      exports: ["search_path in connection string"]
      shape: "options=-csearch_path%3Dassessmentform%2Cpublic appended to DATABASE_URL"
      verify: "grep -n 'search_path' src/lib/db.ts && echo CONTRACT_OK"
    - artifact: "src/hooks/useAutoSave.ts"
      exports: ["triggerSave returning Promise<boolean>"]
      shape: "performSave returns Promise<boolean>; all save params stored in refs; dep array []"
      verify: "grep -n 'Promise<boolean>' src/hooks/useAutoSave.ts && echo CONTRACT_OK"
    - artifact: "src/components/AppNav.tsx"
      exports: ["AppNav React component"]
      shape: "default export functional component; sticky nav with brand, dashboard link, logout"
      verify: "grep -n 'export default' src/components/AppNav.tsx && echo CONTRACT_OK"
---

<objective>
Document and codify all bug fixes and polish changes implemented after the initial build (phases 01–11) of AssessmentForm-Express. This phase covers 15 discrete fixes across four areas: infrastructure & startup, auto-save reliability, API & validation, and navigation & UX.

Purpose: Produce an authoritative, traceable record of every post-build fix so future maintainers understand what changed, why, and how to verify correctness. These fixes are already implemented in the codebase; this plan captures the rationale, affected files, and verification commands for each fix.
Output: Updated and verified source files across infrastructure scripts, database layer, React hooks, API routes, UI components, seed data, and migrations.
</objective>

<feature_dependencies>
Implements: All 10 features (F0–F9) — these fixes correct defects that prevented the implemented features from working correctly in the Pivota Preview deployment environment.
Depends on: All prior waves 1–11 — the full application stack, Docker setup, and E2E test suite must exist before these fixes can be applied and verified.
Enables: Stable, deployable application on port 4000 inside Pivota Preview iframes.
</feature_dependencies>

<execution_context>
@/app/workspaces/.pivota-home/opencode-xdg/opencode/pivota_spec-framework/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/express/assessmentform-express-spa-multi-step-as/WAVE-SCHEDULE.md
@project_specs/TechArch-AssessmentForm.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Infrastructure & startup fixes (fixes 1–6)</name>
  <files>
    package.json
    scripts/start.sh
    .pivota/start-dev.sh
    docker-compose.yml
    playwright.config.ts
    next.config.ts
    project_specs/TechArch-AssessmentForm.md
    e2e/f0-workflow.spec.ts
    e2e/f1-identity-session.spec.ts
    e2e/f2-question-types.spec.ts
    e2e/f3-section-routing.spec.ts
    e2e/f4-autosave.spec.ts
    e2e/f5-deduplication-editwindow.spec.ts
    e2e/f6-dashboard.spec.ts
    e2e/f7-rbac.spec.ts
    e2e/f8-config.spec.ts
    e2e/f9-confirmation.spec.ts
    e2e/journeys/jrn-01-marcus.spec.ts
    e2e/journeys/jrn-02-priya.spec.ts
    e2e/journeys/jrn-03-dana.spec.ts
    e2e/smoke/cross-browser.spec.ts
  </files>
  <action>
Apply six infrastructure-level fixes that were blocking the application from starting and running correctly in the Pivota Preview deployment environment.

---

### Fix 1 — Port change from 3000 to 4000

**Root cause:** Port 3000 is occupied by the Pivota platform host process. The application failed to bind on startup.

**Changes required:**

**`package.json`** — Update `dev` and `start` scripts:
```json
"dev": "next dev -p 4000",
"start": "next start -p 4000"
```

**`scripts/start.sh`** — Change `--port 3000` to `--port 4000` (or `-p 4000`).

**`.pivota/start-dev.sh`** — Change any port reference from 3000 to 4000.

**`docker-compose.yml`** — Update app service port mapping:
```yaml
ports:
  - "4000:4000"
```
Also update `NEXTAUTH_URL` or any environment variable referencing `localhost:3000` → `localhost:4000`.

**`playwright.config.ts`** — Update `baseURL`:
```typescript
baseURL: process.env.BASE_URL || 'http://localhost:4000',
```

**All e2e spec files** — Replace all hardcoded `localhost:3000` with `localhost:4000`.

**`next.config.ts`** — Update any port comment referencing 3000 → 4000.

**`project_specs/TechArch-AssessmentForm.md`** — Update port references in architecture documentation.

---

### Fix 2 — NODE_TLS_REJECT_UNAUTHORIZED process-level export

**Root cause:** `NODE_TLS_REJECT_UNAUTHORIZED=0` was set in `.env.local`. Next.js loads `.env.local` via its own dotenv integration, which fires after the Node.js TLS stack has already initialised. As a result the TLS setting had no effect, causing self-signed certificate errors when connecting to the database.

**Changes required:**

**`scripts/start.sh`** — Add at the very top, before any node/next invocation:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

**`.pivota/start-dev.sh`** — Same addition at top of file:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from `.env.local` (or document that it has no effect there and must remain in scripts only).

---

### Fix 3 — DB search_path via connection string

**Root cause:** The previous approach used `pool.on('connect', client => client.query('SET search_path TO assessmentform, public'))`. This has a race condition: the `SET search_path` query is asynchronous and may not complete before the first application query runs, causing "relation does not exist" errors for tables in the `assessmentform` schema.

**Changes required:**

**`src/lib/db.ts`** — In `buildConnectionString()`, append the search_path as a URL parameter:
```typescript
function buildConnectionString(): string {
  const base = process.env.DATABASE_URL!;
  const url = new URL(base);
  // Set search_path synchronously via connection parameter — avoids async race with pool.on('connect')
  url.searchParams.set('options', '-csearch_path=assessmentform,public');
  return url.toString();
}
```
URL-encoded form: `options=-csearch_path%3Dassessmentform%2Cpublic`.

Remove the `pool.on('connect', ...)` handler entirely.

---

### Fix 4 — npm ci install in start-dev.sh

**Root cause:** `.pivota/start-dev.sh` was generated from a docker-compose template with empty `LOCK_FILE_PATH` and `INSTALL_CMD` variables. As a result `node_modules` was never installed, causing `Cannot find module` errors on cold boots.

**Changes required:**

**`.pivota/start-dev.sh`** — Add lockfile sentinel and install logic:
```bash
LOCK_FILE="package-lock.json"
INSTALL_PRESENCE_CHECK="node_modules"
INSTALL_CMD="npm ci || npm install"

if [ ! -d "$INSTALL_PRESENCE_CHECK" ]; then
  echo "Installing dependencies..."
  eval "$INSTALL_CMD"
fi
```

This ensures dependencies are installed on the first run, and skipped on subsequent warm boots when `node_modules` is already present.

---

### Fix 5 — Local next binary instead of npx

**Root cause:** `npx next dev` downloads a version of Next.js from the npm registry at runtime, which may not match the version declared in `package.json`. This caused mismatched module errors and inconsistent behaviour.

**Changes required:**

**`scripts/start.sh`** — Replace `npx next` with `./node_modules/.bin/next`:
```bash
./node_modules/.bin/next dev -p 4000
# or for production:
./node_modules/.bin/next start -p 4000
```

**`.pivota/start-dev.sh`** — Same replacement:
```bash
./node_modules/.bin/next dev -p 4000
```

---

### Fix 6 — allowedDevOrigins for Pivota Preview

**Root cause:** Next.js 16 blocks cross-origin requests from iframes by default. The Pivota Preview environment embeds the application in an iframe at `*.preview.pivota-ng.pivota.dev`, which was blocked by the default Next.js security policy.

**Changes required:**

**`next.config.ts`** — Add `allowedDevOrigins`:
```typescript
const nextConfig: NextConfig = {
  // ... existing config ...
  allowedDevOrigins: ['*.preview.pivota-ng.pivota.dev'],
};
```
  </action>
  <verify>
```bash
# Fix 1: Port 4000 everywhere
grep -n "4000" package.json && echo "PACKAGE.JSON PORT OK"
grep -n "4000" docker-compose.yml && echo "DOCKER-COMPOSE PORT OK"
grep -n "localhost:4000" playwright.config.ts && echo "PLAYWRIGHT PORT OK"
grep -rn "localhost:3000" e2e/ | wc -l | xargs -I{} bash -c '[ {} -eq 0 ] && echo "E2E NO OLD PORT OK" || echo "WARN: {} e2e files still use 3000"'

# Fix 2: NODE_TLS_REJECT_UNAUTHORIZED in scripts
grep -n "NODE_TLS_REJECT_UNAUTHORIZED" scripts/start.sh && echo "START.SH TLS OK"
grep -n "NODE_TLS_REJECT_UNAUTHORIZED" .pivota/start-dev.sh && echo "START-DEV.SH TLS OK"

# Fix 3: search_path in connection string
grep -n "search_path" src/lib/db.ts && echo "DB SEARCH_PATH OK"
grep -n "pool.on" src/lib/db.ts | wc -l | xargs -I{} bash -c '[ {} -eq 0 ] && echo "POOL.ON REMOVED OK" || echo "WARN: pool.on still present"'

# Fix 4: npm ci in start-dev.sh
grep -n "npm ci" .pivota/start-dev.sh && echo "NPM CI OK"

# Fix 5: local next binary
grep -n "node_modules/.bin/next" scripts/start.sh && echo "LOCAL NEXT BINARY OK"
grep -n "node_modules/.bin/next" .pivota/start-dev.sh && echo "LOCAL NEXT BINARY IN START-DEV OK"

# Fix 6: allowedDevOrigins
grep -n "allowedDevOrigins" next.config.ts && echo "ALLOWED DEV ORIGINS OK"
```
  </verify>
  <done>
- package.json: dev/start scripts use port 4000
- scripts/start.sh: exports NODE_TLS_REJECT_UNAUTHORIZED=0 at top; uses ./node_modules/.bin/next; targets port 4000
- .pivota/start-dev.sh: exports NODE_TLS_REJECT_UNAUTHORIZED=0 at top; npm ci sentinel; uses ./node_modules/.bin/next dev -p 4000
- docker-compose.yml: port mapping 4000:4000
- playwright.config.ts: baseURL http://localhost:4000
- all e2e spec files: localhost:3000 replaced with localhost:4000
- next.config.ts: allowedDevOrigins includes *.preview.pivota-ng.pivota.dev
- src/lib/db.ts: buildConnectionString appends search_path URL param; pool.on('connect') handler removed
- project_specs/TechArch-AssessmentForm.md: port references updated to 4000
  </done>
</task>

<task type="auto">
  <name>Task 2: Auto-save reliability fixes (fixes 7–8)</name>
  <files>
    src/hooks/useAutoSave.ts
    src/app/assessment/page.tsx
  </files>
  <action>
Fix two closely related bugs in the auto-save system: a stale closure that caused saves to silently send empty data, and navigation that proceeded even when the save failed.

---

### Fix 7 — Auto-save stale closure

**Root cause:** `useAutoSave` captured `getResponses`, `sessionId`, `token`, `sectionId`, and `currentSectionIndex` in the `performSave` callback's dependency array. On the first render `currentQuestions` is an empty array (data not yet loaded), so `getResponses` returns `[]`. Because `performSave` was memoised with these values, subsequent calls reused the stale closure even after questions loaded, causing auto-save to always POST an empty responses array.

**Fix:** Store all save parameters in refs so `performSave` always reads the current value at call time, not the value from the closure at creation time. `performSave` itself gets an empty dependency array `[]` and never becomes stale.

**`src/hooks/useAutoSave.ts`** — Rewrite using refs:

```typescript
import { useCallback, useRef, useEffect } from 'react';

interface AutoSaveParams {
  sessionId: string | null;
  token: string | null;
  sectionId: string | null;
  currentSectionIndex: number;
  getResponses: () => ResponseItem[];
}

export function useAutoSave(params: AutoSaveParams) {
  // Store all params in refs — avoids stale closure on memoised performSave
  const sessionIdRef = useRef(params.sessionId);
  const tokenRef = useRef(params.token);
  const sectionIdRef = useRef(params.sectionId);
  const sectionIndexRef = useRef(params.currentSectionIndex);
  const getResponsesRef = useRef(params.getResponses);

  // Keep refs current on every render
  useEffect(() => { sessionIdRef.current = params.sessionId; }, [params.sessionId]);
  useEffect(() => { tokenRef.current = params.token; }, [params.token]);
  useEffect(() => { sectionIdRef.current = params.sectionId; }, [params.sectionId]);
  useEffect(() => { sectionIndexRef.current = params.currentSectionIndex; }, [params.currentSectionIndex]);
  useEffect(() => { getResponsesRef.current = params.getResponses; }, [params.getResponses]);

  // Empty dep array: performSave is stable and always reads from refs
  const performSave = useCallback(async (): Promise<boolean> => {
    const sessionId = sessionIdRef.current;
    const token = tokenRef.current;
    const sectionId = sectionIdRef.current;
    const currentSectionIndex = sectionIndexRef.current;
    const responses = getResponsesRef.current();

    if (!sessionId || !token || !sectionId) return false;

    try {
      const res = await fetch(`/api/responses/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ section_id: sectionId, section_index: currentSectionIndex, responses }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []); // Empty dep array — reads from refs at call time

  const triggerSave = useCallback(async (): Promise<boolean> => {
    return performSave();
  }, [performSave]);

  return { triggerSave, performSave };
}
```

---

### Fix 8 — Navigation blocked on save failure

**Root cause:** `triggerSave` previously returned `void`. `handleNext` called `triggerSave()` and then always navigated to the next section regardless of whether the save succeeded. A failed save (network error, 4xx, 5xx) was silently ignored, leading to data loss.

**Fix:** `performSave` returns `Promise<boolean>`. `triggerSave` propagates the boolean. `handleNext`, `handlePrevious`, and `handleJump` in `AssessmentWizard` await the result and show a red error banner if `false` is returned, blocking navigation.

**`src/app/assessment/page.tsx`** — Update navigation handlers:

```typescript
const [saveError, setSaveError] = useState<string | null>(null);

const handleNext = async () => {
  // Validate required questions first
  if (!validateCurrentSection()) return;

  setSaveError(null);
  const saved = await triggerSave();
  if (!saved) {
    setSaveError('Failed to save your answers. Please check your connection and try again.');
    return; // Block navigation on save failure
  }

  // Navigate only on successful save
  setCurrentSectionIndex(prev => prev + 1);
};

const handlePrevious = async () => {
  setSaveError(null);
  const saved = await triggerSave();
  if (!saved) {
    setSaveError('Failed to save your answers. Please check your connection and try again.');
    return;
  }
  setCurrentSectionIndex(prev => prev - 1);
};

const handleJump = async (targetIndex: number) => {
  setSaveError(null);
  const saved = await triggerSave();
  if (!saved) {
    setSaveError('Failed to save your answers. Please check your connection and try again.');
    return;
  }
  setCurrentSectionIndex(targetIndex);
};
```

In the JSX, render the error banner when `saveError` is non-null:
```tsx
{saveError && (
  <div role="alert" className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
    {saveError}
  </div>
)}
```
  </action>
  <verify>
```bash
# Fix 7: Ref-based save params
grep -n "useRef" src/hooks/useAutoSave.ts && echo "REFS PRESENT OK"
grep -n "Promise<boolean>" src/hooks/useAutoSave.ts && echo "RETURN TYPE OK"
# performSave dep array must be [] — confirm no captured variables
grep -n "\[\]" src/hooks/useAutoSave.ts && echo "EMPTY DEP ARRAY OK"

# Fix 8: Navigation gated on save result
grep -n "triggerSave" src/app/assessment/page.tsx && echo "TRIGGER SAVE CALLED OK"
grep -n "saveError\|save.*error\|Failed to save" src/app/assessment/page.tsx && echo "ERROR BANNER OK"
grep -n "return;" src/app/assessment/page.tsx && echo "NAVIGATION BLOCKED OK"

# TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5 && echo "TYPESCRIPT OK"
```
  </verify>
  <done>
- src/hooks/useAutoSave.ts: all save params stored in refs; performSave has empty dep array []; returns Promise<boolean>; triggerSave returns Promise<boolean>
- src/app/assessment/page.tsx: handleNext, handlePrevious, handleJump await triggerSave(); block navigation and display red error banner on false; saveError state added
  </done>
</task>

<task type="auto">
  <name>Task 3: API & validation fixes (fixes 9–11)</name>
  <files>
    src/lib/validation.ts
    src/types/session.ts
    src/app/api/sessions/route.ts
    src/app/api/sessions/[sessionId]/route.ts
    src/app/assessment/page.tsx
  </files>
  <action>
Fix three interconnected bugs in the API and data validation layer that caused session creation to fail, the assessment to hang on load, and question responses to be rejected by Zod.

---

### Fix 9 — Zod UUID validation on question_id

**Root cause:** `ResponseItemSchema` used `z.string().uuid()` for the `question_id` field. The database seed script generates deterministic IDs using a pattern like `"00000001-0001-0001-0001-000000000001"`. These IDs have the correct hyphen-separated format but are not RFC 4122–compliant (the variant and version bits are not set correctly). `z.string().uuid()` performs a strict RFC 4122 check and rejects these IDs, causing every save attempt to return a 400 validation error.

**Fix:** Change `z.string().uuid()` to `z.string().min(1)` for `question_id`. The database enforces referential integrity; Zod only needs to ensure the field is a non-empty string.

**`src/lib/validation.ts`:**
```typescript
// Before:
const ResponseItemSchema = z.object({
  question_id: z.string().uuid(),
  // ...
});

// After:
const ResponseItemSchema = z.object({
  question_id: z.string().min(1), // Accepts deterministic seed IDs (not strict RFC 4122)
  // ...
});
```

---

### Fix 10 — team_type missing from session response

**Root cause:** The POST `/api/sessions` (create/resume) and GET `/api/sessions/[sessionId]` (fetch existing session) routes did not include `team_type` in their response bodies. `AssessmentWizard` read `team_type` exclusively from `localStorage`. In a fresh Pivota Preview iframe, `localStorage` is empty, so `team_type` was always `null`, breaking section routing.

**Fix — Part A:** Return `team_type` from both API routes.

**`src/app/api/sessions/route.ts`** — In the POST handler response:
```typescript
return NextResponse.json({
  session_id: session.id,
  token,
  is_returning: isReturning,
  team_type: session.teamType,   // ← add this
  current_section_index: session.currentSectionIndex,
});
```

**`src/app/api/sessions/[sessionId]/route.ts`** — In the GET handler response:
```typescript
return NextResponse.json({
  session_id: session.id,
  status: session.submissionStatus,
  team_type: session.teamType,   // ← add this
  current_section_index: session.currentSectionIndex,
  // ... other fields
});
```

**Fix — Part B:** Add `team_type` to the `SessionResponse` TypeScript interface.

**`src/types/session.ts`:**
```typescript
export interface SessionResponse {
  session_id: string;
  token: string;
  is_returning: boolean;
  team_type: string;             // ← add this
  current_section_index: number;
}
```

**Fix — Part C:** `AssessmentWizard` falls back to `session.team_type` and writes it to `localStorage`.

**`src/app/assessment/page.tsx`** — In the session creation/resume handler:
```typescript
const teamType =
  localStorage.getItem('team_type') ??
  session.team_type;             // ← fallback to API response

if (teamType) {
  localStorage.setItem('team_type', teamType);
}
```

---

### Fix 11 — Loading assessment hang (consequence of fix 10)

**Root cause:** Because `team_type` was missing from the session response (fix 10), `AssessmentWizard` could not determine which sections to load. The sections API call was made with `teamType=null`, which returned an error or empty array, leaving the component in an infinite loading state.

**Fix:** This is resolved by fix 10. Once `team_type` is returned by the API and correctly read by `AssessmentWizard`, the sections fetch receives a valid `teamType` parameter and the loading hang is eliminated. No additional code changes are required beyond those in fix 10.
  </action>
  <verify>
```bash
# Fix 9: z.string().min(1) for question_id
grep -n "min(1)" src/lib/validation.ts && echo "QUESTION_ID VALIDATION OK"
# Confirm uuid() is gone for question_id
grep -n "question_id.*uuid\|uuid.*question_id" src/lib/validation.ts | wc -l | xargs -I{} bash -c '[ {} -eq 0 ] && echo "UUID VALIDATOR REMOVED OK" || echo "WARN: uuid still present"'

# Fix 10: team_type in API responses
grep -n "team_type" src/app/api/sessions/route.ts && echo "SESSION ROUTE TEAM_TYPE OK"
grep -n "team_type" src/app/api/sessions/[sessionId]/route.ts && echo "SESSION_ID ROUTE TEAM_TYPE OK"
grep -n "team_type" src/types/session.ts && echo "SESSION TYPE TEAM_TYPE OK"
grep -n "team_type" src/app/assessment/page.tsx && echo "WIZARD TEAM_TYPE FALLBACK OK"

# TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5 && echo "TYPESCRIPT OK"
```
  </verify>
  <done>
- src/lib/validation.ts: ResponseItemSchema.question_id uses z.string().min(1); z.string().uuid() removed
- src/types/session.ts: SessionResponse interface includes team_type: string
- src/app/api/sessions/route.ts: POST handler returns team_type in response body
- src/app/api/sessions/[sessionId]/route.ts: GET handler returns team_type in response body
- src/app/assessment/page.tsx: reads team_type from session.team_type when localStorage is empty; writes to localStorage
- Loading hang (fix 11) eliminated as a consequence of fix 10
  </done>
</task>

<task type="auto">
  <name>Task 4: Navigation & UX fixes (fixes 12–15)</name>
  <files>
    src/components/AppNav.tsx
    src/app/layout.tsx
    src/app/dashboard/components/DashboardHeader.tsx
    drizzle/seed.ts
    drizzle/migrations/0000_initial.sql
  </files>
  <action>
Add global navigation, fix dashboard access, correct the system owner seed, and repair migration FK schema references.

---

### Fix 12 — Global AppNav component

**Root cause:** There was no persistent navigation bar in the respondent-facing flow. Users had no way to reach the dashboard or log out without knowing the URL.

**Fix:** Create `src/components/AppNav.tsx` — a sticky top navigation bar rendered in the root layout on all non-dashboard routes.

**`src/components/AppNav.tsx`:**
```typescript
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide on all dashboard routes — dashboard has its own DashboardHeader
  if (pathname?.startsWith('/dashboard')) return null;

  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('team_type');
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-lg font-semibold text-gray-900">
        AssessmentForm
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          System Owner Dashboard
        </Link>
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
```

**`src/app/layout.tsx`** — Import and mount `AppNav` above `{children}`:
```typescript
import AppNav from '@/components/AppNav';

// Inside <body>:
<body>
  <AppNav />
  {children}
</body>
```

---

### Fix 13 — Dashboard access and DashboardHeader polish

**Root cause:** No navigation link to the System Owner Dashboard existed outside of knowing the `/dashboard` URL directly. The `DashboardHeader` had an "Exit" button that was non-functional, and the Responses/Analytics/Settings tabs had no hover states.

**Fix — Part A:** The `System Owner Dashboard` link in `AppNav` (fix 12) provides the navigation entry point.

**Fix — Part B:** Update `DashboardHeader` — rename "Exit" to "Logout" and add tab hover states.

**`src/app/dashboard/components/DashboardHeader.tsx`:**

Replace the Exit button with a proper Logout button:
```typescript
const handleLogout = () => {
  // Clear system owner auth state
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  localStorage.removeItem('dashboard_token');
  router.push('/dashboard/login');
};

// In JSX:
<button
  onClick={handleLogout}
  className="text-sm text-red-600 hover:text-red-800 font-medium"
>
  Logout
</button>
```

Add hover states to navigation tabs:
```typescript
<nav className="flex gap-6">
  {['Responses', 'Analytics', 'Settings'].map(tab => (
    <Link
      key={tab}
      href={`/dashboard/${tab.toLowerCase()}`}
      className={`text-sm font-medium pb-1 border-b-2 transition-colors
        ${activeTab === tab
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
        }`}
    >
      {tab}
    </Link>
  ))}
</nav>
```

---

### Fix 14 — System owner seeding

**Root cause:** The `system_owner_emails` table was empty after `drizzle-kit push` and `npm run db:seed`. Nobody could log into the dashboard because no email was registered as a system owner. Additionally, `vijay@gmail.com` was present in both the respondents table and the system owners table, triggering the "This email is registered as a System Owner" guard on the respondent identity form.

**Fix:**

**`drizzle/seed.ts`** — Add system owner seed; remove `vijay@gmail.com` from system_owner_emails:
```typescript
// Seed system owners — admin@assessmentform.dev is the default dashboard login
await db.insert(systemOwnerEmails).values([
  { email: 'admin@assessmentform.dev' },
]).onConflictDoNothing();

// Do NOT seed vijay@gmail.com as a system owner — it is a respondent test email
// and its dual presence in both tables breaks the respondent flow guard
```

---

### Fix 15 — Migration FK references

**Root cause:** The initial migration SQL contained foreign key constraints using `REFERENCES "public"."questions"`. However, all application tables were created in the `assessmentform` schema (not `public`). These FK constraints referred to a table that did not exist in the `public` schema, causing migration failures on a clean database.

**Fix:**

**`drizzle/migrations/0000_initial.sql`** — Replace all `REFERENCES "public"."questions"` with `REFERENCES "assessmentform"."questions"`. Apply the same correction to any other FK references that use the `public` schema prefix for tables that live in `assessmentform`:

```sql
-- Before:
REFERENCES "public"."questions"("id")

-- After:
REFERENCES "assessmentform"."questions"("id")
```

Search the migration file for all occurrences of `REFERENCES "public".` and update each one to `REFERENCES "assessmentform".` for any table that is defined in the `assessmentform` schema.
  </action>
  <verify>
```bash
# Fix 12: AppNav exists and is mounted in layout
grep -n "export default" src/components/AppNav.tsx && echo "APPNAV COMPONENT OK"
grep -n "AppNav" src/app/layout.tsx && echo "APPNAV IN LAYOUT OK"
grep -n "startsWith.*dashboard\|dashboard.*startsWith" src/components/AppNav.tsx && echo "APPNAV HIDDEN ON DASHBOARD OK"

# Fix 13: DashboardHeader Logout button
grep -n "Logout" src/app/dashboard/components/DashboardHeader.tsx && echo "LOGOUT BUTTON OK"
grep -n "hover:" src/app/dashboard/components/DashboardHeader.tsx && echo "HOVER STATES OK"

# Fix 14: Seed has admin@assessmentform.dev; no vijay@gmail.com system owner
grep -n "admin@assessmentform.dev" drizzle/seed.ts && echo "ADMIN SEED OK"
grep -n "vijay@gmail.com" drizzle/seed.ts | grep -i "system_owner\|systemOwner" | wc -l | xargs -I{} bash -c '[ {} -eq 0 ] && echo "VIJAY REMOVED FROM SYSTEM OWNERS OK" || echo "WARN: vijay still in system owners"'

# Fix 15: Migration FK references assessmentform schema
grep -n "assessmentform.*questions\|REFERENCES.*assessmentform" drizzle/migrations/0000_initial.sql && echo "FK SCHEMA OK"
grep -n 'REFERENCES "public"\."questions"' drizzle/migrations/0000_initial.sql | wc -l | xargs -I{} bash -c '[ {} -eq 0 ] && echo "NO PUBLIC SCHEMA FK OK" || echo "WARN: {} public schema FK still present"'

# TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5 && echo "TYPESCRIPT OK"
```
  </verify>
  <done>
- src/components/AppNav.tsx: created; sticky nav with brand name, System Owner Dashboard link, Logout button; hidden on /dashboard/* routes
- src/app/layout.tsx: AppNav mounted above {children} in root layout
- src/app/dashboard/components/DashboardHeader.tsx: Logout button replaces Exit; tab hover states added
- drizzle/seed.ts: admin@assessmentform.dev seeded as system owner; vijay@gmail.com removed from system_owner_emails
- drizzle/migrations/0000_initial.sql: all FK references updated from "public"."questions" to "assessmentform"."questions"
  </done>
</task>

</tasks>

<self_check>
```bash
# ── Infrastructure ──────────────────────────────────────────────
echo "=== Infrastructure Checks ===" && \
grep -n "4000" package.json | head -3 && echo "PORT 4000 IN PACKAGE.JSON" && \
grep -n "NODE_TLS_REJECT_UNAUTHORIZED" scripts/start.sh && echo "TLS EXPORT IN START.SH" && \
grep -n "search_path" src/lib/db.ts && echo "SEARCH_PATH IN CONNECTION STRING" && \
grep -n "npm ci" .pivota/start-dev.sh && echo "NPM CI IN START-DEV.SH" && \
grep -n "node_modules/.bin/next" scripts/start.sh && echo "LOCAL NEXT BINARY IN START.SH" && \
grep -n "allowedDevOrigins" next.config.ts && echo "ALLOWED DEV ORIGINS IN NEXT CONFIG" && \

# ── Auto-save ───────────────────────────────────────────────────
echo "=== Auto-save Checks ===" && \
grep -n "useRef" src/hooks/useAutoSave.ts && echo "REFS IN AUTOSAVE" && \
grep -n "Promise<boolean>" src/hooks/useAutoSave.ts && echo "RETURN TYPE BOOLEAN" && \
grep -n "saveError\|Failed to save" src/app/assessment/page.tsx && echo "ERROR BANNER IN WIZARD" && \

# ── API & Validation ────────────────────────────────────────────
echo "=== API & Validation Checks ===" && \
grep -n "min(1)" src/lib/validation.ts && echo "ZOD MIN1 OK" && \
grep -n "team_type" src/app/api/sessions/route.ts && echo "TEAM_TYPE IN SESSION ROUTE" && \
grep -n "team_type" src/types/session.ts && echo "TEAM_TYPE IN TYPES" && \

# ── Navigation & UX ─────────────────────────────────────────────
echo "=== Navigation & UX Checks ===" && \
grep -n "export default" src/components/AppNav.tsx && echo "APPNAV EXISTS" && \
grep -n "AppNav" src/app/layout.tsx && echo "APPNAV IN LAYOUT" && \
grep -n "Logout" src/app/dashboard/components/DashboardHeader.tsx && echo "LOGOUT IN DASHBOARD" && \
grep -n "admin@assessmentform.dev" drizzle/seed.ts && echo "ADMIN SEED OK" && \
grep -n "assessmentform" drizzle/migrations/0000_initial.sql | grep "REFERENCES" | head -3 && echo "FK SCHEMA OK" && \

# ── TypeScript ──────────────────────────────────────────────────
echo "=== TypeScript ===" && \
npx tsc --noEmit 2>&1 | tail -3 && echo "TYPESCRIPT OK"
```
</self_check>
