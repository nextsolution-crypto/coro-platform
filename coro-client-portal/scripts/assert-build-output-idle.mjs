import { readFileSync } from 'node:fs';

const statePath = 'D:\\coro-qa-runtime\\client-email-runtime.json';
const requestedDistDir = process.env.NEXT_DIST_DIR || '.next';

if (requestedDistDir !== '.next') process.exit(0);

let state;
try {
  state = JSON.parse(readFileSync(statePath, 'utf8').replace(/^\uFEFF/, ''));
} catch {
  process.exit(0);
}

const portalPid = Number(state?.portalPid);
if (!Number.isInteger(portalPid) || portalPid <= 0) process.exit(0);

try {
  process.kill(portalPid, 0);
  console.error(
    `Refusing to rebuild active .next: QA portal process ${portalPid} is running. Stop the QA portal/runtime first or set NEXT_DIST_DIR to an isolated validation directory.`,
  );
  process.exit(1);
} catch {
  process.exit(0);
}
