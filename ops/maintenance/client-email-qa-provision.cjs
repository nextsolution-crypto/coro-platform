'use strict';

const QA_ORGANIZATION_ID = '00000000-0000-4000-8000-00000000e101';
const QA_CLIENT_ID = '00000000-0000-4000-8000-00000000e102';
const QA_BUILDING_ID = '00000000-0000-4000-8000-00000000e103';
const RECIPIENT = 'info@getcoro.io';
const APPROVAL = 'PROVISION_CLIENT_EMAIL_QA_MANAGER_2026_10_26';

function assertApproval(env) {
  if (env.CLIENT_EMAIL_QA_PROVISION_RUN !== 'true' || env.CLIENT_EMAIL_QA_PROVISION_APPROVAL !== APPROVAL) {
    throw new Error('Exact governed provisioning approval is required.');
  }
}

function assertFoundation({ organization, client, building, existing }) {
  if (!organization?.isActive || organization.name !== 'CORO QA Production Email Acceptance') throw new Error('QA organization mismatch.');
  if (!client?.isActive || client.organizationId !== QA_ORGANIZATION_ID || client.name !== 'Client QA — courriels transactionnels') throw new Error('QA client mismatch.');
  if (!building?.isActive || building.organizationId !== QA_ORGANIZATION_ID || building.clientId !== QA_CLIENT_ID || building.name !== 'Bâtiment QA — courriels transactionnels') throw new Error('QA building mismatch.');
  if (existing) throw new Error('Recipient is already assigned to a ClientUser.');
}

async function execute(env = process.env) {
  assertApproval(env);
  const { PrismaClient } = require('@prisma/client');
  const path = require('node:path');
  const { BuildingsService } = require(path.join(process.cwd(), 'dist/src/buildings/buildings.service'));
  const { EmailService } = require(path.join(process.cwd(), 'dist/src/client-portal/email.service'));
  const prisma = new PrismaClient();
  let providerResult = null;
  try {
    const [organization, client, building, existing] = await Promise.all([
      prisma.organization.findUnique({ where: { id: QA_ORGANIZATION_ID } }),
      prisma.client.findUnique({ where: { id: QA_CLIENT_ID } }),
      prisma.building.findUnique({ where: { id: QA_BUILDING_ID } }),
      prisma.clientUser.findUnique({ where: { email: RECIPIENT } }),
    ]);
    assertFoundation({ organization, client, building, existing });

    const emailService = new EmailService();
    const send = emailService.sendClientInvitation.bind(emailService);
    emailService.sendClientInvitation = async (data) => {
      if (data.toEmail.toLowerCase() !== RECIPIENT) throw new Error('Unexpected invitation recipient.');
      providerResult = await send(data);
      return providerResult;
    };
    const service = new BuildingsService(prisma, emailService);
    await service.update(QA_BUILDING_ID, {
      responsableFirstName: 'Recette', responsableLastName: 'CORO V1',
      responsableTitre: 'Gestionnaire QA', responsableEmail: RECIPIENT,
    }, QA_ORGANIZATION_ID);

    const user = await prisma.clientUser.findUnique({ where: { email: RECIPIENT } });
    if (!user || !user.isActive || user.role !== 'CLIENT_MANAGER' || user.organizationId !== QA_ORGANIZATION_ID || user.clientId !== QA_CLIENT_ID || user.buildingIds.length !== 1 || user.buildingIds[0] !== QA_BUILDING_ID) {
      throw new Error('Canonical ClientUser scope verification failed.');
    }
    await prisma.adminAuditEvent.create({ data: {
      actorType: 'SYSTEM', systemActorKey: 'GOVERNED_CLIENT_EMAIL_QA_PROVISIONING',
      actorDisplayName: 'Governed production maintenance', actorRole: 'SYSTEM',
      action: 'CLIENT_USER_QA_PROVISIONED', targetType: 'ClientUser', targetId: user.id,
      targetLabel: 'Synthetic email acceptance identity', organizationId: QA_ORGANIZATION_ID,
      reason: 'Provision a building-scoped synthetic ClientUser through the canonical BuildingsService.',
      requestId: env.GITHUB_RUN_ID || null,
      afterData: { active: true, role: user.role, organizationId: user.organizationId, clientId: user.clientId, buildingIds: user.buildingIds },
    }});
    return {
      schemaVersion: 1, execution: providerResult?.success ? 'PASS' : 'PARTIAL', productionMutation: true,
      canonicalService: 'BuildingsService.update', clientUserId: user.id, role: user.role,
      qaOrganizationId: QA_ORGANIZATION_ID, qaClientId: QA_CLIENT_ID, qaBuildingId: QA_BUILDING_ID,
      buildingScopeCount: user.buildingIds.length, providerAccepted: providerResult?.success === true,
      providerMessageIdRecorded: Boolean(providerResult?.messageId),
    };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) execute().then((r) => process.stdout.write(JSON.stringify(r))).catch((e) => { console.error(e.message); process.exitCode = 1; });
module.exports = { assertApproval, assertFoundation, execute };
