import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const shell=readFileSync(join(root,'components/ProductPage.tsx'),'utf8');
const compositions=readFileSync(join(root,'components/ProductCompositions.tsx'),'utf8');

test('ProductPage remains a shell rather than a central-page template',()=>{
 assert.match(shell,/ProductComposition/);
 assert.doesNotMatch(shell,/next\/image|media\.map|capabilities\.map|flow\.map/);
});

test('each product owns a distinct semantic composition',()=>{
 for(const name of ['Documents','Projects','Performance','Client']) assert.match(compositions,new RegExp(`function ${name}\\(`));
 assert.match(compositions,/docCycle/);
 assert.match(compositions,/projectJourney/);
 assert.match(compositions,/performanceQuestions/);
 assert.match(compositions,/clientTour/);
});
