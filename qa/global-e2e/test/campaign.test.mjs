import test from "node:test";
import assert from "node:assert/strict";
import { campaignStages, selectStages } from "../src/campaign.mjs";

test("campaign uses the governed fail-closed order", () => {
  assert.deepEqual(
    campaignStages.map(({ id }) => id),
    [
      "seed",
      "authority",
      "security",
      "business",
      "application-browser",
      "portal-browser",
    ],
  );
});

test("campaign can resume at the financial/business gate without re-seeding", () => {
  assert.deepEqual(
    selectStages("business", "portal-browser").map(({ id }) => id),
    ["business", "application-browser", "portal-browser"],
  );
});

test("campaign rejects unknown or reversed ranges", () => {
  assert.throws(() => selectStages("missing"), /Unknown campaign start/);
  assert.throws(() => selectStages("business", "seed"), /reversed/);
});
