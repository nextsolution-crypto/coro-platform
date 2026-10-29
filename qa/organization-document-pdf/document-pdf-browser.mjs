#!/usr/bin/env node
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { QaIdentityLab } from '../global-e2e/src/browser-orchestration.mjs';
import { loadSecretStore } from '../global-e2e/src/secret-store.mjs';
import { startMfaCaptureAdapter } from '../global-e2e/src/mfa-capture-adapter.mjs';
import { assertUnderQaRoot } from '../global-e2e/src/policy.mjs';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const require = createRequire(join(root, 'coro-backend', 'package.json'));
const puppeteer = require('puppeteer');
const apiUrl = process.env.CORO_QA_BACKEND_URL?.replace(/\/$/, '');
const frontendUrl = process.env.CORO_QA_FRONTEND_URL?.replace(/\/$/, '');
const evidenceRoot = assertUnderQaRoot(process.env.CORO_QA_PDF_BROWSER_EVIDENCE);
const testedCommit = process.env.CORO_QA_COMMIT;
if (!apiUrl || !frontendUrl || !testedCommit) throw new Error('Browser runtime configuration incomplete');
const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({ captureDirectory: process.env.CORO_QA_MFA_DIR, channelToken: secrets.mfaChannelToken, port: Number(process.env.CORO_QA_MFA_ADAPTER_PORT || 34684) });
const lab = new QaIdentityLab({ apiUrl, frontendUrl, portalUrl: frontendUrl, password: secrets.syntheticPassword, mfaAdapterUrl: adapter.url, mfaChannelToken: secrets.mfaChannelToken });
const report = { testedCommit, executedAt: new Date().toISOString(), matrix: [], consoleErrors: [], keyboardZoom: null };
const viewports = [{width:390,height:844},{width:768,height:1024},{width:1440,height:900},{width:2560,height:1440}];
const themes = [{name:'classic',ui:'legacy',preference:'LIGHT'},{name:'glass-light',ui:'glass',preference:'LIGHT'},{name:'glass-dark',ui:'glass',preference:'DARK'}];
async function login() {
  const email='advisor-a@global-e2e.test'; const startedAt=Date.now();
  const first=await lab.call('/auth/login',{method:'POST',body:{email,password:secrets.syntheticPassword}});
  const code=await lab.completeMfa({email,key:email},startedAt);
  const verified=await lab.call('/auth/verify-mfa',{method:'POST',body:{email,code}});
  if(first.status>=300||verified.status>=300) throw new Error('QA login failed');
  return verified.data;
}
async function clickVisible(page, pattern) {
  const handles=await page.$$('button,a');
  for(const handle of handles){const value=await handle.evaluate((node)=>({text:(node.textContent||'').replace(/\s+/g,' ').trim(),visible:Boolean(node.offsetWidth||node.offsetHeight||node.getClientRects().length),disabled:Boolean(node.disabled)}));if(value.visible&&!value.disabled&&pattern.test(value.text)){await handle.click();return;}}
  throw new Error(`Control not found ${pattern}`);
}
await mkdir(evidenceRoot,{recursive:true});
let browser;
try {
  const session=await login();
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
  const page=await browser.newPage();
  page.on('console',(message)=>{if(message.type()==='error')report.consoleErrors.push(message.text())});
  await page.evaluateOnNewDocument(({token,refresh,user})=>{localStorage.setItem('coro_token',token);localStorage.setItem('coro_user',JSON.stringify(user));sessionStorage.setItem('coro_token',token);sessionStorage.setItem('coro_user',JSON.stringify(user));if(refresh){localStorage.setItem('coro_refresh_token',refresh);sessionStorage.setItem('coro_refresh_token',refresh)}},{token:session.access_token,refresh:session.refresh_token,user:session.user});
  for(const viewport of viewports) for(const theme of themes){
    await page.setViewport(viewport);
    await page.goto(frontendUrl,{waitUntil:'domcontentloaded'});
    await page.evaluate(({ui,preference})=>{localStorage.setItem('coro-ui-generation',ui);localStorage.setItem('coro-theme-preference',preference)},theme);
    await page.goto(`${frontendUrl}/projects/pr124-browser-pmu`,{waitUntil:'networkidle0'});
    await clickVisible(page,/Exporter le document/);
    await page.waitForFunction(()=>document.body.innerText.includes('Modules à inclure')||document.body.innerText.includes('Modules Ã'));
    const geometry=await page.evaluate(()=>{const modal=[...document.querySelectorAll('div')].find((node)=>/Exporter le document/.test(node.textContent||'')&&getComputedStyle(node).position==='fixed');const controls=modal?[...modal.querySelectorAll('button,input')].filter((node)=>node.offsetWidth||node.offsetHeight||node.getClientRects().length):[];return{overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,modal:modal?(()=>{const r=modal.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})():null,clipped:controls.filter((node)=>{const r=node.getBoundingClientRect();return r.left<-1||r.right>innerWidth+1}).length,exportVisible:controls.some((node)=>/Exporter/.test(node.textContent||''))}});
    const status=!geometry.overflow&&geometry.clipped===0&&geometry.exportVisible&&geometry.modal?'PASS':'FAIL';
    report.matrix.push({viewport,theme:theme.name,status,geometry});
    await page.screenshot({path:join(evidenceRoot,`${viewport.width}x${viewport.height}-${theme.name}.png`),fullPage:true});
  }
  await page.setViewport({width:1440,height:900});
  await page.goto(`${frontendUrl}/projects/pr124-browser-pmu`,{waitUntil:'networkidle0'}); await clickVisible(page,/Exporter le document/); await page.keyboard.press('Tab');
  const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.trim().slice(0,60),insideModal:Boolean(document.activeElement?.closest('.fixed.inset-0'))}));
  const cdp=await page.createCDPSession(); await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
  const zoom=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,width:document.documentElement.clientWidth})); await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
  await page.reload({waitUntil:'networkidle0'}); const persisted=(await page.evaluate(()=>document.body.innerText)).includes('PR124 Integrated PMU');
  report.keyboardZoom={focus,zoom,persisted,status:focus.tag!=='BODY'&&focus.insideModal&&!zoom.overflow&&persisted?'PASS':'FAIL'};
  report.pass=report.matrix.every((entry)=>entry.status==='PASS')&&report.keyboardZoom.status==='PASS'&&report.consoleErrors.filter((value)=>!/favicon|404/.test(value)).length===0;
  await writeFile(join(evidenceRoot,'browser-audit.json'),JSON.stringify(report,null,2)); console.log(JSON.stringify({pass:report.pass,matrix:`${report.matrix.filter((x)=>x.status==='PASS').length}/12`,keyboardZoom:report.keyboardZoom,consoleErrors:report.consoleErrors.length},null,2));
} finally { if(browser)await browser.close(); await adapter.close(); }
