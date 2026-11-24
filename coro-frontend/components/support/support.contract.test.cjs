// Centre d'aide de l'app conseiller (24 nov. 2026).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const layout = read('components/layout/AppLayout.tsx');
assert.match(layout, /\{ label: 'Centre d’aide', path: '\/support', icon: '🛟' \}/, 'Centre d’aide pour tous, dans Ressources');
assert.match(layout, /\{ label: 'Demandes de support',\s+path: '\/support\/console',\s+icon: '💬' \}/, 'console pour les administrateurs');
assert.match(read('app/settings/feedback/page.tsx'), /router\.replace\('\/support'\)/);
assert.match(read('app/admin/feedback/page.tsx'), /router\.replace\('\/support\/console'\)/);
const thread = read('components/support/SupportTicketThread.tsx');
assert.match(thread, /ticket\.isAgent && \(/, 'panneau de gestion réservé aux agents');
assert.match(thread, /Note interne/);
assert.match(thread, /accept="\.pdf,\.jpg,\.jpeg,application\/pdf,image\/jpeg"/);
const lib = read('lib/support.ts');
assert.match(lib, /Réponse sous 4 h ouvrables/);
assert.match(lib, /Réponse sous 1 jour ouvrable/);
assert.match(lib, /Réponse sous 3 jours ouvrables/);
console.log('support center contract: OK');
