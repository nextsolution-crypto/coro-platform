'use strict';
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('fails closed, supports dry-run and does not embed credentials', () => {
    const installer = read('install.sh');
  assert.match(installer, /--dry-run/);
  assert.match(installer, /OS_VERSION_UNSUPPORTED/);
  assert.match(installer, /EXTERNAL_SIGNER_MISSING/);
  assert.match(installer, /systemd-sysusers/);
  assert.match(installer, /systemd-tmpfiles --create/);
  assert.match(installer, /chmod 0755 \/opt\/coro-display\/ops\/display-player\/bin\/coro-display-preflight/);
  assert.doesNotMatch(installer, /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/);
  assert.doesNotMatch(installer, /curl \|/);
});

test('preserves audit, identity and cache on default removal', () => {
    const uninstaller = read('uninstall.sh');
  assert.match(uninstaller, /configuration preserved/);
  assert.match(uninstaller, /Refusing automatic data purge/);
});

test('keeps Chromium sandboxed and systemd privileges bounded', () => {
    const service = read('systemd/coro-display-player.service');
    const policy = JSON.parse(read('chromium/coro-display-policy.json'));
  assert.match(service, /User=coro-display/);
  assert.match(service, /NoNewPrivileges=true/);
  assert.match(service, /ProtectSystem=strict/);
  assert.match(service, /CapabilityBoundingSet=/);
  assert.match(service, /Restart=on-failure/);
  assert.doesNotMatch(service, /User=root/);
  assert.equal(policy.DeveloperToolsAvailability, 2);
  assert.deepEqual(policy.ExtensionInstallBlocklist, ['*']);
  assert.equal(policy.DownloadRestrictions, 3);
});
