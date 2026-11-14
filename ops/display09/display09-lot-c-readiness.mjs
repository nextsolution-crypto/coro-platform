import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const manifestPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, 'display09-lot-c-manifest.json');

export function validateManifest(manifest, workspaceRoot = root) {
  const failures = [];
  const expect = (condition, code) => { if (!condition) failures.push(code); };
  expect(manifest.schemaVersion === 1, 'SCHEMA_VERSION_INVALID');
  expect(manifest.authorizationRequired === true, 'AUTHORIZATION_GATE_MISSING');
  expect(manifest.organization?.id === '916f54ec-af22-45e0-99db-a369d9630002', 'ORGANIZATION_INVALID');
  expect(manifest.organization?.fixtureNamespace === 'display-09-demo-pilot', 'FIXTURE_NAMESPACE_INVALID');
  expect(manifest.organization?.fixtureKey === 'tour-premont-building', 'FIXTURE_KEY_INVALID');
  expect(manifest.organization?.canonicalBuildingFingerprint === '5ba4072e9e0027d5b74ff469e5424463f671eb76b9c052db8f024b2450b0f3ec', 'BUILDING_FINGERPRINT_INVALID');
  expect(manifest.player?.capability === 'WEB_VIEW_ONLY', 'PLAYER_CAPABILITY_INVALID');
  expect(manifest.player?.emergencyEligible === false, 'EMERGENCY_CAPABILITY_FORBIDDEN');
  expect(manifest.player?.managedKiosk === false, 'MANAGED_KIOSK_FORBIDDEN');
  expect(manifest.publication?.requiresDistinctReviewAndApproval === true, 'INDEPENDENT_APPROVAL_REQUIRED');
  expect(Array.isArray(manifest.assets) && manifest.assets.length === 2, 'ASSET_COUNT_INVALID');
  const versions = new Set();
  for (const asset of manifest.assets ?? []) {
    versions.add(asset.version);
    expect(asset.synthetic === true, `ASSET_${asset.version}_NOT_SYNTHETIC`);
    const resolved = path.resolve(workspaceRoot, asset.path ?? '');
    expect(resolved.startsWith(`${workspaceRoot}${path.sep}`), `ASSET_${asset.version}_OUTSIDE_WORKSPACE`);
    if (!fs.existsSync(resolved)) {
      failures.push(`ASSET_${asset.version}_MISSING`);
      continue;
    }
    const actual = crypto.createHash('sha256').update(fs.readFileSync(resolved)).digest('hex');
    expect(actual === asset.sha256, `ASSET_${asset.version}_HASH_MISMATCH`);
  }
  expect(versions.has('V1') && versions.has('V2'), 'ASSET_VERSIONS_INVALID');
  expect(manifest.assets?.[0]?.sha256 !== manifest.assets?.[1]?.sha256, 'ASSET_VERSIONS_IDENTICAL');
  const required = new Set(manifest.requiredSequence ?? []);
  for (const step of ['LOT_A_DNS_TLS_PASS', 'LOT_C_AUTHORIZED', 'IPAD_SAFARI_V1_OBSERVED', 'IPAD_SAFARI_V2_SYNC_OBSERVED', 'SESSION_AND_ACTIVATION_REVOKED', 'SERVER_REFUSAL_AFTER_REVOCATION_VERIFIED']) {
    expect(required.has(step), `SEQUENCE_${step}_MISSING`);
  }
  const idempotencyValues = Object.values(manifest.idempotency ?? {});
  expect(idempotencyValues.length === 7 && new Set(idempotencyValues).size === idempotencyValues.length, 'IDEMPOTENCY_KEYS_INVALID');
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const failures = validateManifest(manifest);
  const result = failures.length === 0 ? 'PASS' : 'FAIL';
  process.stdout.write(JSON.stringify({
    result,
    mutation: false,
    pilot: manifest.pilot,
    organizationId: manifest.organization?.id,
    fixture: `${manifest.organization?.fixtureNamespace}/${manifest.organization?.fixtureKey}`,
    assets: (manifest.assets ?? []).map(({ version, sha256 }) => ({ version, sha256 })),
    playerCapability: manifest.player?.capability,
    failures,
  }, null, 2) + '\n');
  process.exitCode = failures.length === 0 ? 0 : 1;
}
