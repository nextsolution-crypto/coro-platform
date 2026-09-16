import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  ExerciseDataSource,
  ExerciseFindingType,
  ExerciseTimelineEntryType,
  Prisma,
} from '@prisma/client';
import { ExerciseReportsService } from './exercise-reports.service';

const user = { userId: 'user-a', organizationId: 'org-a' };

function activity(type = 'exercice_table') {
  return {
    id: 'activity-a',
    projectId: 'project-a',
    organizationId: 'org-a',
    type,
    label: 'Exercice',
    customLabel: null,
    scheduledDate: new Date('2026-09-16T13:00:00Z'),
    dureeHeures: 2,
    duration: '2h00',
    notes: 'Scenario activity',
    bookingId: null,
    booking: null,
    project: {
      id: 'project-a',
      clientId: 'client-a',
      buildingId: 'building-a',
      organization: { id: 'org-a', name: 'CORO' },
      client: {
        id: 'client-a',
        name: 'Client',
        contactFirstName: 'Jane',
        contactLastName: 'Doe',
      },
      building: {
        id: 'building-a',
        name: 'Tour A',
        address: '1 rue A',
        city: 'Montreal',
        province: 'QC',
        postalCode: 'H0H0H0',
      },
      user: {
        id: 'user-a',
        firstName: 'Alex',
        lastName: 'Conseil',
        companyName: null,
      },
    },
  };
}

function report(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-a',
    organizationId: 'org-a',
    status: 'DRAFT',
    fieldProvenance: {},
    scheduledAt: null,
    occurredAt: null,
    startedAt: null,
    durationMinutes: null,
    zones: [],
    level: null,
    difficulty: null,
    scenario: null,
    positiveIntro: null,
    globalRating: null,
    summaryTitle: null,
    conclusion: null,
    preparedBy: null,
    recipient: null,
    conclusionDate: null,
    participants: [],
    timelineEntries: [],
    findings: [],
    recommendations: [],
    actionItems: [],
    ...overrides,
  };
}

