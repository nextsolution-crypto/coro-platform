import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("./administration/page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("./administration/network-administration.module.css", import.meta.url), "utf8");
const networkPage = fs.readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("management navigation is exposed only from canonical canManage evidence", () => {
  assert.match(networkPage, /data\?\.canManage/);
  assert.match(networkPage, /\/network\/administration/);
});

test("delegation, succession and revocation use governed Network endpoints", () => {
  assert.match(page, /client-portal\/network\/assignments/);
  assert.match(page, /\/succeed/);
  assert.match(page, /\/revoke/);
  assert.match(page, /subjectType:\s*"CLIENT_USER"/);
  assert.doesNotMatch(page, /SUPER_ADMIN|Platform Authority/);
});

test("responsive management controls preserve touch and focus geometry", () => {
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*560px\)/);
  assert.match(css, /grid-template-columns:\s*1fr/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});
