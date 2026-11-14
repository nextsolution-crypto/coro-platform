import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;
const IMAGE = /^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$/;
const here = path.dirname(fileURLToPath(import.meta.url));

export function loadApprovedRelease(candidate, policyPath = path.join(here, 'approved-immutable-releases.json')) {
  if (!SHA.test(candidate || '')) throw new Error('APPLICATION_COMMIT_INVALID');
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  if (policy.schemaVersion !== 1) throw new Error('APPROVED_RELEASE_POLICY_VERSION_INVALID');
  const release = policy.releases?.[candidate];
  if (!release) throw new Error('APPLICATION_COMMIT_NOT_APPROVED');
  if (!/^20[0-9]{12}_[a-z0-9_]+$/.test(release.migrationHead || '')) throw new Error('MIGRATION_HEAD_INVALID');
  for (const name of ['backend', 'frontend', 'clientPortal', 'website']) {
    if (!IMAGE.test(release.images?.[name] || '')) throw new Error(`${name.toUpperCase()}_IMAGE_INVALID`);
  }
  return release;
}

export function githubOutputs(candidate, release) {
  return [
    `application_commit=${candidate}`,
    `migration_head=${release.migrationHead}`,
    `backend_image=${release.images.backend}`,
    `frontend_image=${release.images.frontend}`,
    `client_portal_image=${release.images.clientPortal}`,
    `website_image=${release.images.website}`,
  ].join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  try {
    const candidate = process.argv[2];
    const release = loadApprovedRelease(candidate);
    const output = githubOutputs(candidate, release);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output, { encoding: 'utf8' });
    process.stdout.write(output);
  } catch (error) {
    process.stderr.write(`approved-immutable-release=FAIL code=${error.message}\n`);
    process.exitCode = 1;
  }
}
