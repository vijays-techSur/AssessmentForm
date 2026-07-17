---

## 2. Component Architecture

### 2.1 Frontend Components

```
src/
├── app/                             # Next.js App Router pages
│   ├── page.tsx                     # Root redirect: → /assessment or /dashboard
│   ├── assessment/
│   │   └── page.tsx                 # Assessment SPA entry point
│   └── dashboard/
│       ├── page.tsx                 # Dashboard home (response list + analytics)
│       └── responses/
│           └── [sessionId]/
│               └── page.tsx         # Individual response drill-down
│
├── components/
│   ├── assessment/
│   │   ├── IdentityForm.tsx         # F01: Email + name + team type capture
│   │   ├── AssessmentWizard.tsx     # F00: Multi-step section wizard container
│   │   ├── ProgressBar.tsx          # F00: Step progress indicator
│   │   ├── SectionScreen.tsx        # F00: Renders one section's questions
│   │   ├── ReviewStep.tsx           # F00: Pre-submit read-only summary
│   │   ├── SaveStateIndicator.tsx   # F04: "Saved / Saving… / Unsaved" status
│   │   └── SubmissionConfirmation.tsx # F09: Post-submit confirmation screen
│   │
│   ├── questions/                   # F02: Question type renderers
│   │   ├── QuestionRouter.tsx       # Selects renderer by question_type
│   │   ├── SingleChoiceQuestion.tsx
│   │   ├── MultiChoiceQuestion.tsx
│   │   ├── LikertQuestion.tsx
│   │   ├── RankingQuestion.tsx      # DnD + numbered fallback
│   │   ├── FreeTextShortQuestion.tsx
│   │   ├── FreeTextLongQuestion.tsx
│   │   └── OtherTextReveal.tsx      # Shared "Other" field reveal component
│   │
│   ├── dashboard/
│   │   ├── ResponseTable.tsx        # F06: Paginated, sortable response list
│   │   ├── FilterPanel.tsx          # F06: Team type / date / status filters
│   │   ├── SearchBar.tsx            # F06: Name/email search
│   │   ├── ResponseDetailView.tsx   # F06: Individual response read-only render
│   │   ├── AnalyticsPanel.tsx       # F06: Charts container
│   │   ├── charts/
│   │   │   ├── TeamTypeBarChart.tsx          # Response counts by team type
│   │   │   ├── LikertDistributionChart.tsx   # Stacked bar per Likert question
│   │   │   ├── RankingTopItemsChart.tsx      # Average rank per ranking question
│   │   │   └── ChoiceBreakdownChart.tsx      # Pie/bar per choice question
│   │   └── ConfigPanel.tsx          # F08: Due date management
│   │
│   └── shared/
│       ├── AuthGuard.tsx            # F07: Client-side role guard HOC
│       ├── ErrorBoundary.tsx        # Global error catch + display
│       ├── LoadingSpinner.tsx
│       └── ResumeBanner.tsx         # F01: Returning respondent notice
│
├── hooks/
│   ├── useAutoSave.ts               # F04: Auto-save logic (nav + idle timer)
│   ├── useSession.ts                # F01: Session state management + localStorage
│   ├── useSectionList.ts            # F03: Fetch + cache section list
│   └── useDashboardFilters.ts       # F06: Filter state + URL sync
│
├── lib/
│   ├── api.ts                       # Typed fetch wrapper (all API calls)
│   ├── jwt.ts                       # Client-side JWT decode (role extraction)
│   ├── answerPayload.ts             # F02: Answer serialization helpers
│   └── validators.ts                # Client-side validation (email, name, etc.)
│
└── types/
    └── index.ts                     # Shared TypeScript interfaces (see §4)
```

### 2.2 Backend Modules (Next.js API Routes)

```
src/app/api/
├── auth/
│   └── login/route.ts               # POST /api/auth/login — System Owner login
│
├── sessions/
│   ├── route.ts                     # POST /api/sessions — create/resume session
│   └── [sessionId]/
│       └── route.ts                 # GET /api/sessions/:sessionId — load session
│
├── sections/
│   ├── route.ts                     # GET /api/sections?teamType — section list
│   └── [sectionId]/
│       └── questions/
│           └── route.ts             # GET /api/sections/:id/questions
│
├── responses/
│   └── [sessionId]/
│       └── route.ts                 # PUT /api/responses/:sessionId — auto-save
│
├── submissions/
│   └── [sessionId]/
│       └── route.ts                 # POST /api/submissions/:sessionId — finalize
│
├── dashboard/
│   ├── responses/
│   │   ├── route.ts                 # GET /api/dashboard/responses — paginated list
│   │   └── [sessionId]/
│   │       └── route.ts             # GET /api/dashboard/responses/:sessionId
│   ├── analytics/
│   │   └── route.ts                 # GET /api/dashboard/analytics
│   └── export/
│       └── csv/
│           └── route.ts             # GET /api/dashboard/export/csv — streaming
│
├── config/
│   └── route.ts                     # GET + PATCH /api/config
│
└── notifications/
    └── email/
        └── route.ts                 # POST /api/notifications/email (stretch)
```

### 2.3 Backend Services (Business Logic Layer)

| Service Module | Responsibilities |
|----------------|-----------------|
| `authService.ts` | JWT sign/verify, role determination, `system_owner_emails` lookup |
| `sessionService.ts` | Session upsert, returning-respondent detection, section list hydration |
| `sectionRoutingService.ts` | Compute effective section list for a team type; mandatory section enforcement; order assembly |
| `questionService.ts` | Fetch section questions with options; validate answer payload schemas |
| `responseService.ts` | Upsert responses (JSONB payloads); due-date guard; `last_saved_at` update |
| `submissionService.ts` | Final submission: mandatory-questions check, status transition, audit timestamp |
| `dashboardService.ts` | Paginated response list with filters; individual response fetch |
| `analyticsService.ts` | SQL aggregations: COUNT by team type, Likert distribution, ranking AVG, choice counts |
| `csvExportService.ts` | Streaming CSV generation: flatten JSONB payloads to human-readable strings |
| `configService.ts` | Read/update `assessment_config` singleton; write `config_audit_log` on every change |
| `emailService.ts` | Fire-and-forget email via SMTP relay; no-op if `EMAIL_RELAY_URL` unset |

### 2.4 Middleware

| Middleware | Applied To | Responsibility |
|------------|-----------|----------------|
| `jwtMiddleware` | All `/api/**` except `POST /api/sessions` and `POST /api/auth/login` | Verify JWT signature + expiry; attach `req.user = { session_id, email, role }` |
| `requireSystemOwner` | All `/api/dashboard/**` and `GET /api/config`, `PATCH /api/config` | Reject with 403 `ACCESS_DENIED` if `req.user.role !== "system_owner"` |
| `requireSessionOwner` | `GET /api/sessions/:id`, `PUT /api/responses/:id`, `POST /api/submissions/:id` | Verify session belongs to authenticated email; reject with 403 `SESSION_ACCESS_DENIED` |
| `assessmentOpenGuard` | `PUT /api/responses/:id`, `POST /api/submissions/:id` | Check `assessment_config.due_date > NOW()`; reject with 403 `ASSESSMENT_CLOSED` if past |
| `requestLogger` | All routes | Structured request/response logging (method, path, status, latency) |

---
