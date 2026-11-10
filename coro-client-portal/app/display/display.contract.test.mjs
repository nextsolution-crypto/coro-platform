import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../components/PortalLayout.tsx', import.meta.url), 'utf8');
assert.match(layout, /DISPLAY_CLIENT_PLAN_READ/);
assert.match(page, /DISPLAY_CLIENT_PREVIEW/);
assert.match(page, /DISPLAY_CLIENT_OBSERVATION_SUBMIT/);
assert.match(page, /DISPLAY_CLIENT_OBSERVATION_READ/);
assert.match(page, /Ce formulaire ne déclenche ni incident ni évacuation/);
assert.match(page, /Les pièces jointes sont désactivées/);
assert.doesNotMatch(page, /DISPLAY_CONTENT_MANAGE/);
console.log('DISPLAY-05B portal contract: PASS');
