---

## 6. Technology Stack

### 6.1 Stack Table

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend framework** | React | 19.2.7 | Component model for SPA |
| **Full-stack framework** | Next.js (App Router) | 16.2.10 | SPA shell + API Routes co-located |
| **Language** | TypeScript | 6.0.3 | Type safety across frontend and backend |
| **Styling** | Tailwind CSS | 4.3.3 | Utility-first CSS; WCAG 2.1 AA compliant primitives |
| **Charts** | Recharts | 3.9.2 | React-native analytics charts (bar, pie, stacked bar) |
| **Drag-and-drop** | dnd-kit | 6.x | Ranking question drag-and-drop; accessible, keyboard-navigable |
| **Database** | PostgreSQL | 16 | Platform-provisioned shared DB; schema: `assessmentform` |
| **ORM / Query builder** | Drizzle ORM | 0.45.2 | Typesafe SQL queries; parameterized; lightweight |
| **JWT** | jose | 6.2.3 | JWT sign/verify (HS256); 24h respondent / 8h system_owner |
| **Validation (shared)** | Zod | 4.4.3 | Runtime schema validation for API payloads (server + client) |
| **HTTP client** | Native `fetch` | — | Browser fetch API; no additional HTTP lib needed |
| **CSV generation** | csv-stringify | 6.8.1 | Streaming CSV serialization for export endpoint |
| **Runtime** | Node.js | 20 LTS | Application server runtime |
| **Container** | Docker | 24.x+ | Single container packaging for enterprise deployment |
| **Package manager** | npm | — | Standard Node.js package management |

### 6.2 Key Dependency Rationale

| Decision | Rationale |
|----------|-----------|
| **Next.js App Router (not Pages Router)** | App Router supports React Server Components and co-located API handlers; reduces boilerplate; easier streaming response for CSV export. |
| **Drizzle ORM (not Prisma)** | Drizzle generates minimal runtime overhead; schema lives in TypeScript; no heavy binary client; easier to use raw SQL when needed for analytics GROUP BY queries. |
| **jose (not jsonwebtoken)** | `jose` is Edge Runtime compatible, needed for Next.js middleware JWT verification. `jsonwebtoken` uses Node.js crypto, incompatible with Edge. Used at version 6.2.3 with HS256 algorithm. |
| **dnd-kit (not react-beautiful-dnd)** | `react-beautiful-dnd` is unmaintained. `dnd-kit` is actively maintained, accessible, and supports both pointer and keyboard interactions (required by WCAG 2.1 AA). |
| **Zod (not Yup)** | Zod inference integrates cleanly with TypeScript; schemas can be shared between client validation and server-side API validation without duplication. |
| **Recharts (not Chart.js)** | Recharts is React-native (no imperative canvas management); composable; integrates naturally with React state for filtered views. |

### 6.3 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✓ | PostgreSQL connection string with schema isolation: `postgres://user:pass@pivota-spec-driven-primary.prod.svc:5432/db?options=-csearch_path%3Dassessmentform%2Cpublic` |
| `JWT_SECRET` | ✓ | HS256 signing secret (min 256-bit entropy; random string) |
| `EMAIL_RELAY_URL` | Optional | SMTP relay or internal email service URL; stretch goal |
| `EMAIL_FROM_ADDRESS` | Optional | Sender address for confirmation emails; required if `EMAIL_RELAY_URL` is set |
| `NODE_ENV` | ✓ | `production` \| `development` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | ✓ | Set to `0` at process level (exported before Next.js starts) to allow self-signed TLS certs on platform-internal DB connections |

---
