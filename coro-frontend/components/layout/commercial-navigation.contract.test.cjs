/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "AppLayout.tsx"), "utf8");

assert.match(source, /label: ["']Commercial["']/);
assert.match(source, /label: ["']Administration commerciale["']/);
assert.match(
  source,
  /label: ["']Configurateur d’offres["'][\s\S]*?path: ["']\/admin\/commercial\/configurator["']/,
);
assert.match(
  source,
  /label: ["']Configuration tarifaire["'][\s\S]*?path: ["']\/admin\/commercial\/configuration["']/,
);
assert.doesNotMatch(source, /label: 'Commercial Configurator'/);
assert.doesNotMatch(source, /label: 'Commercial Configuration'/);

console.log("commercial navigation contract: PASS");
