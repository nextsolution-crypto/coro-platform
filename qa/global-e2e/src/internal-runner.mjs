#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createConnection, createServer } from "node:net";
import { basename, join } from "node:path";

const allowed = new Set([
  "govern-authority.mjs",
  "api-smoke.mjs",
  "business-smoke.mjs",
]);
const requested = basename(process.argv[2] || "");
if (!allowed.has(requested)) throw new Error("Unsupported internal QA script.");

const proxy = createServer((incoming) => {
  const backend = createConnection({ host: "127.0.0.1", port: 3002 });
  incoming.pipe(backend).pipe(incoming);
  backend.on("error", () => incoming.destroy());
});

await new Promise((resolve, reject) => {
  proxy.once("error", reject);
  proxy.listen(3155, "127.0.0.1", resolve);
});

const child = spawn(process.execPath, [join("/qa", requested)], {
  env: { ...process.env, CORO_QA_BACKEND_URL: "http://127.0.0.1:3155/api" },
  stdio: "inherit",
});
const code = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", resolve);
});
await new Promise((resolve) => proxy.close(resolve));
process.exitCode = typeof code === "number" ? code : 1;
