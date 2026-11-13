'use strict';
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const script = fs.readFileSync(path.join(__dirname, 'display09-origin-tls-inspection.sh'), 'utf8');

test('inspection is read-only and never opens private keys or environment files', () => {
  assert.match(script, /"readOnly":true/);
  assert.doesNotMatch(script, /cat\s+.*(?:privkey|\.env)|docker\s+compose\s+(?:restart|up|down)|systemctl\s+(?:restart|reload|start|stop)|certbot\s+(?:certonly|run|renew)/i);
});

test('inspection validates every required SNI hostname and the chain', () => {
  for (const host of ['getcoro.io', 'client.getcoro.io', 'api.getcoro.io', 'app.getcoro.io', 'display.getcoro.io']) assert.ok(script.includes(host));
  assert.match(script, /-verify_hostname\s+"\$host"\s+-verify_return_error/);
  assert.match(script, /sha256Fingerprint/);
});

test('inspection detects the supported TLS terminators without exposing process arguments', () => {
  for (const name of ['NGINX', 'TRAEFIK', 'CADDY', 'APACHE', 'DOCKER_PROXY']) assert.ok(script.includes(name));
  assert.doesNotMatch(script, /ps\s+(?:aux|-[a-z]*e)/i);
});

test('discovery emits only whitelisted nginx directives and never reads private key material', () => {
  for (const directive of ['listen', 'server_name', 'ssl_certificate', 'proxy_pass']) assert.ok(script.includes(directive));
  assert.match(script, /line !~ \/\^ssl_certificate_key/);
  assert.doesNotMatch(script, /cat\s+[^\n]*(?:privkey|ssl_certificate_key)/i);
  assert.match(script, /nginxConfigFiles/);
  assert.match(script, /nginxWhitelistedDirectives/);
});

test('certbot discovery is metadata-only and ACME readiness distinguishes HTTP-01 from DNS-01', () => {
  assert.match(script, /\/etc\/letsencrypt\/renewal/);
  assert.match(script, /preHook=\$pre::postHook=\$post::deployHook=\$deploy/);
  assert.match(script, /http01DnsPresent/);
  assert.match(script, /dns01CredentialAvailability/);
  assert.doesNotMatch(script, /certbot\s+(?:renew|certonly|run)/i);
});

test('origin correlation publishes only a SHA-256 fingerprint, never the address', () => {
  assert.match(script, /serverOriginFingerprint/);
  assert.match(script, /origin_address.*sha256sum/);
  assert.doesNotMatch(script, /printf[^\n]*origin_address[^\n]*\\n/);
});
