# Wave Schedule: AssessmentForm-Express

**Generated:** 2026-07-20  
**Features:** F0–F9 (10 total, all P0/P1 MVP)  
**Stack:** Next.js App Router · PostgreSQL · Drizzle ORM · Recharts · dnd-kit · JWT (jose) · Zod

---

```yaml
wave: 1
domain: database
depends_on: []
features: [F1, F2, F3, F4, F5, F6, F7, F8]
objective: "Create the full PostgreSQL schema (DDL) for all tables — system_owner_emails, respondents, sessions, sections, section_routing, questions, question_options, responses, assessment_config, config_audit_log — with exact constraints, indexes, and seed data for sections/questions/routing from TechArch §3."
estimated_plans: 1

---

wave: 2a
domain: backend
depends_on: [1]
features: [F1, F7]
objective: "Implement authentication and session services: POST /api/auth/login (System Owner JWT, 8h expiry), POST /api/sessions (Respondent upsert with team_type, 24h JWT), GET /api/sessions/:sessionId (returning-respondent detection, saved_responses, is_closed). Includes jwtMiddleware, requireSystemOwner, requireSessionOwner middleware and authService/sessionService."
estimated_plans: 1

---

wave: 2b
domain: backend
depends_on: [1]
features: [F2, F3]
objective: "Implement question/section API: GET /api/sections?teamType (sectionRoutingService: mandatory section enforcement, ordering, SECTION_LIMIT_EXCEEDED guard) and GET /api/sections/:sectionId/questions (per-section question list with options). Implement Zod validation schemas for all six answer payload types (single_choice, multi_choice, likert, ranking, free_text_short, free_text_long)."
estimated_plans: 1

---

wave: 2c
domain: backend
depends_on: [1]
features: [F4, F5, F9]
objective: "Implement response persistence and submission: PUT /api/responses/:sessionId (upsert responses, update last_saved_at, assessmentOpenGuard enforcement, retry-safe), POST /api/submissions/:sessionId (mandatory-questions check, draft→submitted transition, submitted_at), and POST /api/notifications/email (fire-and-forget stretch, EMAIL_RELAY_URL). Includes responseService, submissionService, emailService."
estimated_plans: 1

---

wave: 2d
domain: backend
depends_on: [1]
features: [F6, F8]
objective: "Implement System Owner backend: GET /api/dashboard/responses (paginated, sortable, filterable by team type/date/status/search), GET /api/dashboard/responses/:sessionId (individual drill-down), GET /api/dashboard/analytics (aggregated GROUP BY for team type bar, Likert distribution, ranking top-items, choice breakdown), GET /api/dashboard/export/csv (streaming csv-stringify, Content-Disposition), GET /api/config, PATCH /api/config (due_date update + config_audit_log write). Includes analyticsService, csvExportService, configService."
estimated_plans: 1

---

wave: 3a
domain: frontend
depends_on: [2a, 2b, 2c]
features: [F0, F1, F2, F3, F4]
objective: "Implement the Respondent SPA: IdentityForm (email/name/team_type capture with Zod validation + useSession), AssessmentWizard (section navigation with Previous/Next, direction enum, SPA transitions), ProgressBar (step indicator, ARIA labels, conditional jump for submitted sessions), SectionScreen (reads section questions, renders QuestionRouter, read-only mode when is_closed), all six question-type renderers (SingleChoiceQuestion, MultiChoiceQuestion, LikertQuestion, RankingQuestion with dnd-kit, FreeTextShortQuestion, FreeTextLongQuestion), OtherTextReveal, useAutoSave hook (navigate-triggered + 30s idle timer, 3-retry backoff, SaveStateIndicator), useSectionList hook, ResumeBanner."
estimated_plans: 2

---

wave: 3b
domain: frontend
depends_on: [2a, 2c]
features: [F0, F5, F9]
objective: "Implement ReviewStep (read-only summary of all sections/answers, Edit link per section, Submit button), SubmissionConfirmation screen (post-submit view with edit window notice, Return to Assessment button), re-entry banner for submitted-within-edit-window sessions, Assessment Closed banner/read-only state for post-due-date sessions (both submitted and draft variants). Wire AuthGuard client-side route guard."
estimated_plans: 1

---

wave: 3c
domain: frontend
depends_on: [2d]
features: [F6, F7, F8]
objective: "Implement the System Owner Dashboard SPA: ResponseTable (paginated 25/page, sortable columns, summary stats row, 60s auto-refresh for summary counts), FilterPanel + SearchBar + useDashboardFilters (combinable filters synced to URL query params), ResponseDetailView (drill-down, back preserves filter state), AnalyticsPanel with all four chart types (TeamTypeBarChart, LikertDistributionChart, RankingTopItemsChart, ChoiceBreakdownChart via Recharts, empty state), CSV export trigger, ConfigPanel (due date display, date picker, confirmation dialog, status badge in header), AuthGuard dashboard route protection."
estimated_plans: 2

---

wave: 4
domain: integration
depends_on: [1, 2a, 2b, 2c, 2d, 3a, 3b, 3c]
features: [F0, F1, F2, F3, F4, F5, F6, F7, F8, F9]
objective: "End-to-end integration, cross-cutting concerns, and production readiness: Docker container setup, environment variable configuration (JWT_SECRET, DATABASE_URL, EMAIL_RELAY_URL, AUTO_SAVE_IDLE_SECONDS), Playwright E2E tests covering all 89 RTM test cases across the two SPA surfaces, accessibility audit (axe-core WCAG 2.1 AA), cross-browser smoke tests (Chrome/Firefox/Safari/Edge), and database seed script for v1 section/question data. Verify 500-concurrent-respondent load profile."
estimated_plans: 2
```

