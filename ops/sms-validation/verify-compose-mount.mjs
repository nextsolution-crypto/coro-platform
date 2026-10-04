import { readFileSync } from "node:fs";

const expectedTarget = "/var/lib/coro/sms-validation";
const expectedSource =
  process.env.POPULATION_SMS_VALIDATION_EVIDENCE_HOST_DIR || expectedTarget;

function fail(message) {
  process.stderr.write(`SMS validation evidence mount invalid: ${message}\n`);
  process.exit(1);
}

let config;
try {
  config = JSON.parse(readFileSync(0, "utf8"));
} catch {
  fail("docker compose config did not produce valid JSON");
}

const backend = config?.services?.backend;
if (!backend) fail("backend service is missing");

const mounts = Array.isArray(backend.volumes) ? backend.volumes : [];
const mount = mounts.find((candidate) => candidate?.target === expectedTarget);

if (!mount) fail(`backend target ${expectedTarget} is missing`);
if (mount.type !== "bind") fail("evidence storage must be a bind mount");
if (mount.source !== expectedSource) {
  fail(`unexpected host source for ${expectedTarget}`);
}
if (mount.read_only === true) fail("evidence storage must be writable");

process.stdout.write("SMS_VALIDATION_EVIDENCE_MOUNT=VALID\n");
