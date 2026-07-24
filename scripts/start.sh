#!/bin/bash
# Startup wrapper: reads platform-injected env from PID1, writes .env.local, then starts Next.js

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── 1. Read injected env from PID1 (platform-provided DATABASE_URL + JWT_SECRET) ──
PID1_ENV="/proc/1/environ"
if [ -f "$PID1_ENV" ]; then
  DB_URL=$(tr '\0' '\n' < "$PID1_ENV" | grep '^DATABASE_URL=' | cut -d= -f2- | head -1)
  JWT=$(tr '\0' '\n' < "$PID1_ENV" | grep '^JWT_SECRET=' | cut -d= -f2- | head -1)
fi

# Fallback to current env if PID1 values not found
DB_URL="${DB_URL:-${DATABASE_URL:-}}"
JWT="${JWT:-${JWT_SECRET:-uat-dev-secret-minimum-32-chars-here!!}}"

if [ -z "$DB_URL" ]; then
  echo "[warn] DATABASE_URL not found — app will start but DB-backed routes will error"
fi

# ── 2. Write .env.local ──────────────────────────────────────────────────────
cat > "$PROJECT_DIR/.env.local" << ENVEOF
DATABASE_URL=${DB_URL}
JWT_SECRET=${JWT}
AUTO_SAVE_IDLE_SECONDS=${AUTO_SAVE_IDLE_SECONDS:-30}
NODE_ENV=development
ENVEOF

echo "[start] .env.local written"

# ── 3. Run db:setup (schema push + seed) ────────────────────────────────────
cd "$PROJECT_DIR"
if [ -n "$DB_URL" ]; then
  echo "[start] Pushing DB schema..."
  DATABASE_URL="$DB_URL" npx drizzle-kit push --force 2>&1 || echo "[warn] db:push failed — continuing"
  echo "[start] Seeding DB..."
  DATABASE_URL="$DB_URL" npx tsx drizzle/seed.ts 2>&1 || echo "[warn] db:seed failed — continuing"
else
  echo "[warn] Skipping db:setup — no DATABASE_URL"
fi

# ── 4. Start Next.js ─────────────────────────────────────────────────────────
echo "[start] Starting Next.js on 0.0.0.0:3000..."
exec npx next dev -H 0.0.0.0 -p 3000
