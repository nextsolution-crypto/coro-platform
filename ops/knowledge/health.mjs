import { execFileSync, spawnSync } from 'node:child_process';
import { loadPolicy, overlay, verifyRuntime } from './runtime-policy.mjs';
import { summarize } from './usage-summary.mjs';

try {
  const inspect = JSON.parse(execFileSync('docker', ['inspect', 'coro_backend'], { encoding:'utf8',maxBuffer:1048576 }))[0];
  const policy = loadPolicy();
  const runtime = verifyRuntime(inspect, overlay(policy, inspect.Config.Image));
  let certificate = { status: 'DISABLED', expiresAt: null };
  if (policy.bedrockEnabled) {
    const endDate = execFileSync('openssl', ['x509','-in','/etc/coro-ai/pki/coro-production.pem','-noout','-enddate'], {encoding:'utf8'}).trim().replace(/^notAfter=/,'');
    const expires = new Date(endDate);
    if (!Number.isFinite(expires.getTime()) || expires <= new Date()) throw new Error('KNOWLEDGE_CERTIFICATE_EXPIRED');
    certificate = { status: expires.getTime() - Date.now() < 14 * 86400000 ? 'RENEWAL_REQUIRED' : 'PASS', expiresAt: expires.toISOString() };
  }
  const health = JSON.parse(execFileSync('docker', ['exec','coro_backend','node','dist/scripts/knowledge-health.js'], { encoding:'utf8',timeout:30000,maxBuffer:1048576 }));
  // Capture internally and emit counts only, never arbitrary application log lines.
  const logResult = spawnSync('docker', ['logs','--since','1h','--tail','10000','coro_backend'], { encoding:'utf8',timeout:15000,maxBuffer:8*1048576,stdio:['ignore','pipe','pipe'] });
  if (logResult.status !== 0 || logResult.error) throw new Error('KNOWLEDGE_USAGE_LOGS_UNAVAILABLE');
  const logs = logResult.stdout + '\n' + logResult.stderr;
  // Bedrock usage events are intentionally written on stderr; Docker returns them there.
  const usage = summarize(logs.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }));
  console.log(JSON.stringify({ checkedAt:new Date().toISOString(), runtime, certificate, health, usage,
    usageWindow:'last hour, at most 10000 log lines', billing:'TOKEN_COUNTS_ONLY_NOT_AN_INVOICE' }));
  if (certificate.status === 'RENEWAL_REQUIRED') process.exitCode = 2;
} catch (error) {
  console.error(/^KNOWLEDGE_[A-Z_]+$/.test(error.message) ? error.message : 'KNOWLEDGE_HEALTH_FAILED');
  process.exitCode = 1;
}
