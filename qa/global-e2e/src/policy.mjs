import { isAbsolute, relative, resolve } from "node:path";

export const QA_ROOT = resolve(process.env.CORO_QA_ROOT || "D:\\CORO-QA");
export const RUN_ROOT = resolve(
  process.env.CORO_QA_RUN_ROOT || `${QA_ROOT}\\runs\\global-e2e`,
);

const productionMarkers = [
  "BREVO_API_KEY",
  "TWILIO_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "AWS_SECRET_ACCESS_KEY",
  "DO_SPACES_SECRET",
];

export function assertSafeEnvironment(env = process.env) {
  const containerEvidence =
    env.CORO_QA_CONTAINERIZED === "true" && QA_ROOT === resolve("/evidence");
  if (!isAbsolute(QA_ROOT) || (!/^D:\\/i.test(QA_ROOT) && !containerEvidence)) {
    throw new Error("CORO QA root must be an absolute path on D:.");
  }
  if (productionMarkers.some((name) => String(env[name] || "").trim())) {
    throw new Error("Production/external provider credentials are forbidden.");
  }
  for (const [name, value] of Object.entries(env)) {
    if (!/(URL|HOST|ENDPOINT)$/i.test(name) || !value) continue;
    if (!/^CORO_QA_|^PRIVATE_STORAGE_QA_/i.test(name)) continue;
    assertLocalUrl(value, name);
  }
  return true;
}

export function assertUnderQaRoot(path) {
  const candidate = resolve(path);
  const rel = relative(QA_ROOT, candidate);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Path escapes CORO QA root: ${candidate}`);
  }
  return candidate;
}

export function assertLocalUrl(value, label = "URL") {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${label} must use HTTP(S).`);
  }
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error(`${label} must target loopback.`);
  }
  if (url.port === "3002")
    throw new Error(`${label} uses production port 3002.`);
  return url;
}

export function redact(value) {
  const sensitive = /(password|secret|token|authorization|cookie|mfa|otp|key)/i;
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitive.test(key) ? "[REDACTED]" : redact(item),
    ]),
  );
}
