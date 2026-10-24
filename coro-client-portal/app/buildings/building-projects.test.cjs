require('../../design-system/test-loader.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { belongsToBuilding } = require('./building-projects.ts');
test('un lien bâtiment exclut les dossiers des autres bâtiments et ceux sans bâtiment', () => {
  const projects = [{ id: 'a', buildingId: 'A' }, { id: 'b', building: { id: 'B' } }, { id: 'c' }];
  assert.deepEqual(projects.filter(p => belongsToBuilding(p, 'A')).map(p => p.id), ['a']);
  assert.deepEqual(projects.filter(p => belongsToBuilding(p, 'B')).map(p => p.id), ['b']);
  assert.equal(projects.filter(p => belongsToBuilding(p, '')).length, 3);
  assert.deepEqual(projects.filter(p => belongsToBuilding(p, 'unknown')), []);
});
test('la relation canonique prime sur un objet de présentation incohérent', () => {
  assert.equal(belongsToBuilding({ buildingId: 'A', building: { id: 'B' } }, 'B'), false);
});
