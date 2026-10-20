import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const vault = readFileSync(
  new URL("./offline-vault.ts", import.meta.url),
  "utf8",
);
const worker = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8",
);
const auth = readFileSync(new URL("../store/auth.ts", import.meta.url), "utf8");
const layout = readFileSync(
  new URL("../components/PortalLayout.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const projectFilePage = readFileSync(
  new URL("../files/[id]/page.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("./offline-documents.module.css", import.meta.url),
  "utf8",
);

for (const expected of [
  "AES-GCM",
  "AES-KW",
  "Ed25519",
  "WEBAUTHN_PRF_UNAVAILABLE",
  "OFFLINE_CLOCK_ROLLBACK_DETECTED",
  "OFFLINE_LEASE_EXPIRED",
  "OFFLINE_LEASE_SIGNATURE_INVALID",
  "OFFLINE_DOCUMENT_HASH_INVALID",
  "OFFLINE_STORAGE_QUOTA_EXCEEDED",
  "indexedDB.deleteDatabase",
  "status === 401 || status === 403 || status === 404 || status === 409",
])
  assert.ok(
    vault.includes(expected),
    `missing fail-closed control: ${expected}`,
  );

assert.ok(!vault.includes("localStorage.setItem"));
assert.match(
  vault,
  /db\.transaction\(\["documents", "audit"\], "readwrite"\)/,
  "document and audit must be committed atomically",
);
assert.match(
  vault,
  /tx\.onabort[\s\S]*OFFLINE_STORAGE_WRITE_FAILED/,
  "aborted IndexedDB transactions must fail closed",
);
assert.ok(worker.includes('event.request.mode === "navigate"'));
assert.ok(worker.includes('url.pathname !== "/offline"'));
assert.ok(auth.includes("coro_client_trusted_"));
assert.ok(auth.includes("purgeOfflineData"));
assert.ok(layout.includes('pathname === "/offline-documents" && cachedUser'));
assert.ok(layout.includes('item.path === "/offline-documents"'));
assert.ok(!layout.includes('pathname.startsWith("/offline") && cachedUser'));
assert.match(
  layout,
  /revokeOfflineDeviceAndPurge\(\);\s*} finally \{\s*clearAuth\(\)/s,
);
assert.ok(page.includes("isOfflineVaultReady"));
assert.ok(projectFilePage.includes("OFFLINE_STORAGE_QUOTA_EXCEEDED"));
assert.ok(projectFilePage.includes("Aucun document partiel"));
assert.ok(page.includes("Appareil activé"));
assert.ok(page.includes("styles.controlPanel"));
assert.ok(styles.includes("var(--cg-glass-bg"));
assert.ok(styles.includes("padding: 11px var(--cg-space-4, 16px)"));
assert.ok(styles.includes("@media (max-width: 820px)"));
assert.ok(styles.includes("@media (max-width: 520px)"));
assert.ok(styles.includes("width: 100%"));

console.log("offline document security contract: PASS");
