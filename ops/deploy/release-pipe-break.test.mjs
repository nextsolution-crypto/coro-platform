import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Sous `set -o pipefail`, un `break` dans `... | while read` fait échouer
// l'écrivain du pipe (SIGPIPE, code 141) dès que la liste dépasse 64 Ko :
// la livraison s'arrêtait alors sans code d'erreur (REMOTE_EXIT_1).
const scripts = [
  'ops/deploy/coro-production-release.sh',
  'ops/capacity/coro-capacity-cleanup.sh',
  'ops/capacity/coro-capacity-audit.sh',
  'ops/capacity/coro-rollback-image-restore.sh',
];

for (const file of scripts) {
  test(`${file} ne coupe pas un pipe avec break`, () => {
    const text = fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      if (/\|\s*while read\b/.test(line)) {
        assert.ok(!/\bbreak\b/.test(line), `pipe interrompu par break : ${line.trim().slice(0, 120)}`);
      }
    }
  });
}
