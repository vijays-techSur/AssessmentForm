# FRD: AssessmentForm-Express
**Project:** AssessmentForm  
**Version:** 1.0  
**Date:** 2026-07-17  
**Status:** Draft  
**Based on:** PRD-AssessmentForm.md v1.0

---

## Scope

This Functional Requirements Document specifies the detailed behavior of every feature in AssessmentForm-Express — an enterprise-internal SPA that enables cross-functional teams to self-assess their readiness for and expectations of Developer Platform (DP) tools (Backstage, Red Hat Developer Hub, Harness IDP). It covers all inputs, outputs, validation rules, error states, API surface, and database schema for v1 MVP delivery.

---

## Conventions

- **Feature IDs:** `F{nn}` (zero-padded) match PRD feature numbers exactly (e.g., F0 → F00).
- **Field types:** `string`, `integer`, `boolean`, `enum`, `timestamp`, `uuid`, `text` follow PostgreSQL/standard type naming.
- **Required vs Optional:** `(required)` / `(optional)` follow each field.
- **HTTP verbs:** All API endpoints use standard REST conventions (GET, POST, PUT, PATCH, DELETE).
- **Error codes:** `SCREAMING_SNAKE_CASE` identifiers are used in API error responses (see `Y2-errors.md`).
- **References:** `see F{nn} §{section}` means refer to the named section inside that feature chunk.
- **Cross-feature specs:** Full DDL lives in `Y0-schema.md`; full API specs in `Y1-api.md`; error catalog in `Y2-errors.md`; integrations in `Y3-integrations.md`.

---

## Master Table of Contents

| Chunk | Feature / Section |
|-------|------------------|
| `F00-multi-step-workflow.md` | F0: Multi-Step Assessment Workflow |
| `F01-respondent-identity.md` | F1: Respondent Identity & Session Management |
| `F02-question-types.md` | F2: Question Types Engine |
| `F03-section-routing.md` | F3: Team-Type-Specific Section Routing |
| `F04-auto-save.md` | F4: Auto-Save & Progress Persistence |
| `F05-duplicate-prevention.md` | F5: Duplicate Submission Prevention & Edit Window |
| `F06-dashboard.md` | F6: System Owner Dashboard |
| `F07-rbac.md` | F7: Role-Based Access Control |
| `F08-config-management.md` | F8: Assessment Configuration Management |
| `F09-submission-confirmation.md` | F9: Submission Confirmation & Respondent Feedback |
| `Y0-schema.md` | Database Schema (DDL) |
| `Y1-api.md` | REST API Endpoint Catalog |
| `Y2-errors.md` | Cross-Feature Error Catalog |
| `Y3-integrations.md` | External Integration Points |

---

## Cross-Cutting Terminology

| Term | Definition |
|------|-----------|
| **Respondent** | An enterprise team member who completes the assessment form. Identified by email + name. |
| **System Owner** | A privileged user who can view all responses, analytics, and configure assessment settings. Identified by a pre-configured email address. |
| **Assessment** | The full multi-step questionnaire consisting of sections and questions. |
| **Section** | A logical grouping of 5–6 related questions within the assessment. Max 7–8 sections per assessment. |
| **Team Type** | One of four respondent categories: Program/Project, Platform Engineering, Infrastructure/Cloud, Data/API Governance. Determines which optional sections are shown. |
| **DP Tool** | A Developer Platform tool being evaluated. Fixed set in v1: Backstage, Red Hat Developer Hub, Harness IDP. |
| **Submission** | A finalized (deliberate "Submit" action) set of answers from a respondent. |
| **Draft** | A partially-completed assessment that has been auto-saved but not yet submitted. |
| **Due Date** | The configurable deadline after which no further edits to submissions are accepted. |
| **Session** | A server-side record linking a respondent's email to their current draft/submission state. |
| **Edit Window** | The period between a respondent's first submission and the assessment due date during which edits are permitted. |
| **Mandatory Section** | A section required for all team types: General DP Alignment, Current Status, Feedback & Adaptability. |
| **Optional Section** | A section displayed only for specific team types based on routing configuration. |
| **Auto-Save** | Automatic background persistence of a respondent's current answers without requiring a deliberate save action. |
| **Response** | A single answer to a single question by a respondent. |
| **Completion Status** | Indicates whether a respondent has submitted (`submitted`) or has a draft in progress (`draft`). |

---

## Non-Functional Requirements Summary

| Category | Requirement |
|----------|-------------|
| Performance | Section loads ≤ 1 second on standard enterprise network |
| Auto-save latency | Completes within 3 seconds of trigger |
| Availability | 99.5% uptime during active 2-week assessment window |
| Scalability | 500 concurrent respondents without degradation |
| Browser support | Chrome, Firefox, Safari, Edge (latest 2 major versions) |
| Accessibility | WCAG 2.1 AA for all form elements and navigation |
| Security | Dashboard accessible only to System Owner role |
| Data Privacy | Respondent email/name stored; no external data sharing |
| Auditability | Submission timestamps and last-modified per response stored |

---
