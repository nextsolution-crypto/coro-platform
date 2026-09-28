import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ActivityTypesService } from '../src/activity-types/activity-types.service';
import { ActivityTaskListsService } from '../src/activities/activity-task-lists.service';
import { MandateOperationsApplyService } from '../src/mandate/mandate-operations-apply.service';
import { MandateOperationDecisionAction as Action } from '../src/mandate/mandate-operations-apply.dto';
import { MandateOperationsPreviewService } from '../src/mandate/mandate-operations-preview.service';
import { MandateServicesService } from '../src/mandate/mandate-services.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Mandate service operational Apply F2-F on PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  const commercial = new MandateServicesService(prisma as any);
  const preview = new MandateOperationsPreviewService(
    prisma as any,
    commercial,
  );
  const activityTypes = new ActivityTypesService(prisma as any);
  const taskLists = new ActivityTaskListsService(prisma as any, activityTypes);
  const apply = new MandateOperationsApplyService(
    prisma as any,
    commercial,
    preview,
    taskLists,
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  async function scenario(count = 1) {
    const fixture = await createBookingFixture(prisma);
    const actor = {
      userId: fixture.admin.id,
      organizationId: fixture.org.id,
      role: 'ADMIN',
    };
    const mandate = await prisma.projectMandate.create({
      data: {
        projectId: fixture.project.id,
        organizationId: fixture.org.id,
      },
    });
    const types: Array<Awaited<ReturnType<typeof prisma.activityType.create>>> =
      [];
    const services: Array<
      Awaited<ReturnType<typeof prisma.projectMandateService.create>>
    > = [];
    for (let index = 0; index < count; index++) {
      const type = await prisma.activityType.create({
        data: {
          organizationId: fixture.org.id,
          code: `custom-${randomUUID()}`,
          nameFR: `Service Apply ${index}`,
          defaultDurationMinutes: 90,
          clientBookableDefault: false,
        },
      });
      const service = await prisma.projectMandateService.create({
        data: {
          projectMandateId: mandate.id,
          projectId: fixture.project.id,
          organizationId: fixture.org.id,
          activityTypeId: type.id,
          nameFRSnapshot: type.nameFR,
          displayOrder: index,
          createdById: fixture.admin.id,
          updatedById: fixture.admin.id,
        },
      });
      types.push(type);
      services.push(service);
    }
    const revision = (await commercial.list(fixture.project.id, actor))
      .revision;
    return { fixture, actor, mandate, types, services, revision };
  }

  const dto = (
    revision: string,
    decisions: any[],
    idempotencyKey = randomUUID(),
  ) => ({ idempotencyKey, expectedRevision: revision, decisions });

  it('creates canonical Activity, 2C/2D checklist, AuditLog and Operation atomically, then replays', async () => {
    const s = await scenario();
    const list = await prisma.taskList.create({
      data: {
        name: `Apply list ${randomUUID()}`,
        category: 'DOCUMENT',
        documentTypes: [],
        organizationId: s.fixture.org.id,
      },
    });
    await prisma.taskTemplate.create({
      data: {
        taskListId: list.id,
        categoryName: 'Gate',
        taskTitle: 'Apply task',
        documentTypes: [],
        organizationId: s.fixture.org.id,
      },
    });
    const policy = await prisma.activityTypeTaskListPolicy.create({
      data: {
        activityTypeId: s.types[0].id,
        organizationId: s.fixture.org.id,
        mode: 'REPLACE',
      },
    });
    await prisma.activityTypeTaskList.create({
      data: { policyId: policy.id, taskListId: list.id },
    });
    const request = dto(s.revision, [
      { mandateServiceId: s.services[0].id, action: Action.CREATE_ACTIVITY },
    ]);
    const first = await apply.apply(s.fixture.project.id, s.actor, request);
    const second = await apply.apply(s.fixture.project.id, s.actor, request);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.applied).toEqual(first.applied);
    const activityId = first.applied[0].activityId;
    const activity = await prisma.projectActivity.findUniqueOrThrow({
      where: { id: activityId },
      include: { bookings: true, taskLists: { include: { tasks: true } } },
    });
    expect(activity).toMatchObject({
      projectId: s.fixture.project.id,
      organizationId: s.fixture.org.id,
      activityTypeId: s.types[0].id,
      mandateServiceId: s.services[0].id,
      sourceMandate: true,
      status: 'a_faire',
      scheduledDate: null,
      replacementOfActivityId: null,
    });
    expect(activity.bookings).toHaveLength(0);
    expect(activity.taskLists).toHaveLength(1);
    expect(activity.taskLists[0].tasks).toHaveLength(1);
    expect(
      await prisma.mandateServiceOperation.count({
        where: { idempotencyKey: request.idempotencyKey },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: {
          entityId: activityId,
          action: 'MANDATE_SERVICE_ACTIVITY_CREATED',
        },
      }),
    ).toBe(1);
    expect(first.preview.operations[0]).toMatchObject({
      action: 'NO_ACTION',
      reasonCode: 'ACTIVE_ACTIVITY_EXISTS',
    });
  });

  it('rejects a reused key with a different payload and a second key after creation', async () => {
    const s = await scenario(2);
    const key = randomUUID();
    await apply.apply(
      s.fixture.project.id,
      s.actor,
      dto(
        s.revision,
        [
          {
            mandateServiceId: s.services[0].id,
            action: Action.CREATE_ACTIVITY,
          },
        ],
        key,
      ),
    );
    await expect(
      apply.apply(
        s.fixture.project.id,
        s.actor,
        dto(
          s.revision,
          [
            {
              mandateServiceId: s.services[1].id,
              action: Action.CREATE_ACTIVITY,
            },
          ],
          key,
        ),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      apply.apply(
        s.fixture.project.id,
        s.actor,
        dto(s.revision, [
          {
            mandateServiceId: s.services[0].id,
            action: Action.CREATE_ACTIVITY,
          },
        ]),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await prisma.projectActivity.count({
        where: { mandateServiceId: s.services[0].id },
      }),
    ).toBe(1);
  });

  it('adopts the exact active or cancelled legacy Activity without changing its operational data', async () => {
    for (const status of ['a_faire', 'annule']) {
      const s = await scenario();
      const legacy = await prisma.projectActivity.create({
        data: {
          projectId: s.fixture.project.id,
          organizationId: s.fixture.org.id,
          activityTypeId: s.types[0].id,
          type: s.types[0].code,
          label: `Legacy ${status}`,
          duration: '2h',
          sourceMandate: true,
          status,
          scheduledDate: new Date('2026-10-10T14:00:00Z'),
          notes: 'preserve-me',
        },
      });
      const booking = await s.fixture.createBooking({
        activityId: legacy.id,
        status: 'CONFIRMEE',
      });
      const result = await apply.apply(
        s.fixture.project.id,
        s.actor,
        dto(s.revision, [
          {
            mandateServiceId: s.services[0].id,
            action: Action.ADOPT_LEGACY_ACTIVITY,
            activityId: legacy.id,
          },
        ]),
      );
      const after = await prisma.projectActivity.findUniqueOrThrow({
        where: { id: legacy.id },
      });
      expect(after).toMatchObject({
        mandateServiceId: s.services[0].id,
        status,
        scheduledDate: legacy.scheduledDate,
        notes: 'preserve-me',
      });
      expect(
        await prisma.booking.findUnique({ where: { id: booking.id } }),
      ).not.toBeNull();
      expect(result.preview.operations[0]).toMatchObject(
        status === 'annule'
          ? {
              action: 'REQUIRES_DECISION',
              reasonCode: 'LATEST_ACTIVITY_CANCELLED',
            }
          : { action: 'NO_ACTION', reasonCode: 'ACTIVE_ACTIVITY_EXISTS' },
      );
    }
  });

  it('allows structural adoption of an archived type but refuses wrong-context candidates', async () => {
    const s = await scenario();
    const legacy = await prisma.projectActivity.create({
      data: {
        projectId: s.fixture.project.id,
        organizationId: s.fixture.org.id,
        activityTypeId: s.types[0].id,
        type: s.types[0].code,
        label: 'Archived legacy',
        duration: '1h',
        sourceMandate: true,
        status: 'a_faire',
      },
    });
    await prisma.activityType.update({
      where: { id: s.types[0].id },
      data: { isActive: false, archivedAt: new Date() },
    });
    const result = await apply.apply(
      s.fixture.project.id,
      s.actor,
      dto(s.revision, [
        {
          mandateServiceId: s.services[0].id,
          action: Action.ADOPT_LEGACY_ACTIVITY,
          activityId: legacy.id,
        },
      ]),
    );
    expect(result.applied[0]).toMatchObject({
      activityId: legacy.id,
      created: false,
    });

    const other = await scenario();
    await expect(
      apply.apply(
        other.fixture.project.id,
        other.actor,
        dto(other.revision, [
          {
            mandateServiceId: other.services[0].id,
            action: Action.ADOPT_LEGACY_ACTIVITY,
            activityId: legacy.id,
          },
        ]),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await prisma.projectActivity.findUniqueOrThrow({
        where: { id: legacy.id },
      }),
    ).toMatchObject({ mandateServiceId: s.services[0].id });
  });

  it('creates a clean replacement, preserves its source and permits X <- Y <- Z', async () => {
    const s = await scenario();
    const source = await prisma.projectActivity.create({
      data: {
        projectId: s.fixture.project.id,
        organizationId: s.fixture.org.id,
        activityTypeId: s.types[0].id,
        mandateServiceId: s.services[0].id,
        type: s.types[0].code,
        label: 'X',
        duration: '90min',
        sourceMandate: true,
        status: 'annule',
        scheduledDate: new Date('2026-10-10T14:00:00Z'),
        notes: 'source',
      },
    });
    const replacementRequest = dto(s.revision, [
      {
        mandateServiceId: s.services[0].id,
        action: Action.CREATE_REPLACEMENT,
        activityId: source.id,
      },
    ]);
    const first = await apply.apply(s.fixture.project.id, s.actor, replacementRequest);
    const retry = await apply.apply(s.fixture.project.id, s.actor, replacementRequest);
    expect(retry).toMatchObject({ replayed: true, applied: first.applied });
    const y = await prisma.projectActivity.findUniqueOrThrow({
      where: { id: first.applied[0].activityId },
      include: { bookings: true, tasks: true },
    });
    expect(y).toMatchObject({
      replacementOfActivityId: source.id,
      status: 'a_faire',
      scheduledDate: null,
    });
    expect(y.bookings).toHaveLength(0);
    expect(y.tasks).toHaveLength(0);
    expect(
      await prisma.projectActivity.findUniqueOrThrow({
        where: { id: source.id },
      }),
    ).toMatchObject({ status: 'annule', notes: 'source' });
    await expect(
      apply.apply(
        s.fixture.project.id,
        s.actor,
        dto(s.revision, [
          {
            mandateServiceId: s.services[0].id,
            action: Action.CREATE_REPLACEMENT,
            activityId: source.id,
          },
        ]),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await prisma.projectActivity.update({
      where: { id: y.id },
      data: { status: 'annule' },
    });
    const second = await apply.apply(
      s.fixture.project.id,
      s.actor,
      dto(s.revision, [
        {
          mandateServiceId: s.services[0].id,
          action: Action.CREATE_REPLACEMENT,
          activityId: y.id,
        },
      ]),
    );
    expect(
      await prisma.projectActivity.findUniqueOrThrow({
        where: { id: second.applied[0].activityId },
      }),
    ).toMatchObject({ replacementOfActivityId: y.id, status: 'a_faire' });
  });

  it('refuses replacement with an open Booking or a pre-existing cycle', async () => {
    const open = await scenario();
    const source = await prisma.projectActivity.create({
      data: {
        projectId: open.fixture.project.id,
        organizationId: open.fixture.org.id,
        activityTypeId: open.types[0].id,
        mandateServiceId: open.services[0].id,
        type: open.types[0].code,
        label: 'Open',
        duration: '1h',
        sourceMandate: true,
        status: 'annule',
      },
    });
    await open.fixture.createBooking({
      activityId: source.id,
      status: 'CONFIRMEE',
    });
    await expect(
      apply.apply(
        open.fixture.project.id,
        open.actor,
        dto(open.revision, [
          {
            mandateServiceId: open.services[0].id,
            action: Action.CREATE_REPLACEMENT,
            activityId: source.id,
          },
        ]),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const cyclic = await scenario();
    const x = await prisma.projectActivity.create({
      data: {
        projectId: cyclic.fixture.project.id,
        organizationId: cyclic.fixture.org.id,
        activityTypeId: cyclic.types[0].id,
        mandateServiceId: cyclic.services[0].id,
        type: cyclic.types[0].code,
        label: 'Cycle X',
        duration: '1h',
        sourceMandate: true,
        status: 'annule',
      },
    });
    const y = await prisma.projectActivity.create({
      data: {
        projectId: cyclic.fixture.project.id,
        organizationId: cyclic.fixture.org.id,
        activityTypeId: cyclic.types[0].id,
        mandateServiceId: cyclic.services[0].id,
        replacementOfActivityId: x.id,
        type: cyclic.types[0].code,
        label: 'Cycle Y',
        duration: '1h',
        sourceMandate: true,
        status: 'annule',
      },
    });
    await prisma.projectActivity.update({
      where: { id: x.id },
      data: { replacementOfActivityId: y.id },
    });
    await expect(
      apply.apply(
        cyclic.fixture.project.id,
        cyclic.actor,
        dto(cyclic.revision, [
          {
            mandateServiceId: cyclic.services[0].id,
            action: Action.CREATE_REPLACEMENT,
            activityId: y.id,
          },
        ]),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await prisma.mandateServiceOperation.count({
        where: { projectId: cyclic.fixture.project.id },
      }),
    ).toBe(0);
  });

  it('rolls back an entire batch, audits and Operation when the second checklist instantiation fails', async () => {
    const s = await scenario(2);
    let calls = 0;
    const failingLists = {
      instantiateMissingTaskListsForActivity: async (...args: any[]) => {
        calls += 1;
        if (calls === 2) throw new Error('forced checklist failure');
        return taskLists.instantiateMissingTaskListsForActivity(
          args[0],
          args[1],
          args[2],
          args[3],
        );
      },
    };
    const failingApply = new MandateOperationsApplyService(
      prisma as any,
      commercial,
      preview,
      failingLists as any,
    );
    await expect(
      failingApply.apply(
        s.fixture.project.id,
        s.actor,
        dto(
          s.revision,
          s.services.map((service) => ({
            mandateServiceId: service.id,
            action: Action.CREATE_ACTIVITY,
          })),
        ),
      ),
    ).rejects.toThrow('forced checklist failure');
    expect(
      await prisma.projectActivity.count({
        where: { mandateServiceId: { in: s.services.map((item) => item.id) } },
      }),
    ).toBe(0);
    expect(
      await prisma.mandateServiceOperation.count({
        where: { projectId: s.fixture.project.id },
      }),
    ).toBe(0);
    expect(
      await prisma.auditLog.count({
        where: {
          projectId: s.fixture.project.id,
          action: {
            in: [
              'MANDATE_SERVICE_ACTIVITY_CREATED',
              'ACTIVITY_TASK_LISTS_INSTANTIATED',
            ],
          },
        },
      }),
    ).toBe(0);
  });

  it('commits a valid CREATE plus ADOPT batch as one Operation', async () => {
    const s = await scenario(2);
    const legacy = await prisma.projectActivity.create({
      data: {
        projectId: s.fixture.project.id,
        organizationId: s.fixture.org.id,
        activityTypeId: s.types[1].id,
        type: s.types[1].code,
        label: 'Batch legacy',
        duration: '1h',
        sourceMandate: true,
      },
    });
    const result = await apply.apply(
      s.fixture.project.id,
      s.actor,
      dto(s.revision, [
        { mandateServiceId: s.services[0].id, action: Action.CREATE_ACTIVITY },
        {
          mandateServiceId: s.services[1].id,
          action: Action.ADOPT_LEGACY_ACTIVITY,
          activityId: legacy.id,
        },
      ]),
    );
    expect(result.applied).toHaveLength(2);
    expect(
      await prisma.projectActivity.count({
        where: {
          mandateServiceId: { in: s.services.map((item) => item.id) },
        },
      }),
    ).toBe(2);
    expect(
      await prisma.mandateServiceOperation.count({
        where: { projectId: s.fixture.project.id },
      }),
    ).toBe(1);
  });

  it('rejects stale revision, removed, annual, quantity and archived creation without Operation', async () => {
    const stale = await scenario();
    await expect(
      apply.apply(
        stale.fixture.project.id,
        stale.actor,
        dto('0'.repeat(64), [
          {
            mandateServiceId: stale.services[0].id,
            action: Action.CREATE_ACTIVITY,
          },
        ]),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await prisma.mandateServiceOperation.count({
        where: { projectId: stale.fixture.project.id },
      }),
    ).toBe(0);

    for (const mutation of [
      {
        commercialStatus: 'REMOVED' as const,
        removedAt: new Date(),
        removedById: stale.fixture.admin.id,
      },
      {
        commercialStatus: 'ACTIVE' as const,
        removedAt: null,
        removedById: null,
        recurrenceMode: 'ANNUAL' as const,
      },
      { recurrenceMode: 'ONCE' as const, quantity: 2 },
    ]) {
      const s = await scenario();
      await prisma.projectMandateService.update({
        where: { id: s.services[0].id },
        data: mutation,
      });
      const current = (await commercial.list(s.fixture.project.id, s.actor))
        .revision;
      await expect(
        apply.apply(
          s.fixture.project.id,
          s.actor,
          dto(current, [
            {
              mandateServiceId: s.services[0].id,
              action: Action.CREATE_ACTIVITY,
            },
          ]),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        await prisma.mandateServiceOperation.count({
          where: { projectId: s.fixture.project.id },
        }),
      ).toBe(0);
    }
    const archived = await scenario();
    await prisma.activityType.update({
      where: { id: archived.types[0].id },
      data: { isActive: false },
    });
    await expect(
      apply.apply(
        archived.fixture.project.id,
        archived.actor,
        dto(archived.revision, [
          {
            mandateServiceId: archived.services[0].id,
            action: Action.CREATE_ACTIVITY,
          },
        ]),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('serializes concurrent same-key and different-key CREATE_ACTIVITY requests', async () => {
    const same = await scenario();
    const request = dto(same.revision, [
      { mandateServiceId: same.services[0].id, action: Action.CREATE_ACTIVITY },
    ]);
    const sameResults = await Promise.all([
      apply.apply(same.fixture.project.id, same.actor, request),
      apply.apply(same.fixture.project.id, same.actor, request),
    ]);
    expect(sameResults.filter((item) => item.replayed)).toHaveLength(1);
    expect(
      await prisma.projectActivity.count({
        where: { mandateServiceId: same.services[0].id },
      }),
    ).toBe(1);
    expect(
      await prisma.mandateServiceOperation.count({
        where: { projectId: same.fixture.project.id },
      }),
    ).toBe(1);

    const different = await scenario();
    const outcomes = await Promise.allSettled(
      [randomUUID(), randomUUID()].map((key) =>
        apply.apply(
          different.fixture.project.id,
          different.actor,
          dto(
            different.revision,
            [
              {
                mandateServiceId: different.services[0].id,
                action: Action.CREATE_ACTIVITY,
              },
            ],
            key,
          ),
        ),
      ),
    );
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(
      1,
    );
    expect(
      await prisma.projectActivity.count({
        where: { mandateServiceId: different.services[0].id },
      }),
    ).toBe(1);

    const replacement = await scenario();
    const source = await prisma.projectActivity.create({ data: {
      projectId: replacement.fixture.project.id, organizationId: replacement.fixture.org.id,
      activityTypeId: replacement.types[0].id, mandateServiceId: replacement.services[0].id,
      type: replacement.types[0].code, label: 'Concurrent source', duration: '1h',
      sourceMandate: true, status: 'annule',
    } });
    const replacementOutcomes = await Promise.allSettled([randomUUID(), randomUUID()].map(key => apply.apply(
      replacement.fixture.project.id, replacement.actor, dto(replacement.revision, [{
        mandateServiceId: replacement.services[0].id, action: Action.CREATE_REPLACEMENT, activityId: source.id,
      }], key))));
    expect(replacementOutcomes.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(replacementOutcomes.filter(item => item.status === 'rejected')).toHaveLength(1);
    expect(await prisma.projectActivity.count({ where: { replacementOfActivityId: source.id } })).toBe(1);
  });
});
