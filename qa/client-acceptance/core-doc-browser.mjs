#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const require = createRequire(join(resolve("coro-backend"), "package.json"));
const puppeteer = require("puppeteer");
const api = "http://127.0.0.1:3166/api";
const frontend = "http://127.0.0.1:3167";
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
const mfaDir = process.env.CORO_QA_MFA_DIR;
const output = process.env.CORO_QA_BROWSER_EVIDENCE;
if (!password || !mfaDir || !output) throw new Error("Browser QA configuration incomplete");

async function call(route, options = {}) {
  const response = await fetch(`${api}${route}`, { method: options.method || "GET", headers: { "content-type": "application/json" }, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const text = await response.text(); let data = text; try { data = JSON.parse(text); } catch {}
  return { status: response.status, data };
}
async function latestCode(email, after) {
  const files = await Promise.all((await readdir(mfaDir)).map(async name => ({ name, time: (await stat(join(mfaDir, name))).mtimeMs })));
  for (const file of files.sort((a,b) => b.time-a.time)) {
    if (file.time < after - 2000) break;
    const message = JSON.parse(await readFile(join(mfaDir, file.name), "utf8"));
    if (String(message.to).toLowerCase() === email) return /\b(\d{6})\b/.exec(message.subject)?.[1];
  }
  throw new Error(`MFA missing for ${email}`);
}
async function login() {
  const email = "advisor-a@global-e2e.test"; const after = Date.now();
  const challenge = await call("/auth/login", { method:"POST", body:{ email, password } });
  if (![200,201].includes(challenge.status)) throw new Error(`Challenge ${challenge.status}`);
  const verified = await call("/auth/verify-mfa", { method:"POST", body:{ email, code:await latestCode(email,after) } });
  if (![200,201].includes(verified.status) || !verified.data?.access_token) throw new Error(`MFA ${verified.status}`);
  return verified.data;
}
function geometry() {
  const root=document.documentElement;
  // The closed mobile navigation drawer is intentionally translated outside
  // the viewport. Measure the active page surface, not inactive drawer items.
  const elements=[...document.querySelectorAll("main,main section,main article,main table,main form,main button,main input,main select,header")].map(element=>{const r=element.getBoundingClientRect();return{tag:element.tagName,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,visible:r.width>0&&r.height>0}});
  return { viewport:{width:innerWidth,height:innerHeight}, globalOverflow:root.scrollWidth>root.clientWidth+1, failures:elements.filter(x=>x.visible&&(x.left < -1 || x.right > innerWidth+1)), text:document.body.innerText };
}

await mkdir(output,{recursive:true});
const auth=await login();
const browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
const results=[]; const errors=[];
try {
  const page=await browser.newPage();
  page.on("console",event=>{if(event.type()==="error") errors.push(event.text())}); page.on("pageerror",error=>errors.push(error.message));
  const viewports=[[1440,900],[1920,1080],[390,844],[430,932]];
  const themes=[{id:"classic",ui:"legacy",preference:"LIGHT"},{id:"glass-light",ui:"glass",preference:"LIGHT"},{id:"glass-dark",ui:"glass",preference:"DARK"}];
  for (const [width,height] of viewports) for (const theme of themes) {
    await page.setViewport({width,height,deviceScaleFactor:1});
    await page.goto(`${frontend}/login`,{waitUntil:"domcontentloaded"});
    await page.evaluate(({token,user,ui,preference})=>{localStorage.setItem("coro_token",token);localStorage.setItem("coro_user",JSON.stringify(user));localStorage.setItem("coro-ui-generation",ui);localStorage.setItem("coro-theme-preference",preference);},{token:auth.access_token,user:auth.user,ui:theme.ui,preference:theme.preference});
    await page.goto(`${frontend}/projects/50000000-0000-4000-8000-000000000001`,{waitUntil:"networkidle2"});
    await page.waitForFunction(()=>document.body.innerText.includes("Synthetic PMU Project"),{timeout:15000});
    const measured=await page.evaluate(geometry);
    const pass=/Synthetic PMU Project/.test(measured.text)&&/Valid/.test(measured.text)&&/(PDF|Aperçu|Exporter)/i.test(measured.text)&&!measured.globalOverflow&&measured.failures.length===0;
    const id=`${width}x${height}-${theme.id}`;
    await page.screenshot({path:join(output,`${id}.png`),fullPage:true});
    results.push({id,status:pass?"PASS":"FAIL",viewport:measured.viewport,globalOverflow:measured.globalOverflow,componentOverflow:measured.failures,hasProject:/Synthetic PMU Project/.test(measured.text),hasPdfAction:/(PDF|Aperçu|Exporter)/i.test(measured.text)});
  }
  await page.reload({waitUntil:"networkidle2"});
  const refreshed=await page.evaluate(geometry);
  results.push({id:"f5-session-persistence",status:/Synthetic PMU Project/.test(refreshed.text)?"PASS":"FAIL"});
} finally { await browser.close(); }
const critical=[...new Set(errors)].filter(value=>!/favicon|Failed to load resource.*404/i.test(value));
const report={generatedAt:new Date().toISOString(),commit:process.env.CORO_QA_COMMIT,results,consoleErrors:critical,pass:results.every(item=>item.status==="PASS")&&critical.length===0};
await writeFile(join(output,"core-doc-browser-matrix.json"),JSON.stringify(report,null,2));
console.log(`CORE_DOC_BROWSER_${report.pass?"PASS":"FAIL"}: ${results.filter(x=>x.status==="PASS").length}/${results.length}`);
if(!report.pass)process.exitCode=1;
