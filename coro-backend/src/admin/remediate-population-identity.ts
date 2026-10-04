import { UserRole } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PopulationIdentityRemediationError,
  PopulationIdentityRemediationService,
} from '../population/population-identity-remediation.service';
import type { PopulationIdentityType } from '../population/population-identity-lock';

type Arguments = {
  programId: string;
  identityType: PopulationIdentityType;
  authoritySubscriberId: string;
  abandonSubscriberId: string;
  actorUserId?: string;
  dryRun: boolean;
  confirmRemediation: boolean;
};

function parseArguments(argv: string[]): Arguments {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const valueOptions = new Set([
    '--program-id',
    '--identity-type',
    '--authority-subscriber-id',
    '--abandon-subscriber-id',
    '--actor-user-id',
  ]);
  const booleanOptions = new Set(['--dry-run', '--confirm-remediation']);
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (booleanOptions.has(option)) {
      flags.add(option);
      continue;
    }
    if (!valueOptions.has(option)) {
      throw new PopulationIdentityRemediationError('INVALID_ARGUMENT');
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new PopulationIdentityRemediationError('INVALID_ARGUMENT');
    }
    values.set(option, value);
    index += 1;
  }
  const identityType = values.get('--identity-type');
  if (identityType !== 'EMAIL' && identityType !== 'PHONE') {
    throw new PopulationIdentityRemediationError('IDENTITY_TYPE_MISMATCH');
  }
  const programId = values.get('--program-id');
  const authoritySubscriberId = values.get('--authority-subscriber-id');
  const abandonSubscriberId = values.get('--abandon-subscriber-id');
  if (!programId || !authoritySubscriberId || !abandonSubscriberId) {
    throw new PopulationIdentityRemediationError('INVALID_ARGUMENT');
  }
  const dryRun = flags.has('--dry-run');
  const confirmRemediation = flags.has('--confirm-remediation');
  if (dryRun === confirmRemediation) {
    throw new PopulationIdentityRemediationError('CONFIRMATION_REQUIRED');
  }
  const actorUserId = values.get('--actor-user-id');
  if (confirmRemediation && !actorUserId) {
    throw new PopulationIdentityRemediationError('CONFIRMATION_REQUIRED');
  }
  return {
    programId,
    identityType,
    authoritySubscriberId,
    abandonSubscriberId,
    actorUserId,
    dryRun,
    confirmRemediation,
  };
}

async function main() {
  const input = parseArguments(process.argv.slice(2));
  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    if (input.confirmRemediation) {
      const actor = await prisma.user.findUnique({
        where: { id: input.actorUserId! },
        select: { role: true },
      });
      if (!actor || actor.role !== UserRole.SUPER_ADMIN) {
        throw new PopulationIdentityRemediationError('ACTOR_NOT_AUTHORIZED');
      }
    }
    const result = await new PopulationIdentityRemediationService(
      prisma,
      new AdminAuditService(),
    ).remediate(input);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const code =
    error instanceof PopulationIdentityRemediationError
      ? error.code
      : 'REMEDIATION_FAILED';
  process.stderr.write(`${JSON.stringify({ status: 'FAILED', code })}\n`);
  process.exitCode = 1;
});
