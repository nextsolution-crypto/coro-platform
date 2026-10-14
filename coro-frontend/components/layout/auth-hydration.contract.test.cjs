/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const provider = fs.readFileSync(
  path.join(__dirname, "AuthProvider.tsx"),
  "utf8",
);
const store = fs.readFileSync(path.join(root, "stores/auth.store.ts"), "utf8");

assert.match(provider, /isInitialized/);
assert.match(provider, /aria-busy="true"/);
assert.match(provider, /if \(!isInitialized\)/);
assert.match(store, /isInitialized: false/);
assert.match(store, /api\.get<User>\(["']\/users\/me["']/);
assert.match(
  store,
  /if \(initializationPromise\) return initializationPromise/,
);
assert.match(store, /if \(epoch !== authEpoch\) return/);
assert.match(store, /isAuthenticated: true, isInitialized: true/);
assert.match(store, /isAuthenticated: false,[\s\S]*isInitialized: true/);

console.log("auth hydration contract: PASS");
