# Technical Architecture: AssessmentForm-Express
**Project:** AssessmentForm  
**Version:** 1.0  
**Date:** 2026-07-17  
**Status:** Draft  
**Based on:** PRD-AssessmentForm.md v1.0, FRD-AssessmentForm.md v1.0

---

## 1. Architectural Overview

### 1.1 Architecture Pattern

AssessmentForm-Express uses a **Layered Monolith / Full-Stack SPA** pattern built on Next.js. The frontend is a React single-page application served as a statically-rendered shell with client-side routing. The backend exposes a REST API via Next.js API Routes (Node.js runtime), co-located in the same deployment unit. PostgreSQL provides the persistent relational data store.

This pattern was chosen over a microservices approach because:
- **Operational simplicity:** Internal enterprise tool with a bounded scope (~500 concurrent users) doesn't require distributed services.
- **Co-location reduces latency:** API routes run in the same process as the server-side rendering layer.
- **Single deployment artifact:** One container image simplifies the enterprise's internal rollout.
- **Next.js API Routes provide sufficient isolation:** Each route file maps to an HTTP handler — logic can be extracted to a service module later if needed.

### 1.2 System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Enterprise Internal Network                   │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Browser (SPA Client)                     │   │
│   │                                                             │   │
│   │  ┌─────────────────┐       ┌──────────────────────────┐   │   │
│   │  │  Assessment SPA  │       │   Dashboard SPA (SO only) │   │   │
│   │  │  (Respondent)   │       │   (System Owner)          │   │   │
│   │  │                 │       │                           │   │   │
│   │  │ • Multi-step    │       │ • Response list + filters │   │   │
│   │  │   form wizard   │       │ • Analytics charts        │   │   │
│   │  │ • Auto-save     │       │   (Recharts)              │   │   │
│   │  │ • Progress bar  │       │ • Individual drill-down   │   │   │
│   │  │ • Review step   │       │ • CSV export              │   │   │
│   │  └────────┬────────┘       └──────────┬────────────────┘   │   │
│   │           │                           │                     │   │
│   │           └─────────┬─────────────────┘                     │   │
│   │                     │  Authorization: Bearer {JWT}          │   │
│   └─────────────────────┼─────────────────────────────────────-─┘   │
│                         │                                            │
│   ┌─────────────────────▼──────────────────────────────────────┐    │
│   │               Next.js Application Server                   │    │
│   │                                                            │    │
│   │  ┌──────────────────────────────────────────────────────┐ │    │
│   │  │                   REST API Layer                     │ │    │
│   │  │          /api/** (Next.js API Routes)                │ │    │
│   │  │                                                      │ │    │
│   │  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │ │    │
│   │  │  │  Auth    │  │ Sessions │  │  Responses /      │ │ │    │
│   │  │  │  /login  │  │ CRUD     │  │  Submissions      │ │ │    │
│   │  │  └──────────┘  └──────────┘  └───────────────────┘ │ │    │
│   │  │                                                      │ │    │
│   │  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │ │    │
│   │  │  │ Sections │  │Dashboard │  │  Config PATCH     │ │ │    │
│   │  │  │ /Questions│  │ Analytics│  │  & Audit Log      │ │ │    │
│   │  │  └──────────┘  └──────────┘  └───────────────────┘ │ │    │
│   │  └──────────────────────────────────────────────────────┘ │    │
│   │                                                            │    │
│   │  ┌──────────────────────────────────────────────────────┐ │    │
│   │  │              Business Logic Layer                    │ │    │
│   │  │  • JWT auth middleware (role claim extraction)       │ │    │
│   │  │  • Section routing engine (team-type → sections)     │ │    │
│   │  │  • Answer payload validation (per question type)     │ │    │
│   │  │  • Due date enforcement (assessment open/closed)     │ │    │
│   │  │  • Analytics aggregation (SQL GROUP BY / AVG)        │ │    │
│   │  │  • CSV generation (streaming)                        │ │    │
│   │  └──────────────────────────────────────────────────────┘ │    │
│   │                                                            │    │
│   │  ┌──────────────────────────────────────────────────────┐ │    │
│   │  │                Data Access Layer                     │ │    │
│   │  │  • PostgreSQL client (pg / Drizzle ORM)              │ │    │
│   │  │  • Parameterized queries; no raw string concat       │ │    │
│   │  │  • Connection pool (max 20 connections)              │ │    │
│   │  └──────────────────────────────────────────────────────┘ │    │
│   └────────────────────────┬───────────────────────────────────┘    │
│                            │                                         │
│   ┌────────────────────────▼───────────────────────────────────┐    │
│   │                   PostgreSQL Database                      │    │
│   │                                                            │    │
│   │  system_owner_emails │ respondents │ sessions             │    │
│   │  sections │ section_routing │ questions │ question_options│    │
│   │  responses │ assessment_config │ config_audit_log        │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   ┌──────────────────────────────────────────────────┐              │
│   │   Optional: Enterprise Email Relay (SMTP)        │              │
│   │   INT-01 stretch goal — graceful no-op if absent │              │
│   └──────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.3 Deployment Topology

```
┌────────────────────────────────────────────────────┐
│               Enterprise Internal Network          │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │          Docker Container (single)           │  │
│  │                                              │  │
│  │  Node.js 20 LTS  (Next.js 14+ App Router)   │  │
│  │  Port 3000 (HTTP — internal only)            │  │
│  │                                              │  │
│  │  ENV:                                        │  │
│  │    DATABASE_URL=postgres://...               │  │
│  │    JWT_SECRET=<secret>                       │  │
│  │    EMAIL_RELAY_URL= (optional)               │  │
│  │    EMAIL_FROM_ADDRESS= (optional)            │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │      PostgreSQL 15+ (internal host)          │  │
│  │      Port 5432                               │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

**Deployment notes:**
- Single container deployment; no orchestration required for v1 scale (≤500 concurrent users).
- PostgreSQL hosted internally; `DATABASE_URL` injected at runtime.
- No public internet exposure. All traffic is within the enterprise network.
- `JWT_SECRET` must be a cryptographically random 256-bit value; rotated on security events.
- Optional email relay enabled by setting `EMAIL_RELAY_URL`; omitting the variable disables the feature silently.

### 1.4 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js (App Router)** | Co-locates React SPA and API routes in one deployment; SSR optional but not required; simplifies internal hosting. |
| **JWT-based auth (no SSO)** | Eliminates SSO dependency for v1. Email + role claim sufficient for two-role model. Token expiry: 24h (respondent) / 8h (system owner). |
| **PostgreSQL with JSONB** | Relational integrity for sessions/responses; JSONB `answer_payload` handles polymorphic answer types without a schema-per-question approach. |
| **Singleton `assessment_config`** | One active assessment at a time in v1. `CHECK (id = 1)` constraint enforces this at the database level. |
| **Section routing in DB** | Config-driven team-type → section mapping allows future team types / section changes without code deploys. |
| **Auto-save on navigation + idle** | Guarantees zero data loss on browser close. Dirty-state tracking prevents unnecessary API calls. |
| **CSV export via streaming** | Avoids memory pressure on large result sets; streamed directly as HTTP response. |
| **Recharts for analytics** | Lightweight, React-native charting library; no additional iframe or embed dependencies. |

---
