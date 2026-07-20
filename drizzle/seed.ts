import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sections, sectionRouting, assessmentConfig } from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export async function seedDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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

  await pool.end();
  console.log('Seed complete.');
}

// Run when called directly
seedDatabase().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
