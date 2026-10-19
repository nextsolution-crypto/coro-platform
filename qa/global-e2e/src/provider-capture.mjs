import { createServer } from "node:http";
import { mkdir, appendFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { assertUnderQaRoot, redact } from "./policy.mjs";

export async function startProviderCapture({ port = 34641, output }) {
  const target = assertUnderQaRoot(output);
  await mkdir(dirname(target), { recursive: true });
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    let payload = {};
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    } catch {
      response.writeHead(400).end('{"error":"INVALID_JSON"}');
      return;
    }
    const correlationId = request.headers["x-correlation-id"] || randomUUID();
    const event = redact({
      at: new Date().toISOString(),
      correlationId,
      method: request.method,
      path: request.url,
      payload,
    });
    await appendFile(target, `${JSON.stringify(event)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    if (request.headers["x-qa-failure"] === "true") {
      response.writeHead(503, {
        "content-type": "application/json",
        "x-correlation-id": correlationId,
      });
      response.end('{"error":"QA_INJECTED_FAILURE"}');
      return;
    }
    response.writeHead(202, {
      "content-type": "application/json",
      "x-correlation-id": correlationId,
    });
    response.end(JSON.stringify({ accepted: true, correlationId }));
  });
  await new Promise((resolve, reject) =>
    server.listen(port, "127.0.0.1", resolve).once("error", reject),
  );
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
