import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./[publicDisplayId]/page.tsx", import.meta.url), "utf8");
const config = fs.readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");
const proxy = fs.readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");

test("the browser player is explicitly view-only and never emergency eligible", () => {
  assert.match(source, /WEB_VIEW_ONLY/);
  assert.match(source, /urgence réelle non admissible/);
  assert.doesNotMatch(source, /WEB_EMERGENCY_ELIGIBLE/);
});

test("private plan requests require the enrolled bearer session", () => {
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.match(source, /localStorage\.setItem/);
});

test("the permanent display route is protected against framing and referrer leakage", () => {
  assert.match(config, /source: '\/d\/:path\*'/);
  assert.match(config, /X-Frame-Options', value: 'DENY'/);
  assert.match(config, /Referrer-Policy', value: 'no-referrer'/);
  assert.match(proxy, /Content-Security-Policy/);
  assert.match(proxy, /nonce-\$\{nonce\}/);
  assert.match(proxy, /frame-ancestors 'none'/);
  assert.doesNotMatch(proxy, /script-src[^\n]*unsafe-inline/);
});
