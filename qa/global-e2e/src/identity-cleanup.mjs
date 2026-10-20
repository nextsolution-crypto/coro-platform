#!/usr/bin/env node
import { readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { assertUnderQaRoot } from "./policy.mjs";

const captureDirectory = assertUnderQaRoot(resolve(process.env.CORO_QA_MFA_DIR || "D:\\CORO-QA\\runs\\qa-identity-lab\\mfa"));
for (const file of await readdir(captureDirectory).catch(() => [])) {
  if (file.endsWith(".json")) await rm(join(captureDirectory, file), { force: true });
}
for (const name of ["coro-identity-lab-proxy", "coro-identity-lab-backend"]) {
  spawnSync("docker", ["rm", "-f", name], { windowsHide: true, stdio: "ignore" });
}
console.log("QA Identity Lab transient resources cleaned; persistent QA evidence and secrets preserved.");
