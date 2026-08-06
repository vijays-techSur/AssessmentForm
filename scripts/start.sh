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

# If DB_URL still empty, read from existing .env.local rather than overwriting it with a blank value
if [ -z "$DB_URL" ] && [ -f "$PROJECT_DIR/.env.local" ]; then
  DB_URL=$(grep '^DATABASE_URL=' "$PROJECT_DIR/.env.local" | cut -d= -f2- | head -1)
fi

if [ -z "$DB_URL" ]; then
  echo "[warn] DATABASE_URL not found — app will start but DB-backed routes will error"
fi

# ── 2. Write .env.local ──────────────────────────────────────────────────────
cat > "$PROJECT_DIR/.env.local" << ENVEOF
DATABASE_URL=${DB_URL}
JWT_SECRET=${JWT}
AUTO_SAVE_IDLE_SECONDS=${AUTO_SAVE_IDLE_SECONDS:-30}
NODE_ENV=development
NODE_TLS_REJECT_UNAUTHORIZED=0
ENVEOF

echo "[start] .env.local written"

# ── 3. Install dependencies if needed ───────────────────────────────────────
cd "$PROJECT_DIR"
if [ ! -d node_modules ] || [ ! -f node_modules/.bin/next ]; then
  echo "[start] Installing dependencies..."
  npm ci || npm install --legacy-peer-deps
fi

# ── 4. Run db migrate + seed ─────────────────────────────────────────────────
if [ -n "$DB_URL" ]; then
  echo "[start] Running DB migrations..."
  NODE_TLS_REJECT_UNAUTHORIZED=0 DATABASE_URL="$DB_URL" node_modules/.bin/tsx drizzle/migrate.ts 2>&1 || echo "[warn] db:migrate failed — continuing"
  echo "[start] Running DB seed..."
  NODE_TLS_REJECT_UNAUTHORIZED=0 DATABASE_URL="$DB_URL" node_modules/.bin/tsx drizzle/seed.ts 2>&1 || echo "[warn] db:seed failed — continuing"
else
  echo "[warn] Skipping db:setup — no DATABASE_URL"
fi

# ── 5. Start Next.js ─────────────────────────────────────────────────────────
echo "[start] Starting Next.js on 0.0.0.0:3000..."
exec NODE_TLS_REJECT_UNAUTHORIZED=0 ./node_modules/.bin/next dev -H 0.0.0.0 -p 3000
