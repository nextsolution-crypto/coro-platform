import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profile = readFileSync(new URL('./profile/page.tsx', import.meta.url), 'utf8');
const document = readFileSync(new URL('./documents/[id]/page.tsx', import.meta.url), 'utf8');
const invitations = readFileSync(
  new URL('./sentinelle/[buildingId]/invitations/page.tsx', import.meta.url),
  'utf8',
);

assert.match(profile, /currentPassword/);
assert.match(profile, /autoComplete="current-password"/);
assert.match(profile, /clearAuth\(\)/);
assert.match(profile, /router\.replace\('\/login'\)/);
assert.match(document, /client-portal\/pilot-policy/);
assert.match(document, /Signature exclue du pilote/);
assert.match(document, /La récupération du PDF officiel est exclue de ce pilote/);
assert.match(document, /archivedProjectMutation/);
assert.match(invitations, /client-portal\/pilot-policy/);
assert.match(invitations, /Les invitations externes sont désactivées pour ce pilote/);
assert.match(invitations, /disabled=\{pilotPolicy\?\.externalInvitation === false\}/);

console.log('client pilot restriction UI contracts: PASS');
