import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputRoot = resolve(
  process.cwd(),
  '../docs/coro-display/DISPLAY-07/evidence/chromium',
);
const profiles = [
  { name: '17x11', width: 1700, height: 1100 },
  { name: '16x9', width: 1600, height: 900 },
  { name: '16x10', width: 1600, height: 1000 },
];
const states = [
  {
    name: 'normal',
    title: 'PLAN APPROUVÉ — CYCLE NORMAL',
    color: '#0b6f67',
    exercise: false,
  },
  {
    name: 'exercise',
    title: 'EXERCICE — AUCUNE URGENCE RÉELLE',
    color: '#d88b17',
    exercise: true,
  },
  {
    name: 'emergency',
    title: 'URGENCE — PLAN APPROUVÉ MAINTENU',
    color: '#b3261e',
    exercise: false,
  },
  {
    name: 'offline',
    title: 'HORS LIGNE — ÉTAT D’URGENCE CONSERVÉ',
    color: '#7b2cbf',
    exercise: false,
  },
  {
    name: 'restored',
    title: 'SORTIE GOUVERNÉE — CYCLE NORMAL RESTAURÉ',
    color: '#176b3a',
    exercise: false,
  },
];

function html(state: (typeof states)[number]) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:Arial,sans-serif;background:#07131a;color:#fff}main{height:100%;display:grid;grid-template-rows:auto 1fr;border:18px solid ${state.color}}header{padding:20px 28px;background:${state.color};display:flex;justify-content:space-between;gap:20px;align-items:center}h1{font-size:34px;margin:0}.tag{font-weight:800;border:2px solid #fff;padding:9px 14px;border-radius:999px}.plan{position:relative;background:#f6f2e9;color:#13242b;margin:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:30px;border:5px solid #13242b}.room{border:4px solid #13242b;display:grid;place-items:center;font-size:28px;font-weight:800;min-height:180px}.exit{background:#087c72;color:white}.route{position:absolute;left:18%;top:48%;width:62%;border-top:16px dashed #b3261e;transform:rotate(-8deg)}.legend{position:absolute;right:34px;bottom:30px;background:#fff;border:3px solid #13242b;padding:16px;font-size:20px}.notice{position:absolute;left:34px;bottom:30px;font-weight:800;color:${state.color};font-size:23px}</style></head><body><main><header><h1>${state.title}</h1><span class="tag">DISPLAY-07 · SYNTHÉTIQUE</span></header><section class="plan" aria-label="Plan d’évacuation synthétique approuvé"><div class="room">HALL</div><div class="room exit">SORTIE A</div><div class="room">BUREAUX</div><div class="room exit">SORTIE B</div><div class="route"></div><div class="notice">Plan v3 · empreinte vérifiée · aucune publicité</div><div class="legend">Vous êtes ici ●<br>Itinéraire →</div></section></main></body></html>`;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const profile of profiles) {
      for (const state of states) {
        const page = await browser.newPage();
        await page.setViewport({
          width: profile.width,
          height: profile.height,
          deviceScaleFactor: 1,
        });
        await page.setContent(html(state), { waitUntil: 'domcontentloaded' });
        const dimensions = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          title: document.querySelector('h1')?.textContent,
        }));
        if (
          dimensions.width !== profile.width ||
          dimensions.height !== profile.height ||
          !dimensions.title
        )
          throw new Error(
            `VISUAL_DIMENSION_INVALID:${profile.name}:${state.name}`,
          );
        await page.screenshot({
          path: resolve(outputRoot, `${profile.name}-${state.name}.png`),
          fullPage: false,
        });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(
    `DISPLAY-07 Chromium captures: ${profiles.length * states.length}\n`,
  );
}

void main();
