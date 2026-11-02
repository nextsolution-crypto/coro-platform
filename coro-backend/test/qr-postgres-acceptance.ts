import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient, QrCodeStatus, UserRole } from '@prisma/client';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { RequestContext } from '../src/common/request-context';
import { QrCodesService } from '../src/qr-codes/qr-codes.service';

const prisma = new PrismaClient();
const service = new QrCodesService(prisma as never, new AdminAuditService());
const actorUserId = 'qr001-acceptance-founder';
const organizationId = 'qr001-acceptance-organization';

async function digest(path: string) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function main() {
  const website = resolve(__dirname, '../../coro-website/public/qr');
  const beforeAssets = {
    png: await digest(resolve(website, 'contact.png')),
    svg: await digest(resolve(website, 'contact.svg')),
  };

  await prisma.organization.upsert({
    where: { id: organizationId },
    update: {},
    create: {
      id: organizationId,
      name: 'QR-001 Acceptance Organization',
    },
  });
  await prisma.user.upsert({
    where: { id: actorUserId },
    update: { isActive: true, role: UserRole.SUPER_ADMIN },
    create: {
      id: actorUserId,
      email: 'qr001-acceptance@example.invalid',
      password: 'NOT_A_LOGIN_CREDENTIAL',
      firstName: 'QR',
      lastName: 'Acceptance',
      role: UserRole.SUPER_ADMIN,
      organizationId,
    },
  });

  const initial = await prisma.qrCode.findUniqueOrThrow({
    where: { slug: 'contact' },
  });
  const initialChangeCount = await prisma.qrCodeChange.count({
    where: { qrCodeId: initial.id },
  });
  const initialAuditCount = await prisma.adminAuditEvent.count({
    where: { targetType: 'QR_CODE', targetId: initial.id },
  });
  assert.equal(initial.destinationUrl, 'https://getcoro.io/contact');
  assert.equal(initial.status, QrCodeStatus.ACTIVE);

  const resolved = await service.resolve('contact', 'Mozilla/5.0 Mobile', 'GET');
  assert.equal(resolved.destinationUrl, 'https://getcoro.io/contact');
  assert.equal(resolved.scope, 'GLOBAL');

  const changed = await RequestContext.run('qr001-update', () =>
    service.update(
      'contact',
      {
        destinationUrl: 'https://getcoro.io/contact?qr_acceptance=1',
        expectedVersion: initial.configurationVersion,
        reason: 'Vérifier le changement de destination sans régénération',
      },
      actorUserId,
    ),
  );
  assert.equal(
    changed.destinationUrl,
    'https://getcoro.io/contact?qr_acceptance=1',
  );

  await assert.rejects(
    service.update(
      'contact',
      {
        destinationUrl: 'https://getcoro.io/contact?stale=1',
        expectedVersion: initial.configurationVersion,
        reason: 'Cette écriture obsolète doit être refusée',
      },
      actorUserId,
    ),
    (error: { status?: number }) => error.status === 409,
  );

  const disabled = await RequestContext.run('qr001-disable', () =>
    service.update(
      'contact',
      {
        enabled: false,
        expectedVersion: changed.configurationVersion,
        reason: 'Vérifier la désactivation',
      },
      actorUserId,
    ),
  );
  await assert.rejects(service.resolve('contact'));
  await assert.rejects(service.resolve('unknown-slug'));

  const restored = await RequestContext.run('qr001-restore', () =>
    service.update(
      'contact',
      {
        destinationUrl: 'https://getcoro.io/contact',
        enabled: true,
        expectedVersion: disabled.configurationVersion,
        reason: 'Restaurer la fixture après la recette isolée',
      },
      actorUserId,
    ),
  );
  assert.equal(restored.destinationUrl, 'https://getcoro.io/contact');
  assert.equal(restored.status, QrCodeStatus.ACTIVE);

  const concurrentSlug = `concurrent-${Date.now()}`;
  const attempts = await Promise.allSettled(
    [1, 2].map((attempt) =>
      RequestContext.run(`qr001-create-${attempt}`, () =>
        service.create(
          {
            slug: concurrentSlug,
            destinationUrl: 'https://getcoro.io/contact',
            reason: `Création concurrente ${attempt}`,
          },
          actorUserId,
        ),
      ),
    ),
  );
  assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(await prisma.qrCode.count({ where: { slug: concurrentSlug } }), 1);

  assert.equal(
    await prisma.qrCodeChange.count({ where: { qrCodeId: initial.id } }),
    initialChangeCount + 3,
  );
  assert.equal(
    await prisma.adminAuditEvent.count({
      where: { targetType: 'QR_CODE', targetId: initial.id },
    }),
    initialAuditCount + 3,
  );

  const afterAssets = {
    png: await digest(resolve(website, 'contact.png')),
    svg: await digest(resolve(website, 'contact.svg')),
  };
  assert.deepEqual(afterAssets, beforeAssets);

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        resolution: resolved.destinationUrl,
        restoredDestination: restored.destinationUrl,
        globalScope: resolved.scope,
        mutationAuditEvents: 3,
        mutationHistoryEntries: 3,
        concurrentCreate: { accepted: 1, rejected: 1 },
        assetHashesStable: true,
        assetSha256: afterAssets,
      },
      null,
      2,
    ),
  );
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
