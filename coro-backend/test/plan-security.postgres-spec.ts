import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ProjectsService } from '../src/projects/projects.service';
import { ApprovalService } from '../src/approval/approval.service';

jest.mock('../src/export/export.service', () => ({
  ExportService: class ExportService {},
}));

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour plan-security',
  );
}

describe('Plan security PostgreSQL authorization', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const suffix = randomUUID();
  const ids = {
    orgA: `plan-s02-org-a-${suffix}`,
    orgB: `plan-s02-org-b-${suffix}`,
    operatorA: `plan-s02-operator-a-${suffix}`,
    operatorC: `plan-s02-operator-c-${suffix}`,
    operatorB: `plan-s02-operator-b-${suffix}`,
    adminA: `plan-s02-admin-a-${suffix}`,
    clientA: `plan-s02-client-a-${suffix}`,
    buildingA: `plan-s02-building-a-${suffix}`,
    projectA: `plan-s02-project-a-${suffix}`,
  };
  const operatorA = {
    userId: ids.operatorA,
    organizationId: ids.orgA,
    role: 'OPERATOR',
  };
  const operatorC = {
    userId: ids.operatorC,
    organizationId: ids.orgA,
    role: 'OPERATOR',
  };
  const operatorB = {
    userId: ids.operatorB,
    organizationId: ids.orgB,
    role: 'OPERATOR',
  };
  const adminA = {
    userId: ids.adminA,
    organizationId: ids.orgA,
    role: 'ADMIN',
  };
  let projects: ProjectsService;
  let approval: ApprovalService;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.createMany({
      data: [
        { id: ids.orgA, name: 'Plan S02 Organization A' },
        { id: ids.orgB, name: 'Plan S02 Organization B' },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: ids.operatorA,
          email: `${ids.operatorA}@example.invalid`,
          password: 'x',
          firstName: 'Operator',
          lastName: 'A',
          role: 'OPERATOR',
          organizationId: ids.orgA,
        },
        {
          id: ids.operatorC,
          email: `${ids.operatorC}@example.invalid`,
          password: 'x',
          firstName: 'Operator',
          lastName: 'C',
          role: 'OPERATOR',
          organizationId: ids.orgA,
        },
        {
          id: ids.adminA,
          email: `${ids.adminA}@example.invalid`,
          password: 'x',
          firstName: 'Admin',
          lastName: 'A',
          role: 'ADMIN',
          organizationId: ids.orgA,
        },
        {
          id: ids.operatorB,
          email: `${ids.operatorB}@example.invalid`,
          password: 'x',
          firstName: 'Operator',
          lastName: 'B',
          role: 'OPERATOR',
          organizationId: ids.orgB,
        },
      ],
    });
    await prisma.client.create({
      data: {
        id: ids.clientA,
        name: 'Plan S02 Client A',
        organizationId: ids.orgA,
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.buildingA,
        name: 'Plan S02 Building A',
        address: '1 Test',
        city: 'Montreal',
        province: 'QC',
        organizationId: ids.orgA,
        clientId: ids.clientA,
      },
    });
    await prisma.project.create({
      data: {
        id: ids.projectA,
        name: 'Plan S02 Project A1',
        documentType: 'PMU',
        year: 2026,
        organizationId: ids.orgA,
        clientId: ids.clientA,
        buildingId: ids.buildingA,
        userId: ids.operatorA,
      },
    });
    projects = new ProjectsService(prisma as any);
    approval = new ApprovalService(
      prisma as any,
      {
        create: jest.fn().mockResolvedValue({}),
        createForOrganization: jest.fn().mockResolvedValue({}),
      } as any,
      { send: jest.fn().mockResolvedValue({}) } as any,
      { generatePdf: jest.fn(() => new Promise(() => undefined)) } as any,
      { uploadFile: jest.fn() } as any,
    );
  });

  afterAll(async () => {
    await prisma.projectVersion.deleteMany({
      where: { projectId: ids.projectA },
    });
    await prisma.project.deleteMany({ where: { id: ids.projectA } });
    await prisma.building.deleteMany({ where: { id: ids.buildingA } });
    await prisma.client.deleteMany({ where: { id: ids.clientA } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [ids.operatorA, ids.operatorC, ids.adminA, ids.operatorB] },
      },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [ids.orgA, ids.orgB] } },
    });
    await prisma.$disconnect();
  });

  it('enforces assignment, tenant, creation, transition and approval boundaries', async () => {
    await expect(
      projects.findOne(ids.projectA, operatorA),
    ).resolves.toMatchObject({ id: ids.projectA });
    await expect(projects.findOne(ids.projectA, operatorC)).rejects.toThrow(
      'Projet introuvable',
    );
    await expect(projects.findOne(ids.projectA, operatorB)).rejects.toThrow(
      'Projet introuvable',
    );

    const before = await prisma.project.findUniqueOrThrow({
      where: { id: ids.projectA },
    });
    const beforeVersions = await prisma.projectVersion.count({
      where: { projectId: ids.projectA },
    });
    const beforeAudits = await prisma.auditLog.count({
      where: { projectId: ids.projectA },
    });

    await expect(
      projects.update(ids.projectA, { name: 'Blocked' }, operatorC),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      projects.remove(ids.projectA, operatorC),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      approval.submit(ids.projectA, operatorC),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      approval.submit(ids.projectA, operatorB),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      approval.requestRevision(ids.projectA, operatorC),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      projects.update(ids.projectA, { status: 'VALIDATED' }, operatorA),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      projects.update(ids.projectA, { userId: ids.operatorC }, operatorA),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      projects.create(
        {
          name: 'Foreign',
          documentType: 'PMU',
          year: 2026,
          clientId: ids.clientA,
          buildingId: ids.buildingA,
          userId: ids.operatorA,
          organizationId: ids.orgB,
        },
        operatorA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(
      await prisma.project.findUniqueOrThrow({ where: { id: ids.projectA } }),
    ).toEqual(before);
    expect(
      await prisma.projectVersion.count({ where: { projectId: ids.projectA } }),
    ).toBe(beforeVersions);
    expect(
      await prisma.auditLog.count({ where: { projectId: ids.projectA } }),
    ).toBe(beforeAudits);

    await expect(
      approval.submit(ids.projectA, operatorA),
    ).resolves.toMatchObject({ status: 'REVIEW' });
    await expect(
      approval.approve(ids.projectA, ids.operatorA, ids.orgA, 'OPERATOR'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      approval.requestRevision(ids.projectA, adminA, 'Review required'),
    ).resolves.toMatchObject({ status: 'IN_PROGRESS' });
    await approval.submit(ids.projectA, operatorA);
    await expect(
      approval.approve(ids.projectA, ids.adminA, ids.orgA, 'ADMIN'),
    ).resolves.toMatchObject({ status: 'VALIDATED', version: 1 });
    expect(
      await prisma.projectVersion.count({ where: { projectId: ids.projectA } }),
    ).toBe(1);
  });
});
