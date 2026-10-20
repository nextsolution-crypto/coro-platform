"use client";

import { getToken, getUser } from "../store/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";
const DB_NAME = "coro-offline-documents-v1";
const DB_VERSION = 1;
const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;

type LeasePayload = {
  schemaVersion: 1;
  leaseId: string;
  deviceId: string;
  credentialIdHash: string;
  clientUserId: string;
  organizationId: string;
  buildingId: string;
  projectFileId: string;
  projectFileVersion: number;
  documentSha256: string;
  issuedAt: string;
  expiresAt: string;
};

type VaultRecord = {
  id: string;
  userId: string;
  organizationId: string;
  deviceId: string;
  credentialId: string;
  credentialIdHash: string;
  prfSalt: ArrayBuffer;
  wrappedVaultKey: ArrayBuffer;
  publicKeySpki: string;
  createdAt: string;
};

type DocumentRecord = {
  id: string;
  userId: string;
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
  metadataCiphertext: ArrayBuffer;
  metadataIv: ArrayBuffer;
  lease: { payload: LeasePayload; signature: string };
  savedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("vault"))
        db.createObjectStore("vault", { keyPath: "id" });
      if (!db.objectStoreNames.contains("documents"))
        db.createObjectStore("documents", { keyPath: "id" });
      if (!db.objectStoreNames.contains("audit"))
        db.createObjectStore("audit", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta"))
        db.createObjectStore("meta", { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

async function storeGet<T>(
  storeName: string,
  key: string,
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName).objectStore(storeName).get(key);
    request.onsuccess = () => {
      const result = request.result as T | undefined;
      db.close();
      resolve(result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function storePut(storeName: string, value: unknown) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function storeDocumentAndAudit(
  document: DocumentRecord,
  audit: {
    id: string;
    userId: string;
    iv: ArrayBuffer;
    ciphertext: ArrayBuffer;
  },
) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["documents", "audit"], "readwrite");
    tx.objectStore("documents").put(document);
    tx.objectStore("audit").put(audit);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("OFFLINE_STORAGE_WRITE_FAILED"));
    };
    tx.onerror = () => undefined;
  });
}

async function storeDelete(storeName: string, key: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function storeAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName).objectStore(storeName).getAll();
    request.onsuccess = () => {
      const result = request.result as T[];
      db.close();
      resolve(result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64ToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
}

async function sha256Hex(value: ArrayBuffer | string) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data?.message || "Operation hors ligne refusee",
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return data;
}

