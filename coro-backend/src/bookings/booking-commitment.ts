import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { BookingCommitmentChangeType, Prisma } from '@prisma/client';

type CommitmentInput = {
  bookingId: string;
  projectId: string;
  activityId?: string | null;
  buildingId: string;
  advisorId: string;
  startAt: Date;
  durationMinutes: number;
};

export function commitmentFingerprint(input: CommitmentInput): string {
  const endAt = new Date(
    input.startAt.getTime() + input.durationMinutes * 60_000,
  );
  const canonical = JSON.stringify({
    bookingId: input.bookingId,
    activityId: input.activityId ?? null,
    projectId: input.projectId,
    buildingId: input.buildingId,
    advisorId: input.advisorId,
    startAt: input.startAt.toISOString(),
    endAt: endAt.toISOString(),
    durationMinutes: input.durationMinutes,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export async function createCommitmentVersion(
  tx: Prisma.TransactionClient,
  input: CommitmentInput & {
    changeType: BookingCommitmentChangeType;
    proposedByActorType: 'CLIENT' | 'USER';
    proposedByActorId: string;
    customerRequested?: boolean;
  },
) {
  const fingerprint = commitmentFingerprint(input);
  const existing = await tx.bookingCommitmentVersion.findUnique({
    where: { canonicalFingerprint: fingerprint },
  });
  if (existing) {
    if (
      existing.bookingId !== input.bookingId ||
      existing.status !== 'PROPOSED'
    ) {
      throw new BadRequestException(
        'Cette version d’engagement ne peut pas être réutilisée',
      );
    }
    return existing;
  }
  const latest = await tx.bookingCommitmentVersion.findFirst({
    where: { bookingId: input.bookingId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });
  const endAt = new Date(
    input.startAt.getTime() + input.durationMinutes * 60_000,
  );
  return tx.bookingCommitmentVersion.create({
    data: {
      bookingId: input.bookingId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      changeType: input.changeType,
      projectId: input.projectId,
      activityId: input.activityId ?? null,
      buildingId: input.buildingId,
      advisorId: input.advisorId,
      startAt: input.startAt,
      endAt,
      durationMinutes: input.durationMinutes,
      canonicalFingerprint: fingerprint,
      proposedByActorType: input.proposedByActorType,
      proposedByActorId: input.proposedByActorId,
      customerRequested: input.customerRequested ?? false,
      customerAgreedAt: input.customerRequested ? new Date() : null,
      customerAgreedByClientUserId: input.customerRequested
        ? input.proposedByActorId
        : null,
    },
  });
}

export function assertExpectedCommitment(
  commitment: { id: string; canonicalFingerprint: string; status: string },
  expectedId?: string,
  expectedFingerprint?: string,
) {
  if (!expectedId || !expectedFingerprint) {
    throw new BadRequestException('Version et empreinte d’engagement requises');
  }
  if (
    commitment.id !== expectedId ||
    commitment.canonicalFingerprint !== expectedFingerprint ||
    commitment.status !== 'PROPOSED'
  ) {
    throw new BadRequestException('Engagement périmé ou remplacé');
  }
}
