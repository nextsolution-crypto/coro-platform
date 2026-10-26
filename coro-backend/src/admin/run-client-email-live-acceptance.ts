import { randomBytes, randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, isAbsolute, resolve } from 'path';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailSendResult, EmailService } from '../client-portal/email.service';
import { ClientAuthService } from '../client-portal/client-auth.service';

export const QA_RECIPIENT = 'info@getcoro.io';
export const QA_ORGANIZATION_ID = '00000000-0000-4000-8000-00000000e001';
export const QA_CLIENT_ID = '00000000-0000-4000-8000-00000000e002';
export const QA_USER_ID = '4f76642c-6b97-4ba8-8631-0ff98995bad8';
const QA_DB = 'coro_email_qa';
const QA_DB_USER = 'coro_email_qa';
const QA_DB_PORT = '55471';
const QA_POSTGRES_SERVER_PORT = 5432;
const QA_ORGANIZATION_NAME = 'CORO QA Real Email Acceptance';
const QA_CLIENT_NAME = 'Client synthétique — courriels réels';

export type Mode =
  | 'INSPECT'
  | 'PREPARE'
  | 'INVITATION'
  | 'PASSWORD_RESET'
  | 'MAGIC_LINK'
  | 'VERIFY'
  | 'REPORT';
export type Scenario = 'INVITATION' | 'PASSWORD_RESET' | 'MAGIC_LINK';
type Milestone =
  | 'APPLICATION_REQUESTED'
  | 'PROVIDER_ACCEPTED'
  | 'PROVIDER_DELIVERED'
  | 'MAILBOX_RECEIVED'
  | 'LINK_OPENED'
  | 'APPLICATION_VERIFIED'
  | 'REPLAY_REJECTED'
  | 'EXPIRED_REJECTED'
  | 'REVOKED_REJECTED';
type ScenarioState = {
  attemptedAt?: string;
  providerMessageId?: string;
  milestones: Partial<Record<Milestone, { at: string; source: string }>>;
  outcome?: 'ACCEPTED' | 'FAILED' | 'AMBIGUOUS';
};
type Evidence = {
  schemaVersion: 2;
  runId: string;
  createdAt: string;
  sourceCommit: string;
  environment: 'QA';
  recipient: typeof QA_RECIPIENT;
  scenarios: Record<Scenario, ScenarioState>;
};

export function parseMode(value: string | undefined): Mode {
  const mode = value?.toUpperCase() as Mode | undefined;
  const allowed: Mode[] = [
    'INSPECT',
    'PREPARE',
    'INVITATION',
    'PASSWORD_RESET',
    'MAGIC_LINK',
    'VERIFY',
    'REPORT',
  ];
  if (!mode || !allowed.includes(mode))
    throw new Error('Invalid or missing CLIENT_EMAIL_ACCEPTANCE_MODE.');
  return mode;
}

export function parseQaDatabaseUrl(value: string | undefined): URL {
  if (!value) throw new Error('DATABASE_URL is required.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }
  if (!['postgresql:', 'postgres:'].includes(url.protocol))
    throw new Error('Only PostgreSQL is permitted.');
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname))
    throw new Error('QA database host must be loopback.');
  if (url.port !== QA_DB_PORT)
    throw new Error(`QA database port must be ${QA_DB_PORT}.`);
  if (decodeURIComponent(url.pathname.slice(1)) !== QA_DB)
    throw new Error(`QA database name must be ${QA_DB}.`);
  if (decodeURIComponent(url.username) !== QA_DB_USER)
    throw new Error(`QA database user must be ${QA_DB_USER}.`);
  return url;
}

