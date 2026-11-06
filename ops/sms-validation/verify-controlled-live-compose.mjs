import fs from "node:fs";

const mode = process.argv[2];
if (!["--defaults", "--configured"].includes(mode)) {
  throw new Error(
    "USAGE: verify-controlled-live-compose.mjs --defaults|--configured",
  );
}

const input = fs.readFileSync(0, "utf8");
const compose = JSON.parse(input);
const environment = compose?.services?.backend?.environment;
if (!environment || typeof environment !== "object") {
  throw new Error("BACKEND_ENVIRONMENT_MISSING");
}

const defaults = {
  POPULATION_CONTROLLED_LIVE_TEST_ENABLED: "false",
  POPULATION_CONTROLLED_LIVE_TEST_STOP: "true",
  POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID: "",
  POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID: "",
  POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256: "",
  POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256: "",
  POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS: "",
  POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT: "",
  POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE: "",
  POPULATION_BREVO_EMAIL_SENDER_VERIFIED: "false",
  POPULATION_SMS_TFN_APPROVED: "false",
};

const configured = {
  POPULATION_CONTROLLED_LIVE_TEST_ENABLED: "true",
  POPULATION_CONTROLLED_LIVE_TEST_STOP: "false",
  POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID: "synthetic-org",
  POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID: "synthetic-program",
  POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256: "a".repeat(64),
  POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256: "b".repeat(64),
  POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS: "100",
  POPULATION_CONTROLLED_LIVE_TEST_SMS_CANADA_CAD_MICROS_PER_SEGMENT: "75000",
  POPULATION_CONTROLLED_LIVE_TEST_EMAIL_CAD_MICROS_PER_MESSAGE: "1000",
  POPULATION_BREVO_EMAIL_SENDER_VERIFIED: "true",
  POPULATION_SMS_TFN_APPROVED: "true",
};

const expected = mode === "--defaults" ? defaults : configured;
for (const [name, value] of Object.entries(expected)) {
  if (String(environment[name] ?? "") !== value) {
    throw new Error(`${name}_NOT_PROPAGATED`);
  }
}

process.stdout.write(
  `CONTROLLED_LIVE_COMPOSE=${mode === "--defaults" ? "DEFAULTS_SAFE" : "CONFIGURED_PROPAGATED"}\n`,
);
