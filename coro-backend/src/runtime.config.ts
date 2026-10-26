export const CLIENT_EMAIL_QA_RUNTIME = 'CLIENT_EMAIL_E2E';
export const CLIENT_EMAIL_QA_PORTAL = 'http://127.0.0.1:3103';

export type RuntimeConfig = {
  host: string;
  port: number;
  corsOrigins: string[];
  qa: boolean;
};

function parsePort(value: string | undefined) {
  const port = value === undefined ? 3002 : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer between 1 and 65535.');
  return port;
}

function parseOrigins(value: string | undefined, variableName: string) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      let url: URL;
      try {
        url = new URL(origin);
      } catch {
        throw new Error(`${variableName} contains an invalid origin.`);
      }
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        url.origin === 'null'
      )
        throw new Error(`${variableName} contains an invalid origin.`);
      return url.origin;
    });
}

function requireQaDatabase(value: string | undefined) {
  if (!value) throw new Error('QA runtime requires DATABASE_URL.');
  const url = new URL(value);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', '::1'].includes(url.hostname) ||
    url.port !== '55471' ||
    decodeURIComponent(url.pathname.slice(1)) !== 'coro_email_qa' ||
    decodeURIComponent(url.username) !== 'coro_email_qa'
  )
    throw new Error('QA runtime requires the isolated PostgreSQL QA database.');
}

export function runtimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  if (
    env.CORO_QA_RUNTIME !== undefined &&
    env.CORO_QA_RUNTIME !== CLIENT_EMAIL_QA_RUNTIME
  )
    throw new Error('Unknown CORO_QA_RUNTIME profile.');
  const qa = env.CORO_QA_RUNTIME === CLIENT_EMAIL_QA_RUNTIME;
  const host = env.HOST?.trim() || (qa ? '127.0.0.1' : '0.0.0.0');
  const port = parsePort(env.PORT);
  const configuredOrigins = parseOrigins(
    env.CORS_ALLOWED_ORIGINS,
    'CORS_ALLOWED_ORIGINS',
  );
  const frontendOrigins = parseOrigins(env.FRONTEND_URL, 'FRONTEND_URL');

  if (qa) {
    if (host !== '127.0.0.1' || port !== 3102)
      throw new Error('Client email QA backend must bind to 127.0.0.1:3102.');
    requireQaDatabase(env.DATABASE_URL);
    if (env.CLIENT_PORTAL_PUBLIC_URL !== CLIENT_EMAIL_QA_PORTAL)
      throw new Error('QA email links must target http://127.0.0.1:3103.');
    if (
      configuredOrigins.length !== 1 ||
      configuredOrigins[0] !== CLIENT_EMAIL_QA_PORTAL
    )
      throw new Error('QA CORS must allow only http://127.0.0.1:3103.');
    if (frontendOrigins.length)
      throw new Error('QA CORS must not inherit FRONTEND_URL.');
    if (
      !env.CORO_QA_JWT_SECRET ||
      env.CORO_QA_JWT_SECRET.length < 32 ||
      env.JWT_SECRET !== env.CORO_QA_JWT_SECRET
    )
      throw new Error(
        'QA runtime requires a dedicated confirmed QA JWT secret.',
      );
    if (!env.PLATFORM_MFA_SECRET || env.PLATFORM_MFA_SECRET.length < 32)
      throw new Error('QA runtime requires a dedicated MFA secret.');
  }

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
    'https://app.getcoro.io',
    'https://client.getcoro.io',
    'https://getcoro.io',
    'https://www.getcoro.io',
  ];
  return {
    host,
    port,
    qa,
    corsOrigins: qa
      ? configuredOrigins
      : [
          ...new Set([
            ...defaultOrigins,
            ...frontendOrigins,
            ...configuredOrigins,
          ]),
        ],
  };
}
