import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sections, sectionRouting, assessmentConfig, questions as questionsTable, questionOptions } from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export async function seedDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.on('connect', (client) => {
    client.query("SET search_path TO assessmentform, public");
  });
  const db = drizzle(pool);

  console.log('Seeding sections...');

  // ── TechArch §3.4: v1 Section Seed Data ─────────────────────────────────────
  // INSERT INTO sections (id, title, description, is_mandatory, display_order)
  // Exact values from TechArch §3.4 — do NOT modify IDs or order
  await db.insert(sections).values([
    {
      id:            'general_dp_alignment',
      title:         'General DP Alignment',
      description:   'Core Developer Platform alignment questions',
      is_mandatory:  true,
      display_order: 1,
    },
    {
      id:            'current_status',
      title:         'Current Status',
      description:   'Team current tooling and adoption status',
      is_mandatory:  true,
      display_order: 2,
    },
    {
      id:            'platform_needs',
      title:         'Platform Needs & Capability Requirements',
      description:   'Platform-specific capability requirements',
      is_mandatory:  false,
      display_order: 3,
    },
    {
      id:            'tool_evaluation',
      title:         'Tool Evaluation Criteria',
      description:   'Criteria for evaluating DP tools',
      is_mandatory:  false,
      display_order: 4,
    },
    {
      id:            'integration_requirements',
      title:         'Integration & Ecosystem Requirements',
      description:   'Integration and ecosystem requirements',
      is_mandatory:  false,
      display_order: 5,
    },
    {
      id:            'adoption_readiness',
      title:         'Adoption Readiness & Constraints',
      description:   'Readiness and blockers for adoption',
      is_mandatory:  false,
      display_order: 6,
    },
    {
      id:            'governance_compliance',
      title:         'Governance & Compliance Requirements',
      description:   'Governance and compliance needs',
      is_mandatory:  false,
      display_order: 7,
    },
    {
      id:            'feedback_adaptability',
      title:         'Feedback & Adaptability',
      description:   'Open feedback and adaptability questions',
      is_mandatory:  true,
      display_order: 8,
    },
  ]).onConflictDoNothing();

  console.log('Sections seeded (8 rows).');
  console.log('Seeding section routing...');

  // ── TechArch §3.5: v1 Section Routing Seed Data ──────────────────────────────
  // Exact values from TechArch §3.5 — display_order per team type matches routing table

  // Program/Project: mandatory + platform_needs, tool_evaluation (5 sections total)
  // general_dp_alignment → current_status → platform_needs → tool_evaluation → feedback_adaptability
  const programProjectRouting = [
    { team_type: 'program_project', section_id: 'general_dp_alignment',  display_order: 1, is_included: true },
    { team_type: 'program_project', section_id: 'current_status',        display_order: 2, is_included: true },
    { team_type: 'program_project', section_id: 'platform_needs',        display_order: 3, is_included: true },
    { team_type: 'program_project', section_id: 'tool_evaluation',       display_order: 4, is_included: true },
    { team_type: 'program_project', section_id: 'feedback_adaptability', display_order: 5, is_included: true },
  ];

  // Platform Engineering: mandatory + platform_needs, tool_evaluation, integration_requirements, adoption_readiness (7 sections total)
  // general_dp_alignment → current_status → platform_needs → tool_evaluation → integration_requirements → adoption_readiness → feedback_adaptability
  const platformEngineeringRouting = [
    { team_type: 'platform_engineering', section_id: 'general_dp_alignment',     display_order: 1, is_included: true },
    { team_type: 'platform_engineering', section_id: 'current_status',           display_order: 2, is_included: true },
    { team_type: 'platform_engineering', section_id: 'platform_needs',           display_order: 3, is_included: true },
    { team_type: 'platform_engineering', section_id: 'tool_evaluation',          display_order: 4, is_included: true },
    { team_type: 'platform_engineering', section_id: 'integration_requirements', display_order: 5, is_included: true },
    { team_type: 'platform_engineering', section_id: 'adoption_readiness',       display_order: 6, is_included: true },
    { team_type: 'platform_engineering', section_id: 'feedback_adaptability',    display_order: 7, is_included: true },
  ];

  // Infrastructure/Cloud: mandatory + integration_requirements, adoption_readiness, tool_evaluation (6 sections total)
  // general_dp_alignment → current_status → integration_requirements → adoption_readiness → tool_evaluation → feedback_adaptability
  const infrastructureCloudRouting = [
    { team_type: 'infrastructure_cloud', section_id: 'general_dp_alignment',     display_order: 1, is_included: true },
    { team_type: 'infrastructure_cloud', section_id: 'current_status',           display_order: 2, is_included: true },
    { team_type: 'infrastructure_cloud', section_id: 'integration_requirements', display_order: 3, is_included: true },
    { team_type: 'infrastructure_cloud', section_id: 'adoption_readiness',       display_order: 4, is_included: true },
    { team_type: 'infrastructure_cloud', section_id: 'tool_evaluation',          display_order: 5, is_included: true },
    { team_type: 'infrastructure_cloud', section_id: 'feedback_adaptability',    display_order: 6, is_included: true },
  ];

  // Data/API Governance: mandatory + governance_compliance, platform_needs, integration_requirements (6 sections total)
  // general_dp_alignment → current_status → governance_compliance → platform_needs → integration_requirements → feedback_adaptability
  const dataApiGovernanceRouting = [
    { team_type: 'data_api_governance', section_id: 'general_dp_alignment',     display_order: 1, is_included: true },
    { team_type: 'data_api_governance', section_id: 'current_status',           display_order: 2, is_included: true },
    { team_type: 'data_api_governance', section_id: 'governance_compliance',    display_order: 3, is_included: true },
    { team_type: 'data_api_governance', section_id: 'platform_needs',           display_order: 4, is_included: true },
    { team_type: 'data_api_governance', section_id: 'integration_requirements', display_order: 5, is_included: true },
    { team_type: 'data_api_governance', section_id: 'feedback_adaptability',    display_order: 6, is_included: true },
  ];

  await db.insert(sectionRouting).values([
    ...programProjectRouting,
    ...platformEngineeringRouting,
    ...infrastructureCloudRouting,
    ...dataApiGovernanceRouting,
  ]).onConflictDoNothing();

  console.log('Section routing seeded (24 rows total across 4 team types).');

  // ── Initial assessment_config singleton ──────────────────────────────────────
  // Seed the singleton assessment config row (id=1) with a 2-week default window
  // System Owner can update due_date from the dashboard (PATCH /api/config)
  const launchDate = new Date();
  const dueDate = new Date(launchDate);
  dueDate.setDate(dueDate.getDate() + 14);  // 2-week default from TechArch §1.4

  await db.insert(assessmentConfig).values({
    id:               1,
    due_date:         dueDate.toISOString(),
    launch_date:      launchDate.toISOString(),
    last_modified_at: launchDate.toISOString(),
    last_modified_by: null,
  }).onConflictDoNothing();

  console.log('Assessment config singleton seeded (id=1, due_date=+14 days from now).');

  // ── Questions + Options Seed Data (v1) ──────────────────────────────────────
  // Seeded question IDs are fixed UUIDs so reruns remain idempotent.
  // All 6 question types represented across the 8 sections.
  // TechArch §3.4: 5-6 questions per section; questions table + question_options table.

  console.log('Seeding questions...');

  // ── Section: general_dp_alignment (mandatory, 5 questions) ─────────────────
  await db.insert(questionsTable).values([
    { id: '00000001-0001-0001-0001-000000000001', section_id: 'general_dp_alignment', question_text: 'How familiar is your team with Developer Platform tooling (e.g., Backstage, Harness IDP, Red Hat Developer Hub)?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Not at all familiar, 5 = Highly familiar' },
    { id: '00000001-0001-0001-0001-000000000002', section_id: 'general_dp_alignment', question_text: 'Which of the following Developer Platform tools has your team evaluated or used?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000001-0001-0001-0001-000000000003', section_id: 'general_dp_alignment', question_text: 'What is the primary reason your team is interested in a Developer Platform?', question_type: 'single_choice', is_required: true, has_other: true, display_order: 3, help_text: null },
    { id: '00000001-0001-0001-0001-000000000004', section_id: 'general_dp_alignment', question_text: 'Briefly describe your team\'s current biggest pain point in developer onboarding or tooling.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: 'Up to 2000 characters.' },
    { id: '00000001-0001-0001-0001-000000000005', section_id: 'general_dp_alignment', question_text: 'How urgently does your team need a Developer Platform solution?', question_type: 'likert', is_required: true, has_other: false, display_order: 5, help_text: '1 = Not urgent, 5 = Critical / blocking work' },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    // Q2 options — multi_choice (which DP tools evaluated)
    { id: '00000001-0002-0001-0001-000000000001', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'Backstage (Spotify)', display_order: 1, is_other: false },
    { id: '00000001-0002-0001-0001-000000000002', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'Red Hat Developer Hub', display_order: 2, is_other: false },
    { id: '00000001-0002-0001-0001-000000000003', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'Harness IDP', display_order: 3, is_other: false },
    { id: '00000001-0002-0001-0001-000000000004', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'None yet', display_order: 4, is_other: false },
    { id: '00000001-0002-0001-0001-000000000005', question_id: '00000001-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    // Q3 options — single_choice (primary reason)
    { id: '00000001-0003-0001-0001-000000000001', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Improve developer onboarding speed', display_order: 1, is_other: false },
    { id: '00000001-0003-0001-0001-000000000002', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Standardise tooling across teams', display_order: 2, is_other: false },
    { id: '00000001-0003-0001-0001-000000000003', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Reduce cognitive load for engineers', display_order: 3, is_other: false },
    { id: '00000001-0003-0001-0001-000000000004', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Improve compliance and audit trails', display_order: 4, is_other: false },
    { id: '00000001-0003-0001-0001-000000000005', question_id: '00000001-0001-0001-0001-000000000003', option_text: 'Other', display_order: 5, is_other: true },
  ]).onConflictDoNothing();

  // ── Section: current_status (mandatory, 5 questions) ─────────────────────────
  await db.insert(questionsTable).values([
    { id: '00000002-0001-0001-0001-000000000001', section_id: 'current_status', question_text: 'How would you rate your team\'s current developer experience (DX)?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Very poor, 5 = Excellent' },
    { id: '00000002-0001-0001-0001-000000000002', section_id: 'current_status', question_text: 'Which of the following tools does your team currently use? (Select all that apply)', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000002-0001-0001-0001-000000000003', section_id: 'current_status', question_text: 'What is the approximate size of your team?', question_type: 'single_choice', is_required: true, has_other: false, display_order: 3, help_text: null },
    { id: '00000002-0001-0001-0001-000000000004', section_id: 'current_status', question_text: 'Describe any recurring tooling or workflow issues your team experiences today.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000002-0001-0001-0001-000000000005', section_id: 'current_status', question_text: 'How satisfied is your team with the current CI/CD setup?', question_type: 'likert', is_required: true, has_other: false, display_order: 5, help_text: '1 = Very dissatisfied, 5 = Very satisfied' },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000002-0002-0001-0001-000000000001', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'GitHub / GitLab', display_order: 1, is_other: false },
    { id: '00000002-0002-0001-0001-000000000002', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'Jenkins / TeamCity', display_order: 2, is_other: false },
    { id: '00000002-0002-0001-0001-000000000003', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'Confluence / Notion (docs)', display_order: 3, is_other: false },
    { id: '00000002-0002-0001-0001-000000000004', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'Jira / Linear (tracking)', display_order: 4, is_other: false },
    { id: '00000002-0002-0001-0001-000000000005', question_id: '00000002-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    { id: '00000002-0003-0001-0001-000000000001', question_id: '00000002-0001-0001-0001-000000000003', option_text: '1–5 people', display_order: 1, is_other: false },
    { id: '00000002-0003-0001-0001-000000000002', question_id: '00000002-0001-0001-0001-000000000003', option_text: '6–15 people', display_order: 2, is_other: false },
    { id: '00000002-0003-0001-0001-000000000003', question_id: '00000002-0001-0001-0001-000000000003', option_text: '16–50 people', display_order: 3, is_other: false },
    { id: '00000002-0003-0001-0001-000000000004', question_id: '00000002-0001-0001-0001-000000000003', option_text: '50+ people', display_order: 4, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: platform_needs (optional, 6 questions including ranking) ─────────
  await db.insert(questionsTable).values([
    { id: '00000003-0001-0001-0001-000000000001', section_id: 'platform_needs', question_text: 'Rank the following Developer Platform capabilities by priority for your team.', question_type: 'ranking', is_required: true, has_other: false, display_order: 1, help_text: 'Drag items to reorder from most to least important.' },
    { id: '00000003-0001-0001-0001-000000000002', section_id: 'platform_needs', question_text: 'How important is a self-service software catalog (e.g., Backstage catalog) to your team?', question_type: 'likert', is_required: true, has_other: false, display_order: 2, help_text: '1 = Not important, 5 = Essential' },
    { id: '00000003-0001-0001-0001-000000000003', section_id: 'platform_needs', question_text: 'Which platform features does your team consider must-have for day 1 adoption?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 3, help_text: null },
    { id: '00000003-0001-0001-0001-000000000004', section_id: 'platform_needs', question_text: 'What template or scaffolding capabilities does your team need?', question_type: 'free_text_short', is_required: false, has_other: false, display_order: 4, help_text: 'e.g., project templates, service scaffolding, IaC templates' },
    { id: '00000003-0001-0001-0001-000000000005', section_id: 'platform_needs', question_text: 'How many internal services or components would your team register in a software catalog?', question_type: 'single_choice', is_required: false, has_other: false, display_order: 5, help_text: null },
    { id: '00000003-0001-0001-0001-000000000006', section_id: 'platform_needs', question_text: 'Describe any custom platform capability your team requires that is not covered above.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 6, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    // Q1 ranking options
    { id: '00000003-0001-0001-0002-000000000001', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Software catalog / service registry', display_order: 1, is_other: false },
    { id: '00000003-0001-0001-0002-000000000002', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Developer portal / unified UI', display_order: 2, is_other: false },
    { id: '00000003-0001-0001-0002-000000000003', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Scaffolding / templates', display_order: 3, is_other: false },
    { id: '00000003-0001-0001-0002-000000000004', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Onboarding automation', display_order: 4, is_other: false },
    { id: '00000003-0001-0001-0002-000000000005', question_id: '00000003-0001-0001-0001-000000000001', option_text: 'Plugin / extension ecosystem', display_order: 5, is_other: false },
    // Q3 multi-choice options
    { id: '00000003-0003-0001-0002-000000000001', question_id: '00000003-0001-0001-0001-000000000003', option_text: 'Software catalog', display_order: 1, is_other: false },
    { id: '00000003-0003-0001-0002-000000000002', question_id: '00000003-0001-0001-0001-000000000003', option_text: 'CI/CD pipeline integration', display_order: 2, is_other: false },
    { id: '00000003-0003-0001-0002-000000000003', question_id: '00000003-0001-0001-0001-000000000003', option_text: 'Metrics and observability', display_order: 3, is_other: false },
    { id: '00000003-0003-0001-0002-000000000004', question_id: '00000003-0001-0001-0001-000000000003', option_text: 'Other', display_order: 4, is_other: true },
    // Q5 single-choice
    { id: '00000003-0005-0001-0002-000000000001', question_id: '00000003-0001-0001-0001-000000000005', option_text: 'Fewer than 10', display_order: 1, is_other: false },
    { id: '00000003-0005-0001-0002-000000000002', question_id: '00000003-0001-0001-0001-000000000005', option_text: '10–50', display_order: 2, is_other: false },
    { id: '00000003-0005-0001-0002-000000000003', question_id: '00000003-0001-0001-0001-000000000005', option_text: '51–200', display_order: 3, is_other: false },
    { id: '00000003-0005-0001-0002-000000000004', question_id: '00000003-0001-0001-0001-000000000005', option_text: '200+', display_order: 4, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: tool_evaluation (optional, 5 questions) ─────────────────────────
  await db.insert(questionsTable).values([
    { id: '00000004-0001-0001-0001-000000000001', section_id: 'tool_evaluation', question_text: 'Rank the three DP tools being evaluated by your overall preference.', question_type: 'ranking', is_required: true, has_other: false, display_order: 1, help_text: 'Rank from most to least preferred.' },
    { id: '00000004-0001-0001-0001-000000000002', section_id: 'tool_evaluation', question_text: 'Which evaluation criteria are most important to your team?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000004-0001-0001-0001-000000000003', section_id: 'tool_evaluation', question_text: 'How confident is your team in evaluating these tools without external support?', question_type: 'likert', is_required: true, has_other: false, display_order: 3, help_text: '1 = Not confident, 5 = Very confident' },
    { id: '00000004-0001-0001-0001-000000000004', section_id: 'tool_evaluation', question_text: 'What is the most important single differentiator between the tools for your team?', question_type: 'free_text_short', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000004-0001-0001-0001-000000000005', section_id: 'tool_evaluation', question_text: 'Which tool do you currently lean toward adopting, based on your initial evaluation?', question_type: 'single_choice', is_required: false, has_other: false, display_order: 5, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    // Q1 ranking — tools
    { id: '00000004-0001-0001-0002-000000000001', question_id: '00000004-0001-0001-0001-000000000001', option_text: 'Backstage (Spotify)', display_order: 1, is_other: false },
    { id: '00000004-0001-0001-0002-000000000002', question_id: '00000004-0001-0001-0001-000000000001', option_text: 'Red Hat Developer Hub', display_order: 2, is_other: false },
    { id: '00000004-0001-0001-0002-000000000003', question_id: '00000004-0001-0001-0001-000000000001', option_text: 'Harness IDP', display_order: 3, is_other: false },
    // Q2 multi-choice — criteria
    { id: '00000004-0002-0001-0002-000000000001', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Ease of onboarding', display_order: 1, is_other: false },
    { id: '00000004-0002-0001-0002-000000000002', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Plugin / extension ecosystem', display_order: 2, is_other: false },
    { id: '00000004-0002-0001-0002-000000000003', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Enterprise support / SLA', display_order: 3, is_other: false },
    { id: '00000004-0002-0001-0002-000000000004', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Total cost of ownership', display_order: 4, is_other: false },
    { id: '00000004-0002-0001-0002-000000000005', question_id: '00000004-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    // Q5 single-choice — current lean
    { id: '00000004-0005-0001-0002-000000000001', question_id: '00000004-0001-0001-0001-000000000005', option_text: 'Backstage (Spotify)', display_order: 1, is_other: false },
    { id: '00000004-0005-0001-0002-000000000002', question_id: '00000004-0001-0001-0001-000000000005', option_text: 'Red Hat Developer Hub', display_order: 2, is_other: false },
    { id: '00000004-0005-0001-0002-000000000003', question_id: '00000004-0001-0001-0001-000000000005', option_text: 'Harness IDP', display_order: 3, is_other: false },
    { id: '00000004-0005-0001-0002-000000000004', question_id: '00000004-0001-0001-0001-000000000005', option_text: 'No preference yet', display_order: 4, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: integration_requirements (optional, 5 questions) ────────────────
  await db.insert(questionsTable).values([
    { id: '00000005-0001-0001-0001-000000000001', section_id: 'integration_requirements', question_text: 'Which source control platforms does your team use?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 1, help_text: null },
    { id: '00000005-0001-0001-0001-000000000002', section_id: 'integration_requirements', question_text: 'How critical is integration with your existing CI/CD pipelines for initial adoption?', question_type: 'likert', is_required: true, has_other: false, display_order: 2, help_text: '1 = Not critical, 5 = Blocker for adoption' },
    { id: '00000005-0001-0001-0001-000000000003', section_id: 'integration_requirements', question_text: 'Rank the integration points your team needs most urgently.', question_type: 'ranking', is_required: true, has_other: false, display_order: 3, help_text: null },
    { id: '00000005-0001-0001-0001-000000000004', section_id: 'integration_requirements', question_text: 'Describe any non-standard or bespoke integrations your team requires.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000005-0001-0001-0001-000000000005', section_id: 'integration_requirements', question_text: 'Does your team use a cloud provider that the DP tool must integrate with?', question_type: 'single_choice', is_required: false, has_other: true, display_order: 5, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000005-0001-0001-0002-000000000001', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'GitHub', display_order: 1, is_other: false },
    { id: '00000005-0001-0001-0002-000000000002', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'GitLab', display_order: 2, is_other: false },
    { id: '00000005-0001-0001-0002-000000000003', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'Bitbucket', display_order: 3, is_other: false },
    { id: '00000005-0001-0001-0002-000000000004', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'Azure DevOps', display_order: 4, is_other: false },
    { id: '00000005-0001-0001-0002-000000000005', question_id: '00000005-0001-0001-0001-000000000001', option_text: 'Other', display_order: 5, is_other: true },
    // Q3 ranking
    { id: '00000005-0003-0001-0002-000000000001', question_id: '00000005-0001-0001-0001-000000000003', option_text: 'SCM / version control', display_order: 1, is_other: false },
    { id: '00000005-0003-0001-0002-000000000002', question_id: '00000005-0001-0001-0001-000000000003', option_text: 'CI/CD pipelines', display_order: 2, is_other: false },
    { id: '00000005-0003-0001-0002-000000000003', question_id: '00000005-0001-0001-0001-000000000003', option_text: 'Cloud provider APIs', display_order: 3, is_other: false },
    { id: '00000005-0003-0001-0002-000000000004', question_id: '00000005-0001-0001-0001-000000000003', option_text: 'Identity / SSO', display_order: 4, is_other: false },
    // Q5 single-choice
    { id: '00000005-0005-0001-0002-000000000001', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'AWS', display_order: 1, is_other: false },
    { id: '00000005-0005-0001-0002-000000000002', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'Azure', display_order: 2, is_other: false },
    { id: '00000005-0005-0001-0002-000000000003', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'GCP', display_order: 3, is_other: false },
    { id: '00000005-0005-0001-0002-000000000004', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'Multiple / Hybrid', display_order: 4, is_other: false },
    { id: '00000005-0005-0001-0002-000000000005', question_id: '00000005-0001-0001-0001-000000000005', option_text: 'Other', display_order: 5, is_other: true },
  ]).onConflictDoNothing();

  // ── Section: adoption_readiness (optional, 5 questions) ──────────────────────
  await db.insert(questionsTable).values([
    { id: '00000006-0001-0001-0001-000000000001', section_id: 'adoption_readiness', question_text: 'How ready is your team to adopt a Developer Platform in the next 6 months?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Not ready, 5 = Ready to adopt immediately' },
    { id: '00000006-0001-0001-0001-000000000002', section_id: 'adoption_readiness', question_text: 'What are the main blockers to adoption for your team?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000006-0001-0001-0001-000000000003', section_id: 'adoption_readiness', question_text: 'Who in your team would be the primary champion for DP adoption?', question_type: 'single_choice', is_required: false, has_other: true, display_order: 3, help_text: null },
    { id: '00000006-0001-0001-0001-000000000004', section_id: 'adoption_readiness', question_text: 'What training or support would your team need to successfully adopt a Developer Platform?', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000006-0001-0001-0001-000000000005', section_id: 'adoption_readiness', question_text: 'How many engineers in your team would actively use the Developer Platform in the first 90 days?', question_type: 'single_choice', is_required: false, has_other: false, display_order: 5, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000006-0002-0001-0002-000000000001', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Migration effort from existing tools', display_order: 1, is_other: false },
    { id: '00000006-0002-0001-0002-000000000002', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Lack of engineering capacity', display_order: 2, is_other: false },
    { id: '00000006-0002-0001-0002-000000000003', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Budget / procurement constraints', display_order: 3, is_other: false },
    { id: '00000006-0002-0001-0002-000000000004', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Leadership buy-in', display_order: 4, is_other: false },
    { id: '00000006-0002-0001-0002-000000000005', question_id: '00000006-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    { id: '00000006-0003-0001-0002-000000000001', question_id: '00000006-0001-0001-0001-000000000003', option_text: 'Engineering Lead / Principal Engineer', display_order: 1, is_other: false },
    { id: '00000006-0003-0001-0002-000000000002', question_id: '00000006-0001-0001-0001-000000000003', option_text: 'Platform / DevOps team lead', display_order: 2, is_other: false },
    { id: '00000006-0003-0001-0002-000000000003', question_id: '00000006-0001-0001-0001-000000000003', option_text: 'Engineering Manager', display_order: 3, is_other: false },
    { id: '00000006-0003-0001-0002-000000000004', question_id: '00000006-0001-0001-0001-000000000003', option_text: 'Other', display_order: 4, is_other: true },
    { id: '00000006-0005-0001-0002-000000000001', question_id: '00000006-0001-0001-0001-000000000005', option_text: '1–3 engineers', display_order: 1, is_other: false },
    { id: '00000006-0005-0001-0002-000000000002', question_id: '00000006-0001-0001-0001-000000000005', option_text: '4–10 engineers', display_order: 2, is_other: false },
    { id: '00000006-0005-0001-0002-000000000003', question_id: '00000006-0001-0001-0001-000000000005', option_text: '11–25 engineers', display_order: 3, is_other: false },
    { id: '00000006-0005-0001-0002-000000000004', question_id: '00000006-0001-0001-0001-000000000005', option_text: '25+ engineers', display_order: 4, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: governance_compliance (optional, 5 questions) ───────────────────
  await db.insert(questionsTable).values([
    { id: '00000007-0001-0001-0001-000000000001', section_id: 'governance_compliance', question_text: 'How important is regulatory compliance support (e.g., SOC 2, ISO 27001) in the DP tool?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Not required, 5 = Mandatory for adoption' },
    { id: '00000007-0001-0001-0001-000000000002', section_id: 'governance_compliance', question_text: 'Which compliance frameworks does your team need to demonstrate adherence to?', question_type: 'multi_choice', is_required: true, has_other: true, display_order: 2, help_text: null },
    { id: '00000007-0001-0001-0001-000000000003', section_id: 'governance_compliance', question_text: 'Does your team require data residency controls (e.g., EU-only data storage)?', question_type: 'single_choice', is_required: true, has_other: false, display_order: 3, help_text: null },
    { id: '00000007-0001-0001-0001-000000000004', section_id: 'governance_compliance', question_text: 'Describe any specific audit or governance requirements not covered in the options above.', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000007-0001-0001-0001-000000000005', section_id: 'governance_compliance', question_text: 'How mature is your team\'s current API governance practice?', question_type: 'likert', is_required: true, has_other: false, display_order: 5, help_text: '1 = Ad hoc / none, 5 = Fully governed with enforcement' },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000007-0002-0001-0002-000000000001', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'SOC 2', display_order: 1, is_other: false },
    { id: '00000007-0002-0001-0002-000000000002', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'ISO 27001', display_order: 2, is_other: false },
    { id: '00000007-0002-0001-0002-000000000003', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'GDPR', display_order: 3, is_other: false },
    { id: '00000007-0002-0001-0002-000000000004', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'HIPAA', display_order: 4, is_other: false },
    { id: '00000007-0002-0001-0002-000000000005', question_id: '00000007-0001-0001-0001-000000000002', option_text: 'Other', display_order: 5, is_other: true },
    { id: '00000007-0003-0001-0002-000000000001', question_id: '00000007-0001-0001-0001-000000000003', option_text: 'Yes — strict data residency required', display_order: 1, is_other: false },
    { id: '00000007-0003-0001-0002-000000000002', question_id: '00000007-0001-0001-0001-000000000003', option_text: 'Preferred but not mandatory', display_order: 2, is_other: false },
    { id: '00000007-0003-0001-0002-000000000003', question_id: '00000007-0001-0001-0001-000000000003', option_text: 'No requirement', display_order: 3, is_other: false },
  ]).onConflictDoNothing();

  // ── Section: feedback_adaptability (mandatory, 5 questions) ──────────────────
  await db.insert(questionsTable).values([
    { id: '00000008-0001-0001-0001-000000000001', section_id: 'feedback_adaptability', question_text: 'Overall, how confident are you that a Developer Platform will improve your team\'s productivity?', question_type: 'likert', is_required: true, has_other: false, display_order: 1, help_text: '1 = Not confident, 5 = Highly confident' },
    { id: '00000008-0001-0001-0001-000000000002', section_id: 'feedback_adaptability', question_text: 'How willing is your team to adapt existing workflows to use a shared Developer Platform?', question_type: 'likert', is_required: true, has_other: false, display_order: 2, help_text: '1 = Very resistant, 5 = Fully open to change' },
    { id: '00000008-0001-0001-0001-000000000003', section_id: 'feedback_adaptability', question_text: 'Which aspects of your current workflow are you most reluctant to change?', question_type: 'multi_choice', is_required: false, has_other: true, display_order: 3, help_text: null },
    { id: '00000008-0001-0001-0001-000000000004', section_id: 'feedback_adaptability', question_text: 'What would make you rate this assessment as highly valuable to you and your team?', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 4, help_text: null },
    { id: '00000008-0001-0001-0001-000000000005', section_id: 'feedback_adaptability', question_text: 'Is there anything else you would like the adoption decision team to know?', question_type: 'free_text_long', is_required: false, has_other: false, display_order: 5, help_text: null },
  ]).onConflictDoNothing();

  await db.insert(questionOptions).values([
    { id: '00000008-0003-0001-0002-000000000001', question_id: '00000008-0001-0001-0001-000000000003', option_text: 'Local build tooling / scripts', display_order: 1, is_other: false },
    { id: '00000008-0003-0001-0002-000000000002', question_id: '00000008-0001-0001-0001-000000000003', option_text: 'Existing CI/CD pipelines', display_order: 2, is_other: false },
    { id: '00000008-0003-0001-0002-000000000003', question_id: '00000008-0001-0001-0001-000000000003', option_text: 'Team-specific onboarding docs', display_order: 3, is_other: false },
    { id: '00000008-0003-0001-0002-000000000004', question_id: '00000008-0001-0001-0001-000000000003', option_text: 'Other', display_order: 4, is_other: true },
  ]).onConflictDoNothing();

  console.log('Questions seeded (41 questions, 8 sections, all 6 question types represented).');

  await pool.end();
  console.log('Seed complete.');
}

// Run when called directly
seedDatabase().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
