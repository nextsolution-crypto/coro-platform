'use strict';
const USER_ID = '7a366320-0505-4280-a915-e3e784d22407';
const ORG_ID = '00000000-0000-4000-8000-00000000e101';
const CLIENT_ID = '00000000-0000-4000-8000-00000000e102';
const BUILDING_ID = '00000000-0000-4000-8000-00000000e103';
const APPROVAL = 'FINALIZE_CLIENT_EMAIL_QA_2026_10_26';

function assertApproval(env) {
  if (env.CLIENT_EMAIL_QA_FINALIZE_RUN !== 'true' || env.CLIENT_EMAIL_QA_FINALIZE_APPROVAL !== APPROVAL) throw new Error('Exact finalization approval required.');
}
function assertTarget(user) {
  if (!user || user.id !== USER_ID || user.organizationId !== ORG_ID || user.clientId !== CLIENT_ID || user.role !== 'CLIENT_MANAGER' || user.buildingIds.length !== 1 || user.buildingIds[0] !== BUILDING_ID) throw new Error('Final QA identity mismatch.');
}
async function run(env = process.env) {
  assertApproval(env);
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const user = await prisma.clientUser.findUnique({ where: { id: USER_ID } });
    assertTarget(user);
    await prisma.$transaction(async (tx) => {
      await tx.clientTrustedDevice.deleteMany({ where: { userId: USER_ID } });
      await tx.magicLink.updateMany({ where: { userId: USER_ID, usedAt: null }, data: { usedAt: new Date() } });
      await tx.clientPasswordResetToken.updateMany({ where: { clientUserId: USER_ID, usedAt: null }, data: { usedAt: new Date() } });
      if (user.isActive) await tx.clientUser.update({ where: { id: USER_ID }, data: { isActive: false, sessionVersion: { increment: 1 }, mfaCode: null, mfaCodeExpiry: null } });
      await tx.adminAuditEvent.create({ data: {
        actorType: 'SYSTEM', systemActorKey: 'GOVERNED_CLIENT_EMAIL_QA_FINALIZATION', actorDisplayName: 'Governed production maintenance', actorRole: 'SYSTEM',
        action: 'CLIENT_USER_QA_FINALIZED', targetType: 'ClientUser', targetId: USER_ID, targetLabel: 'Synthetic email acceptance identity', organizationId: ORG_ID,
        reason: 'Close production email acceptance; deactivate identity, revoke sessions and invalidate access links.', requestId: env.GITHUB_RUN_ID || null,
        beforeData: { active: user.isActive, sessionVersion: user.sessionVersion }, afterData: { active: false, sessionsRevoked: true, linksInvalidated: true },
      }});
    });
    const [finalUser, links, resets, devices] = await Promise.all([
      prisma.clientUser.findUnique({ where: { id: USER_ID } }),
      prisma.magicLink.count({ where: { userId: USER_ID, usedAt: null } }),
      prisma.clientPasswordResetToken.count({ where: { clientUserId: USER_ID, usedAt: null } }),
      prisma.clientTrustedDevice.count({ where: { userId: USER_ID } }),
    ]);
    return { schemaVersion: 1, execution: !finalUser.isActive && links === 0 && resets === 0 && devices === 0 ? 'PASS' : 'FAIL', productionMutation: true, clientUserId: USER_ID, disabled: !finalUser.isActive, activeMagicLinks: links, activePasswordResetLinks: resets, trustedDevices: devices };
  } finally { await prisma.$disconnect(); }
}
if (!module.parent) run().then(r => process.stdout.write(`${JSON.stringify(r)}\n`)).catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { assertApproval, assertTarget };
