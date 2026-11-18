import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const layout = fs.readFileSync(new URL("../components/PortalLayout.tsx", import.meta.url), "utf8");

assert.match(layout, /Poste de sécurité/);
assert.match(page, /operational-capabilities\?buildingId=/);
assert.match(page, /available\.some\(\(capability\) => capability\.available\)/);
assert.match(page, /setBuildingId\(preferred\?\.building\.id \?\? ""\)/);
assert.doesNotMatch(page, /setBuildingId\(next\[0\]\?\.id/);
assert.match(page, /client-portal\/organizations\/\$\{organizationId\}/);
assert.match(page, /incident-reports\/forms\/templates/);
assert.match(page, /operational-log\/entries/);
assert.match(page, /operational-shifts/);
assert.match(page, /operations\/directives/);
assert.match(page, /operations\/follow-ups/);
assert.doesNotMatch(page, /Authorization:\s*["']Bearer [^$]/);
assert.doesNotMatch(page, /demo@getcoro\.io|916f54ec/);

console.log("security-workstation contract: PASS");
