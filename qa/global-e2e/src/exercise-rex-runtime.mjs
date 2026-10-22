import { resolve } from "node:path";
import { assertLocalUrl, assertUnderQaRoot } from "./policy.mjs";

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function resolveExerciseRexRuntime(env = process.env) {
  const apiUrl = assertLocalUrl(required(env, "CORO_QA_BACKEND_URL"), "CORO_QA_BACKEND_URL").href.replace(/\/$/, "");
  const portalUrl = assertLocalUrl(required(env, "CORO_QA_PORTAL_URL"), "CORO_QA_PORTAL_URL").href.replace(/\/$/, "");
  const mfaDirectory = assertUnderQaRoot(required(env, "CORO_QA_MFA_DIR"));
  const actorFile = assertUnderQaRoot(required(env, "CORO_QA_ACTOR_FILE"));
  const evidenceDirectory = assertUnderQaRoot(required(env, "CORO_QA_EVIDENCE_DIR"));
  const chromeEndpoint = env.CORO_QA_CDP_ENDPOINT?.trim() || null;
  if (chromeEndpoint) assertLocalUrl(chromeEndpoint, "CORO_QA_CDP_ENDPOINT");
  return Object.freeze({
    apiUrl,
    portalUrl,
    mfaDirectory: resolve(mfaDirectory),
    actorFile: resolve(actorFile),
    evidenceDirectory: resolve(evidenceDirectory),
    chromeEndpoint,
  });
}

export function sanitizedExerciseRexRuntime(runtime) {
  return {
    apiOrigin: new URL(runtime.apiUrl).origin,
    portalOrigin: new URL(runtime.portalUrl).origin,
    mfaConfigured: true,
    actorCatalogueConfigured: true,
    evidenceConfigured: true,
    chromeMode: runtime.chromeEndpoint ? "local-cdp" : "bundled",
  };
}
