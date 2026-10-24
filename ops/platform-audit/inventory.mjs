import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'coro-backend/package.json'));
const ts = require('typescript');
const out = path.join(root, 'docs/platform-audit');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e =>
  e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.') ? [] :
    e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const relative = file => path.relative(root,file).replaceAll('\\','/');
const sourceFiles = walk(path.join(root,'coro-backend/src'));
const tests = [...sourceFiles, ...walk(path.join(root,'coro-backend/test'))].filter(f=>/\.(spec|test)\.[cm]?[jt]s$/.test(f));
const decorators = node => ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
const deco = (node,name) => decorators(node).find(d=>ts.isCallExpression(d.expression) && d.expression.expression.getText()===name)?.expression;
const strings = node => !node ? [''] : ts.isStringLiteral(node) ? [node.text] : ts.isArrayLiteralExpression(node) ? node.elements.flatMap(strings) : ['UNRESOLVED:'+node.getText()];
const category = key => /population/.test(key) ? 'Population' : /commercial|proposal|contract|entitlement|metering|organization-360|referral/.test(key) ? 'Commercial' : /knowledge|manual/.test(key) ? 'Knowledge, AI et aide' : /occupancy|incident|exercise|operational|corrective|alarm|bridge/.test(key) ? 'Opérations et résilience' : /booking|planning|schedule|timelog|activit|mandate|task/.test(key) ? 'Planification et performance' : /auth|user|organization|audit|control-center|storage|prisma|notification|reminder/.test(key) ? 'Socle et exploitation' : /network/.test(key) ? 'Network' : 'Documents et portefeuille';
const endpoints = [];
for (const file of sourceFiles.filter(f=>f.endsWith('.controller.ts'))) {
  const src=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  const visit = node => {
    if(ts.isClassDeclaration(node) && deco(node,'Controller')) {
      const controller=deco(node,'Controller');
      const prefixes=strings(controller.arguments[0]);
      for(const method of node.members) for(const verb of ['Get','Post','Put','Patch','Delete','Options','Head','All']) {
        const route=deco(method,verb); if(!route)continue;
        for(const prefix of prefixes)for(const suffix of strings(route.arguments[0])) {
          const guards=[...decorators(node),...decorators(method)].map(d=>d.getText()).filter(s=>/Guard|Public|Permission|Role/.test(s));
          const module=relative(file).split('/')[2];
          endpoints.push({id:`API:${relative(file)}:${method.name.getText()}:${verb}:${prefix}/${suffix}`,module,category:category(module),kind:'API',function:method.name.getText(),method:verb.toUpperCase(),route:'/api/'+[prefix,suffix].filter(Boolean).join('/'),source:relative(file),line:src.getLineAndCharacterOfPosition(method.getStart()).line+1,declaredGuards:guards,testsPresent:tests.filter(t=>path.dirname(t)===path.dirname(file)).map(relative),implementation:'PRESENT_IN_SOURCE',e2e:'NOT_VERIFIED_IN_THIS_AUDIT',commercial:'NOT_ASSESSED',decision:'A_VALIDER',nextAction:'Rejouer le contrat, succès, refus de droits/périmètre, données invalides, état final et trace; preuve datée requise.'});
        }
      }
    }
    ts.forEachChild(node,visit);
  };visit(src);
}
const pages=[];
for(const app of ['coro-frontend','coro-client-portal','coro-website'])for(const file of walk(path.join(root,app,'app')).filter(f=>/\/page\.[jt]sx?$/.test(f))) {
  const route='/'+relative(file).split('/').slice(2,-1).filter(s=>!/^\(.*\)$/.test(s)).join('/');
  pages.push({id:`UI:${relative(file)}`,module:route.split('/')[1]||'home',category:category(route),kind:'UI',surface:app,function:route,route,source:relative(file),implementation:'PRESENT_IN_SOURCE',e2e:'NOT_VERIFIED_IN_THIS_AUDIT',commercial:'NOT_ASSESSED',decision:'A_VALIDER',nextAction:'Connexion avec rôle réel de test, navigation, soumission/validation, persistance après recharge, mobile/clavier, refus inter-tenant; preuve datée requise.'});
}
const modules=[...new Set(sourceFiles.filter(f=>f.endsWith('.module.ts')).map(f=>relative(f).split('/')[2]))].sort().map(name=>({name,category:category(name),apiCount:endpoints.filter(e=>e.module===name).length,testFiles:tests.filter(f=>relative(f).split('/')[2]===name).map(relative),e2e:'NOT_VERIFIED_IN_THIS_AUDIT',commercial:'NOT_ASSESSED',decision:'A_VALIDER'}));
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const sourceHash=createHash('sha256');
for(const file of [...new Set([...sourceFiles,...pages.map(p=>path.join(root,p.source)),...tests])].sort())sourceHash.update(relative(file)).update('\0').update(fs.readFileSync(file)).update('\0');
const report={schemaVersion:1,baselineCommit:commit,sourceSnapshotSha256:sourceHash.digest('hex'),generatedAt:new Date().toISOString(),scope:'Inventaire statique du backend, des trois interfaces et des tests présents. Aucune exécution E2E ni décision commerciale ne découle de la présence de code.',limitations:['Les routes sont déclarées : montage effectif, préfixes versionnés et disponibilité runtime à vérifier.','Les guards déclarés ne prouvent pas les contrôles des services.','Les tests présents ne sont pas des tests exécutés.','Les effets externes, les clauses juridiques et les droits commerciaux nécessitent une validation distincte.'],counts:{modules:modules.length,endpoints:endpoints.length,pages:pages.length,testFiles:tests.length,unresolvedRoutes:endpoints.filter(e=>e.route.includes('UNRESOLVED:')).length},modules,functions:[...endpoints,...pages]};
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(report,null,2)+'\n');
const cell=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' ');
fs.writeFileSync(path.join(out,'FUNCTION-MATRIX.md'),`# Matrice fonctionnelle CORO\n\nBase : \`${commit}\`. Générée le ${report.generatedAt}.\n\n${report.scope}\n\n${report.counts.modules} modules techniques, ${report.counts.endpoints} endpoints, ${report.counts.pages} pages, ${report.counts.testFiles} fichiers de tests.\n\nChaque ligne reste **À VALIDER** tant qu'une preuve E2E et les conditions commerciales ne sont pas reliées à sa fonction. Les tests, limites et détails des guards sont dans inventory.json. Voir AUDIT-PLAN.md et JOURNEYS.md.\n\n| Catégorie | Surface/module | Fonction | Source | Décision |\n|---|---|---|---|---|\n`+report.functions.map(e=>`| ${cell(e.category)} | ${cell(e.surface??e.module)} | ${cell((e.method??'PAGE')+' '+e.route)} | [code](../../${e.source}) | À valider |`).join('\n')+'\n');
fs.writeFileSync(path.join(out,'MODULE-MATRIX.md'),'# Matrice des modules techniques\n\nUn module Nest n’est pas nécessairement un produit commercial autonome. Le regroupement est une aide d’inventaire, sans modifier les autorités commerciales.\n\n| Module | Catégorie | Endpoints | Fichiers de tests présents | E2E de cet audit | Aptitude commerciale |\n|---|---|---:|---:|---|---|\n'+modules.map(m=>`| ${m.name} | ${m.category} | ${m.apiCount} | ${m.testFiles.length} | Non vérifié | Non évaluée |`).join('\n')+'\n');
console.log(JSON.stringify({baselineCommit:commit,...report.counts}));
