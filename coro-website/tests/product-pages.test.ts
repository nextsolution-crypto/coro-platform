import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{join}from'node:path';const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
// /gestion-documentaire left this contract in MIG-02A: it is migrated to V2Shell (tests/gestion-documentaire-migration.test.ts).
// /gestion-de-projets left this contract in MIG-02B: it is migrated to V2Shell (tests/gestion-de-projets-migration.test.ts).
// /performance-objectifs left this contract in MIG-02C: it is migrated to V2Shell (tests/performance-objectifs-migration.test.ts).
// /portail-client left this contract in MIG-02D: it is migrated to V2Shell (tests/portail-client-migration.test.ts). No page uses ProductPage any more.
test('product content is bilingual and keeps conceptual boundaries',()=>{const s=read('lib/site/product-content.ts');assert.match(s,/documents:\{fr:/);assert.match(s,/projects:\{fr:/);assert.match(s,/performance:\{fr:/);assert.match(s,/client:\{fr:/);assert.match(s,/Performance n’est pas l’Indice CORO/);assert.match(s,/Un accès selon les droits accordés/);assert.match(s,/Planning des ressources/);assert.doesNotMatch(s,/href:'\/(knowledge|ops|network)'/);});
