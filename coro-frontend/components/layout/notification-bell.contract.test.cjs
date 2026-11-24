// La cloche affiche les notifications qu'elle compte (incident du 23 nov. 2026 : 438 au compteur, menu vide).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const layout = fs.readFileSync(path.join(__dirname, 'AppLayout.tsx'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '../../app/notifications/page.tsx'), 'utf8');
const helper = fs.readFileSync(path.join(__dirname, '../../lib/notification-destination.ts'), 'utf8');

assert.match(layout, /api\.get\('\/notifications\?take=8'\)/, 'la cloche charge les notifications récentes');
assert.match(layout, /recentNotifs\.map\(/, 'la cloche affiche les notifications');
assert.match(layout, /Tout marquer comme lu/, 'la cloche permet de tout marquer comme lu');
assert.match(layout, /badgeLabel\(totalCount\)/, 'la pastille est plafonnée à 99+');
assert.match(layout, /recentNotifs\.length === 0 \?/, '« Tout est à jour » seulement sans notification');
assert.match(page, /before=\$\{encodeURIComponent\(last\.createdAt\)\}/, 'la page charge l’historique complet');
assert.match(page, /notifications\/unread-count/, 'le compteur de la page vient du serveur');
assert.match(helper, /return count > 99 \? '99\+' : String\(count\);/);
assert.match(helper, /notification\.link\.startsWith\('\/'\) && !notification\.link\.startsWith\('\/\/'\)/, 'lien interne seulement');
console.log('notification bell contract: OK');
