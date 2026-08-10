import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const rawUrl = process.env.DATABASE_URL!;
  const separator = rawUrl.includes('?') ? '&' : '?';
  const connStr = rawUrl.includes('options=') ? rawUrl : `${rawUrl}${separator}options=-csearch_path%3Dassessmentform%2Cpublic`;
  const pool = new Pool({ connectionString: connStr });
  const db = drizzle(pool);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle/migrations', migrationsSchema: 'assessmentform' });
  console.log('Migrations complete.');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
