#!/usr/bin/env node
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

if (!process.env.DATABASE_URL?.includes("coro_qa_global_e2e")) throw new Error("Disposable QA database required");
const require = createRequire(join(resolve("coro-backend"), "package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ids = {
  org: "10000000-0000-4000-8000-000000000002", client: "30000000-0000-4000-8000-000000000001",
  building: "40000000-0000-4000-8000-000000000001", manager: "70000000-0000-4000-8000-000000000001",
  verifier: "70000000-0000-4000-8000-000000000002", denied: "70000000-0000-4000-8000-000000000005",
  profile: "81000000-0000-4000-8000-000000000001", program: "81000000-0000-4000-8000-000000000002",
  scenario: "81000000-0000-4000-8000-000000000003", event: "81000000-0000-4000-8000-000000000004",
  review: "81000000-0000-4000-8000-000000000005",
};
try {
  await prisma.clientUser.update({ where: { id: ids.manager }, data: {
    operationalReviewPermissions: ["REX_CREATE", "REX_EDIT", "REX_REVIEW", "REX_FINALIZE"],
    correctiveActionPermissions: ["CORRECTIVE_ACTION_CREATE", "CORRECTIVE_ACTION_EDIT", "CORRECTIVE_ACTION_COMPLETE"],
  }});
  await prisma.clientUser.update({ where: { id: ids.verifier }, data: {
    operationalReviewPermissions: ["REX_REVIEW", "REX_FINALIZE"],
    correctiveActionPermissions: ["CORRECTIVE_ACTION_VERIFY", "CORRECTIVE_ACTION_CLOSE", "CORRECTIVE_ACTION_REPORT_GENERATE"],
  }});
  await prisma.clientUser.update({ where: { id: ids.denied }, data: { operationalReviewPermissions: [], correctiveActionPermissions: [] }});
  await prisma.rueFacilityProfile.upsert({ where: { buildingId: ids.building }, update: { populationEnabled: true }, create: { id: ids.profile, buildingId: ids.building, assessmentStatus: "CONFIRMED_SUBJECT", populationEnabled: true }});
  const profile = await prisma.rueFacilityProfile.findUniqueOrThrow({ where: { buildingId: ids.building }});
  await prisma.populationProgram.upsert({ where: { rueFacilityProfileId: profile.id }, update: { status: "ACTIVE", deliveryMode: "SANDBOX" }, create: { id: ids.program, rueFacilityProfileId: profile.id, status: "ACTIVE", deliveryMode: "SANDBOX", publicSlug: "rex-qa", nameFR: "Programme REX QA" }});
  const program = await prisma.populationProgram.findUniqueOrThrow({ where: { rueFacilityProfileId: profile.id }});
  await prisma.rueEmergencyScenario.upsert({ where: { id: ids.scenario }, update: {}, create: { id: ids.scenario, facilityProfileId: profile.id, nameFR: "Exercice REX synthétique" }});
  await prisma.populationOperationalEvent.upsert({ where: { id: ids.event }, update: {}, create: { id: ids.event, organizationId: ids.org, programId: program.id, emergencyScenarioId: ids.scenario, status: "ENDED", startedByType: "SYSTEM", startedById: "rex-qa", endedByType: "SYSTEM", endedById: "rex-qa", endedAt: new Date() }});
  await prisma.operationalReview.upsert({ where: { id: ids.review }, update: {}, create: { id: ids.review, organizationId: ids.org, title: "REX synthétique QA", populationOperationalEventId: ids.event, buildingId: ids.building, confidentiality: "BUILDING_TEAM", createdByType: "CLIENT_USER", createdById: ids.manager }});
  console.log(JSON.stringify({ status: "PASS", reviewId: ids.review, buildingId: ids.building }));
} finally { await prisma.$disconnect(); }
