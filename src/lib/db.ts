import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../drizzle/schema';

// Inject search_path into the connection string via the PostgreSQL `options` parameter.
// This is set at the protocol level before any query runs — unlike pool.on('connect')
// which fires an async SET that may not complete before the first query.
function buildConnectionString(url: string | undefined): string {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  // Only add options if not already present
  if (url.includes('options=')) return url;
  return `${url}${separator}options=-csearch_path%3Dassessmentform%2Cpublic`;
}

const isLocal = (process.env.DATABASE_URL ?? '').includes('localhost')
  || (process.env.DATABASE_URL ?? '').includes('127.0.0.1')
  || (process.env.DATABASE_URL ?? '').includes('sslmode=disable');

const pool = new Pool({
  connectionString: buildConnectionString(process.env.DATABASE_URL),
  max: 20,  // TechArch §1: Connection pool max 20
  // Enable SSL for platform-provisioned sidecars (Kubernetes native-sidecar)
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
