# UX Mockup: AssessmentForm-Express

**Project:** AssessmentForm-Express
**Generated:** 2026-07-17
**Based on:** UserStories-AssessmentForm.md, JOURNEYS-AssessmentForm.md, PRD-AssessmentForm.md, FRD-AssessmentForm.md
**User Stories Covered:** US-0.1 – US-9.3 (38 stories across 10 epics)

---

## Overview

AssessmentForm-Express serves two distinct user groups with non-overlapping UI surfaces:

1. **Respondents** (Marcus Reid, Priya Nair): A multi-step SPA assessment form with identity capture, section-by-section navigation, auto-save, and submission/re-entry flows.
2. **System Owners** (Dana Okafor): A role-protected dashboard with a response list, analytics charts, CSV export, and assessment configuration.

### Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Persistent save-state confidence** | The #1 respondent anxiety is data loss. A persistent, real-time save indicator appears on every section screen. (JRN-01.1 Stage 4, JRN-02.1 Stage 3) |
| **Progressive disclosure** | Team type selection at identity capture gates section routing; respondents never see irrelevant sections. (US-3.1, US-3.2) |
| **Re-entry first-class citizen** | Returning respondents (both draft and submitted) are recognized immediately with clear banners and pre-populated forms. (US-1.2, US-5.2, US-9.2) |
| **Confirmation clarity** | Post-submit and post-edit confirmations explicitly distinguish "updated submission" from "new submission" to prevent deduplication anxiety. (JRN-01.2, JRN-02.2) |
| **Section jump on re-entry** | Returning users can jump directly to any completed section via the progress indicator — not forced to navigate sequentially. (JRN-01.2 Stage 3, JRN-02.2 Stage 3) |
| **Dashboard for analysts** | Charts are readable at projection scale; CSV headers are human-readable question text, not IDs. (JRN-03.2) |

### Personas → UI Surface Mapping

| Persona | Primary Surface | Key Flows |
|---------|-----------------|-----------|
| Marcus Reid (non-technical respondent) | Assessment Form | Identity → Section Navigation → Review → Submit → Re-entry |
| Priya Nair (technical respondent) | Assessment Form | Identity (PE routing) → Ranking/Free-text → Submit → Revision |
| Dana Okafor (System Owner) | Dashboard | Config → Monitor → Drill-down → Export → Present |

### Route Map

| Route | Surface | Role |
|-------|---------|------|
| `/` | Landing / Identity Capture | Respondent |
| `/assessment` | Multi-step Assessment Form | Respondent |
| `/assessment/review` | Review & Submit Step | Respondent |
| `/assessment/confirmation` | Submission Confirmation | Respondent |
| `/dashboard` | System Owner Dashboard Home | System Owner |
| `/dashboard/responses/:sessionId` | Individual Response Drill-down | System Owner |
| `/dashboard/analytics` | Analytics Charts Panel | System Owner |
| `/dashboard/config` | Assessment Configuration | System Owner |

---
