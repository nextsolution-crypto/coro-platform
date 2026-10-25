#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const run = promisify(execFile);
const api = "http://127.0.0.1:3166/api";
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const mfaDir = process.env.CORO_QA_MFA_DIR;
const output = process.env.CORO_QA_EVIDENCE;
if (!password || !mfaDir || !output) throw new Error("QA configuration incomplete");
const projectId = "50000000-0000-4000-8000-000000000001";
const buildingId = "40000000-0000-4000-8000-000000000001";

async function call(route,{token,method="GET",body}={}) { const r=await fetch(`${api}${route}`,{method,headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)}); const text=await r.text();let data=text;try{data=JSON.parse(text)}catch{}return{status:r.status,data}; }
async function code(email,after){const files=await Promise.all((await readdir(mfaDir)).map(async name=>({name,time:(await stat(join(mfaDir,name))).mtimeMs})));for(const f of files.sort((a,b)=>b.time-a.time)){if(f.time<after-2000)break;const m=JSON.parse(await readFile(join(mfaDir,f.name),"utf8"));if(String(m.to).toLowerCase()===email)return /\b(\d{6})\b/.exec(m.subject)?.[1]}throw new Error(`MFA missing ${email}`)}
async function login(email,portal=false){const base=portal?"/client-auth":"/auth";const after=Date.now();const c=await call(`${base}/login`,{method:"POST",body:{email,password}});const v=await call(`${base}/verify-mfa`,{method:"POST",body:{email,code:await code(email,after)}});const token=v.data?.access_token??v.data?.token;if(![200,201].includes(v.status)||!token)throw new Error(`login failed ${email}`);return token}
const report={generatedAt:new Date().toISOString(),archive:[],generationRecovery:[]};
const add=(area,id,pass,observed)=>report[area].push({id,status:pass?"PASS":"FAIL",observed});
const advisor=await login("advisor-a@global-e2e.test");
const corporate=await login("portal-corporate-a@global-e2e.test",true);
const zero=await login("portal-zero-a@global-e2e.test",true);

const before=await call(`/projects/${projectId}`,{token:advisor});
const versionsBefore=await call(`/projects/${projectId}/versions`,{token:advisor});
const knowledgeBefore=await call(`/client-portal/knowledge/search?q=vanne&buildingId=${buildingId}`,{token:corporate});
const archived=await call(`/projects/${projectId}`,{token:advisor,method:"PUT",body:{status:"ARCHIVED"}});
const listAfter=await call("/projects",{token:advisor});
const directAfter=await call(`/projects/${projectId}`,{token:advisor});
const portalAfter=await call(`/client-portal/projects/${projectId}`,{token:corporate});
const deniedAfter=await call(`/client-portal/projects/${projectId}`,{token:zero});
const versionsAfter=await call(`/projects/${projectId}/versions`,{token:advisor});
const knowledgeAfter=await call(`/client-portal/knowledge/search?q=vanne&buildingId=${buildingId}`,{token:corporate});
add("archive","transition",archived.status===200&&archived.data?.status==="ARCHIVED",{httpStatus:archived.status,state:archived.data?.status});
add("archive","internal-list-and-direct",listAfter.status===200&&listAfter.data.some(x=>x.id===projectId)&&directAfter.data?.status==="ARCHIVED",{listed:listAfter.data?.some(x=>x.id===projectId),directStatus:directAfter.status,state:directAfter.data?.status});
add("archive","authorized-client-read",portalAfter.status===200&&portalAfter.data?.status==="ARCHIVED",{httpStatus:portalAfter.status,state:portalAfter.data?.status});
add("archive","unauthorized-client-denial",deniedAfter.status===200&&!deniedAfter.data?.id,{httpStatus:deniedAfter.status,hasResource:Boolean(deniedAfter.data?.id)});
add("archive","versions-preserved",versionsAfter.status===200&&versionsAfter.data.length===versionsBefore.data.length&&versionsAfter.data.length>0,{before:versionsBefore.data?.length,after:versionsAfter.data?.length});
add("archive","knowledge-preserved",knowledgeAfter.status===200&&knowledgeAfter.data.length>0&&knowledgeAfter.data.length===knowledgeBefore.data.length,{before:knowledgeBefore.data?.length,after:knowledgeAfter.data?.length});

const documentBefore=await call(`/generator/document/${projectId}`,{token:advisor});
let failure;
try {
  await run("docker",["stop","coro-cp004-core-doc-postgres-1"]);
  failure=await call(`/generator/generate/${projectId}`,{token:advisor,method:"POST",body:{}});
} finally {
  await run("docker",["start","coro-cp004-core-doc-postgres-1"]);
}
for(let i=0;i<30;i++){try{const r=await call(`/projects/${projectId}`,{token:advisor});if(r.status===200)break}catch{}await new Promise(r=>setTimeout(r,1000));}
const documentAfterFailure=await call(`/generator/document/${projectId}`,{token:advisor});
const retry=await call(`/generator/generate/${projectId}`,{token:advisor,method:"POST",body:{}});
const documentAfterRetry=await call(`/generator/document/${projectId}`,{token:advisor});
add("generationRecovery","controlled-database-failure",failure.status>=500,{httpStatus:failure.status,message:typeof failure.data==="object"?failure.data?.message:null});
add("generationRecovery","no-partial-document",documentAfterFailure.status===200&&documentAfterFailure.data?.id===documentBefore.data?.id&&documentAfterFailure.data?.version===documentBefore.data?.version,{beforeId:documentBefore.data?.id,afterId:documentAfterFailure.data?.id,beforeVersion:documentBefore.data?.version,afterVersion:documentAfterFailure.data?.version});
add("generationRecovery","retry-success",retry.status===201&&documentAfterRetry.data?.id===documentBefore.data?.id&&documentAfterRetry.data?.version===documentBefore.data?.version+1,{httpStatus:retry.status,id:documentAfterRetry.data?.id,version:documentAfterRetry.data?.version});
add("generationRecovery","project-binding",documentAfterRetry.data?.projectId===projectId,{projectId:documentAfterRetry.data?.projectId});
report.pass=[...report.archive,...report.generationRecovery].every(x=>x.status==="PASS");
await mkdir(output,{recursive:true});await writeFile(join(output,"remaining-limits.json"),JSON.stringify(report,null,2));
console.log(`REMAINING_LIMITS_${report.pass?"PASS":"FAIL"}: ${[...report.archive,...report.generationRecovery].filter(x=>x.status==="PASS").length}/${report.archive.length+report.generationRecovery.length}`);if(!report.pass)process.exitCode=1;
