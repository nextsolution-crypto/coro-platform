#!/usr/bin/env node
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const require = createRequire(join(root, "coro-backend", "package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
const mode = process.argv[2];
const ids = {
  project: "pdf-migration-existing-project",
  document: "pdf-migration-existing-document",
  review: "pdf-migration-existing-review",
};

try {
  if (mode === "seed") {
    const client = await prisma.client.findFirstOrThrow({
      where: { organization: { isActive: true }, buildings: { some: {} } },
      include: { organization: true },
    });
    const organization = client.organization;
    const building = await prisma.building.findFirstOrThrow({
      where: { clientId: client.id },
    });
    const user = await prisma.user.findFirstOrThrow({
      where: { organizationId: organization.id, isActive: true },
    });
    await prisma.project.create({
      data: {
        id: ids.project,
        name: "Pre-migration PDF project",
        documentType: "PMU",
        status: "REVIEW",
        year: 2026,
        organizationId: organization.id,
        clientId: client.id,
        buildingId: building.id,
        userId: user.id,
      },
    });
    await prisma.document.create({
      data: {
        id: ids.document,
        projectId: ids.project,
        title: "Pre-migration document",
        content: { preserved: true },
        version: 3,
        lockVersion: 4,
      },
    });
    await prisma.documentReviewRequest.create({
      data: {
        id: ids.review,
        projectId: ids.project,
        documentId: ids.document,
        organizationId: organization.id,
        documentVersion: 3,
        documentLockVersion: 4,
        contentHash: "pre-migration-content-hash",
        snapshot: { schemaVersion: 1, preserved: true },
        submittedById: user.id,
      },
    });
    console.log(JSON.stringify({ status: "SEEDED", ids }));
  } else if (mode === "verify") {
    const [project, document, review, exportCount] = await Promise.all([
      prisma.project.findUnique({ where: { id: ids.project } }),
      prisma.document.findUnique({ where: { id: ids.document } }),
      prisma.documentReviewRequest.findUnique({ where: { id: ids.review } }),
      prisma.documentPdfExport.count({ where: { projectId: ids.project } }),
    ]);
    const pass =
      project?.status === "REVIEW" &&
      document?.version === 3 &&
      document?.lockVersion === 4 &&
      review?.status === "PENDING" &&
      review?.decisionVersion === null &&
      exportCount === 0;
    console.log(
      JSON.stringify({
        status: pass ? "PASS" : "FAIL",
        projectStatus: project?.status,
        documentVersion: document?.version,
        documentLockVersion: document?.lockVersion,
        reviewStatus: review?.status,
        decisionVersion: review?.decisionVersion,
        retroactiveExports: exportCount,
      }),
    );
    if (!pass) process.exitCode = 1;
  } else throw new Error("Expected seed or verify mode");
} finally {
  await prisma.$disconnect();
}
