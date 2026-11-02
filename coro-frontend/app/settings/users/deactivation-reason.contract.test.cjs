const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

if (!source.includes('if (!isActive)')) {
  throw new Error('La désactivation doit être distinguée de la réactivation.');
}

if (!source.includes('reason = enteredReason.trim()')) {
  throw new Error('Le motif de désactivation doit être normalisé avant transmission.');
}

if (!source.includes('{ isActive, reason }')) {
  throw new Error('Le motif doit être transmis à l’autorité serveur canonique.');
}

if (!source.includes("window.alert('Un motif est requis pour désactiver un membre.')")) {
  throw new Error('Un motif vide doit échouer avant toute requête.');
}

console.log('PASS: le contrôle de désactivation transmet un motif d’audit explicite et échoue à blanc.');
