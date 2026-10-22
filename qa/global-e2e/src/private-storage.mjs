import { createServer } from "node:http";
import { createHash } from "node:crypto";

export function startPrivateStorage({
  port = 34642,
  accessKey = "qa-storage-access",
} = {}) {
  const objects = new Map();
  const server = createServer(async (request, response) => {
    const auth = String(request.headers.authorization || "");
    if (!auth.includes(`Credential=${accessKey}/`)) {
      response.writeHead(403).end("ACCESS_DENIED");
      return;
    }
    const match = /^\/([^/]+)\/(.+)$/.exec(request.url || "");
    if (!match) {
      response.writeHead(400).end("INVALID_KEY");
      return;
    }
    const [, bucket, key] = match;
    if (!key.startsWith("tenant-") || key.includes("..")) {
      response.writeHead(403).end("TENANT_PREFIX_REQUIRED");
      return;
    }
    const objectKey = `${bucket}/${key}`;
    if (request.method === "PUT") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      if (objects.has(objectKey)) {
        response.writeHead(409).end("IMMUTABLE");
        return;
      }
      objects.set(objectKey, body);
      response
        .writeHead(200, {
          etag: createHash("sha256").update(body).digest("hex"),
        })
        .end();
      return;
    }
    if (request.method === "GET") {
      if (!objects.has(objectKey)) {
        response.writeHead(404).end("NOT_FOUND");
        return;
      }
      response
        .writeHead(200, { "content-type": "application/octet-stream" })
        .end(objects.get(objectKey));
      return;
    }
    response.writeHead(405).end("METHOD_NOT_ALLOWED");
  });
  return new Promise((resolve, reject) =>
    server
      .listen(port, "127.0.0.1", () => {
        const assignedPort = server.address().port;
        resolve({
          url: `http://127.0.0.1:${assignedPort}`,
          objects,
          close: () => new Promise((done) => server.close(done)),
        });
      },
      )
      .once("error", reject),
  );
}
