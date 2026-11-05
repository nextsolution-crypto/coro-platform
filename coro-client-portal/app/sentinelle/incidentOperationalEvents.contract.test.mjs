import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const triggerPage = readFileSync(join(here, '[buildingId]', 'incident', 'page.tsx'), 'utf8');
const historyPage = readFileSync(join(here, '[buildingId]', 'incidents', 'page.tsx'), 'utf8');
const detailPage = readFileSync(join(here, '[buildingId]', 'incidents', '[incidentId]', 'page.tsx'), 'utf8');
const interventionPage = readFileSync(join(here, '..', 'intervention', '[token]', 'page.tsx'), 'utf8');

const types = [
  'ELEVATOR_ENTRAPMENT',
  'FIRE_PROTECTION_IMPAIRMENT',
  'HAZARDOUS_ATMOSPHERE',
  'EMERGENCY_POWER_FAILURE',
  'SEVERE_ICE_CONDITIONS',
  'CRITICAL_SAFETY_SYSTEM_LOSS',
];

for (const type of types) {
  assert.match(triggerPage, new RegExp(type), `${type} must be selectable`);
  assert.match(historyPage, new RegExp(type), `${type} must have a history label`);
  assert.match(detailPage, new RegExp(type), `${type} must have a detail label`);
  assert.match(interventionPage, new RegExp(type), `${type} must have an intervention label`);
}

const triggerRequest = triggerPage.slice(
  triggerPage.indexOf("clientFetch('/client-portal/incidents/trigger'"),
  triggerPage.indexOf("setDescription('')"),
);
assert.doesNotMatch(triggerRequest, /triggeredBy\s*:/, 'the browser must not choose the incident author');
assert.match(triggerPage, /Seuil opérationnel/, 'the UI must distinguish operational events from maintenance work');

console.log('Incident operational events portal contract: PASS');
