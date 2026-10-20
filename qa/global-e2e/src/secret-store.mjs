import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { assertUnderQaRoot } from "./policy.mjs";

export const DEFAULT_SECRET_FILE = resolve(
  process.env.CORO_QA_SECRET_FILE || "D:\\CORO-QA\\secrets\\identity-lab.json",
);

function validateSecretFile(file) {
  const resolved = assertUnderQaRoot(file);
  if (!resolved.toLowerCase().includes("\\secrets\\"))
    throw new Error("QA identity secrets must be stored in the D:\\CORO-QA\\secrets directory.");
  return resolved;
}

function newPayload() {
  return {
    schemaVersion: 1,
    environment: "CORO_QA_ONLY",
    createdAt: new Date().toISOString(),
    syntheticPassword: `${randomBytes(24).toString("base64url")}!Qa1`,
    databasePassword: randomBytes(32).toString("base64url"),
    mfaChannelToken: randomBytes(32).toString("base64url"),
  };
}

export async function initializeSecretStore(file = DEFAULT_SECRET_FILE) {
  const target = validateSecretFile(file);
  await mkdir(dirname(target), { recursive: true });
  const payload = newPayload();
  await writeFile(target, JSON.stringify(payload, null, 2), { mode: 0o600, flag: "wx" });
  await secureSecretStore(target);
  return target;
}

export async function rotateSecretStore(file = DEFAULT_SECRET_FILE) {
  const target = validateSecretFile(file);
  await writeFile(target, JSON.stringify(newPayload(), null, 2), { mode: 0o600 });
  await secureSecretStore(target);
  return target;
}

export async function secureSecretStore(file = DEFAULT_SECRET_FILE) {
  const target = validateSecretFile(file);
  await chmod(target, 0o600).catch(() => undefined);
  if (process.platform === "win32") {
    const principal = [process.env.USERDOMAIN, process.env.USERNAME].filter(Boolean).join("\\");
    if (!principal) throw new Error("Unable to identify the Windows user for QA secret ACLs.");
    const result = spawnSync("icacls.exe", [target, "/inheritance:r", "/grant:r", `${principal}:(F)`, "*S-1-5-18:(F)"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status !== 0) throw new Error("Unable to restrict QA secret-store ACLs.");
  }
  return target;
}

export async function loadSecretStore(file = DEFAULT_SECRET_FILE) {
  const target = validateSecretFile(file);
  const info = await stat(target);
  if (!info.isFile()) throw new Error("QA secret store is not a regular file.");
  const payload = JSON.parse(await readFile(target, "utf8"));
  if (payload.environment !== "CORO_QA_ONLY") throw new Error("QA secret store environment marker is invalid.");
  for (const key of ["syntheticPassword", "databasePassword", "mfaChannelToken"])
    if (typeof payload[key] !== "string" || payload[key].length < 24)
      throw new Error(`QA secret store field is invalid: ${key}`);
  return payload;
}
