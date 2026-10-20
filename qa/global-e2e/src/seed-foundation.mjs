#!/usr/bin/env node
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { assertDisposableDatabase } from "./database-policy.mjs";
import {
  assertSafeEnvironment,
  assertUnderQaRoot,
  RUN_ROOT,
} from "./policy.mjs";

assertSafeEnvironment();
assertDisposableDatabase();
const password = process.env.CORO_QA_SYNTHETIC_PASSWORD;
if (!password || password.length < 16)
  throw new Error("A 16+ character synthetic password is required.");

const backend = resolve("coro-backend");
const require = createRequire(join(backend, "package.json"));
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
const hash = await bcrypt.hash(password, 10);

const ids = Object.freeze({
  operator: "10000000-0000-4000-8000-000000000001",
  orgA: "10000000-0000-4000-8000-000000000002",
  orgB: "10000000-0000-4000-8000-000000000003",
  founder: "20000000-0000-4000-8000-000000000001",
  employeeOrg: "20000000-0000-4000-8000-000000000002",
  employeeGlobal: "20000000-0000-4000-8000-000000000003",
  employeeNone: "20000000-0000-4000-8000-000000000004",
  adminA: "20000000-0000-4000-8000-000000000005",
  adminB: "20000000-0000-4000-8000-000000000006",
  advisorA: "20000000-0000-4000-8000-000000000007",
  clientA: "30000000-0000-4000-8000-000000000001",
  clientB: "30000000-0000-4000-8000-000000000002",
  buildingA: "40000000-0000-4000-8000-000000000001",
  projectA: "50000000-0000-4000-8000-000000000001",
  mandateA: "60000000-0000-4000-8000-000000000001",
  portalManager: "70000000-0000-4000-8000-000000000001",
  portalUser: "70000000-0000-4000-8000-000000000002",
  portalRegional: "70000000-0000-4000-8000-000000000003",
  portalLocal: "70000000-0000-4000-8000-000000000004",
  portalZero: "70000000-0000-4000-8000-000000000005",
  portalCorporateB: "70000000-0000-4000-8000-000000000006",
  portalCorporateA: "70000000-0000-4000-8000-000000000007",
  revoked: "20000000-0000-4000-8000-000000000008",
});

const user = (id, key, role, organizationId) =>
  prisma.user.upsert({
    where: { id },
    update: { isActive: true },
    create: {
      id,
      email: `${key}@global-e2e.test`,
      password: hash,
      firstName: "Synthetic",
      lastName: key,
      role,
      organizationId,
      isActive: true,
    },
  });

try {
  for (const [id, name, internal] of [
    [ids.operator, "CORO QA Operator", true],
    [ids.orgA, "Synthetic Customer A", false],
    [ids.orgB, "Synthetic Customer B", false],
  ])
    await prisma.organization.upsert({
      where: { id },
      update: { isActive: true },
      create: { id, name, isInternal: internal, isActive: true },
    });
  await user(ids.founder, "founder", "SUPER_ADMIN", ids.operator);
  await user(ids.employeeOrg, "employee-org", "OPERATOR", ids.operator);
  await user(ids.employeeGlobal, "employee-global", "OPERATOR", ids.operator);
  await user(ids.employeeNone, "employee-none", "OPERATOR", ids.operator);
  await user(ids.adminA, "customer-admin-a", "ADMIN", ids.orgA);
  await user(ids.adminB, "customer-admin-b", "ADMIN", ids.orgB);
  await user(ids.advisorA, "advisor-a", "OPERATOR", ids.orgA);
  await prisma.user.upsert({
    where: { id: ids.revoked },
    update: { isActive: false },
    create: {
      id: ids.revoked,
      email: "revoked@global-e2e.test",
      password: hash,
      firstName: "Synthetic",
      lastName: "revoked",
      role: "OPERATOR",
      organizationId: ids.orgA,
      isActive: false,
    },
  });
  await prisma.client.upsert({
    where: { id: ids.clientA },
    update: {},
    create: {
      id: ids.clientA,
      name: "Synthetic Client A",
      organizationId: ids.orgA,
      regulatoryRequirements: [],
    },
  });
  await prisma.client.upsert({
    where: { id: ids.clientB },
    update: {},
    create: {
      id: ids.clientB,
      name: "Synthetic Client B",
      organizationId: ids.orgB,
      regulatoryRequirements: [],
    },
  });
  await prisma.building.upsert({
    where: { id: ids.buildingA },
    update: {},
    create: {
      id: ids.buildingA,
      name: "Synthetic Building A",
      address: "1 QA Street",
      city: "Testville",
      province: "QC",
      organizationId: ids.orgA,
      clientId: ids.clientA,
    },
  });
  await prisma.project.upsert({
    where: { id: ids.projectA },
    update: {},
    create: {
      id: ids.projectA,
      name: "Synthetic PMU Project",
      documentType: "PMU",
      year: 2026,
      organizationId: ids.orgA,
      clientId: ids.clientA,
      buildingId: ids.buildingA,
      userId: ids.advisorA,
    },
  });
  await prisma.projectMandate.upsert({
    where: { id: ids.mandateA },
    update: {},
    create: {
      id: ids.mandateA,
      projectId: ids.projectA,
      organizationId: ids.orgA,
      ownerId: ids.advisorA,
      description: "Synthetic QA mandate",
    },
  });
  for (const [id, key, role, clientId, organizationId, buildingIds] of [
    [ids.portalManager, "portal-manager-a", "CLIENT_MANAGER", ids.clientA, ids.orgA, [ids.buildingA]],
    [ids.portalUser, "portal-user-a", "CLIENT_CORPORATE", ids.clientA, ids.orgA, [ids.buildingA]],
    [ids.portalCorporateA, "portal-corporate-a", "CLIENT_CORPORATE", ids.clientA, ids.orgA, []],
    [ids.portalRegional, "portal-regional-a", "CLIENT_MANAGER", ids.clientA, ids.orgA, [ids.buildingA]],
    [ids.portalLocal, "portal-local-a", "CLIENT_MANAGER", ids.clientA, ids.orgA, [ids.buildingA]],
    [ids.portalZero, "portal-zero-a", "CLIENT_MANAGER", ids.clientA, ids.orgA, []],
    [ids.portalCorporateB, "portal-corporate-b", "CLIENT_CORPORATE", ids.clientB, ids.orgB, []],
  ]) {
    await prisma.clientUser.upsert({
      where: { id },
      update: {
        email: `${key}@global-e2e.test`,
        password: hash,
        firstName: "Synthetic",
        lastName: key,
        role,
        buildingIds,
        clientId,
        organizationId,
        isActive: true,
      },
      create: {
        id,
        email: `${key}@global-e2e.test`,
        password: hash,
        firstName: "Synthetic",
        lastName: key,
        role,
        buildingIds,
        clientId,
        organizationId,
      },
    });
  }
  const output = assertUnderQaRoot(join(RUN_ROOT, "synthetic-actors.json"));
  await mkdir(assertUnderQaRoot(RUN_ROOT), { recursive: true });
  await writeFile(output, JSON.stringify(ids, null, 2), { mode: 0o600 });
  console.log(`Synthetic foundation created: ${output}`);
} finally {
  await prisma.$disconnect();
}
