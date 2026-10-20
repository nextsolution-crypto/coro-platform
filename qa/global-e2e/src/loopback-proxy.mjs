import { createServer } from "node:http";

const TARGET = "http://coro-p22-backend:3002";
const FORWARDED_HEADERS = Object.freeze([
  "accept",
  "authorization",
  "content-type",
  "origin",
  "referer",
  "user-agent",
]);

createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const headers = Object.fromEntries(
      FORWARDED_HEADERS.flatMap((name) =>
        incoming.headers[name] ? [[name, incoming.headers[name]]] : [],
      ),
    );
    const response = await fetch(`${TARGET}${incoming.url}`, {
      method: incoming.method,
      headers,
      body: ["GET", "HEAD"].includes(incoming.method)
        ? undefined
        : Buffer.concat(chunks),
    });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(502).end();
  }
}).listen(3002, "0.0.0.0");
