// Maintenance encadrée de /etc/coro-ai/runtime-policy.json.
// report             : état des interrupteurs et présence des identifiants (aucune valeur affichée)
// set-semantic <on|off> : allume ou éteint les vecteurs Titan de CORO Knowledge
// La politique est appliquée au conteneur au déploiement suivant.
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPolicy, validatePolicy, POLICY_PATH } from './runtime-policy.mjs';

const AWS_CONFIG = '/etc/coro-ai/aws-config';
const SIGNING_HELPER = '/usr/local/bin/aws_signing_helper';
const PKI = '/etc/coro-ai/pki/coro-production.pem';
const BACKUP_DIR = '/opt/coro-ops/backups/knowledge-policy';

export function credentialReport(paths = { awsConfig: AWS_CONFIG, signingHelper: SIGNING_HELPER, pki: PKI }) {
  const present = (path) => existsSync(path) && !lstatSync(path).isSymbolicLink();
  let profile = false;
  let rolesAnywhere = false;
  if (present(paths.awsConfig)) {
    const text = readFileSync(paths.awsConfig, 'utf8');
    profile = /^\[profile coro-ai-production\]\s*$/m.test(text);
    rolesAnywhere = /credential_process\s*=.*aws_signing_helper/.test(text);
  }
  return {
    awsConfig: present(paths.awsConfig),
    profileCoroAiProduction: profile,
    rolesAnywhereCredentialProcess: rolesAnywhere,
    signingHelper: present(paths.signingHelper),
    certificate: present(paths.pki),
  };
}

export function withSemantic(policy, enabled) {
  if (typeof enabled !== 'boolean') throw new Error('KNOWLEDGE_POLICY_INVALID');
  return validatePolicy({ ...validatePolicy(policy), semanticEmbeddingsEnabled: enabled });
}

export function credentialsReady(report) {
  return report.awsConfig && report.profileCoroAiProduction && report.rolesAnywhereCredentialProcess &&
    report.signingHelper && report.certificate;
}

function writePolicy(policy, path = POLICY_PATH) {
  const directory = dirname(path);
  if (!existsSync(directory)) mkdirSync(directory, { mode: 0o700 });
  if (existsSync(path)) {
    mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
    copyFileSync(path, join(BACKUP_DIR, `runtime-policy.${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
  }
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, JSON.stringify(policy) + '\n', { mode: 0o600, flag: 'wx' });
  renameSync(temporary, path);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, value] = process.argv.slice(2);
    const policy = loadPolicy();
    const credentials = credentialReport();
    if (command === 'report') {
      console.log(JSON.stringify({ schemaVersion: 1, execution: 'PASS', policy, credentials,
        credentialsReady: credentialsReady(credentials) }));
    } else if (command === 'set-semantic' && (value === 'on' || value === 'off')) {
      const enabled = value === 'on';
      if (enabled && !credentialsReady(credentials)) throw new Error('KNOWLEDGE_CREDENTIALS_NOT_READY');
      const next = withSemantic(policy, enabled);
      writePolicy(next);
      const reread = loadPolicy();
      if (reread.semanticEmbeddingsEnabled !== enabled) throw new Error('KNOWLEDGE_POLICY_WRITE_MISMATCH');
      console.log(JSON.stringify({ schemaVersion: 1, execution: 'PASS', policy: reread, credentials,
        appliesAt: 'NEXT_RELEASE' }));
    } else throw new Error('KNOWLEDGE_COMMAND_INVALID');
  } catch (error) {
    const code = /^KNOWLEDGE_[A-Z_]+$/.test(error.message) ? error.message : 'KNOWLEDGE_POLICY_MAINTENANCE_FAILED';
    console.log(JSON.stringify({ schemaVersion: 1, execution: 'FAIL', errorCode: code }));
    process.exitCode = 1;
  }
}