---

## WAVE SCHEDULE

| Wave | Domain | Plans | Features | Objective |
|------|--------|-------|----------|-----------|
| 1 | database | 1 | F1, F2, F3, F4, F5, F6, F7, F8 | Full PostgreSQL DDL — all 10 tables with constraints, indexes, v1 seed data for sections/questions/routing |
| 2a | backend | 1 | F1, F7 | Auth & session API: login, session create/resume, JWT middleware stack |
| 2b | backend | 1 | F2, F3 | Section routing API + question API + all answer payload Zod schemas |
| 2c | backend | 1 | F4, F5, F9 | Response auto-save, submission, email notification (stretch) |
| 2d | backend | 1 | F6, F8 | Dashboard API: response list, analytics, CSV export, config management |
| 3a | frontend | 2 | F0, F1, F2, F3, F4 | Respondent SPA: identity form, wizard, all question types, auto-save, section routing |
| 3b | frontend | 1 | F0, F5, F9 | Review step, submission confirmation, re-entry/closed state banners |
| 3c | frontend | 2 | F6, F7, F8 | System Owner Dashboard SPA: response table, filters, analytics charts, config panel |
| 4 | integration | 2 | F0–F9 | E2E tests (89 RTM cases), Docker/env config, accessibility audit, cross-browser, seed script |

**Total features:** 10 (F0–F9) | **Covered:** 10 | **Uncovered:** 0

---

### Feature Coverage Verification

| Feature | Assigned Waves | All Capabilities Covered |
|---------|---------------|--------------------------|
| F0: Multi-Step Assessment Workflow | 2b (sections API), 3a (wizard/nav/progress), 3b (review/submit), 4 (E2E) | ✓ |
| F1: Respondent Identity & Session Mgmt | 1 (schema), 2a (sessions API), 3a (IdentityForm/useSession/ResumeBanner), 4 (E2E) | ✓ |
| F2: Question Types Engine | 1 (schema), 2b (questions API + Zod), 3a (all 6 renderers + OtherTextReveal), 4 (E2E) | ✓ |
| F3: Team-Type-Specific Section Routing | 1 (schema + seed), 2b (sectionRoutingService), 3a (useSectionList), 4 (E2E) | ✓ |
| F4: Auto-Save & Progress Persistence | 1 (schema), 2c (responses API), 3a (useAutoSave + SaveStateIndicator), 4 (E2E) | ✓ |
| F5: Duplicate Prevention & Edit Window | 1 (schema + UNIQUE constraint), 2c (submissions API + assessmentOpenGuard), 3b (read-only/edit modes), 4 (E2E) | ✓ |
| F6: System Owner Dashboard | 1 (schema), 2d (dashboard API + analytics + CSV), 3c (Dashboard SPA), 4 (E2E) | ✓ |
| F7: Role-Based Access Control | 1 (system_owner_emails table), 2a (authService + middleware), 3b/3c (AuthGuard), 4 (E2E) | ✓ |
| F8: Assessment Configuration Management | 1 (assessment_config + config_audit_log), 2d (config API), 3c (ConfigPanel), 4 (E2E) | ✓ |
| F9: Submission Confirmation & Feedback | 2c (submissions API + emailService), 3b (SubmissionConfirmation + banners), 4 (E2E) | ✓ |
