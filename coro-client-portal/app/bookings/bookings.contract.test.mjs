import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

assert.doesNotMatch(source, /booking\.assignedUser/);
assert.doesNotMatch(source, /assignedUser\.(?:firstName|lastName|email)/);
assert.match(source, /Conseiller à confirmer/);
assert.match(source, /Activité confirmée/);
assert.match(source, /apiGet\('\/client-portal\/bookings'\)/);
assert.match(source, /\/client-portal\/bookings\/\$\{bookingId\}\/cancel/);
assert.match(source, /DEMANDEE:\s*\{/);
assert.match(source, /booking\.status === 'CONFIRMEE'/);
assert.match(source, /break-words/);

console.log("Client Portal Booking customer-safe contracts: PASS");
