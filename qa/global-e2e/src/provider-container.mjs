#!/usr/bin/env node
import { createServer } from "node:http";

const port = Number(process.env.QA_PROVIDER_PORT || 34641);
const state = { requests: 0, accepted: 0, failed: 0, failNext: 0 };
const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/__qa/state") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(state));
    return;
  }
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    response.writeHead(400, { "content-type": "application/json" });
    response.end('{"error":"INVALID_JSON"}');
    return;
  }
  if (request.method === "POST" && request.url === "/__qa/fail-next") {
    state.failNext += 1;
    response.writeHead(204);
    response.end();
    return;
  }
  state.requests += 1;
  if (request.headers["x-qa-failure"] === "true" || state.failNext > 0) {
    if (state.failNext > 0) state.failNext -= 1;
    state.failed += 1;
    response.writeHead(503, { "content-type": "application/json" });
    response.end('{"error":"QA_INJECTED_FAILURE"}');
    return;
  }
  state.accepted += 1;
  response.writeHead(202, { "content-type": "application/json" });
  response.end('{"accepted":true}');
});

server.listen(port, "0.0.0.0", () =>
  console.log(`QA provider fake listening on ${port}`),
);
