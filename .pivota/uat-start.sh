#!/usr/bin/env bash
# Idempotent, detached UAT app launcher (written by verify-express). Re-run after
# any code fix to (re)start the app — it frees the port first.
set -u
PORT="${UAT_PORT:-3000}"
BS="${BUILD_SYSTEM:-}"
LOG=/tmp/pivota-uat-app.log
# Free the port + any prior server so re-runs are clean. Framework-agnostic and
# SAFE for the agent runtime — kill ONLY (a) the launcher we recorded, by its
# whole process group so workers/children die too, and (b) whatever still holds
# the port. This works for Next, NestJS (`node dist/...`), Express, Vite, etc.
# without matching process *names*.
# 🚫 NEVER free the port with `pkill -f node` / `pkill node` / `pkill -9 -f node`:
# OpenCode itself runs as `node /usr/bin/opencode serve --port 4100`, so a broad
# node pkill kills THIS agent mid-run — the verify session dies and UAT.md is
# never written (surfaces as "verify-express did not produce a fresh UAT.md").
PRIOR_PID="$(cat /tmp/pivota-uat-app.pid 2>/dev/null || true)"
if [ -n "$PRIOR_PID" ] && kill -0 "$PRIOR_PID" 2>/dev/null; then
  PGID="$(ps -o pgid= -p "$PRIOR_PID" 2>/dev/null | tr -d ' ')"
  if [ -n "$PGID" ]; then kill -TERM "-${PGID}" 2>/dev/null || true; fi
  kill -TERM "$PRIOR_PID" 2>/dev/null || true
fi
fuser -k "${PORT}/tcp" 2>/dev/null || true          # port-scoped: frees ANY server on PORT, safe
pkill -f 'next (dev|start)' 2>/dev/null || true       # Next.js-only backstop; never matches node/opencode
sleep 1
if [ "$BS" = "docker-compose" ] || ls docker-compose.y*ml compose.y*ml >/dev/null 2>&1; then
  # Use the resolved Compose command (v2 `docker compose` + sudo as needed),
  # passed in from the parent verify session. The legacy standalone
  # `docker-compose` (v1, hyphen) binary is NOT installed in the sandbox, so a
  # bare `docker-compose up -d` here would hang/fail.
  COMPOSE_CMD="${COMPOSE:-docker compose}"
  $COMPOSE_CMD up -d
  echo "[uat] ${COMPOSE_CMD} up -d"
  exit 0
fi
if [ ! -f package.json ]; then
  echo "[uat] no compose file or package.json found — start the app manually" >&2
  exit 1
fi
# Run UAT against the PRODUCTION build, NOT `next dev`: next dev's Watchpack hits
# EMFILE on the inotify-constrained K8s sandbox (shared per-uid inotify pool) and
# the app never serves in time. The build already passed in Step 4, so prefer a
# production start (npm start / next start, no file watcher); fall back to a
# polling dev server (no inotify) if there is no start script.
if grep -qE '"start"[[:space:]]*:' package.json 2>/dev/null; then
  RUN_CMD='npm start'
else
  RUN_CMD='WATCHPACK_POLLING=true npm run dev'
fi
setsid bash -c "$RUN_CMD" > "$LOG" 2>&1 < /dev/null &
echo "$!" > /tmp/pivota-uat-app.pid
echo "[uat] launched detached on :${PORT} (log: $LOG)"