export function requireQaPortal(value: string | undefined): URL {
  if (!value)
    throw new Error(
      'CLIENT_PORTAL_PUBLIC_URL is required; implicit production fallback is forbidden.',
    );
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash)
    throw new Error('QA portal URL must be a clean origin.');
  if (
    ['client.getcoro.io', 'getcoro.io', 'www.getcoro.io'].includes(
      url.hostname.toLowerCase(),
    )
  )
    throw new Error('Production portal URL is forbidden.');
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (!loopback && url.protocol !== 'https:')
    throw new Error('Remote QA portal must use HTTPS.');
  if (loopback && !['http:', 'https:'].includes(url.protocol))
    throw new Error('Unsupported QA portal protocol.');
  return url;
}

export function requireRecipientConfiguration(env: NodeJS.ProcessEnv) {
  const entries = (env.CLIENT_EMAIL_RECIPIENT_ALLOWLIST || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (entries.length !== 1 || entries[0] !== QA_RECIPIENT)
    throw new Error('Recipient allowlist must contain only info@getcoro.io.');
  if (
    (env.CLIENT_EMAIL_REDIRECT_TO || '').trim() ||
    (env.CLIENT_EMAIL_CC || '').trim() ||
    (env.CLIENT_EMAIL_BCC || '').trim()
  )
    throw new Error('Redirect, CC and BCC are forbidden.');
}

export function requireScenarioAuthorization(
  mode: Mode,
  runId: string,
  env: NodeJS.ProcessEnv,
) {
  if (!['INVITATION', 'PASSWORD_RESET', 'MAGIC_LINK'].includes(mode)) return;
  const expected = `${mode}:${runId}:${QA_RECIPIENT}`;
  if (
    env.CLIENT_EMAIL_SCENARIO_AUTHORIZATION !== expected ||
    env.CLIENT_EMAIL_HUMAN_CONFIRMATION !== expected
  )
    throw new Error(
      `Scenario requires two explicit confirmations equal to ${expected}.`,
    );
}

function loadDedicatedCredential(pathValue: string | undefined) {
  if (!pathValue) throw new Error('CLIENT_EMAIL_QA_SECRET_FILE is required.');
  const entries = readFileSync(resolve(pathValue), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  if (entries.length !== 1 || !entries[0].startsWith('BREVO_API_KEY='))
    throw new Error(
      'Dedicated QA secret file must contain only BREVO_API_KEY.',
    );
  const key = entries[0].slice('BREVO_API_KEY='.length).trim();
  if (!key) throw new Error('BREVO_API_KEY is empty.');
  process.env.BREVO_API_KEY = key;
}

function evidencePath(runId: string) {
  const root = process.env.CLIENT_EMAIL_EVIDENCE_ROOT;
  if (!root || !isAbsolute(root))
    throw new Error(
      'CLIENT_EMAIL_EVIDENCE_ROOT must be an absolute, dedicated path outside Git.',
    );
  return resolve(root, runId, 'evidence.json');
}

function freshEvidence(runId: string): Evidence {
  const empty = (): ScenarioState => ({ milestones: {} });
  return {
    schemaVersion: 2,
    runId,
    createdAt: new Date().toISOString(),
    sourceCommit: process.env.CORO_SOURCE_COMMIT || 'UNRECORDED',
    environment: 'QA',
    recipient: QA_RECIPIENT,
    scenarios: {
      INVITATION: empty(),
      PASSWORD_RESET: empty(),
      MAGIC_LINK: empty(),
    },
  };
}

async function loadEvidence(runId: string, create = false) {
  const path = evidencePath(runId);
  if (!existsSync(path)) {
    if (create) return { path, value: freshEvidence(runId) };
    throw new Error(
      `Evidence does not exist for run ${runId}. Run PREPARE first.`,
    );
  }
  const value = JSON.parse(await readFile(path, 'utf8')) as Evidence;
  if (
    value.runId !== runId ||
    value.recipient !== QA_RECIPIENT ||
    value.schemaVersion !== 2
  )
    throw new Error('Evidence identity is invalid.');
  return { path, value };
}

async function saveEvidence(path: string, value: Evidence) {
  const serialized = JSON.stringify(value, null, 2);
  const forbidden = [process.env.BREVO_API_KEY, process.env.JWT_SECRET].filter(
    Boolean,
  ) as string[];
  if (
    forbidden.some((secret) => serialized.includes(secret)) ||
    /[?&](token|code)=/i.test(serialized) ||
    /authorization/i.test(serialized)
  )
    throw new Error('Sensitive value detected in evidence.');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${serialized}\n`, { encoding: 'utf8', mode: 0o600 });
}

async function assertDatabaseIdentity(prisma: PrismaService) {
  const rows = await prisma.$queryRaw<
    Array<{
      database: string;
      db_user: string;
      server_address: string | null;
      server_port: number;
    }>
  >`SELECT current_database() AS database, current_user AS db_user, inet_server_addr()::text AS server_address, inet_server_port() AS server_port`;
  const row = rows[0];
  if (
    !row ||
    row.database !== QA_DB ||
    row.db_user !== QA_DB_USER ||
    row.server_port !== QA_POSTGRES_SERVER_PORT
  )
    throw new Error(
      'Connected PostgreSQL identity does not match QA invariants.',
    );
  if (row.server_address) {
    const privateDockerAddress =
      /^10\./.test(row.server_address) ||
      /^192\.168\./.test(row.server_address) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(row.server_address) ||
      /^(fc|fd)[0-9a-f]{2}:/i.test(row.server_address);
    if (
      !['127.0.0.1', '::1'].includes(row.server_address) &&
      !privateDockerAddress
    )
      throw new Error(
        'Connected PostgreSQL server is outside local/private QA networking.',
      );
  }
}

async function assertSyntheticBoundary(
  prisma: PrismaService,
  allowMissing: boolean,
) {
  const [organization, client, byEmail, byId] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: QA_ORGANIZATION_ID },
      select: { id: true, name: true },
    }),
    prisma.client.findUnique({
      where: { id: QA_CLIENT_ID },
      select: { id: true, name: true, organizationId: true },
    }),
    prisma.clientUser.findUnique({
      where: { email: QA_RECIPIENT },
      select: { id: true, organizationId: true, clientId: true },
    }),
    prisma.clientUser.findUnique({
      where: { id: QA_USER_ID },
      select: { email: true, organizationId: true, clientId: true },
    }),
  ]);
  if (organization && organization.name !== QA_ORGANIZATION_NAME)
    throw new Error(
      'Reserved QA organization ID collides with non-synthetic data.',
    );
  if (
    client &&
    (client.name !== QA_CLIENT_NAME ||
      client.organizationId !== QA_ORGANIZATION_ID)
  )
    throw new Error('Reserved QA client ID collides with non-synthetic data.');
  if (
    byEmail &&
    (byEmail.id !== QA_USER_ID ||
      byEmail.organizationId !== QA_ORGANIZATION_ID ||
      byEmail.clientId !== QA_CLIENT_ID)
  )
    throw new Error('Authorized mailbox is attached to non-synthetic data.');
  if (
    byId &&
    (byId.email.toLowerCase() !== QA_RECIPIENT ||
      byId.organizationId !== QA_ORGANIZATION_ID ||
      byId.clientId !== QA_CLIENT_ID)
  )
    throw new Error('Reserved QA user ID collides with non-synthetic data.');
  if (!allowMissing && (!organization || !client || !byEmail || !byId))
    throw new Error('Synthetic QA fixture is incomplete. Run PREPARE.');
}

async function prepare(prisma: PrismaService) {
  await assertSyntheticBoundary(prisma, true);
  const password = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);
  await prisma.$transaction(async (tx) => {
    await tx.organization.upsert({
      where: { id: QA_ORGANIZATION_ID },
      update: { isActive: true },
      create: {
        id: QA_ORGANIZATION_ID,
        name: QA_ORGANIZATION_NAME,
        isActive: true,
      },
    });
    await tx.client.upsert({
      where: { id: QA_CLIENT_ID },
      update: { isActive: true },
      create: {
        id: QA_CLIENT_ID,
        name: QA_CLIENT_NAME,
        organizationId: QA_ORGANIZATION_ID,
        regulatoryRequirements: [],
        isActive: true,
      },
    });
    await tx.clientUser.upsert({
      where: { id: QA_USER_ID },
      update: { isActive: true },
      create: {
        id: QA_USER_ID,
        email: QA_RECIPIENT,
        password,
        firstName: 'QA',
        lastName: 'EMAIL ACCEPTANCE',
        organizationId: QA_ORGANIZATION_ID,
        clientId: QA_CLIENT_ID,
        role: 'CLIENT_CORPORATE',
        buildingIds: [],
        isActive: true,
      },
    });
  });
}

function recordAccepted(
  state: ScenarioState,
  result: { success: boolean; messageId?: string },
) {
  state.attemptedAt = new Date().toISOString();
  state.milestones.APPLICATION_REQUESTED = {
    at: state.attemptedAt,
    source: 'runner',
  };
  if (!result.success) state.outcome = 'FAILED';
  else if (!result.messageId) state.outcome = 'AMBIGUOUS';
  else {
    state.outcome = 'ACCEPTED';
    state.providerMessageId = result.messageId;
    state.milestones.PROVIDER_ACCEPTED = {
      at: new Date().toISOString(),
      source: 'Brevo API response',
    };
  }
}

async function sendScenario(
  mode: Scenario,
  prisma: PrismaService,
  evidence: Evidence,
) {
  const state = evidence.scenarios[mode];
  await assertSyntheticBoundary(prisma, false);
  class CapturingEmailService extends EmailService {
    result?: EmailSendResult;

    override async sendClientPasswordReset(
      data: Parameters<EmailService['sendClientPasswordReset']>[0],
    ): Promise<EmailSendResult> {
      const result = await super.sendClientPasswordReset(data);
      this.result = result;
      return result;
    }

    override async sendClientMagicLink(
      data: Parameters<EmailService['sendClientMagicLink']>[0],
    ): Promise<EmailSendResult> {
      const result = await super.sendClientMagicLink(data);
      this.result = result;
      return result;
    }
  }
  const email = new CapturingEmailService();
  if (mode === 'INVITATION') {
    const temporaryPassword = `Qa-${randomBytes(18).toString('base64url')}9!`;
    await prisma.clientUser.update({
      where: { id: QA_USER_ID },
      data: {
        password: await bcrypt.hash(temporaryPassword, 12),
        sessionVersion: { increment: 1 },
      },
    });
    recordAccepted(
      state,
      await email.sendClientInvitation({
        toEmail: QA_RECIPIENT,
        toName: 'QA EMAIL ACCEPTANCE',
        clientName: QA_CLIENT_NAME,
        organizationName: QA_ORGANIZATION_NAME,
        temporaryPassword,
      }),
    );
  } else {
    const auth = new ClientAuthService(prisma, {} as never, email, {} as never);
    if (mode === 'PASSWORD_RESET') await auth.forgotPassword(QA_RECIPIENT);
    else await auth.requestMagicLink(QA_RECIPIENT);
    recordAccepted(state, email.result || { success: false });
  }
}

async function verifyOnce(evidence: Evidence) {
  const scenario = process.env.CLIENT_EMAIL_VERIFY_SCENARIO as Scenario;
  if (!['INVITATION', 'PASSWORD_RESET', 'MAGIC_LINK'].includes(scenario))
    throw new Error('CLIENT_EMAIL_VERIFY_SCENARIO is required.');
  const state = evidence.scenarios[scenario];
  if (!state.providerMessageId)
    throw new Error(
      'No provider message ID is recorded; verification cannot be inferred.',
    );
  const url = new URL('https://api.brevo.com/v3/smtp/statistics/events');
  url.searchParams.set('messageId', state.providerMessageId);
  url.searchParams.set('limit', '50');
  const response = await fetch(url, {
    headers: { 'api-key': process.env.BREVO_API_KEY! },
  });
  if (!response.ok)
    throw new Error(
      `Provider verification failed with HTTP ${response.status}; no retry performed.`,
    );
  const payload = (await response.json()) as {
    events?: Array<{ event?: string; date?: string }>;
  };
  const delivered = payload.events?.find(
    (event) => event.event === 'delivered',
  );
  if (delivered)
    state.milestones.PROVIDER_DELIVERED = {
      at: delivered.date || new Date().toISOString(),
      source: 'Brevo events API',
    };
  const human = process.env.CLIENT_EMAIL_HUMAN_EVIDENCE;
  if (human) {
    const separator = human.indexOf(':');
    const milestone = human.slice(0, separator) as Milestone;
    const confirmation = human.slice(separator + 1);
    if (
      ![
        'MAILBOX_RECEIVED',
        'LINK_OPENED',
        'APPLICATION_VERIFIED',
        'REPLAY_REJECTED',
        'EXPIRED_REJECTED',
        'REVOKED_REJECTED',
      ].includes(milestone) ||
      confirmation !== `${scenario}-${evidence.runId}`
    )
      throw new Error('Human evidence confirmation is invalid.');
    state.milestones[milestone] = {
      at: new Date().toISOString(),
      source: 'explicit human confirmation',
    };
  }
}

export async function run(env: NodeJS.ProcessEnv = process.env) {
  const mode = parseMode(env.CLIENT_EMAIL_ACCEPTANCE_MODE);
  const runId =
    env.CLIENT_EMAIL_RUN_ID || (mode === 'INSPECT' ? randomUUID() : '');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,63}$/.test(runId))
    throw new Error(
      'CLIENT_EMAIL_RUN_ID must be an explicit safe identifier (8-64 characters).',
    );
  parseQaDatabaseUrl(env.DATABASE_URL);
  requireQaPortal(env.CLIENT_PORTAL_PUBLIC_URL);
  requireRecipientConfiguration(env);
  requireScenarioAuthorization(mode, runId, env);
  if (['INVITATION', 'PASSWORD_RESET', 'MAGIC_LINK', 'VERIFY'].includes(mode))
    loadDedicatedCredential(env.CLIENT_EMAIL_QA_SECRET_FILE);
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    await assertDatabaseIdentity(prisma);
    if (mode === 'INSPECT') {
      await assertSyntheticBoundary(prisma, true);
      return { status: 'SAFE_TO_PREPARE', runId };
    }
    const loaded = await loadEvidence(runId, mode === 'PREPARE');
    if (mode === 'PREPARE') {
      if (env.CLIENT_EMAIL_PREPARE_AUTHORIZATION !== `PREPARE:${runId}`)
        throw new Error(
          `PREPARE requires CLIENT_EMAIL_PREPARE_AUTHORIZATION=PREPARE:${runId}.`,
        );
      await prepare(prisma);
      await saveEvidence(loaded.path, loaded.value);
      return { status: 'PREPARED', runId };
    }
    if (['INVITATION', 'PASSWORD_RESET', 'MAGIC_LINK'].includes(mode)) {
      const scenario = mode as Scenario;
      const state = loaded.value.scenarios[scenario];
      if (state.attemptedAt)
        throw new Error(
          `${scenario} was already attempted for this run; automatic retry is forbidden.`,
        );
      // Persist the attempt before any provider call. A crash therefore leaves
      // an ambiguous, non-retryable run instead of risking a duplicate email.
      state.attemptedAt = new Date().toISOString();
      state.outcome = 'AMBIGUOUS';
      await saveEvidence(loaded.path, loaded.value);
      await sendScenario(mode as Scenario, prisma, loaded.value);
    } else if (mode === 'VERIFY') await verifyOnce(loaded.value);
    await saveEvidence(loaded.path, loaded.value);
    return {
      status: mode === 'REPORT' ? 'REPORT_GENERATED' : 'RECORDED',
      runId,
      scenarios: loaded.value.scenarios,
    };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(
        error instanceof Error ? error.message : 'Acceptance runner failed.',
      );
      process.exitCode = 1;
    });
}
