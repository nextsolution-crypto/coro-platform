import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CLAMAV_IMAGE, verifyCompose } from './verify-compose.mjs';

function valid() {
  return {
    services: {
      clamav: {
        image: CLAMAV_IMAGE,
        profiles: ['incident-report-untrusted-files'],
        networks: { coro_clamav_internal: null, coro_clamav_updates: null },
        volumes: [{ type: 'volume', source: 'clamav_signatures', target: '/var/lib/clamav' }],
        mem_limit: 3 * 1024 ** 3,
        healthcheck: { test: ['CMD-SHELL', 'clamdcheck.sh'] },
      },
      backend: {
        networks: { coro_clamav_internal: null },
        environment: {
          INCIDENT_REPORT_CLAMAV_HOST: 'clamav',
          INCIDENT_REPORT_CLAMAV_PORT: '3310',
          INCIDENT_REPORT_IMPORT_ENABLED: 'false',
          INCIDENT_REPORT_ATTACHMENTS_ENABLED: 'false',
          INCIDENT_REPORT_ARCHIVES_ENABLED: 'false',
        },
        depends_on: {},
      },
    },
    networks: { coro_clamav_internal: { internal: true } },
  };
}

test('accepts the isolated pinned ClamAV contract', () => {
  assert.equal(verifyCompose(valid()).execution, 'PASS');
});

test('rejects a published ClamAV port', () => {
  const config = valid();
  config.services.clamav.ports = [{ target: 3310, published: '3310' }];
  assert.throws(() => verifyCompose(config), /CLAMAV_PORT_MUST_NOT_BE_PUBLISHED/);
});

test('rejects mutable images and an enabled import default', () => {
  const mutable = valid();
  mutable.services.clamav.image = 'clamav/clamav-debian:stable';
  assert.throws(() => verifyCompose(mutable), /CLAMAV_IMAGE_NOT_PINNED/);
  const enabled = valid();
  enabled.services.backend.environment.INCIDENT_REPORT_IMPORT_ENABLED = 'true';
  assert.throws(() => verifyCompose(enabled), /IMPORT_FLAG_DEFAULT_MUST_BE_FALSE/);
  const attachments = valid();
  attachments.services.backend.environment.INCIDENT_REPORT_ATTACHMENTS_ENABLED = 'true';
  assert.throws(
    () => verifyCompose(attachments),
    /ATTACHMENT_FLAG_DEFAULT_MUST_BE_FALSE/,
  );
});

test('requires explicit activation and keeps the backend independently deployable', () => {
  const unprofiled = valid();
  delete unprofiled.services.clamav.profiles;
  assert.throws(() => verifyCompose(unprofiled), /CLAMAV_MUST_BE_EXPLICIT_PROFILE/);
  const coupled = valid();
  coupled.services.backend.depends_on = {
    clamav: { condition: 'service_healthy' },
  };
  assert.throws(
    () => verifyCompose(coupled),
    /BACKEND_MUST_NOT_REQUIRE_OPTIONAL_CLAMAV/,
  );
});

test('CLI consumes JSON on stdin on POSIX and Windows paths', () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./verify-compose.mjs', import.meta.url))],
    { input: JSON.stringify(valid()), encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    execution: 'PASS',
    image: CLAMAV_IMAGE,
  });
});
