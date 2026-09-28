import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createBookingFixture } from './booking-postgres-fixture';

const url = process.env.TEST_DATABASE_URL;
const describePg = url ? describe : describe.skip;
const hash = (c = 'a', n = 64) => c.repeat(n);

describePg('Mandate service apply foundation on PostgreSQL', () => {
  const prisma = url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient();
  let a: Awaited<ReturnType<typeof createBookingFixture>>;
  let b: Awaited<ReturnType<typeof createBookingFixture>>;
  let mandateA: { id: string }; let mandateB: { id: string };
  const rejection = async (promise: Promise<unknown>, constraint: string) => {
    try { await promise; throw new Error(`Expected ${constraint}`); } catch (error) {
      const rendered = String(error);
      if (rendered.includes(constraint) || rendered.includes(constraint.slice(0, 60))) return;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        expect(error.code).toBe(constraint.endsWith('_key') ? 'P2002' : 'P2003'); return;
      }
      throw error;
    }
  };
  beforeAll(async () => {
    await prisma.$connect(); a = await createBookingFixture(prisma); b = await createBookingFixture(prisma);
    mandateA = await prisma.projectMandate.create({ data: { projectId: a.project.id, organizationId: a.org.id } });
    mandateB = await prisma.projectMandate.create({ data: { projectId: b.project.id, organizationId: b.org.id } });
  });
  afterAll(() => prisma.$disconnect());
  const operation = (fixture: typeof a, mandate: { id: string }, key = randomUUID(), overrides: any = {}) => ({
    organizationId: fixture.org.id, projectId: fixture.project.id, projectMandateId: mandate.id,
    idempotencyKey: key, payloadHash: hash('a'), commercialRevision: hash('b'),
    result: { applied: [] }, createdById: fixture.owner.id, ...overrides,
  });
  const activity = (fixture: typeof a, overrides: any = {}) => ({ projectId: fixture.project.id,
    organizationId: fixture.org.id, type: 'autre', label: 'Gate', duration: '1h', ...overrides });

  it('creates a valid immutable-result operation', async () => {
    const row = await prisma.mandateServiceOperation.create({ data: operation(a, mandateA) });
    expect(row).toMatchObject({ organizationId: a.org.id, projectId: a.project.id,
      projectMandateId: mandateA.id, payloadHash: hash('a'), commercialRevision: hash('b'),
      result: { applied: [] }, createdById: a.owner.id });
    expect(row.id).toBeTruthy(); expect(row.createdAt).toBeInstanceOf(Date);
  });
  it('enforces tenant-scoped idempotency while allowing the same key in another tenant', async () => {
    const key = randomUUID(); await prisma.mandateServiceOperation.create({ data: operation(a, mandateA, key) });
    await rejection(prisma.mandateServiceOperation.create({ data: operation(a, mandateA, key) }),
      'MandateServiceOperation_organizationId_idempotencyKey_key');
    await expect(prisma.mandateServiceOperation.create({ data: operation(b, mandateB, key) })).resolves.toBeTruthy();
  });
  it.each([63, 65])('rejects payloadHash length %i', async n => {
    await rejection(prisma.mandateServiceOperation.create({ data: operation(a, mandateA, randomUUID(),
      { payloadHash: hash('a', n) }) }), 'MandateServiceOperation_payloadHash_check');
  });
  it.each([63, 65])('rejects commercialRevision length %i', async n => {
    await rejection(prisma.mandateServiceOperation.create({ data: operation(a, mandateA, randomUUID(),
      { commercialRevision: hash('b', n) }) }), 'MandateServiceOperation_commercialRevision_check');
  });
  it('rejects mismatched mandate context and missing actor', async () => {
    await rejection(prisma.mandateServiceOperation.create({ data: operation(b, mandateA) }),
      'MandateServiceOperation_projectMandateId_projectId_organizationId_fkey');
    await rejection(prisma.mandateServiceOperation.create({ data: operation(a, mandateA, randomUUID(),
      { createdById: randomUUID() }) }), 'MandateServiceOperation_createdById_fkey');
  });
  it('accepts null, one replacement and a replacement chain', async () => {
    const x = await prisma.projectActivity.create({ data: activity(a) });
    const ordinary = await prisma.projectActivity.create({ data: activity(a) }); expect(ordinary.replacementOfActivityId).toBeNull();
    const y = await prisma.projectActivity.create({ data: activity(a, { replacementOfActivityId: x.id }) });
    const z = await prisma.projectActivity.create({ data: activity(a, { replacementOfActivityId: y.id }) });
    expect(z.replacementOfActivityId).toBe(y.id);
  });
  it('rejects a second direct replacement and cross-project replacement', async () => {
    const x = await prisma.projectActivity.create({ data: activity(a) });
    await prisma.projectActivity.create({ data: activity(a, { replacementOfActivityId: x.id }) });
    await rejection(prisma.projectActivity.create({ data: activity(a, { replacementOfActivityId: x.id }) }),
      'ProjectActivity_replacementOfActivityId_key');
    const crossSource = await prisma.projectActivity.create({ data: activity(a) });
    await rejection(prisma.projectActivity.create({ data: activity(b, { replacementOfActivityId: crossSource.id }) }),
      'ProjectActivity_replacementOfActivityId_projectId_organizationId_fkey');
  });
  it('restricts deletion of a replacement source', async () => {
    const x = await prisma.projectActivity.create({ data: activity(a) });
    const y = await prisma.projectActivity.create({ data: activity(a, { replacementOfActivityId: x.id }) });
    await rejection(prisma.projectActivity.delete({ where: { id: x.id } }),
      'ProjectActivity_replacementOfActivityId_projectId_organizationId_fkey');
    expect(await prisma.projectActivity.findUnique({ where: { id: y.id } })).not.toBeNull();
  });
  it('documents that self-reference is currently DB-permitted', async () => {
    const id = randomUUID(); const x = await prisma.projectActivity.create({ data: activity(a, { id, replacementOfActivityId: id }) });
    expect(x.replacementOfActivityId).toBe(id);
  });
});
