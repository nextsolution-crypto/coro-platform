import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync(new URL('./display09-origin-tls-change.sh', import.meta.url), 'utf8');
const template = fs.readFileSync(new URL('./nginx/display.getcoro.io.conf.template', import.meta.url), 'utf8');
const isolated = fs.readFileSync(new URL('./display09-origin-tls-isolated-test.sh', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../../.github/workflows/production-display09-origin-tls.yml', import.meta.url), 'utf8');

test('fails closed before any TLS or DNS mutation', () => {
  for (const gate of ['CONTROLLED_ORIGIN_VERIFICATION_AUTHORIZED', 'CONTROLLED_ORIGIN_RISK_ACCEPTED', 'DISPLAY_DNS_CHANGE_AUTHORIZED']) assert.match(script, new RegExp(`require_pass ${gate}`));
  assert.match(script, /APPLY\)[\s\S]*require_origin_change_authority[\s\S]*require_pass DISPLAY_DNS_CHANGE_AUTHORIZED[\s\S]*backup_configuration/);
});

test('keeps NOT_VERIFIED distinct from the explicitly authorized controlled path', () => {
  assert.match(script, /ORIGIN_PATH_VERIFIED:-NOT_VERIFIED/);
  assert.match(script, /DISPLAY_CLOUDFLARE_RULES_VERIFIED:-.*PARTIAL/);
  assert.match(script, /DISPLAY09_ORIGIN_MODE=CONTROLLED_ORIGIN_VERIFICATION/);
  assert.doesNotMatch(script, /ORIGIN_PATH_VERIFIED=PASS/);
});

test('uses the shared deployment lock, separate certificate and narrow upstream', () => {
  assert.match(script, /coro-production-deployment\.lock/);
  assert.match(template, /server_name display\.getcoro\.io/);
  assert.match(template, /\/etc\/letsencrypt\/live\/display\.getcoro\.io\/fullchain\.pem/);
  assert.match(template, /location \^~ \/d\//);
  assert.match(template, /proxy_pass http:\/\/127\.0\.0\.1:3003/);
  assert.doesNotMatch(template, /proxy_pass.*300[0124-9]/);
});

test('supports only governed HTTP-01 or Cloudflare DNS-01 and never reads private keys', () => {
  assert.match(script, /HTTP01\)/);
  assert.match(script, /DNS01\)/);
  assert.match(script, /DNS01_PLUGIN_NOT_APPROVED/);
  assert.doesNotMatch(script, /cat .*privkey|openssl rsa.*privkey/);
  assert.match(script, /certbot show_account/);
  assert.doesNotMatch(script, /register-unsafely-without-email/);
});

test('backs up, validates, reloads and rolls back only the Display vhost', () => {
  for (const token of ['backup_configuration', 'nginx -t', 'systemctl reload nginx', 'restore_configuration', 'DISPLAY09_TLS_ROLLBACK']) assert.match(script, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(script, /rm -rf|certbot delete|systemctl restart/);
});

test('verifies all five SNI plus player cache, CSP and cookie policy', () => {
  for (const host of ['getcoro.io', 'api.getcoro.io', 'app.getcoro.io', 'client.getcoro.io', 'display.getcoro.io']) assert.match(script, new RegExp(host.replaceAll('.', '\\.')));
  for (const gate of ['PLAYER_NO_STORE_MISSING', 'PLAYER_CSP_MISSING', 'PLAYER_COOKIE_NOT_SECURE', 'PLAYER_COOKIE_SAMESITE_MISSING']) assert.match(script, new RegExp(gate));
});

test('isolated NGINX test renders the template and validates the actual upstream', () => {
  assert.match(isolated, /nginx -t/);
  assert.match(isolated, /server_name display\.getcoro\.io/);
  assert.match(isolated, /proxy_pass http:\/\/127\.0\.0\.1:3003/);
});

test('protected workflow keeps controlled verification explicit and never rewrites origin evidence', () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /group: coro-production-deployment/);
  assert.match(workflow, /EXECUTE_DISPLAY09_CONTROLLED_ORIGIN_TLS/);
  assert.match(workflow, /DISPLAY_DNS_PUBLICLY_VERIFIED/);
  assert.match(workflow, /CONTROLLED_ORIGIN_VERIFICATION_AUTHORIZED=PASS/);
  assert.match(workflow, /CONTROLLED_ORIGIN_RISK_ACCEPTED=PASS/);
  assert.doesNotMatch(workflow, /ORIGIN_PATH_VERIFIED=PASS/);
  assert.doesNotMatch(workflow, /rm -rf|certbot delete|systemctl restart/);
});
