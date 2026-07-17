---

## 6. Technology Stack

### 6.1 Stack Table

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend framework** | React | 18.x | Component model for SPA |
| **Full-stack framework** | Next.js (App Router) | 14.x+ | SPA shell + API Routes co-located |
| **Language** | TypeScript | 5.x | Type safety across frontend and backend |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS; WCAG 2.1 AA compliant primitives |
| **Charts** | Recharts | 2.x | React-native analytics charts (bar, pie, stacked bar) |
| **Drag-and-drop** | dnd-kit | 6.x | Ranking question drag-and-drop; accessible, keyboard-navigable |
| **Database** | PostgreSQL | 15+ | Relational data store with JSONB for answer payloads |
| **ORM / Query builder** | Drizzle ORM | 0.x | Typesafe SQL queries; parameterized; lightweight |
| **JWT** | jose | 5.x | JWT sign/verify (Edge-compatible; works in Next.js middleware) |
| **Form state** | React Hook Form | 7.x | Performant uncontrolled form state; validation integration |
| **Validation (shared)** | Zod | 3.x | Runtime schema validation for API payloads (server + client) |
| **HTTP client** | Native `fetch` | — | Browser fetch API; no additional HTTP lib needed |
| **CSV generation** | csv-stringify | 6.x | Streaming CSV serialization for export endpoint |
| **Runtime** | Node.js | 20 LTS | Application server runtime |
| **Container** | Docker | 24.x+ | Single container packaging for enterprise deployment |
| **Package manager** | pnpm | 8.x | Efficient monorepo-ready package management |

### 6.2 Key Dependency Rationale

| Decision | Rationale |
|----------|-----------|
| **Next.js App Router (not Pages Router)** | App Router supports React Server Components and co-located API handlers; reduces boilerplate; easier streaming response for CSV export. |
| **Drizzle ORM (not Prisma)** | Drizzle generates minimal runtime overhead; schema lives in TypeScript; no heavy binary client; easier to use raw SQL when needed for analytics GROUP BY queries. |
| **jose (not jsonwebtoken)** | `jose` is Edge Runtime compatible, needed for Next.js middleware JWT verification. `jsonwebtoken` uses Node.js crypto, incompatible with Edge. |
| **dnd-kit (not react-beautiful-dnd)** | `react-beautiful-dnd` is unmaintained. `dnd-kit` is actively maintained, accessible, and supports both pointer and keyboard interactions (required by WCAG 2.1 AA). |
| **Zod (not Yup)** | Zod inference integrates cleanly with TypeScript; schemas can be shared between client validation and server-side API validation without duplication. |
| **Recharts (not Chart.js)** | Recharts is React-native (no imperative canvas management); composable; integrates naturally with React state for filtered views. |

### 6.3 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✓ | PostgreSQL connection string (`postgres://user:pass@host:5432/db`) |
| `JWT_SECRET` | ✓ | HS256 signing secret (min 256-bit entropy; random string) |
| `NEXTAUTH_URL` | ✓ | Public base URL of the application (for cookie/redirect config) |
| `EMAIL_RELAY_URL` | Optional | SMTP relay or internal email service URL; stretch goal |
| `EMAIL_FROM_ADDRESS` | Optional | Sender address for confirmation emails; required if `EMAIL_RELAY_URL` is set |
| `NODE_ENV` | ✓ | `production` \| `development` |

---
