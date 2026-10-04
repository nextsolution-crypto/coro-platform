/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { PopulationSubscriberStatus, UserRole } from '@prisma/client';
import {
  PopulationIdentityRemediationError,
  PopulationIdentityRemediationService,
} from './population-identity-remediation.service';

describe('PopulationIdentityRemediationService', () => {
  const programId = 'program-1';
  const authorityId = 'authority-1';
  const duplicateId = 'duplicate-1';
  const email = 'Citizen@Example.com';
  const canonical = 'citizen@example.com';
  const now = new Date('2026-10-04T12:00:00Z');
  let rows: Record<string, any>;
  let prisma: any;
  let adminAudit: { record: jest.Mock };
  let service: PopulationIdentityRemediationService;

  const baseRow = (id: string) => ({
    id,
    programId,
    status: PopulationSubscriberStatus.ACTIVE,
    email,
    emailCanonical: null,
    phoneCanonical: null,
    identityAuthorityAt: null,
    unsubscribedAt: null,
    latitude: id === authorityId ? 45.5 : 45.6,
    longitude: id === authorityId ? -73.5 : -73.6,
    locationSource: 'GEOCODED_ADDRESS',
    locationResolvedAt: now,
    verifiedAt: now,
    createdAt: now,
    _count: {
      verifications: 1,
      consentEvents: 2,
      smsConsentEvidence: 0,
      alertDeliveries: id === authorityId ? 4 : 0,
    },
  });

  const input = (overrides: Record<string, unknown> = {}) => ({
    programId,
    identityType: 'EMAIL' as const,
    authoritySubscriberId: authorityId,
    abandonSubscriberId: duplicateId,
    dryRun: true,
    confirmRemediation: false,
    ...overrides,
  });

  beforeEach(() => {
    rows = {
      [authorityId]: baseRow(authorityId),
      [duplicateId]: baseRow(duplicateId),
    };
    const tx = {
      populationProgram: {
        findUnique: jest.fn().mockResolvedValue({ id: programId }),
      },
      populationSubscriber: {
        findUnique: jest.fn(({ where }: any) =>
          Promise.resolve(rows[where.id] ? { ...rows[where.id] } : null),
        ),
        findMany: jest.fn(() =>
          Promise.resolve(
            Object.values(rows)
              .filter(
                (row: any) =>
                  row.programId === programId &&
                  [
                    PopulationSubscriberStatus.PENDING_VERIFICATION,
                    PopulationSubscriberStatus.ACTIVE,
                    PopulationSubscriberStatus.SUSPENDED,
                  ].includes(row.status),
              )
              .map((row: any) => ({
                id: row.id,
                email: row.email,
                emailCanonical: row.emailCanonical,
                phoneCanonical: row.phoneCanonical,
                identityAuthorityAt: row.identityAuthorityAt,
              })),
          ),
        ),
        updateMany: jest.fn(({ where, data }: any) => {
          const row = rows[where.id];
          if (
            !row ||
            row.programId !== where.programId ||
            row.status !== where.status ||
            row.identityAuthorityAt !== null
          ) {
            return Promise.resolve({ count: 0 });
          }
          Object.assign(row, data);
          return Promise.resolve({ count: 1 });
        }),
        update: jest.fn(({ where, data }: any) => {
          Object.assign(rows[where.id], data);
          return Promise.resolve({ ...rows[where.id] });
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ role: UserRole.SUPER_ADMIN }),
      },
      $executeRaw: jest.fn(),
    };
    prisma = {
      ...tx,
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    adminAudit = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    service = new PopulationIdentityRemediationService(
      prisma,
      adminAudit as any,
    );
  });

  it('validates an EMAIL remediation without mutation in dry-run', async () => {
    const before = JSON.stringify(rows);
    const result = await service.remediate(input());
    expect(result).toEqual(
      expect.objectContaining({
        status: 'DRY_RUN_OK',
        authoritySubscriberId: authorityId,
        duplicateSubscriberId: duplicateId,
        duplicateAfterStatus: PopulationSubscriberStatus.ABANDONED,
        historyMutation: false,
        crossDomainMutation: false,
      }),
    );
    expect(JSON.stringify(rows)).toBe(before);
    expect(adminAudit.record).not.toHaveBeenCalled();
  });

  it('remediates inside one transaction, preserves history, and audits without PII', async () => {
    const result = await service.remediate(
      input({
        dryRun: false,
        confirmRemediation: true,
        actorUserId: 'super-admin-1',
      }),
    );
    expect(result.status).toBe('REMEDIATED');
    expect(rows[authorityId]).toEqual(
      expect.objectContaining({
        status: PopulationSubscriberStatus.ACTIVE,
        emailCanonical: canonical,
        identityAuthorityAt: expect.any(Date),
      }),
    );
    expect(rows[duplicateId]).toEqual(
      expect.objectContaining({
        status: PopulationSubscriberStatus.ABANDONED,
        identityAuthorityAt: null,
        unsubscribedAt: null,
      }),
    );
    const auditPayload = adminAudit.record.mock.calls[0][1];
    expect(JSON.stringify(auditPayload)).not.toContain(email);
    expect(JSON.stringify(auditPayload)).not.toContain(canonical);
    expect(auditPayload.afterData.historyPreserved).toBe(true);
  });

  it('returns a stable idempotent result without refreshing authority timestamp', async () => {
    const authorityAt = new Date('2026-10-04T13:00:00Z');
    rows[authorityId].emailCanonical = canonical;
    rows[authorityId].identityAuthorityAt = authorityAt;
    rows[duplicateId].status = PopulationSubscriberStatus.ABANDONED;
    const result = await service.remediate(
      input({
        dryRun: false,
        confirmRemediation: true,
        actorUserId: 'super-admin-1',
      }),
    );
    expect(result.status).toBe('ALREADY_REMEDIATED');
    expect(rows[authorityId].identityAuthorityAt).toBe(authorityAt);
    expect(adminAudit.record).not.toHaveBeenCalled();
  });

  it('rejects a reversed survivor decision after remediation', async () => {
    rows[authorityId].emailCanonical = canonical;
    rows[authorityId].identityAuthorityAt = now;
    rows[duplicateId].status = PopulationSubscriberStatus.ABANDONED;
    await expect(
      service.remediate(
        input({
          authoritySubscriberId: duplicateId,
          abandonSubscriberId: authorityId,
        }),
      ),
    ).rejects.toMatchObject({ code: 'REMEDIATION_CONFLICT' });
  });

  it.each([
    [
      'different program',
      () => (rows[duplicateId].programId = 'program-2'),
      'PROGRAM_MISMATCH',
    ],
    [
      'different email',
      () => (rows[duplicateId].email = 'other@example.com'),
      'IDENTITY_MISMATCH',
    ],
    [
      'invalid lifecycle',
      () =>
        (rows[duplicateId].status = PopulationSubscriberStatus.UNSUBSCRIBED),
      'INVALID_LIFECYCLE',
    ],
    [
      'managed duplicate',
      () => (rows[duplicateId].identityAuthorityAt = now),
      'REMEDIATION_CONFLICT',
    ],
  ])('fails closed for %s', async (_label, mutate, code) => {
    mutate();
    await expect(service.remediate(input())).rejects.toMatchObject({ code });
  });

  it('rejects an unexpected third current candidate', async () => {
    rows.third = { ...baseRow('third'), id: 'third' };
    await expect(service.remediate(input())).rejects.toMatchObject({
      code: 'AMBIGUOUS_IDENTITY_GROUP',
    });
  });

  it('supports PHONE using phoneCanonical without raw-phone normalization', async () => {
    rows[authorityId].email = null;
    rows[duplicateId].email = null;
    rows[authorityId].phoneCanonical = '+14505551234';
    rows[duplicateId].phoneCanonical = '+14505551234';
    const result = await service.remediate(input({ identityType: 'PHONE' }));
    expect(result.status).toBe('DRY_RUN_OK');
    expect(JSON.stringify(result)).not.toContain('+14505551234');
  });

  it('requires explicit confirmation and an authorized SUPER_ADMIN actor', async () => {
    await expect(
      service.remediate(input({ dryRun: false })),
    ).rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.ADMIN });
    await expect(
      service.remediate(
        input({
          dryRun: false,
          confirmRemediation: true,
          actorUserId: 'admin-1',
        }),
      ),
    ).rejects.toMatchObject({ code: 'ACTOR_NOT_AUTHORIZED' });
  });

  it('uses only Population repositories and never queries cross-domain identities', async () => {
    await service.remediate(input());
    expect(Object.keys(prisma).sort()).toEqual(
      expect.arrayContaining(['populationProgram', 'populationSubscriber']),
    );
    expect(prisma.employee).toBeUndefined();
    expect(prisma.user.findMany).toBeUndefined();
  });

  it('uses the same program-scoped advisory lock key as registration', async () => {
    await service.remediate(input());
    expect(prisma.$executeRaw).toHaveBeenCalledWith(
      expect.any(Array),
      `${programId}:email:${canonical}`,
    );
  });

  it('exposes stable non-PII errors', () => {
    const error = new PopulationIdentityRemediationError('IDENTITY_MISMATCH');
    expect(error.message).toBe('IDENTITY_MISMATCH');
  });
});
