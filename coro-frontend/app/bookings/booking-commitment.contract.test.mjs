import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MISSING_COMMITMENT_MESSAGE,
  STALE_COMMITMENT_MESSAGE,
  buildAdvisorResponsePayload,
  getCommitmentEvidence,
  isStaleCommitmentError,
} from "./booking-commitment-contract.mjs";

const commitment = {
  id: "commitment-a",
  versionNumber: 1,
  status: "PROPOSED",
  changeType: "INITIAL_REQUEST",
  projectId: "project-a",
  activityId: "activity-a",
  buildingId: "building-a",
  advisorId: "advisor-a",
  startAt: "2026-11-10T14:00:00.000Z",
  endAt: "2026-11-10T15:00:00.000Z",
  durationMinutes: 60,
  expectedFingerprint: "a".repeat(64),
};
const booking = {
  projectId: "project-a",
  activityId: "activity-a",
  project: { buildingId: "building-a" },
};

assert.deepEqual(
  buildAdvisorResponsePayload(
    {
      userId: "advisor-a",
      governedCommitment: true,
      commitmentVersion: commitment,
    },
    "ACCEPTED",
    booking,
  ),
  {
    status: "ACCEPTED",
    commitmentVersionId: commitment.id,
    expectedFingerprint: commitment.expectedFingerprint,
  },
);
assert.deepEqual(
  buildAdvisorResponsePayload(
    { governedCommitment: false, commitmentVersion: null },
    "DECLINED",
  ),
  { status: "DECLINED" },
);
assert.throws(
  () =>
    buildAdvisorResponsePayload(
      {
        userId: "advisor-a",
        governedCommitment: true,
        commitmentVersion: null,
      },
      "ACCEPTED",
      booking,
    ),
  { message: MISSING_COMMITMENT_MESSAGE },
);
assert.equal(
  getCommitmentEvidence(
    {
      userId: "advisor-a",
      governedCommitment: true,
      commitmentVersion: commitment,
    },
    booking,
  ).kind,
  "governed",
);
assert.equal(isStaleCommitmentError("Engagement périmé ou remplacé"), true);
assert.equal(
  isStaleCommitmentError("Cette proposition d’engagement n’est plus courante"),
  true,
);
assert.equal(
  isStaleCommitmentError("Cette affectation ne peut plus recevoir de réponse"),
  true,
);
assert.match(STALE_COMMITMENT_MESSAGE, /Actualisez/);

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
assert.match(
  page,
  /buildAdvisorResponsePayload\(\s*assignment,\s*response,\s*booking,?\s*\)/,
);
assert.match(page, /commitment\.startAt/);
assert.match(page, /commitment\.durationMinutes/);
assert.match(page, /Version d’engagement/);
assert.doesNotMatch(page, /createHash|sha256|crypto/);

console.log("Booking commitment frontend contracts: PASS");
