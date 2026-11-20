import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const GIB = 1024 ** 3;
const REQUIRED_AVAILABLE_BYTES = 3 * GIB;

function run(command, args = []) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 30_000,
      windowsHide: true,
    }).trim();
  } catch {
    return '';
  }
}

function meminfo(text) {
  return Object.fromEntries(
    text
      .trim()
      .split(/\r?\n/u)
      .map((line) => {
        const match = /^(\w+):\s+(\d+)\s+kB$/u.exec(line);
        return match ? [match[1], Number(match[2]) * 1024] : null;
      })
      .filter(Boolean),
  );
}

function pressure(text) {
  return Object.fromEntries(
    text
      .trim()
      .split(/\r?\n/u)
      .map((line) => {
        const [kind, ...values] = line.split(/\s+/u);
        return [kind, Object.fromEntries(values.map((part) => part.split('=')))];
      }),
  );
}

function jsonLines(text) {
  return text
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function topProcesses(text) {
  return text
    .split(/\r?\n/u)
    .map((line) => /^\s*(\S+)\s+(\d+)\s*$/u.exec(line))
    .filter(Boolean)
    .slice(0, 15)
    .map((match) => ({ executable: match[1], rssBytes: Number(match[2]) * 1024 }));
}

function parseDf(text) {
  return text
    .split(/\r?\n/u)
    .slice(1)
    .map((line) => line.trim().split(/\s+/u))
    .filter((parts) => parts.length >= 5)
    .map(([size, used, available, usedPercent, ...mount]) => ({
      mount: mount.join(' '),
      sizeBytes: Number(size),
      usedBytes: Number(used),
      availableBytes: Number(available),
      usedPercent,
    }));
}

const memory = meminfo(readFileSync('/proc/meminfo', 'utf8'));
const memoryPressure = pressure(readFileSync('/proc/pressure/memory', 'utf8'));
const cpuPressure = pressure(readFileSync('/proc/pressure/cpu', 'utf8'));
const load = readFileSync('/proc/loadavg', 'utf8').trim().split(/\s+/u).slice(0, 3).map(Number);
const vmstat = Object.fromEntries(
  readFileSync('/proc/vmstat', 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.split(' '))
    .filter(([key]) => ['pgmajfault', 'pswpin', 'pswpout', 'oom_kill'].includes(key))
    .map(([key, value]) => [key, Number(value)]),
);

const containers = jsonLines(
  run('docker', [
    'stats',
    '--no-stream',
    '--format',
    '{{json .}}',
  ]),
).map((entry) => ({
  name: entry.Name,
  cpuPercent: entry.CPUPerc,
  memoryUsage: entry.MemUsage,
  memoryPercent: entry.MemPerc,
  pids: Number(entry.PIDs),
}));

const containerPolicies = jsonLines(
  run('docker', [
    'ps',
    '-a',
    '--format',
    '{{json .}}',
  ]),
).map((entry) => {
  const detailText = run('docker', [
    'inspect',
    '--format',
    '{{json .}}',
    entry.ID,
  ]);
  const detail = detailText ? JSON.parse(detailText) : {};
  return {
    name: entry.Names,
    state: entry.State,
    status: entry.Status,
    running: detail.State?.Running === true,
    health: detail.State?.Health?.Status ?? 'not-configured',
    restartCount: Number(detail.RestartCount ?? 0),
    memoryLimitBytes: Number(detail.HostConfig?.Memory ?? 0),
    memoryReservationBytes: Number(detail.HostConfig?.MemoryReservation ?? 0),
    nanoCpus: Number(detail.HostConfig?.NanoCpus ?? 0),
    restartPolicy: detail.HostConfig?.RestartPolicy?.Name ?? 'none',
  };
});

const kernelLog = run('journalctl', [
  '-k',
  '--since',
  '24 hours ago',
  '--no-pager',
  '-o',
  'cat',
]);
const failedUnits = run('systemctl', [
  '--failed',
  '--no-legend',
  '--plain',
  '--no-pager',
])
  .split(/\r?\n/u)
  .filter(Boolean)
  .map((line) => line.trim().split(/\s+/u)[0]);

const dockerDisk = jsonLines(run('docker', ['system', 'df', '--format', '{{json .}}']));
const stoppedContainers = containerPolicies
  .filter((container) => !container.running)
  .map(({ name, state, status }) => ({ name, state, status }));
const availableBytes = Number(memory.MemAvailable ?? 0);

const report = {
  schemaVersion: 1,
  execution: 'PASS',
  readOnly: true,
  capturedAt: new Date().toISOString(),
  memory: {
    totalBytes: Number(memory.MemTotal ?? 0),
    availableBytes,
    freeBytes: Number(memory.MemFree ?? 0),
    cachedBytes: Number(memory.Cached ?? 0),
    buffersBytes: Number(memory.Buffers ?? 0),
    reclaimableSlabBytes: Number(memory.SReclaimable ?? 0),
    swapTotalBytes: Number(memory.SwapTotal ?? 0),
    swapFreeBytes: Number(memory.SwapFree ?? 0),
    requiredAvailableBytes: REQUIRED_AVAILABLE_BYTES,
    clamavGatePass: availableBytes >= REQUIRED_AVAILABLE_BYTES,
  },
  pressure: { memory: memoryPressure, cpu: cpuPressure },
  cpu: { logicalProcessors: Number(run('nproc')) || null, loadAverage: load },
  virtualMemoryCounters: vmstat,
  oomEventsLast24Hours: (kernelLog.match(/out of memory|oom-kill|killed process/giu) ?? []).length,
  topProcesses: topProcesses(run('ps', ['-eo', 'comm=,rss=', '--sort=-rss'])),
  containers,
  containerPolicies,
  stoppedContainers,
  failedSystemdUnits: failedUnits,
  filesystems: parseDf(run('df', ['-B1', '--output=size,used,avail,pcent,target', '/', '/var/lib/docker'])),
  dockerDisk,
  peakLoadEvidence: 'NOT_VERIFIED_REQUIRES_METRICS_WINDOW',
  mutation: false,
};

process.stdout.write(`${JSON.stringify(report)}\n`);
