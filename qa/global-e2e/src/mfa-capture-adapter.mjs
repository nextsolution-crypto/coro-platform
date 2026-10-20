import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { assertUnderQaRoot } from "./policy.mjs";

function secureEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function extractCode(message) {
  return String(message.subject || message.htmlContent || "").match(/\b(\d{6})\b/)?.[1] || null;
}

export async function startMfaCaptureAdapter({ captureDirectory, channelToken, port = 34643, maxAgeMs = 600_000 }) {
  const directory = assertUnderQaRoot(resolve(captureDirectory));
  if (!channelToken || channelToken.length < 24) throw new Error("Protected MFA channel token is required.");
  const consumed = new Set();
  const server = createServer(async (request, response) => {
    response.setHeader("cache-control", "no-store");
    if (!secureEqual(request.headers.authorization || "", `Bearer ${channelToken}`)) {
      response.writeHead(401).end('{"error":"UNAUTHORIZED"}');
      return;
    }
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" }).end('{"ready":true}');
      return;
    }
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (request.method !== "GET" || url.pathname !== "/challenge") {
      response.writeHead(404).end('{"error":"NOT_FOUND"}');
      return;
    }
    const recipient = String(url.searchParams.get("recipient") || "").toLowerCase();
    const after = Number(url.searchParams.get("after") || 0);
    if (!recipient.endsWith("@global-e2e.test") || !Number.isFinite(after)) {
      response.writeHead(400).end('{"error":"INVALID_REQUEST"}');
      return;
    }
    const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
    for (const name of files) {
      const file = join(directory, name);
      if (consumed.has(file)) continue;
      const info = await stat(file);
      if (info.mtimeMs < after - 2_000 || Date.now() - info.mtimeMs > maxAgeMs) continue;
      const message = JSON.parse(await readFile(file, "utf8"));
      const code = String(message.to || "").toLowerCase() === recipient ? extractCode(message) : null;
      if (!code) continue;
      consumed.add(file);
      await rm(file, { force: true });
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ code, expiresInMs: maxAgeMs }));
      return;
    }
    response.writeHead(404).end('{"error":"CHALLENGE_NOT_READY"}');
  });
  await new Promise((resolveListen, reject) => server.listen(port, "127.0.0.1", resolveListen).once("error", reject));
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((resolveClose) => server.close(resolveClose)) };
}
