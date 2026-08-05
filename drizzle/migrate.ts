import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // Set search_path so all DDL and queries target the assessmentform schema
  pool.on('connect', (client) => {
    client.query("SET search_path TO assessmentform, public");
  });
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
