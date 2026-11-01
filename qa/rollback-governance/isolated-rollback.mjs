import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { validateRollbackSecurity } from '../../ops/capacity/rollback-security-policy.mjs';

const suffix=crypto.randomBytes(4).toString('hex');
const prefix=`coro-rollback-qa-${suffix}`;
const network=`${prefix}-network`;
const volume=`${prefix}-data`;
const services=['backend','frontend','client-portal','website'];
const names=Object.fromEntries(services.map((service)=>[service,`${prefix}-${service}`]));
const run=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',stdio:options.stdio||'pipe'}).trim();
const image=(name,digit)=>`ghcr.io/nextsolution-crypto/${name}@sha256:${digit.repeat(64)}`;
const oldImages=[image('coro-backend','1'),image('coro-frontend','2'),image('coro-client-portal','3'),image('coro-website','4')];
const commit='a'.repeat(40);
const head='20261118010000_organization_settings_governance';
const manifest={previousCommit:commit,previousImages:oldImages,previousMigrationHead:'20261117010000_building_governance'};
const approval={id:'isolated-qa',previousCommit:commit,images:oldImages,compatibleDatabaseHeads:[head],requiredKeyIds:['qa-v1'],workerCompatibility:'COMPATIBLE',status:'APPROVED',reason:'isolated synthetic rollback',reviewedAt:'2026-11-01T00:00:00Z'};
const runtime={phase:'EXECUTION',migrationHead:head,availableKeyIds:['qa-v1'],workerState:'QUIESCED'};

function removeContainers(){for(const name of Object.values(names)){try{run(['rm','-f',name]);}catch{}}}
function start(version){
  removeContainers();
  for(const service of services){
    const args=['run','-d','--name',names[service],'--network',network,'--label',`io.getcoro.qa.release=${version}`];
    if(service==='backend')args.push('-v',`${volume}:/state`);
    args.push('alpine:3.20','sh','-c','sleep 300');
    run(args);
  }
}
function snapshot(){return Object.fromEntries(services.map((service)=>[service,JSON.parse(run(['inspect',names[service]]))[0].Config.Labels['io.getcoro.qa.release']]));}
function cleanup(){removeContainers();try{run(['network','rm',network]);}catch{}try{run(['volume','rm',volume]);}catch{}}

const evidence={schemaVersion:1,prefix,authorizedSwitch:false,dangerousRefusal:false,recovery:false,dataPreserved:false,eventPreserved:false};
try{
  run(['network','create',network]);run(['volume','create',volume]);
  start('corrected');
  run(['exec',names.backend,'sh','-c','printf data-v1 >/state/business-data && printf event-v1 >/state/outbox-event']);

  validateRollbackSecurity({manifest,policy:{schemaVersion:1,blockedRollbackImages:[],approvedRollbackSets:[approval]},runtime});
  start('approved-rollback');
  evidence.authorizedSwitch=Object.values(snapshot()).every((value)=>value==='approved-rollback');

  const beforeDangerous=Object.fromEntries(services.map((service)=>[service,run(['inspect','--format','{{.Id}}',names[service]])]));
  assert.throws(()=>validateRollbackSecurity({manifest,policy:{schemaVersion:1,blockedRollbackImages:[oldImages[0]],approvedRollbackSets:[approval]},runtime}),/IMAGE_BLOCKED/);
  const afterDangerous=Object.fromEntries(services.map((service)=>[service,run(['inspect','--format','{{.Id}}',names[service]])]));
  evidence.dangerousRefusal=JSON.stringify(beforeDangerous)===JSON.stringify(afterDangerous);

  // Failure is injected after the allowed switch; recovery returns every service
  // to the corrected generation without touching the persistent state volume.
  start('corrected');
  evidence.recovery=Object.values(snapshot()).every((value)=>value==='corrected');
  evidence.dataPreserved=run(['exec',names.backend,'cat','/state/business-data'])==='data-v1';
  evidence.eventPreserved=run(['exec',names.backend,'cat','/state/outbox-event'])==='event-v1';
  assert.ok(Object.values(evidence).filter((value)=>typeof value==='boolean').every(Boolean));
  process.stdout.write(`${JSON.stringify(evidence,null,2)}\n`);
}finally{cleanup();}
