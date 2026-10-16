const SHA = /^[0-9a-f]{40}$/;
const IMAGE = /^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$/;

export const IMAGE_VARIABLES = [
  'BACKEND_IMAGE',
  'FRONTEND_IMAGE',
  'CLIENT_PORTAL_IMAGE',
  'WEBSITE_IMAGE',
];

export function validateReleaseRequest(env) {
  if (env.PRODUCTION_APPROVAL !== 'DEPLOY_PRODUCTION') throw new Error('RELEASE_APPROVAL_MISSING');
  if (env.MIGRATION_COMPATIBILITY_APPROVAL !== 'CONFIRMED_BACKWARD_COMPATIBLE') throw new Error('MIGRATION_COMPATIBILITY_APPROVAL_MISSING');
  if (!SHA.test(env.RELEASE_COMMIT || '')) throw new Error('RELEASE_COMMIT_INVALID');
}

export function validateImageSet(env) {
  for (const name of IMAGE_VARIABLES) {
    if (!IMAGE.test(env[name] || '')) throw new Error(`${name}_INVALID`);
  }
}

export function validateReleaseEvidence(env) {
  validateReleaseRequest(env);
  validateImageSet(env);
}

export const REQUIRED_DEPLOYMENT_EVIDENCE = {
  lockAcquired: true,
  backupAvailable: true,
  backupStatus: 'REMOTE_VERIFIED',
  backupVersionIdPresent: true,
  backupShaMatches: true,
  restoreStatus: 'RESTORE_VERIFIED',
  productionMigrationHeadMatches: true,
  migrationStatus: 'PASS',
  partialMigrationDetected: false,
  rolloutStatus: 'PASS',
  backendHealth: 'PASS',
  frontendHealth: 'PASS',
  clientPortalHealth: 'PASS',
  websiteHealth: 'PASS',
  smokeStatus: 'PASS',
  rollbackMetadataComplete: true,
};

export function validateDeploymentEvidence(evidence) {
  for (const [name, expected] of Object.entries(REQUIRED_DEPLOYMENT_EVIDENCE)) {
    if (evidence[name] !== expected) throw new Error(`DEPLOYMENT_GATE_${name.toUpperCase()}_FAILED`);
  }
}

export function validateReleaseManifest(manifest) {
  if (!manifest || manifest.status !== 'SUCCESS') throw new Error('MANIFEST_STATUS_INVALID');
  if (!SHA.test(manifest.gitCommit || '')) throw new Error('MANIFEST_COMMIT_INVALID');
  validateImageSet({
    BACKEND_IMAGE: manifest.images?.backend,
    FRONTEND_IMAGE: manifest.images?.frontend,
    CLIENT_PORTAL_IMAGE: manifest.images?.clientPortal,
    WEBSITE_IMAGE: manifest.images?.website,
  });
  if (!/^[0-9a-f]{64}$/.test(manifest.backupSha256 || '')) throw new Error('MANIFEST_BACKUP_SHA_INVALID');
  if (!manifest.backupVersionId || manifest.restoreEvidence?.status !== 'RESTORE_VERIFIED') throw new Error('MANIFEST_RECOVERY_EVIDENCE_INVALID');
  if (!Array.isArray(manifest.previousImages) || manifest.previousImages.length !== 4 || !manifest.previousImages.every((image) => IMAGE.test(image))) throw new Error('MANIFEST_ROLLBACK_IMAGES_INVALID');
  if (!manifest.previousCompose || !manifest.previousMigrationHead || !manifest.healthChecks) throw new Error('MANIFEST_ROLLBACK_OR_HEALTH_INVALID');
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  const mode = process.argv[2] || 'all';
  try {
    if (mode === 'request') validateReleaseRequest(process.env);
    else if (mode === 'images') validateImageSet(process.env);
    else if (mode === 'all') validateReleaseEvidence(process.env);
    else throw new Error('VALIDATION_MODE_INVALID');
    process.stdout.write('release-policy=PASS\n');
  } catch (error) {
    process.stderr.write(`release-policy=FAIL code=${error.message}\n`);
    process.exitCode = 1;
  }
}
