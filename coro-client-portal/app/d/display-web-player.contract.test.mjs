import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./[publicDisplayId]/page.tsx", import.meta.url), "utf8");
const config = fs.readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");
const proxy = fs.readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");
const layout = fs.readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
const themeInit = fs.readFileSync(
  new URL("../../design-system/theme/ThemeInitScript.tsx", import.meta.url),
  "utf8",
);

test("the browser player is explicitly view-only and never emergency eligible", () => {
  assert.match(source, /WEB_VIEW_ONLY/);
  assert.match(source, /urgence réelle non admissible/);
  assert.doesNotMatch(source, /WEB_EMERGENCY_ELIGIBLE/);
});

test("private plan requests require the enrolled bearer session", () => {
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.match(source, /localStorage\.setItem/);
});

test("synchronization deduplicates content and fails closed on withdrawal or revoked sessions", () => {
  assert.match(source, /publicationRef\.current === publicationKey/);
  assert.match(source, /if \(!next\.publication\)[\s\S]*setContent\(""\)/);
  assert.match(source, /cause instanceof HttpError && cause\.status === 401/);
  assert.match(source, /localStorage\.removeItem/);
  assert.match(source, /setToken\(""\)/);
  assert.doesNotMatch(source, /\[content, publicDisplayId, token\]/);
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

test("the player CSP follows the validated API origin used by the runtime", () => {
  assert.match(proxy, /process\.env\.NEXT_PUBLIC_API_URL/);
  assert.match(proxy, /candidate\.protocol === "https:" \|\| candidate\.protocol === "http:"/);
  assert.match(proxy, /`connect-src 'self' \$\{apiConnectOrigin\(\)\}`/);
});

test("the anti-flash theme script receives the per-request CSP nonce", () => {
  assert.match(layout, /await headers\(\)/);
  assert.match(layout, /<ThemeInitScript nonce=\{nonce\} \/>/);
  assert.match(themeInit, /<script nonce=\{nonce\}/);
  assert.doesNotMatch(proxy, /sha256-bB\//);
});
