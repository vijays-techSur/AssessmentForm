import { db } from '@/lib/db';
import { assessmentConfig, configAuditLog } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

// F08: Assessment Status Computation
// TechArch §4.2: AssessmentStatus — computed from launch_date and due_date relative to NOW()
function computeStatus(launchDate: string, dueDate: string): 'upcoming' | 'active' | 'closed' {
  const now = new Date();
  if (now < new Date(launchDate)) return 'upcoming';
  if (now > new Date(dueDate)) return 'closed';
  return 'active';
}

// GET /api/config — F08 §View Configuration
// TechArch §4.3: AssessmentConfig
// TechArch: status is computed on every call, NOT stored
export async function getConfig() {
  const rows = await db.select().from(assessmentConfig).where(eq(assessmentConfig.id, 1)).limit(1);
  if (rows.length === 0) {
    throw new Error('CONFIG_NOT_FOUND');
  }
  const cfg = rows[0];
  return {
    due_date:         cfg.due_date,
    launch_date:      cfg.launch_date,
    status:           computeStatus(cfg.launch_date, cfg.due_date),
    last_modified_at: cfg.last_modified_at,
    last_modified_by: cfg.last_modified_by ?? null,
  };
}

// PATCH /api/config — F08 §Update Due Date
// TechArch §4.3: Request body { due_date: string }
// Side effect: writes config_audit_log row (F08 §Outputs)
export async function patchConfig(newDueDate: string, changedBy: string) {
  const rows = await db.select().from(assessmentConfig).where(eq(assessmentConfig.id, 1)).limit(1);
  if (rows.length === 0) throw new Error('CONFIG_NOT_FOUND');

  const current = rows[0];
  const now = new Date().toISOString();

  // Update singleton config row
  await db
    .update(assessmentConfig)
    .set({ due_date: newDueDate, last_modified_at: now, last_modified_by: changedBy })
    .where(eq(assessmentConfig.id, 1));

  // Write audit log entry — F08 §Process step 9
  // TechArch §3.2: config_audit_log: changed_by, field_changed, old_value, new_value
  await db.insert(configAuditLog).values({
    changed_by:    changedBy,
    field_changed: 'due_date',
    old_value:     current.due_date,
    new_value:     newDueDate,
    changed_at:    now,
  });

  return {
    due_date:         newDueDate,
    launch_date:      current.launch_date,
    status:           computeStatus(current.launch_date, newDueDate),
    last_modified_at: now,
    last_modified_by: changedBy,
  };
}
