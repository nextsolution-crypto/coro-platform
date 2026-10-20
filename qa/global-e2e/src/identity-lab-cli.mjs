#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { initializeSecretStore, loadSecretStore, rotateSecretStore, secureSecretStore, DEFAULT_SECRET_FILE } from "./secret-store.mjs";
import { publicCatalogue } from "./identity-catalogue.mjs";
import { startMfaCaptureAdapter } from "./mfa-capture-adapter.mjs";
import { runIdentityPreflight } from "./identity-preflight.mjs";
import { assertUnderQaRoot } from "./policy.mjs";

const command = process.argv[2];
if (command === "init") {
  const file = await initializeSecretStore();
  console.log(`QA identity secret store initialized: ${file}`);
} else if (command === "catalogue") {
  const root = assertUnderQaRoot("D:\\CORO-QA\\tracking\\qa-identity-lab");
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "actor-catalogue.json"), JSON.stringify(publicCatalogue(), null, 2));
  console.log(`Synthetic actor catalogue written: ${root}`);
} else if (command === "secure") {
  const file = await secureSecretStore();
  console.log(`QA identity secret store ACLs restricted: ${file}`);
} else if (command === "rotate") {
  const file = await rotateSecretStore();
  console.log(`QA identity secrets rotated: ${file}`);
} else if (command === "preflight") {
  const secrets = await loadSecretStore();
  const adapter = await startMfaCaptureAdapter({
    captureDirectory: process.env.CORO_QA_MFA_DIR,
    channelToken: secrets.mfaChannelToken,
  });
  try {
    const report = await runIdentityPreflight({
      apiUrl: process.env.CORO_QA_BACKEND_URL,
      portalUrl: process.env.CORO_QA_PORTAL_URL,
      mfaAdapterUrl: adapter.url,
      mfaChannelToken: secrets.mfaChannelToken,
      networkIsolated: process.env.CORO_QA_NETWORK_ISOLATED === "true",
      providerEgressBlocked: process.env.CORO_QA_PROVIDER_EGRESS_BLOCKED === "true",
      databaseUrl: process.env.DATABASE_URL,
      syntheticPassword: secrets.syntheticPassword,
    });
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exitCode = 1;
  } finally { await adapter.close(); }
} else {
  throw new Error(`Usage: identity-lab-cli.mjs init|secure|rotate|catalogue|preflight (secret store: ${DEFAULT_SECRET_FILE})`);
}
