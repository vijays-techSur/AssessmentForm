#!/usr/bin/env bash
set -u
PORT="${UAT_PORT:-3000}"
BS="${BUILD_SYSTEM:-docker-compose}"
LOG=/tmp/pivota-uat-app.log
PRIOR_PID="$(cat /tmp/pivota-uat-app.pid 2>/dev/null || true)"
if [ -n "$PRIOR_PID" ] && kill -0 "$PRIOR_PID" 2>/dev/null; then
  PGID="$(ps -o pgid= -p "$PRIOR_PID" 2>/dev/null | tr -d ' ')"
  if [ -n "$PGID" ]; then kill -TERM "-${PGID}" 2>/dev/null || true; fi
  kill -TERM "$PRIOR_PID" 2>/dev/null || true
fi
fuser -k "${PORT}/tcp" 2>/dev/null || true
pkill -f 'next (dev|start)' 2>/dev/null || true
sleep 1
COMPOSE_CMD="${COMPOSE:-docker compose}"
$COMPOSE_CMD up -d
echo "[uat] ${COMPOSE_CMD} up -d"
exit 0
