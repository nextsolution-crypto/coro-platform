import { createServer } from "node:http";
import { createHash } from "node:crypto";

export function startPrivateStorage({
  port = 34642,
  host = "127.0.0.1",
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
    const tenantScoped = key.startsWith("tenant-");
    const governedExerciseReport =
      /^exercise-reports\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\//i.test(
        key,
      );
    if ((!tenantScoped && !governedExerciseReport) || key.includes("..")) {
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
    if (request.method === "DELETE") {
      if (!objects.has(objectKey)) {
        response.writeHead(404).end("NOT_FOUND");
        return;
      }
      objects.delete(objectKey);
      response.writeHead(204).end();
      return;
    }
    response.writeHead(405).end("METHOD_NOT_ALLOWED");
  });
  return new Promise((resolve, reject) =>
    server
      .listen(port, host, () => {
        const assignedPort = server.address().port;
        resolve({
          url: `http://${host}:${assignedPort}`,
          objects,
          close: () => new Promise((done) => server.close(done)),
        });
      },
      )
      .once("error", reject),
  );
}