async function getPrfOutput(credentialId: ArrayBuffer, salt: ArrayBuffer) {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: credentialId, type: "public-key" }],
      userVerification: "required",
      extensions: {
        prf: { eval: { first: salt } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  const results = (
    assertion?.getClientExtensionResults() as unknown as {
      prf?: { results?: { first?: ArrayBuffer } };
    }
  )?.prf?.results?.first;
  if (!results) throw new Error("WEBAUTHN_PRF_UNAVAILABLE");
  return results;
}

async function wrappingKey(prfOutput: ArrayBuffer) {
  return crypto.subtle.importKey("raw", prfOutput, "AES-KW", false, [
    "wrapKey",
    "unwrapKey",
  ]);
}

async function unlockVault(vault: VaultRecord) {
  const output = await getPrfOutput(
    base64ToBytes(vault.credentialId),
    vault.prfSalt,
  );
  const wrapper = await wrappingKey(output);
  return crypto.subtle.unwrapKey(
    "raw",
    vault.wrappedVaultKey,
    wrapper,
    "AES-KW",
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function verifyLease(
  lease: { payload: LeasePayload; signature: string },
  publicKeySpki: string,
) {
  const publicKey = await crypto.subtle.importKey(
    "spki",
    base64ToBytes(publicKeySpki),
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "Ed25519",
    publicKey,
    base64ToBytes(lease.signature),
    new TextEncoder().encode(JSON.stringify(lease.payload)),
  );
}

function currentIdentity() {
  const user = getUser();
  if (!user) throw new Error("SESSION_REQUIRED");
  return user;
}

export async function enrollOfflineVault(label = "Chrome CORO") {
  const user = currentIdentity();
  if (!window.isSecureContext || !window.PublicKeyCredential)
    throw new Error("SECURE_WEBAUTHN_CONTEXT_REQUIRED");
  const config = await api("/project-files/client/offline/config");
  if (!config.available || !config.publicKeySpki)
    throw new Error("OFFLINE_SIGNING_AUTHORITY_UNAVAILABLE");
  const options = await api(
    "/project-files/client/offline/registration-options",
  );
  const prfSalt = crypto.getRandomValues(new Uint8Array(32)).buffer;
  const credential = (await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: base64ToBytes(options.challenge),
      user: {
        ...options.user,
        id: base64ToBytes(options.user.id),
      },
      excludeCredentials: (options.excludeCredentials || []).map(
        (item: { id: string; type: PublicKeyCredentialType }) => ({
          ...item,
          id: base64ToBytes(item.id),
        }),
      ),
      extensions: {
        prf: { eval: { first: prfSalt } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("WEBAUTHN_ENROLLMENT_CANCELLED");
  const extension = credential.getClientExtensionResults() as unknown as {
    prf?: { enabled?: boolean };
  };
  if (extension.prf?.enabled !== true)
    throw new Error("WEBAUTHN_PRF_UNAVAILABLE");
  const credentialId = bytesToBase64Url(credential.rawId);
  const attestation = credential.response as AuthenticatorAttestationResponse;
  const registrationResponse = {
    id: credential.id,
    rawId: credentialId,
    response: {
      clientDataJSON: bytesToBase64Url(attestation.clientDataJSON),
      attestationObject: bytesToBase64Url(attestation.attestationObject),
      transports: attestation.getTransports?.() || [],
    },
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
  };
  const output = await getPrfOutput(credential.rawId, prfSalt);
  const wrapper = await wrappingKey(output);
  const vaultKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const wrappedVaultKey = await crypto.subtle.wrapKey(
    "raw",
    vaultKey,
    wrapper,
    "AES-KW",
  );
  const device = await api("/project-files/client/offline/devices", {
    method: "POST",
    body: JSON.stringify({
      credentialId,
      label,
      prfSupported: true,
      registrationResponse,
    }),
  });
  const vault: VaultRecord = {
    id: user.id,
    userId: user.id,
    organizationId: user.organizationId,
    deviceId: device.id,
    credentialId,
    credentialIdHash: await sha256Hex(credentialId),
    prfSalt,
    wrappedVaultKey,
    publicKeySpki: config.publicKeySpki,
    createdAt: new Date().toISOString(),
  };
  await storePut("vault", vault);
  await storePut("meta", { id: `${user.id}:clock`, maxSeenAt: Date.now() });
  return { deviceId: device.id };
}

export async function prepareOfflineDocument(file: {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}) {
  const user = currentIdentity();
  const vault = await storeGet<VaultRecord>("vault", user.id);
  if (!vault || vault.organizationId !== user.organizationId)
    throw new Error("OFFLINE_DEVICE_ENROLLMENT_REQUIRED");
  const estimate = await navigator.storage?.estimate?.();
  if (
    estimate?.quota !== undefined &&
    estimate.usage !== undefined &&
    estimate.quota - estimate.usage < file.size * 1.25
  )
    throw new Error("OFFLINE_STORAGE_QUOTA_INSUFFICIENT");
  const lease = await api(
    `/project-files/client/offline/files/${file.id}/lease`,
    {
      method: "POST",
      body: JSON.stringify({ deviceId: vault.deviceId }),
    },
  );
  if (!(await verifyLease(lease, vault.publicKeySpki)))
    throw new Error("OFFLINE_LEASE_SIGNATURE_INVALID");
  if (
    lease.payload.clientUserId !== user.id ||
    lease.payload.organizationId !== user.organizationId ||
    lease.payload.deviceId !== vault.deviceId ||
    lease.payload.credentialIdHash !== vault.credentialIdHash ||
    lease.payload.projectFileId !== file.id
  )
    throw new Error("OFFLINE_LEASE_BINDING_INVALID");
  const response = await fetch(
    `${API_URL}/project-files/client/file/${file.id}/content`,
    { headers: { Authorization: `Bearer ${getToken()}` } },
  );
  if (!response.ok) throw new Error("OFFLINE_DOCUMENT_DOWNLOAD_DENIED");
  const plaintext = await response.arrayBuffer();
  if ((await sha256Hex(plaintext)) !== lease.payload.documentSha256)
    throw new Error("OFFLINE_DOCUMENT_HASH_INVALID");
  const key = await unlockVault(vault);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(JSON.stringify(lease.payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    key,
    plaintext,
  );
  const metadataIv = crypto.getRandomValues(new Uint8Array(12));
  const metadataCiphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: metadataIv, additionalData: aad },
    key,
    new TextEncoder().encode(
      JSON.stringify({ name: file.name, mimeType: file.mimeType }),
    ),
  );
  const record: DocumentRecord = {
    id: lease.payload.leaseId,
    userId: user.id,
    ciphertext,
    iv: iv.buffer,
    metadataCiphertext,
    metadataIv: metadataIv.buffer,
    lease,
    savedAt: new Date().toISOString(),
  };
  const audit = await encryptedAuditRecord(
    key,
    vault,
    record.id,
    "OFFLINE_PREPARED",
  );
  try {
    await storeDocumentAndAudit(record, audit);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.name === "UnknownError")
    )
      throw new Error("OFFLINE_STORAGE_QUOTA_EXCEEDED");
    throw error;
  }
  return record.id;
}

export async function listOfflineDocuments() {
  const user = currentIdentity();
  const records = await storeAll<DocumentRecord>("documents");
  return records
    .filter((record) => record.userId === user.id)
    .map(
      ({
        ciphertext: _ciphertext,
        iv: _iv,
        metadataCiphertext: _metadata,
        metadataIv: _metadataIv,
        ...safe
      }) => safe,
    );
}

export async function isOfflineVaultReady() {
  const user = currentIdentity();
  return Boolean(await storeGet<VaultRecord>("vault", user.id));
}

export async function openOfflineDocument(leaseId: string) {
  const user = currentIdentity();
  const vault = await storeGet<VaultRecord>("vault", user.id);
  const record = await storeGet<DocumentRecord>("documents", leaseId);
  if (!vault || !record || record.userId !== user.id)
    throw new Error("OFFLINE_DOCUMENT_NOT_FOUND");
  const clockId = `${user.id}:clock`;
  const clock = await storeGet<{ id: string; maxSeenAt: number }>(
    "meta",
    clockId,
  );
  const now = Date.now();
  if (clock && now + CLOCK_ROLLBACK_TOLERANCE_MS < clock.maxSeenAt)
    throw new Error("OFFLINE_CLOCK_ROLLBACK_DETECTED");
  await storePut("meta", {
    id: clockId,
    maxSeenAt: Math.max(now, clock?.maxSeenAt || 0),
  });
  if (new Date(record.lease.payload.expiresAt).getTime() <= now) {
    await storeDelete("documents", leaseId);
    throw new Error("OFFLINE_LEASE_EXPIRED");
  }
  if (!(await verifyLease(record.lease, vault.publicKeySpki)))
    throw new Error("OFFLINE_LEASE_SIGNATURE_INVALID");
  const key = await unlockVault(vault);
  const aad = new TextEncoder().encode(JSON.stringify(record.lease.payload));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: record.iv, additionalData: aad },
    key,
    record.ciphertext,
  );
  const metadataPlaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: record.metadataIv, additionalData: aad },
    key,
    record.metadataCiphertext,
  );
  const metadata = JSON.parse(new TextDecoder().decode(metadataPlaintext)) as {
    name: string;
    mimeType: string;
  };
  if ((await sha256Hex(plaintext)) !== record.lease.payload.documentSha256)
    throw new Error("OFFLINE_DOCUMENT_HASH_INVALID");
  await queueAudit(key, vault, leaseId, "OFFLINE_OPENED");
  return {
    blob: new Blob([plaintext], { type: metadata.mimeType }),
    name: metadata.name,
  };
}

