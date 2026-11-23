#!/usr/bin/env bash
# ClamAV à la demande — démarré seulement quand des fichiers attendent leur
# analyse, arrêté après une période sans demande. Lancé chaque minute par
# coro-clamav-on-demand.timer. Aucune donnée client n'est journalisée.
set -euo pipefail

REPO=/opt/coro-platform
STATE_DIR=/opt/coro-ops/clamav
IDLE_STOP_SECONDS="${CORO_CLAMAV_IDLE_STOP_SECONDS:-600}"
# Mémoire disponible exigée avant de démarrer ClamAV (base de signatures ~1,2 Gio).
MIN_AVAILABLE_KIB="${CORO_CLAMAV_MIN_AVAILABLE_KIB:-1572864}"
mkdir -p "$STATE_DIR"
log() { printf 'coro-clamav-on-demand %s\n' "$*"; }

running() { [[ "$(docker inspect --format '{{.State.Running}}' coro_clamav 2>/dev/null || true)" == true ]]; }

# Compte direct en base (léger : pas de processus Node chaque minute) :
# pièces jointes de rapports + fichiers de projet / documents de bâtiment.
PENDING_SQL='SELECT (SELECT count(*) FROM "IncidentReportAttachment" WHERE "scanStatus" = '"'"'PENDING'"'"' AND "revokedAt" IS NULL) + (SELECT count(*) FROM "ProjectFile" WHERE "malwareScanStatus" = '"'"'PENDING'"'"')'
pending="$(printf '%s;\n' "$PENDING_SQL" | docker exec -i coro_postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' 2>/dev/null || true)"
[[ "$pending" =~ ^[0-9]+$ ]] || { log "demand=UNAVAILABLE"; exit 0; }

now="$(date +%s)"
if (( pending > 0 )); then
  printf '%s\n' "$now" >"$STATE_DIR/last-demand"
  if ! running; then
    available="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
    if (( available < MIN_AVAILABLE_KIB )); then log "pending=$pending start=DEFERRED_LOW_MEMORY"; exit 0; fi
    cd "$REPO"
    docker compose --profile incident-report-untrusted-files up -d --no-deps clamav >/dev/null
    log "pending=$pending start=REQUESTED"
  else
    log "pending=$pending state=RUNNING"
  fi
  exit 0
fi

if running; then
  last="$(cat "$STATE_DIR/last-demand" 2>/dev/null || echo 0)"
  if (( now - last >= IDLE_STOP_SECONDS )); then
    cd "$REPO"
    docker compose --profile incident-report-untrusted-files stop clamav >/dev/null
    log "pending=0 stop=IDLE"
  fi
fi
