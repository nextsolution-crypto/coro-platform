#!/usr/bin/env bash
set -Eeuo pipefail

operation="${CORO_CLAMAV_READINESS_OPERATION:-INSPECT}"
expected_image='clamav/clamav-debian@sha256:6982509b9e1415bf23cb49d0c55872fdd57fd2b92be33fa26d487da42d322076'
minimum_available_bytes=$((3 * 1024 * 1024 * 1024))
evidence=''
cleanup() { [[ -z "$evidence" ]] || rm -f -- "$evidence"; }
trap cleanup EXIT

fail() { printf 'CORO_CLAMAV_READINESS_FAILED code=%s\n' "$1" >&2; exit 1; }
[[ "$operation" == INSPECT || "$operation" == VERIFY ]] || fail INVALID_OPERATION

available_kib="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
total_kib="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
[[ "$available_kib" =~ ^[0-9]+$ ]] || fail MEMORY_UNAVAILABLE
[[ "$total_kib" =~ ^[0-9]+$ ]] || fail MEMORY_UNAVAILABLE
available_bytes=$((available_kib * 1024))
total_bytes=$((total_kib * 1024))
(( available_bytes >= minimum_available_bytes )) || fail INSUFFICIENT_AVAILABLE_MEMORY

if [[ "$operation" == INSPECT ]]; then
  container_present=false
  image_present=false
  [[ -z "$(docker ps -aq --filter 'name=^/coro_clamav$')" ]] || container_present=true
  [[ -z "$(docker image ls --no-trunc --quiet "$expected_image")" ]] || image_present=true
  printf '{"schemaVersion":1,"execution":"PASS","operation":"INSPECT","readOnly":true,"memoryTotalBytes":%s,"memoryAvailableBytes":%s,"memoryMinimumBytes":%s,"containerPresent":%s,"imagePresent":%s,"mutation":false}\n' "$total_bytes" "$available_bytes" "$minimum_available_bytes" "$container_present" "$image_present"
  exit 0
fi

container="$(docker compose ps -q clamav)"
[[ -n "$container" ]] || fail CONTAINER_MISSING
[[ "$(docker inspect --format '{{.State.Running}}' "$container")" == true ]] || fail CONTAINER_NOT_RUNNING
[[ "$(docker inspect --format '{{.State.Health.Status}}' "$container")" == healthy ]] || fail CONTAINER_UNHEALTHY
[[ -z "$(docker port "$container")" ]] || fail PORT_PUBLISHED
actual_image="$(docker inspect --format '{{.Config.Image}}' "$container")"
[[ "$actual_image" == "$expected_image" ]] || fail IMAGE_MISMATCH
backend="$(docker compose ps -q backend)"
[[ -n "$backend" ]] || fail BACKEND_MISSING
evidence="$(mktemp /tmp/coro-clamav-smoke.XXXXXX.json)"
docker exec "$backend" node dist/src/scripts/clamav-smoke.js >"$evidence" || fail INSTREAM_FAILED
node -e 'const fs=require("fs");const p=process.argv[1];const r=JSON.parse(fs.readFileSync(p,"utf8"));if(r.execution!=="PASS"||r.ping!=="PONG"||r.signatures!=="CURRENT"||r.cleanInstream!=="CLEAN"||r.eicarInstream!=="INFECTED"||r.importEnabled!==false)process.exit(1)' "$evidence" || fail EVIDENCE_INVALID
stats="$(docker stats --no-stream --format '{{.MemUsage}}|{{.CPUPerc}}' "$container")"
[[ -n "$stats" ]] || fail STATS_UNAVAILABLE
printf '{"schemaVersion":1,"execution":"PASS","operation":"VERIFY","readOnly":true,"imageDigest":"sha256:6982509b9e1415bf23cb49d0c55872fdd57fd2b92be33fa26d487da42d322076","health":"HEALTHY","ping":"PONG","signatures":"CURRENT","cleanInstream":"CLEAN","eicarInstream":"INFECTED","importEnabled":false,"resourceStatsAvailable":true,"mutation":false}\n'