function harness() {
  const tx = {
    exerciseReport: {
      create: jest.fn().mockResolvedValue({ id: 'report-a' }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(report()),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue(report()),
    },
    exerciseFinding: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    exerciseRecommendation: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    exerciseActionItem: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    exerciseParticipant: { upsert: jest.fn(), deleteMany: jest.fn() },
    exerciseTimelineEntry: { upsert: jest.fn(), deleteMany: jest.fn() },
  };
  const prisma = {
    exerciseReport: { findFirst: jest.fn().mockResolvedValue(null) },
    projectActivity: { findFirst: jest.fn().mockResolvedValue(activity()) },
    booking: { findFirst: jest.fn() },
    incidentEvent: { findFirst: jest.fn() },
    evacuationEvent: { findFirst: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  return { tx, prisma, service: new ExerciseReportsService(prisma as never) };
}

describe('ExerciseReportsService createFromActivity', () => {
  it('rejects an inadmissible activity', async () => {
    const h = harness();
    h.prisma.projectActivity.findFirst.mockResolvedValue(
      activity('formation_epi'),
    );
    await expect(
      h.service.createFromActivity('activity-a', {}, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an activity from another organization', async () => {
    const h = harness();
    h.prisma.projectActivity.findFirst.mockResolvedValue(null);
    await expect(
      h.service.createFromActivity('activity-b', {}, user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the same existing report on a repeated call', async () => {
    const h = harness();
    h.prisma.exerciseReport.findFirst.mockResolvedValue(report());
    await expect(
      h.service.createFromActivity('activity-a', {}, user),
    ).resolves.toMatchObject({ id: 'report-a' });
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects simultaneous incident and evacuation sources', async () => {
    const h = harness();
    await expect(
      h.service.createFromActivity(
        'activity-a',
        {
          incidentEventId: '11111111-1111-4111-8111-111111111111',
          evacuationEventId: '22222222-2222-4222-8222-222222222222',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['booking', { bookingId: '11111111-1111-4111-8111-111111111111' }],
    ['incident', { incidentEventId: '11111111-1111-4111-8111-111111111111' }],
    [
      'evacuation',
      { evacuationEventId: '11111111-1111-4111-8111-111111111111' },
    ],
  ])('rejects an incompatible %s source', async (kind, dto) => {
    const h = harness();
    if (kind === 'booking') h.prisma.booking.findFirst.mockResolvedValue(null);
    if (kind === 'incident')
      h.prisma.incidentEvent.findFirst.mockResolvedValue(null);
    if (kind === 'evacuation')
      h.prisma.evacuationEvent.findFirst.mockResolvedValue(null);
    await expect(
      h.service.createFromActivity('activity-a', dto, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prefills CORO fields while keeping scheduled and actual dates separate', async () => {
    const h = harness();
    const triggeredAt = new Date('2026-09-18T14:30:00Z');
    h.prisma.incidentEvent.findFirst.mockResolvedValue({
      id: 'incident-a',
      triggeredAt,
      description: 'Scenario sentinelle',
      teamSnapshot: [],
      logs: [],
      rexWentWell: null,
      rexToImprove: null,
      rexRecommendations: null,
      rexCorrectiveActions: null,
    });
    await h.service.createFromActivity(
      'activity-a',
      {
        incidentEventId: '11111111-1111-4111-8111-111111111111',
      },
      user,
    );
    const data = h.tx.exerciseReport.create.mock.calls[0][0].data;
    expect(data.scheduledAt).toEqual(new Date('2026-09-16T13:00:00Z'));
    expect(data.occurredAt).toEqual(triggeredAt);
    expect(data.startedAt).toEqual(triggeredAt);
    expect(data.buildingName).toBe('Tour A');
    expect(data.fieldProvenance.scenario.origin).toBe('SENTINELLE');
  });

  it('prefills Sentinelle participants and REX content with explicit origins', async () => {
    const h = harness();
    h.prisma.incidentEvent.findFirst.mockResolvedValue({
      id: 'incident-a',
      triggeredAt: new Date(),
      description: null,
      teamSnapshot: [
        {
          id: 'emp-a',
          firstName: 'A',
          lastName: 'B',
          roles: [{ role: 'EPI' }],
        },
      ],
      logs: [
        { id: 'log-a', timestamp: new Date(), action: 'Depart', details: null },
      ],
      rexWentWell: 'Bien',
      rexToImprove: 'Lacune',
      rexRecommendations: 'Recommandation',
      rexCorrectiveActions: 'Action',
    });
    h.tx.exerciseFinding.findUnique.mockResolvedValue({ id: 'finding-a' });
    h.tx.exerciseRecommendation.create.mockResolvedValue({
      id: 'recommendation-a',
    });
    await h.service.createFromActivity(
      'activity-a',
      {
        incidentEventId: '11111111-1111-4111-8111-111111111111',
      },
      user,
    );
    const data = h.tx.exerciseReport.create.mock.calls[0][0].data;
    expect(data.participants.create[0].source).toBe(
      ExerciseDataSource.SENTINELLE,
    );
    expect(data.timelineEntries.create[0].source).toBe(
      ExerciseDataSource.SENTINELLE,
    );
    expect(data.findings.create[0].source).toBe(ExerciseDataSource.REX);
    expect(
      h.tx.exerciseRecommendation.create.mock.calls[0][0].data.source,
    ).toBe(ExerciseDataSource.REX);
    expect(h.tx.exerciseActionItem.create).toHaveBeenCalled();
  });

  it('does not leave an externally committed report when transaction initialization fails', async () => {
    const h = harness();
    h.prisma.$transaction.mockRejectedValue(new Error('rex failure'));
    await expect(
      h.service.createFromActivity('activity-a', {}, user),
    ).rejects.toThrow('rex failure');
    expect(h.prisma.exerciseReport).not.toHaveProperty('create');
  });

  it('recovers a concurrent activity unique conflict by returning the winner', async () => {
    const h = harness();
    const error = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
    });
    h.prisma.$transaction.mockRejectedValue(error);
    h.prisma.exerciseReport.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(report());
    await expect(
      h.service.createFromActivity('activity-a', {}, user),
    ).resolves.toMatchObject({ id: 'report-a' });
  });
});

describe('ExerciseReportsService updateDraft', () => {
  it('updates a scalar without touching collections', async () => {
    const h = harness();
    await h.service.updateDraft(
      'report-a',
      { conclusion: 'Nouvelle conclusion' },
      user,
    );
    expect(h.tx.exerciseReport.updateMany).toHaveBeenCalled();
    expect(h.tx.exerciseParticipant.deleteMany).not.toHaveBeenCalled();
    expect(h.tx.exerciseFinding.deleteMany).not.toHaveBeenCalled();
  });

  it.each([
    ['participants', { participants: [] }, 'exerciseParticipant'],
    ['timeline', { timelineEntries: [] }, 'exerciseTimelineEntry'],
    ['findings', { findings: [] }, 'exerciseFinding'],
    ['recommendations', { recommendations: [] }, 'exerciseRecommendation'],
    ['actions', { actionItems: [] }, 'exerciseActionItem'],
  ])(
    'an explicit empty %s collection clears only that collection',
    async (_name, dto, delegate) => {
      const h = harness();
      await h.service.updateDraft('report-a', dto, user);
      const collectionDelegate =
        h.tx[
          delegate as
            | 'exerciseParticipant'
            | 'exerciseTimelineEntry'
            | 'exerciseFinding'
            | 'exerciseRecommendation'
            | 'exerciseActionItem'
        ];
      expect(collectionDelegate.deleteMany).toHaveBeenCalled();
    },
  );

  it('refuses deleting a finding still referenced by an omitted recommendation collection', async () => {
    const h = harness();
    h.tx.exerciseReport.findFirst.mockResolvedValue(
      report({
        findings: [{ id: 'f1', key: 'gap-1' }],
        recommendations: [{ id: 'r1', key: 'rec-1', findingId: 'f1' }],
      }),
    );
    await expect(
      h.service.updateDraft('report-a', { findings: [] }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses deleting a recommendation still referenced by omitted actions', async () => {
    const h = harness();
    h.tx.exerciseReport.findFirst.mockResolvedValue(
      report({
        findings: [{ id: 'f1', key: 'gap-1' }],
        recommendations: [{ id: 'r1', key: 'rec-1', findingId: 'f1' }],
        actionItems: [
          {
            id: 'a1',
            key: 'action-1',
            findingId: 'f1',
            recommendationId: 'r1',
          },
        ],
      }),
    );
    await expect(
      h.service.updateDraft('report-a', { recommendations: [] }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('preserves source and marks a genuinely edited imported item as human modified', async () => {
    const h = harness();
    h.tx.exerciseReport.findFirst.mockResolvedValue(
      report({
        participants: [
          {
            id: 'p1',
            key: 'p-1',
            name: 'Avant',
            status: null,
            simulatedRole: null,
            teamFunction: null,
            observations: null,
            order: 0,
            source: ExerciseDataSource.SENTINELLE,
            sourceRef: 'snapshot',
            confidence: null,
            validatedById: null,
            validatedAt: null,
            isHumanModified: false,
          },
        ],
      }),
    );
    await h.service.updateDraft(
      'report-a',
      { participants: [{ key: 'p-1', name: 'Apres', order: 0 }] },
      user,
    );
    const update = h.tx.exerciseParticipant.upsert.mock.calls[0][0].update;
    expect(update).not.toHaveProperty('source');
    expect(update.isHumanModified).toBe(true);
  });

  it('preserves origin without marking an unchanged item as modified', async () => {
    const h = harness();
    h.tx.exerciseReport.findFirst.mockResolvedValue(
      report({
        participants: [
          {
            id: 'p1',
            key: 'p-1',
            name: 'Stable',
            status: null,
            simulatedRole: null,
            teamFunction: null,
            observations: null,
            order: 0,
            source: ExerciseDataSource.REX,
            sourceRef: 'rex',
            confidence: null,
            validatedById: null,
            validatedAt: null,
            isHumanModified: false,
          },
        ],
      }),
    );
    await h.service.updateDraft(
      'report-a',
      { participants: [{ key: 'p-1', name: 'Stable', order: 0 }] },
      user,
    );
    const update = h.tx.exerciseParticipant.upsert.mock.calls[0][0].update;
    expect(update).not.toHaveProperty('source');
    expect(update.isHumanModified).toBe(false);
  });

  it('rejects duplicate keys before opening a transaction', async () => {
    const h = harness();
    await expect(
      h.service.updateDraft(
        'report-a',
        {
          participants: [
            { key: 'same', name: 'A', order: 0 },
            { key: 'same', name: 'B', order: 1 },
          ],
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a report outside the caller organization', async () => {
    const h = harness();
    h.tx.exerciseReport.findFirst.mockResolvedValue(null);
    await expect(
      h.service.updateDraft('report-b', { conclusion: 'x' }, user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects non-DRAFT and concurrent finalization through the conditional write', async () => {
    const h = harness();
    h.tx.exerciseReport.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      h.service.updateDraft('report-a', { conclusion: 'x' }, user),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back when a nested write fails', async () => {
    const h = harness();
    h.tx.exerciseParticipant.upsert.mockRejectedValue(
      new Error('write failure'),
    );
    await expect(
      h.service.updateDraft(
        'report-a',
        {
          participants: [{ key: 'p-1', name: 'A', order: 0 }],
        },
        user,
      ),
    ).rejects.toThrow('write failure');
    expect(h.prisma.$transaction).toHaveBeenCalled();
  });

  it('accepts explicit null for nullable scalar dates', async () => {
    const h = harness();
    await h.service.updateDraft(
      'report-a',
      { occurredAt: null, startedAt: null },
      user,
    );
    expect(h.tx.exerciseReport.updateMany.mock.calls[0][0].data).toMatchObject({
      occurredAt: null,
      startedAt: null,
    });
  });
});

describe('Exercise action materialization constraint', () => {
  it('defines a unique CorrectiveAction.exerciseActionItemId source key', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (item) => item.name === 'CorrectiveAction',
    );
    const field = model?.fields.find(
      (item) => item.name === 'exerciseActionItemId',
    );
    expect(field?.isUnique).toBe(true);
  });
});
