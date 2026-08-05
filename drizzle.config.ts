import type { Config } from 'drizzle-kit';

const isLocal = (process.env.DATABASE_URL ?? '').includes('localhost')
  || (process.env.DATABASE_URL ?? '').includes('127.0.0.1');

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  schemaFilter: ['assessmentform'],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  },
} satisfies Config;
