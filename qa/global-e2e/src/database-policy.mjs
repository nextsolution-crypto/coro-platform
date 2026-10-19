export function assertDisposableDatabase(value = process.env.DATABASE_URL) {
  if (!value) throw new Error("DATABASE_URL is required.");
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "[::1]", "postgres"].includes(url.hostname)) {
    throw new Error("Disposable PostgreSQL must be local.");
  }
  if (url.port === "5432" && url.hostname !== "postgres") {
    throw new Error("Default host PostgreSQL port is forbidden.");
  }
  if (!/^\/coro_qa_/i.test(url.pathname)) {
    throw new Error("Disposable database name must start with coro_qa_.");
  }
  return url;
}
