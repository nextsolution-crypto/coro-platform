#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const expectedSourceSha = 'a278a9cadaed1d7650c55bb67f3138daf8a928021b2a7d7c989a02a5e906ef39';
const source = process.env.DISPLAY_04B_SOURCE_PDF;
const output = process.env.DISPLAY_04B_OUTPUT_DIR;
const image = process.env.DISPLAY_04B_RASTERIZER_IMAGE ?? 'coro-display-04b-pilot:local';
if (!source || !path.isAbsolute(source)) throw new Error('DISPLAY_04B_SOURCE_PDF_REQUIRED');
if (!output || !path.isAbsolute(output)) throw new Error('DISPLAY_04B_OUTPUT_DIR_REQUIRED');

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command}_EXIT_${code}`)));
});
const pngSize = (bytes) => {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes.subarray(1, 4).toString('ascii') !== 'PNG')
    throw new Error('INVALID_PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

await mkdir(output, { recursive: true });
const sourceBytes = await readFile(source);
if (hash(sourceBytes) !== expectedSourceSha) throw new Error('SOURCE_SHA256_MISMATCH');

const spool = path.join(output, 'spool');
await rm(spool, { recursive: true, force: true });
await mkdir(spool, { recursive: true });
const requestId = randomUUID();
const request = path.join(spool, requestId);
await mkdir(request, { recursive: false });
await copyFile(source, path.join(request, 'source.pdf'));
await writeFile(
  path.join(request, 'request.ready'),
  JSON.stringify({ requestId, pageNumber: 1, dpi: 300 }),
  { flag: 'wx' },
);

const dockerMount = `${spool.replaceAll('\\', '/')}:/var/lib/coro/display-pdf-spool`;
await run('docker', [
  'run', '--rm', '--init', '--network', 'none', '--read-only',
  '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
  '--pids-limit', '16', '--memory', '384m', '--memory-swap', '384m', '--cpus', '1',
  '--tmpfs', '/tmp:rw,noexec,nosuid,nodev,size=256m,mode=0700,uid=1000,gid=1000',
  '-e', 'DISPLAY_PDF_RASTERIZER_ENABLED=true',
  '-e', 'DISPLAY_PDF_SPOOL_DIR=/var/lib/coro/display-pdf-spool',
  '-e', 'NODE_ENV=test',
  '-v', dockerMount,
  image,
  'node', 'dist/src/display-pdf-rasterizer/main.js',
]);

const failurePath = path.join(request, 'failure.json');
const resultPath = path.join(request, 'result.json');
let result;
try {
  result = JSON.parse(await readFile(resultPath, 'utf8'));
} catch (error) {
  const failure = await readFile(failurePath, 'utf8').catch(() => 'NO_RESULT');
  throw new Error(`RASTERIZER_FAILED:${failure}`, { cause: error });
}
const original = await readFile(path.join(request, 'output.png'));
if (hash(original) !== result.outputSha256) throw new Error('RASTER_OUTPUT_SHA256_MISMATCH');
const originalTarget = path.join(output, 'plan-original-5100x3300.png');
await writeFile(originalTarget, original, { flag: 'wx' });

const profiles = [
  ['original-17x11', 4080, 2640],
  ['screen-16x9', 3840, 2160],
  ['screen-16x10', 3840, 2400],
];
const rendered = [];
for (const [name, width, height] of profiles) {
  const target = path.join(output, `${name}.png`);
  await run('magick', [
    originalTarget, '-filter', 'Lanczos', '-resize', `${width}x${height}`,
    '-background', 'white', '-gravity', 'center', '-extent', `${width}x${height}`,
    '-strip', target,
  ]);
  const bytes = await readFile(target);
  const dimensions = pngSize(bytes);
  if (dimensions.width !== width || dimensions.height !== height) throw new Error(`PROFILE_DIMENSIONS:${name}`);
  rendered.push({ name, path: target, bytes: bytes.length, sha256: hash(bytes), ...dimensions });
}

const contactSheet = path.join(output, 'visual-qa-contact-sheet.png');
await run('magick', [
  ...rendered.flatMap((entry) => [entry.path, '-thumbnail', '1200x700']),
  '+append', '-background', '#202124', '-gravity', 'center', '-extent', '3840x900', contactSheet,
]);
const manifest = {
  schemaVersion: 1,
  source: { path: source, bytes: sourceBytes.length, sha256: expectedSourceSha, page: 1 },
  rasterizer: result,
  intermediate: { path: originalTarget, bytes: original.length, sha256: hash(original), ...pngSize(original) },
  profiles: rendered,
  contactSheet: { path: contactSheet, sha256: hash(await readFile(contactSheet)) },
  safety: { network: 'none', readOnlyRoot: true, nonRoot: '1000:1000', memoryMiB: 384, cpu: 1, pids: 16 },
};
await writeFile(path.join(output, 'pilot-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await rm(spool, { recursive: true, force: true });
console.log(JSON.stringify(manifest, null, 2));
