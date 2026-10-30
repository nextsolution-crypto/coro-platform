import { BadRequestException, ConflictException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { CreateBuildingDto } from './dto/building.dto';

const actor = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };
const input = {
  name: 'Building', address: '1 Main', city: 'Toronto', province: 'ON',
  clientId: '11111111-1111-4111-8111-111111111111',
};

function harness() {
  const building = {
    id: 'building-a', ...input, organizationId: 'org-a', isActive: true,
    timeZoneVerified: false, responsableEmail: null, responsableFirstName: null,
    responsableLastName: null, responsableTitre: null, responsablePhone: null,
    postalCode: null, floors: null, units: null, buildingType: null, photoBase64: null,
  };
  const tx: any = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    building: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(building),
      create: jest.fn(async ({ data }) => ({ ...building, ...data })),
      update: jest.fn(async ({ data }) => ({ ...building, ...data })),
    },
    client: { findFirst: jest.fn().mockResolvedValue({ id: input.clientId, name: 'Client A', organization: { name: 'Org A' } }) },
    clientUser: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(async ({ data }) => ({ id: 'manager-a', isActive: true, ...data })), update: jest.fn() },
    clientInvitationEvent: { create: jest.fn(), updateMany: jest.fn() },
  };
  const prisma: any = {
    ...tx,
    project: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (callback) => callback(tx)),
  };
  const audit = { record: jest.fn().mockResolvedValue({ id: 'audit-a' }) };
  const outbox = { protect: jest.fn().mockReturnValue({ recipientHash: 'a'.repeat(64), encryptedEnvelope: 'encrypted', encryptionKeyId: 'qa-v1' }) };
  return { prisma, tx, audit, outbox, service: new BuildingsService(prisma, audit as any, outbox as any), building };
}

describe('BuildingsService governed authority', () => {
  it('scopes direct project reads to the active tenant building and actor project authority', async () => {
    const h = harness();
    await h.service.findProjects('building-a', actor);
    expect(h.prisma.building.findFirst).toHaveBeenCalledWith({ where: { id: 'building-a', organizationId: 'org-a', isActive: true } });
    expect(h.prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { buildingId: 'building-a', organizationId: 'org-a' } }));
  });

  it('limits an operator to assigned or last-edited projects', async () => {
    const h = harness();
    await h.service.findProjects('building-a', { ...actor, role: 'OPERATOR', userId: 'operator-a' });
    expect(h.prisma.building.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ projects: { some: { OR: [{ userId: 'operator-a' }, { lastEditedById: 'operator-a' }] } } }) });
    expect(h.prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      buildingId: 'building-a', organizationId: 'org-a', OR: [{ userId: 'operator-a' }, { lastEditedById: 'operator-a' }],
    }) }));
  });

  it('fails closed for an inactive or foreign building before project lookup', async () => {
    const h = harness(); h.prisma.building.findFirst.mockResolvedValue(null);
    await expect(h.service.findProjects('foreign', actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(h.prisma.project.findMany).not.toHaveBeenCalled();
  });

  it('creates building, manager, encrypted outbox event and audit in one transaction', async () => {
    const h = harness();
    const result = await h.service.create({ ...input, responsableEmail: 'manager@example.test' }, actor, 'building-create-key-0001');
    expect(result.organizationId).toBe('org-a');
    expect(h.tx.clientUser.create).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: 'org-a', clientId: input.clientId, role: 'CLIENT_MANAGER', buildingIds: [result.id] }) });
    expect(h.outbox.protect).toHaveBeenCalledWith(expect.objectContaining({ toEmail: 'manager@example.test' }), `building-manager-invitation-${result.id}-manager-a`);
    expect(h.tx.clientInvitationEvent.create).toHaveBeenCalled();
    expect(h.audit.record).toHaveBeenCalledWith(h.tx, expect.objectContaining({ action: 'BUILDING_CREATED', actorUserId: 'admin-a' }));
  });

  it('rejects a foreign or incompatible existing identity without changing it', async () => {
    const h = harness();
    h.tx.clientUser.findUnique.mockResolvedValue({ id: 'foreign', organizationId: 'org-b', clientId: 'client-b', role: 'CLIENT_MANAGER', isActive: true, buildingIds: [] });
    await expect(h.service.create({ ...input, responsableEmail: 'manager@example.test' }, actor, 'building-create-key-0002')).rejects.toBeInstanceOf(BadRequestException);
    expect(h.tx.clientUser.update).not.toHaveBeenCalled();
    expect(h.tx.clientInvitationEvent.create).not.toHaveBeenCalled();
    expect(h.audit.record).not.toHaveBeenCalled();
  });

  it('replays an identical creation and rejects a conflicting payload', async () => {
    const h = harness();
    const normalized = { ...h.building, id: 'bld_existing' };
    h.tx.building.findUnique.mockResolvedValue(normalized);
    await expect(h.service.create(input, actor, 'building-create-key-0003')).resolves.toBe(normalized);
    await expect(h.service.create({ ...input, name: 'Different' }, actor, 'building-create-key-0003')).rejects.toBeInstanceOf(ConflictException);
    expect(h.tx.building.create).not.toHaveBeenCalled();
  });

  it('validates client tenant and status before mutation', async () => {
    const h = harness(); h.tx.client.findFirst.mockResolvedValue(null);
    await expect(h.service.create(input, actor, 'building-create-key-0004')).rejects.toBeInstanceOf(NotFoundException);
    expect(h.tx.building.create).not.toHaveBeenCalled();
  });

  it('audits deactivation transactionally', async () => {
    const h = harness();
    await h.service.remove('building-a', actor);
    expect(h.tx.building.update).toHaveBeenCalledWith({ where: { id: 'building-a' }, data: { isActive: false } });
    expect(h.audit.record).toHaveBeenCalledWith(h.tx, expect.objectContaining({ action: 'BUILDING_DEACTIVATED' }));
  });

  it('requires valid time zones and an idempotency key', async () => {
    const h = harness();
    await expect(h.service.create(input, actor)).rejects.toBeInstanceOf(BadRequestException);
    await expect(h.service.create({ ...input, timeZone: 'Mars/Olympus' }, actor, 'building-create-key-0005')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BuildingsController and DTO policy', () => {
  it('denies mutations to OPERATOR before invoking the service', () => {
    const service: any = { create: jest.fn() };
    const controller = new BuildingsController(service);
    expect(() => controller.create(input as any, 'building-create-key-0006', { user: { ...actor, role: 'OPERATOR' } })).toThrow();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects protected and unknown payload properties', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    await expect(pipe.transform({ ...input, organizationId: 'org-b', isActive: true, role: 'SUPER_ADMIN' }, {
      type: 'body', metatype: CreateBuildingDto, data: undefined,
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
