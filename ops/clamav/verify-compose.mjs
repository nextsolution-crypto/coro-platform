import fs from 'node:fs';

export const CLAMAV_IMAGE =
  'clamav/clamav-debian@sha256:6982509b9e1415bf23cb49d0c55872fdd57fd2b92be33fa26d487da42d322076';

export function verifyCompose(config) {
  const clamav = config?.services?.clamav;
  const backend = config?.services?.backend;
  if (!clamav || !backend) throw new Error('CLAMAV_SERVICE_MISSING');
  if (clamav.image !== CLAMAV_IMAGE) throw new Error('CLAMAV_IMAGE_NOT_PINNED');
  if (clamav.ports?.length) throw new Error('CLAMAV_PORT_MUST_NOT_BE_PUBLISHED');
  if (!Object.prototype.hasOwnProperty.call(clamav.networks ?? {}, 'coro_clamav_internal')) {
    throw new Error('CLAMAV_PRIVATE_NETWORK_MISSING');
  }
  if (!Object.prototype.hasOwnProperty.call(clamav.networks ?? {}, 'coro_clamav_updates')) {
    throw new Error('CLAMAV_SIGNATURE_UPDATE_NETWORK_MISSING');
  }
  if (!Object.prototype.hasOwnProperty.call(backend.networks ?? {}, 'coro_clamav_internal')) {
    throw new Error('BACKEND_CLAMAV_PRIVATE_NETWORK_MISSING');
  }
  if (config.networks?.coro_clamav_internal?.internal !== true) {
    throw new Error('CLAMAV_NETWORK_MUST_BE_INTERNAL');
  }
  if (!clamav.volumes?.some((entry) => entry.target === '/var/lib/clamav')) {
    throw new Error('CLAMAV_SIGNATURE_VOLUME_MISSING');
  }
  if (Number(clamav.mem_limit) < 3 * 1024 ** 3) {
    throw new Error('CLAMAV_MEMORY_LIMIT_TOO_LOW');
  }
  if (!clamav.healthcheck?.test?.join(' ').includes('clamdcheck.sh')) {
    throw new Error('CLAMAV_HEALTHCHECK_MISSING');
  }
  if (backend.environment?.INCIDENT_REPORT_CLAMAV_HOST !== 'clamav') {
    throw new Error('BACKEND_CLAMAV_HOST_INVALID');
  }
  if (String(backend.environment?.INCIDENT_REPORT_CLAMAV_PORT) !== '3310') {
    throw new Error('BACKEND_CLAMAV_PORT_INVALID');
  }
  if (backend.environment?.INCIDENT_REPORT_IMPORT_ENABLED !== 'false') {
    throw new Error('IMPORT_FLAG_DEFAULT_MUST_BE_FALSE');
  }
  if (backend.depends_on?.clamav?.condition !== 'service_healthy') {
    throw new Error('BACKEND_MUST_WAIT_FOR_CLAMAV');
  }
  return { execution: 'PASS', image: CLAMAV_IMAGE };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const config = JSON.parse(fs.readFileSync(0, 'utf8'));
  process.stdout.write(`${JSON.stringify(verifyCompose(config))}\n`);
}
