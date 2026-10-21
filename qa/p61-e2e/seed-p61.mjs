#!/usr/bin/env node
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(join(resolve("coro-backend"), "package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ids = Object.freeze({
  orgA: "10000000-0000-4000-8000-000000000002",
  adminA: "20000000-0000-4000-8000-000000000005",
  clientA: "30000000-0000-4000-8000-000000000001",
  buildingA: "40000000-0000-4000-8000-000000000001",
  buildingB: "40000000-0000-4000-8000-000000000002",
  portalManager: "70000000-0000-4000-8000-000000000001",
  portalRegional: "70000000-0000-4000-8000-000000000003",
  portalLocal: "70000000-0000-4000-8000-000000000004",
  portalCorporateA: "70000000-0000-4000-8000-000000000007",
  authority: "81000000-0000-4000-8000-000000000001",
  portfolio: "82000000-0000-4000-8000-000000000001",
  region: "83000000-0000-4000-8000-000000000001",
  link: "84000000-0000-4000-8000-000000000001",
  membershipA: "85000000-0000-4000-8000-000000000001",
  membershipB: "85000000-0000-4000-8000-000000000002",
  corporateAssignment: "86000000-0000-4000-8000-000000000001",
  regionalAssignment: "86000000-0000-4000-8000-000000000002",
  localAssignment: "86000000-0000-4000-8000-000000000003",
  managerAssignment: "86000000-0000-4000-8000-000000000004",
});

const allPermissions = [
  "NETWORK_SUPERVISION_READ",
  "NETWORK_HIERARCHY_MANAGE",
  "NETWORK_ASSIGNMENT_MANAGE",
];

try {
  await prisma.$transaction(async (tx) => {
    await tx.building.upsert({
      where: { id: ids.buildingB },
      update: {},
      create: {
        id: ids.buildingB,
        name: "Synthetic Building B",
        address: "2 QA Street",
        city: "Testville",
        province: "QC",
        organizationId: ids.orgA,
        clientId: ids.clientA,
      },
    });
    await tx.customerNetworkAuthorityConfiguration.upsert({
      where: { organizationId: ids.orgA },
      update: { status: "ACTIVE", responsibleUserId: ids.adminA },
      create: {
        id: ids.authority,
        organizationId: ids.orgA,
        initialResponsibleUserId: ids.adminA,
        responsibleUserId: ids.adminA,
        status: "ACTIVE",
        mandateReference: "P61-QA-FOUNDER-AUTHORITY",
        creationReason: "Synthetic governed P-6.1 acceptance",
        createdByUserId: ids.adminA,
        activatedByUserId: ids.adminA,
        activatedAt: new Date(),
        activationReason: "Synthetic QA activation",
      },
    });
    await tx.customerPortfolio.upsert({
      where: { id: ids.portfolio },
      update: { isActive: true },
      create: {
        id: ids.portfolio,
        organizationId: ids.orgA,
        code: "P61-QA",
        name: "P-6.1 Synthetic Portfolio",
        createdByUserId: ids.adminA,
      },
    });
    await tx.customerPortfolioRegion.upsert({
      where: { id: ids.region },
      update: { isActive: true },
      create: {
        id: ids.region,
        organizationId: ids.orgA,
        code: "P61-EAST",
        name: "P-6.1 East Region",
        createdByUserId: ids.adminA,
      },
    });
    await tx.customerPortfolioRegionLink.upsert({
      where: { id: ids.link },
      update: {},
      create: {
        id: ids.link,
        organizationId: ids.orgA,
        portfolioId: ids.portfolio,
        regionId: ids.region,
        createdByUserId: ids.adminA,
      },
    });
    for (const [id, buildingId] of [
      [ids.membershipA, ids.buildingA],
      [ids.membershipB, ids.buildingB],
    ]) {
      await tx.customerPortfolioBuildingMembership.upsert({
        where: { id },
        update: {},
        create: {
          id,
          organizationId: ids.orgA,
          portfolioId: ids.portfolio,
          regionId: ids.region,
          buildingId,
          createdByUserId: ids.adminA,
        },
      });
    }
    const assignments = [
      [ids.corporateAssignment, ids.portalCorporateA, "PORTFOLIO", ids.portfolio, null, null, allPermissions],
      [ids.regionalAssignment, ids.portalRegional, "REGION", null, ids.region, null, allPermissions],
      [ids.localAssignment, ids.portalLocal, "BUILDING", null, null, ids.buildingA, allPermissions],
      [ids.managerAssignment, ids.portalManager, "BUILDING", null, null, ids.buildingA, allPermissions],
    ];
    for (const [id, clientUserId, scope, portfolioId, regionId, buildingId, permissions] of assignments) {
      await tx.customerPortfolioAssignment.upsert({
        where: { id },
        update: { status: "ACTIVE", permissions, effectiveUntil: null },
        create: {
          id,
          organizationId: ids.orgA,
          subjectType: "CLIENT_USER",
          clientUserId,
          scope,
          portfolioId,
          regionId,
          buildingId,
          permissions,
          grantedByActorType: "INTERNAL_USER",
          grantedByUserId: ids.adminA,
          grantReason: "Synthetic governed P-6.1 fixture",
        },
      });
    }
  });
  console.log("P61_NETWORK_FIXTURE_PASS");
} finally {
  await prisma.$disconnect();
}
