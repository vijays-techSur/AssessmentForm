import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// GET /api/health
// Used by docker-compose healthcheck and external monitoring.
// Returns 200 if app + DB are reachable, 503 if DB is down.
// TechArch §7.2 INT-02: deployment health verification endpoint.
export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  try {
    // Lightweight DB connectivity check — does not touch any application tables
    await db.execute(sql`SELECT 1`);

    return NextResponse.json(
      { status: 'ok', db: 'connected', timestamp },
      {
        status: 200,
        headers: {
          // Health endpoint must be freely accessible — no auth, no caching
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('[GET /api/health] DB connectivity check failed:', err);
    return NextResponse.json(
      { status: 'error', db: 'disconnected', timestamp },
      { status: 503 }
    );
  }
}