export async function reconcileOfflineDocuments() {
  const user = currentIdentity();
  const vault = await storeGet<VaultRecord>("vault", user.id);
  if (!vault) throw new Error("OFFLINE_DEVICE_ENROLLMENT_REQUIRED");
  const key = await unlockVault(vault);
  const documents = (await storeAll<DocumentRecord>("documents")).filter(
    (record) => record.userId === user.id,
  );
  const encryptedEvents = (
    await storeAll<{
      id: string;
      userId: string;
      iv: ArrayBuffer;
      ciphertext: ArrayBuffer;
    }>("audit")
  ).filter((event) => event.userId === user.id);
  const events = [];
  for (const event of encryptedEvents) {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: event.iv },
      key,
      event.ciphertext,
    );
    events.push(JSON.parse(new TextDecoder().decode(plaintext)));
  }
  let result;
  try {
    result = await api("/project-files/client/offline/reconcile", {
      method: "POST",
      body: JSON.stringify({
        deviceId: vault.deviceId,
        leaseIds: documents.map((document) => document.id),
        events,
      }),
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 401 || status === 403 || status === 404 || status === 409) {
      await purgeOfflineData();
    }
    throw error;
  }
  for (const leaseId of result.purge || [])
    await storeDelete("documents", leaseId);
  for (const event of encryptedEvents) await storeDelete("audit", event.id);
  return result;
}

export async function revokeOfflineDeviceAndPurge() {
  const user = getUser();
  const vault = user
    ? await storeGet<VaultRecord>("vault", user.id)
    : undefined;
  try {
    if (vault && navigator.onLine && getToken()) {
      await api(`/project-files/client/offline/devices/${vault.deviceId}`, {
        method: "DELETE",
      });
    }
  } finally {
    await purgeOfflineData();
  }
}

async function queueAudit(
  key: CryptoKey,
  vault: VaultRecord,
  leaseId: string,
  eventType: string,
) {
  await storePut(
    "audit",
    await encryptedAuditRecord(key, vault, leaseId, eventType),
  );
}

async function encryptedAuditRecord(
  key: CryptoKey,
  vault: VaultRecord,
  leaseId: string,
  eventType: string,
) {
  const event = {
    requestId: crypto.randomUUID(),
    leaseId,
    eventType,
    occurredAt: new Date().toISOString(),
  };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(event)),
  );
  return {
    id: `${vault.userId}:${event.requestId}`,
    userId: vault.userId,
    iv: iv.buffer,
    ciphertext,
  };
}

export async function purgeOfflineData() {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => undefined;
  });
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("coro-"))
        .map((key) => caches.delete(key)),
    );
  }
}
