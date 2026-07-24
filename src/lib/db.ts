import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../drizzle/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // TechArch §1: Connection pool max 20
  // Enable SSL for platform-provisioned sidecars (Kubernetes native-sidecar)
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
