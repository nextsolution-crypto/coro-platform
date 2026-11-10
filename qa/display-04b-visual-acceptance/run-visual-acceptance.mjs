#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const expectedPdfSha = 'a278a9cadaed1d7650c55bb67f3138daf8a928021b2a7d7c989a02a5e906ef39';
const pdf = process.env.DISPLAY_04B_SOURCE_PDF;
const input = process.env.DISPLAY_04B_PILOT_RENDER_DIR;
const output = process.env.DISPLAY_04B_ACCEPTANCE_DIR;
if (!pdf || !path.isAbsolute(pdf)) throw new Error('DISPLAY_04B_SOURCE_PDF_REQUIRED');
if (!input || !path.isAbsolute(input)) throw new Error('DISPLAY_04B_PILOT_RENDER_DIR_REQUIRED');
if (!output || !path.isAbsolute(output)) throw new Error('DISPLAY_04B_ACCEPTANCE_DIR_REQUIRED');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pngSize = (bytes) => {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes.subarray(1, 4).toString('ascii') !== 'PNG')
    throw new Error('INVALID_PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
const run = (command, args, acceptedCodes = [0]) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { shell: false, windowsHide: true });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.once('error', reject);
  child.once('exit', (code) => acceptedCodes.includes(code)
    ? resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code })
    : reject(new Error(`${command}_EXIT_${code}:${stderr}`)));
});

await mkdir(output, { recursive: false });
const pdfBytes = await readFile(pdf);
if (sha256(pdfBytes) !== expectedPdfSha) throw new Error('SOURCE_SHA256_MISMATCH');

const originalPath = path.join(input, 'plan-original-5100x3300.png');
const originalBytes = await readFile(originalPath);
const originalSize = pngSize(originalBytes);
if (originalSize.width !== 5100 || originalSize.height !== 3300) throw new Error('REFERENCE_DIMENSIONS_MISMATCH');

const profiles = [
  { id: 'ORIGINAL_17X11', file: 'original-17x11.png', width: 4080, height: 2640 },
  { id: 'SCREEN_16X9', file: 'screen-16x9.png', width: 3840, height: 2160 },
  { id: 'SCREEN_16X10', file: 'screen-16x10.png', width: 3840, height: 2400 },
];
const results = [];
for (const profile of profiles) {
  const profilePath = path.join(input, profile.file);
  const bytes = await readFile(profilePath);
  const dimensions = pngSize(bytes);
  if (dimensions.width !== profile.width || dimensions.height !== profile.height)
    throw new Error(`PROFILE_DIMENSIONS_MISMATCH:${profile.id}`);
  const scale = Math.min(profile.width / originalSize.width, profile.height / originalSize.height);
  const contentWidth = Math.round(originalSize.width * scale);
  const contentHeight = Math.round(originalSize.height * scale);
  const marginLeft = Math.floor((profile.width - contentWidth) / 2);
  const marginTop = Math.floor((profile.height - contentHeight) / 2);
  const reference = path.join(output, `${profile.id.toLowerCase()}-reference.png`);
  const normalized = path.join(output, `${profile.id.toLowerCase()}-normalized.png`);
  await run('magick', [originalPath, '-filter', 'Lanczos', '-resize', `${contentWidth}x${contentHeight}!`, '-strip', reference]);
  await run('magick', [profilePath, '-crop', `${contentWidth}x${contentHeight}+${marginLeft}+${marginTop}`, '+repage', '-strip', normalized]);
  const comparison = await run('magick', ['compare', '-metric', 'RMSE', reference, normalized, 'null:'], [0, 1]);
  const metric = comparison.stderr || comparison.stdout;
  const normalizedBytes = await readFile(normalized);
  results.push({
    ...profile,
    bytes: bytes.length,
    sha256: sha256(bytes),
    sourceAspectRatio: originalSize.width / originalSize.height,
    contentAspectRatio: contentWidth / contentHeight,
    contentWidth,
    contentHeight,
    marginLeft,
    marginRight: profile.width - contentWidth - marginLeft,
    marginTop,
    marginBottom: profile.height - contentHeight - marginTop,
    normalizedSha256: sha256(normalizedBytes),
    rmse: metric,
    crop: false,
    stretch: false,
    rotationDegrees: 0,
  });
}

const panels = [
  { source: originalPath, label: `PDF RASTER | 5100x3300 | ${sha256(originalBytes).slice(0, 16)}…` },
  ...results.map((item) => ({
    source: path.join(input, item.file),
    label: `${item.id} | ${item.width}x${item.height} | ${item.sha256.slice(0, 16)}…`,
  })),
];
const panelPaths = [];
for (const [index, panel] of panels.entries()) {
  const panelPath = path.join(output, `comparison-panel-${index + 1}.png`);
  await run('magick', [
    panel.source, '-thumbnail', '1800x1100', '-background', 'white', '-gravity', 'center', '-extent', '1800x1100',
    '-gravity', 'south', '-splice', '0x140', '-fill', '#111827', '-pointsize', '34', '-annotate', '+0+45', panel.label,
    panelPath,
  ]);
  panelPaths.push(panelPath);
}
const comparisonSheet = path.join(output, 'display-04b-visual-acceptance-comparison.png');
await run('magick', ['montage', ...panelPaths, '-background', '#202124', '-tile', '2x2', '-geometry', '1800x1240+24+24', comparisonSheet]);

const crops = [
  ['you-are-here', '1500x900+2050+250'],
  ['north-exit', '1050x1000+1350+350'],
  ['south-exit', '1200x1000+2500+2100'],
  ['legend', '1500x1700+0+450'],
  ['central-zone', '1800x1500+1600+950'],
  ['fire-equipment', '1800x1300+2450+1700'],
];
const cropPaths = [];
for (const [name, geometry] of crops) {
  const target = path.join(output, `critical-${name}.png`);
  await run('magick', [originalPath, '-crop', geometry, '+repage', '-resize', '1400x1000>', target]);
  cropPaths.push(target);
}
const criticalSheet = path.join(output, 'display-04b-critical-zones.png');
await run('magick', ['montage', ...cropPaths, '-background', '#202124', '-tile', '3x2', '-geometry', '1400x1000+18+18', criticalSheet]);

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: { path: pdf, bytes: pdfBytes.length, sha256: sha256(pdfBytes), immutable: true },
  reference: { path: originalPath, bytes: originalBytes.length, sha256: sha256(originalBytes), ...originalSize },
  profiles: results,
  evidence: {
    comparisonSheet: { path: comparisonSheet, sha256: sha256(await readFile(comparisonSheet)) },
    criticalZones: { path: criticalSheet, sha256: sha256(await readFile(criticalSheet)) },
  },
  approvalStatus: 'PENDING_REVIEW',
};
await writeFile(path.join(output, 'visual-acceptance-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(manifest, null, 2));
