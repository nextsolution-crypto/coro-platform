const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const KEY = 'DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST';
const TARGETS = ['demo-sp-preparer@getcoro.io', 'demo-sp-approver@getcoro.io'];
const APPROVAL = 'SP_OPS_04B_QA_INVITATION_ALLOWLIST_2026_11_07';
const HASH_RE = /^[a-f0-9]{64}$/;

function hash(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function assertAuthority(env) {
  if (env.CORO_POPULATION_QA_ALLOWLIST_RUN !== 'true' || env.CORO_POPULATION_QA_ALLOWLIST_APPROVAL !== APPROVAL) {
    throw new Error('QA_INVITATION_ALLOWLIST_AUTHORITY_REQUIRED');
  }
}

function updateContent(content) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const indexes = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith(`${KEY}=`)) indexes.push(i);
  }
  if (indexes.length > 1) throw new Error('QA_INVITATION_ALLOWLIST_DUPLICATE_KEY');
  const existing = indexes.length === 1
    ? lines[indexes[0]].slice(KEY.length + 1).split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)
    : [];
  if (existing.some((v) => !HASH_RE.test(v)) || new Set(existing).size !== existing.length) {
    throw new Error('QA_INVITATION_ALLOWLIST_EXISTING_VALUE_INVALID');
  }
  const required = TARGETS.map(hash);
  const finalValues = [...existing];
  for (const value of required) if (!finalValues.includes(value)) finalValues.push(value);
  if (finalValues.length !== 4) throw new Error('QA_INVITATION_ALLOWLIST_FINAL_CARDINALITY_INVALID');
  const replacement = `${KEY}=${finalValues.join(',')}`;
  if (indexes.length === 1) lines[indexes[0]] = replacement;
  else {
    if (lines.at(-1) === '') lines.splice(lines.length - 1, 0, replacement);
    else lines.push(replacement);
  }
  return {
    content: lines.join(eol),
    evidence: {
      schemaVersion: 1,
      execution: 'PASS',
      previousCount: existing.length,
      addedCount: finalValues.length - existing.length,
      finalCount: finalValues.length,
      exactTargetsPresent: required.every((value) => finalValues.includes(value)),
    },
  };
}

function writeAtomic(file, content) {
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error('QA_INVITATION_ALLOWLIST_ENV_NOT_REGULAR_FILE');
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporary, content, { mode: stat.mode & 0o777, flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary);
  }
}

function main() {
  assertAuthority(process.env);
  const file = process.argv[2];
  if (!file || !path.isAbsolute(file)) throw new Error('QA_INVITATION_ALLOWLIST_ENV_PATH_INVALID');
  const result = updateContent(fs.readFileSync(file, 'utf8'));
  writeAtomic(file, result.content);
  process.stdout.write(`${JSON.stringify(result.evidence)}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`POPULATION_QA_ALLOWLIST_FAILED code=${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { APPROVAL, KEY, TARGETS, assertAuthority, hash, updateContent };
