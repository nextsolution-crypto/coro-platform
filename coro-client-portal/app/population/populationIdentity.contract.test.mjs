import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync(
  new URL("./lib/publicPopulationApi.ts", import.meta.url),
  "utf8",
);
const registration = readFileSync(
  new URL("./components/PopulationRegistration.tsx", import.meta.url),
  "utf8",
);
const verification = readFileSync(
  new URL("./components/PopulationVerification.tsx", import.meta.url),
  "utf8",
);

const resultContract = api.slice(
  api.indexOf("export type RegisterPopulationSubscriberResult"),
  api.indexOf("export type VerifyPopulationSubscriberResult"),
);
assert.match(resultContract, /accessRequestToken: string/);
assert.match(resultContract, /accepted: true/);
assert.doesNotMatch(resultContract, /subscriberId|subscriber:/);
assert.match(registration, /savePopulationWorkflowSession/);
assert.match(verification, /verifyPopulationAccess/);
assert.doesNotMatch(verification, /verifyPopulationSubscriber\(/);

console.log("Population identity opaque registration contract: PASS");
