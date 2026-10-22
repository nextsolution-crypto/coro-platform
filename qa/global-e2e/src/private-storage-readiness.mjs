#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";

const endpoint = process.env.PRIVATE_STORAGE_QA_ENDPOINT;
const accessKey = process.env.PRIVATE_STORAGE_QA_ACCESS_KEY;
const bucket = process.env.PRIVATE_STORAGE_QA_BUCKET;
if (!endpoint || !accessKey || !bucket) {
  throw new Error("Private storage readiness configuration is incomplete");
}

const bytes = randomBytes(97);
const expected = createHash("sha256").update(bytes).digest("hex");
const key = `tenant-readiness/probe-${process.pid}.bin`;
const url = `${endpoint}/${bucket}/${key}`;
const headers = {
  authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/qa-readiness`,
};

const write = await fetch(url, { method: "PUT", headers, body: bytes });
if (!write.ok) throw new Error(`Private storage probe write failed: ${write.status}`);
const read = await fetch(url, { headers });
if (!read.ok) throw new Error(`Private storage probe read failed: ${read.status}`);
const restored = Buffer.from(await read.arrayBuffer());
const actual = createHash("sha256").update(restored).digest("hex");
if (!restored.equals(bytes) || actual !== expected) {
  throw new Error("Private storage probe integrity mismatch");
}
const cleanup = await fetch(url, { method: "DELETE", headers });
if (!cleanup.ok) throw new Error(`Private storage probe cleanup failed: ${cleanup.status}`);
console.log(JSON.stringify({ status: "PASS", byteEquality: true, sha256Equality: true, cleanup: true }));
