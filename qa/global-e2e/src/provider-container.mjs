#!/usr/bin/env node
import { createServer } from "node:http";

const port = Number(process.env.QA_PROVIDER_PORT || 34641);
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    response.writeHead(400, { "content-type": "application/json" });
    response.end('{"error":"INVALID_JSON"}');
    return;
  }
  if (request.headers["x-qa-failure"] === "true") {
    response.writeHead(503, { "content-type": "application/json" });
    response.end('{"error":"QA_INJECTED_FAILURE"}');
    return;
  }
  response.writeHead(202, { "content-type": "application/json" });
  response.end('{"accepted":true}');
});

server.listen(port, "0.0.0.0", () =>
  console.log(`QA provider fake listening on ${port}`),
);
