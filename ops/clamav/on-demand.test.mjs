import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync(new URL('./on-demand.sh', import.meta.url), 'utf8');
const timer = fs.readFileSync(new URL('./coro-clamav-on-demand.timer', import.meta.url), 'utf8');
const release = fs.readFileSync(new URL('../deploy/coro-production-release.sh', import.meta.url), 'utf8');

test('ClamAV à la demande : démarrage seulement sur demande et avec assez de mémoire', () => {
  assert.match(script, /"scanStatus" = '"'"'PENDING'"'"'/);
  assert.match(script, /"ProjectFile" WHERE "malwareScanStatus" = '"'"'PENDING'"'"'/);
  assert.match(script, /MemAvailable/);
  assert.match(script, /DEFERRED_LOW_MEMORY/);
  assert.match(script, /up -d --no-deps clamav/);
  assert.match(script, /stop clamav/);
  assert.match(script, /IDLE_STOP_SECONDS/);
  assert.doesNotMatch(script, /originalFileName|storageKey|SELECT \*/);
});

test('ClamAV à la demande : file indisponible = aucune action', () => {
  assert.match(script, /demand=UNAVAILABLE"; exit 0/);
});

test('minuteur chaque minute et mode de release dédié', () => {
  assert.match(timer, /OnUnitActiveSec=60s/);
  assert.match(release, /CLAMAV_ON_DEMAND\) CLAMAV_REQUIRED=false; CLAMAV_ON_DEMAND=true/);
  assert.match(release, /INCIDENT_REPORT_CLAMAV_MODE: "\$\(\[\[ "\$CLAMAV_ON_DEMAND" == true \]\] && printf ON_DEMAND/);
  assert.match(release, /systemctl enable --now coro-clamav-on-demand\.timer/);
  assert.match(release, /systemctl disable --now coro-clamav-on-demand\.timer/);
  assert.match(release, /quarantineUntilScanned/);
});
