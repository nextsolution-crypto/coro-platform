import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relative) =>
  readFileSync(new URL(relative, import.meta.url), "utf8");
const api = read("./lib/publicPopulationApi.ts");
const session = read("./lib/populationSession.ts");
const component = read("./components/PopulationContactProfile.tsx");
const access = read("./components/PopulationAccess.tsx");

for (const action of ["initiate", "verify", "resend", "cancel"]) {
  assert.match(
    api,
    new RegExp(
      `contactChangePath\\(publicSlug, subscriberId, type, "${action}"\\)`,
    ),
  );
}
assert.match(api, /body\.code\.startsWith\("CONTACT_CHANGE_"\)/);
assert.match(access, /<PopulationContactProfile/);
assert.match(component, /profile\.communications\.phone/);
assert.match(component, /profile\.communications\.email/);
assert.match(component, /program\.consentVersion/);
assert.match(component, /program\.consentTextEN \|\| program\.consentTextFR/);
assert.match(component, /type="checkbox"/);
assert.match(component, /checked=\{consent\}/);
assert.match(component, /inputMode="numeric"/);
assert.match(component, /autoComplete="one-time-code"/);
assert.match(component, /onRefresh/);
assert.match(component, /CONTACT_CHANGE_SUPERSEDED/);
assert.match(component, /CONTACT_CHANGE_ATTEMPTS_EXHAUSTED/);
assert.match(component, /CONTACT_CHANGE_DESTINATION_SUPPRESSED/);
assert.match(session, /coro\.population\.contactChange\.v1/);
assert.match(session, /window\.sessionStorage/);
const contactSession = session.slice(
  session.indexOf("export type PopulationContactChangeSession"),
  session.indexOf("type PopulationWorkflowSessionBase"),
);
assert.doesNotMatch(
  session.slice(session.indexOf("CONTACT_CHANGE_PREFIX")),
  /localStorage/,
);
assert.doesNotMatch(contactSession, /\botp\b|\bcode\b|\bproposedDestination:/i);
assert.doesNotMatch(
  component,
  /localStorage|console\.|location\.href|URLSearchParams/,
);

for (const code of [
  "CONTACT_CHANGE_UNAVAILABLE",
  "CONTACT_CHANGE_INVALID_DESTINATION",
  "CONTACT_CHANGE_NO_CHANGE",
  "CONTACT_CHANGE_CONFLICT",
  "CONTACT_CHANGE_NOT_AUTHORIZED",
  "CONTACT_CHANGE_INVALID_CHALLENGE",
  "CONTACT_CHANGE_EXPIRED",
  "CONTACT_CHANGE_INVALID_OTP",
  "CONTACT_CHANGE_ATTEMPTS_EXHAUSTED",
  "CONTACT_CHANGE_CANCELLED",
  "CONTACT_CHANGE_SUPERSEDED",
  "CONTACT_CHANGE_DELIVERY_FAILED",
  "CONTACT_CHANGE_RESEND_UNAVAILABLE",
  "CONTACT_CHANGE_CONSENT_REQUIRED",
  "CONTACT_CHANGE_CONSENT_STALE",
  "CONTACT_CHANGE_CHANNEL_DISABLED",
  "CONTACT_CHANGE_DESTINATION_SUPPRESSED",
]) {
  assert.match(api, new RegExp(code));
}

console.log("Population Citizen Profile 01C contract: PASS");
