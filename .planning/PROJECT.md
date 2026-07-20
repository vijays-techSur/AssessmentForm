# AssessmentForm-Express

## What This Is

A single-page application (SPA) with a multi-step workflow that allows teams across an enterprise to evaluate Developer Platform (DP) tools — specifically Backstage, Red Hat Developer Hub, and Harness IDP. Different team types (Program/Project, Platform Engineering, Infrastructure/Cloud, Data/API Governance) can complete a structured, role-tailored assessment covering their needs, capability expectations, and current adoption readiness. A separate dashboard view gives System Owners access to aggregated responses and analytics.

## Core Value

Teams can efficiently self-assess their readiness for and expectations of a Developer Platform tool, with results intelligently aggregated so System Owners can make data-driven adoption decisions.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-step SPA workflow with section-based navigation for team-type-specific questions
- [ ] Question types: Single-choice, Multi-choice, Likert scale, Ranking, Free text (short and long), with "Other" free-text option where applicable
- [ ] Sections grouped by team type/role — max 7-8 sections total, 5-6 questions per section
- [ ] Mandatory sections: General DP Alignment, Current Status, Feedback & Adaptability (required for all respondents)
- [ ] Optional sections skippable based on team type/role relevance
- [ ] Respondent identity via email/name for auto-save and deduplication
- [ ] Auto-save progress so respondents can return and continue
- [ ] Duplicate submission prevention per respondent email
- [ ] Edit responses until Due Date (configurable, e.g., 2-week window)
- [ ] System Owner dashboard: view all responses, filter/search, analytics (charts, response breakdown)
- [ ] Role-based access: Respondent role vs System Owner role

### Out of Scope

- Mobile native app — web SPA is sufficient for enterprise internal tools
- Real-time collaboration / multi-user simultaneous editing — not needed for an assessment form
- External SSO/OAuth in v1 — email/name-based identity is sufficient for this use case
- Payment or billing — internal enterprise tool
- AI/ML response analysis in v1 — deferred; basic analytics charts cover v1 needs

## Context

- Target DP tools being evaluated: Backstage, Red Hat Developer Hub, Harness IDP
- Target team types as respondents:
  - Program/Project teams
  - Platform Engineering teams
  - Infrastructure/Cloud teams
  - Data/API Governance teams
- Assessment purpose: Enterprise-level vs team-level need assessment, capability gap identification
- Due date window: ~2 weeks from assessment launch for edits
- Section structure: 3 mandatory sections (General DP Alignment, Current Status, Feedback & Adaptability) + up to 5 optional role-specific sections (max 7-8 sections total)
- Questions per section: 5-6 questions
- Question variety required to capture nuanced preferences (Likert for sentiment, Ranking for priority, Choice for selection, Free text for open feedback)

## Constraints

- **Tech Stack**: SPA (React/Next.js preferred); backend API with persistent storage for responses
- **Sections**: Max 7-8 sections, 5-6 questions each
- **Due Date**: Responses editable up to configurable due date (default ~2 weeks from launch)
- **Deduplication**: One submission per email address; system prevents duplicate entries
- **Roles**: Two roles — Respondent and System Owner; no complex RBAC needed
- **Data privacy**: Responses stored with respondent email/name; System Owners see aggregated and individual responses

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SPA architecture | Single-page experience reduces navigation friction for multi-step form | — Pending |
| Email/name identity (not SSO) | Simpler onboarding, no SSO dependency for enterprise rollout | — Pending |
| Role-based dashboard separation | System Owners need analytics view; respondents need form view | — Pending |
| Fixed DP tools in v1 (Backstage, RHDH, Harness IDP) | Scoped to three specific tools the org is evaluating | — Pending |
| Mandatory + optional sections | Reduces cognitive load; ensures universal baseline data | — Pending |

---
*Last updated: 2026-07-17 after initialization*
