import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../drizzle/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // TechArch §1: Connection pool max 20
  // Enable SSL for platform-provisioned sidecars (Kubernetes native-sidecar)
  // Disable SSL for local docker-compose (localhost, 127.0.0.1, or sslmode=disable)
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1') || process.env.DATABASE_URL?.includes('sslmode=disable')
    ? false
    : { rejectUnauthorized: false },
});

// Route all queries to the assessmentform schema on the shared platform DB
pool.on('connect', (client) => {
  client.query("SET search_path TO assessmentform, public");
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
