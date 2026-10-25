import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const CHALLENGE_TTL_MS = 45_000;
const TRANSACTION_TTL_MS = 5 * 60_000;
const DEVICE_TTL_MS = 30 * 24 * 60 * 60_000;

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class PresenceFlowService {
  constructor(private readonly prisma: PrismaService) {}

  async issueChallenge(publicToken: string) {
    const display = await this.resolveDisplay(publicToken);
    const challenge = randomBytes(32).toString('base64url');
    const now = new Date();
    const challengeExpiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
    const transactionExpiresAt = new Date(now.getTime() + TRANSACTION_TTL_MS);
    await this.prisma.presenceSession.updateMany({
      where: {
        buildingId: display.buildingId,
        status: { in: ['ISSUED', 'STARTED', 'IDENTIFIED'] },
        transactionExpiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });
    const session = await this.prisma.presenceSession.create({
      data: {
        buildingId: display.buildingId,
        organizationId: display.organizationId,
        kioskTokenId: display.id,
        entryLabel: display.label,
        challengeHash: digest(challenge),
        challengeExpiresAt,
        transactionExpiresAt,
      },
      select: { id: true },
    });
    return {
      sessionId: session.id,
      challenge,
      challengeExpiresAt,
      rotationSeconds: 30,
    };
  }

  async start(sessionId: string, challenge: string, deviceToken?: string) {
    if (!sessionId || !challenge) throw new BadRequestException('QR incomplet');
    const now = new Date();
    const claimed = await this.prisma.presenceSession.updateMany({
      where: {
        id: sessionId,
        challengeHash: digest(challenge),
        status: 'ISSUED',
        challengeExpiresAt: { gte: now },
      },
      data: { status: 'STARTED', startedAt: now },
    });
    if (claimed.count !== 1) {
      throw new UnauthorizedException('Ce QR est expiré ou a déjà été utilisé');
    }

    const session = await this.prisma.presenceSession.findUnique({
      where: { id: sessionId },
      include: { building: { select: { name: true } } },
    });
    if (!session) throw new NotFoundException('Transaction introuvable');

    let recognized: null | {
      firstName: string;
      lastName: string;
      action: 'CHECK_IN' | 'CHECK_OUT';
    } = null;
    if (deviceToken) {
      const device = await this.prisma.presenceDeviceSession.findFirst({
        where: {
          tokenHash: digest(deviceToken),
          buildingId: session.buildingId,
          revokedAt: null,
          expiresAt: { gt: now },
          employee: { isActive: true },
        },
        include: { employee: true },
      });
      if (device) {
        const action = await this.resolveAction(device.employeeId);
        await this.prisma.$transaction([
          this.prisma.presenceSession.update({
            where: { id: session.id },
            data: {
              employeeId: device.employeeId,
              intendedAction: action,
              identifiedAt: now,
              status: 'IDENTIFIED',
            },
          }),
          this.prisma.presenceDeviceSession.update({
            where: { id: device.id },
            data: { lastUsedAt: now },
          }),
        ]);
        recognized = {
          firstName: device.employee.firstName,
          lastName: device.employee.lastName,
          action,
        };
      }
    }

    return {
      sessionId: session.id,
      buildingName: session.building.name,
      entryLabel: session.entryLabel,
      transactionExpiresAt: session.transactionExpiresAt,
      recognized,
    };
  }

  async identify(sessionId: string, pin: string) {
    if (!/^\d{4}$/.test(pin || '')) throw new BadRequestException('PIN invalide');
    const now = new Date();
    const session = await this.prisma.presenceSession.findFirst({
      where: {
        id: sessionId,
        status: { in: ['STARTED', 'IDENTIFIED'] },
        failedAttempts: { lt: 5 },
        transactionExpiresAt: { gt: now },
      },
      include: { building: { select: { name: true } } },
    });
    if (!session) throw new UnauthorizedException('Transaction expirée ou invalide');
    const employee = await this.prisma.buildingEmployee.findFirst({
      where: {
        buildingId: session.buildingId,
        organizationId: session.organizationId,
        pin,
        isActive: true,
      },
    });
    if (!employee) {
      const failed = await this.prisma.presenceSession.update({
        where: { id: session.id },
        data: { failedAttempts: { increment: 1 } },
        select: { failedAttempts: true },
      });
      if (failed.failedAttempts >= 5) {
        await this.prisma.presenceSession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new UnauthorizedException('PIN invalide');
    }
    const action = await this.resolveAction(employee.id);
    await this.prisma.presenceSession.update({
      where: { id: session.id },
      data: {
        employeeId: employee.id,
        intendedAction: action,
        identifiedAt: now,
        status: 'IDENTIFIED',
      },
    });
    return {
      firstName: employee.firstName,
      lastName: employee.lastName,
      buildingName: session.building.name,
      entryLabel: session.entryLabel,
      action,
    };
  }

  async confirm(sessionId: string, action: 'CHECK_IN' | 'CHECK_OUT', idempotencyKey: string, rememberDevice: boolean) {
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey || '')) {
      throw new BadRequestException('Clé de répétition invalide');
    }
    if (action !== 'CHECK_IN' && action !== 'CHECK_OUT') throw new BadRequestException('Action invalide');
    const prior = await this.prisma.presenceSession.findFirst({
      where: { id: sessionId, idempotencyKey },
      include: { employee: true },
    });
    if (prior?.status === 'COMPLETED' && prior.idempotencyKey === idempotencyKey) {
      return this.completedResponse(prior, undefined);
    }

    let deviceToken: string | undefined;
    const result = await this.prisma.$transaction(async (tx: any) => {
      const session = await tx.presenceSession.findFirst({
        where: {
          id: sessionId,
          status: 'IDENTIFIED',
          transactionExpiresAt: { gt: new Date() },
        },
        include: { employee: true, building: { select: { name: true } } },
      });
      if (!session?.employee || session.intendedAction !== action) {
        throw new ConflictException('L’action ne correspond plus à l’état confirmé');
      }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.employeeId}))`;
      const open = await tx.occupancyRecord.findFirst({
        where: { employeeId: session.employeeId, status: 'IN' },
        orderBy: { checkedInAt: 'desc' },
      });
      let occupancyRecordId: string | null = open?.id ?? null;
      if (action === 'CHECK_IN') {
        if (!open) {
          const created = await tx.occupancyRecord.create({
            data: {
              buildingId: session.buildingId,
              organizationId: session.organizationId,
              type: 'EMPLOYE',
              status: 'IN',
              firstName: session.employee.firstName,
              lastName: session.employee.lastName,
              employeeId: session.employeeId,
            },
          });
          occupancyRecordId = created.id;
        }
      } else {
        if (!open) throw new ConflictException('La personne est déjà enregistrée comme sortie');
        await tx.occupancyRecord.update({
          where: { id: open.id },
          data: { status: 'OUT', checkedOutAt: new Date() },
        });
      }
      const completed = await tx.presenceSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          idempotencyKey,
          occupancyRecordId,
        },
        include: { employee: true, building: { select: { name: true } } },
      });
      if (rememberDevice) {
        deviceToken = randomBytes(32).toString('base64url');
        await tx.presenceDeviceSession.create({
          data: {
            tokenHash: digest(deviceToken),
            employeeId: session.employeeId,
            buildingId: session.buildingId,
            organizationId: session.organizationId,
            expiresAt: new Date(Date.now() + DEVICE_TTL_MS),
          },
        });
      }
      return completed;
    });
    return this.completedResponse(result, deviceToken);
  }

  async forgetDevice(deviceToken?: string) {
    if (!deviceToken) return { forgotten: true };
    await this.prisma.presenceDeviceSession.updateMany({
      where: { tokenHash: digest(deviceToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { forgotten: true };
  }

  async createDisplay(buildingId: string, organizationId: string, label: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId, isActive: true },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');
    const safeLabel = String(label || '').trim();
    if (safeLabel.length < 2 || safeLabel.length > 80) throw new BadRequestException('Nom d’entrée invalide');
    return this.prisma.presenceKioskDisplay.create({
      data: { buildingId, organizationId, label: safeLabel },
      select: { id: true, label: true, publicToken: true, isActive: true },
    });
  }

  async listDisplays(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');
    return this.prisma.presenceKioskDisplay.findMany({
      where: { buildingId, organizationId },
      select: {
        id: true,
        label: true,
        publicToken: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async resolveDisplay(publicToken: string) {
    const display = await this.prisma.presenceKioskDisplay.findFirst({
      where: { publicToken, isActive: true },
    });
    if (display) return display;
    const legacy = await this.prisma.buildingKioskToken.findFirst({
      where: { token: publicToken, isActive: true },
      include: { building: { select: { organizationId: true } } },
    });
    if (!legacy) throw new NotFoundException('Borne invalide');
    return {
      id: `legacy:${legacy.id}`,
      buildingId: legacy.buildingId,
      organizationId: legacy.building.organizationId,
      label: 'Entrée principale',
    };
  }

  private async resolveAction(employeeId: string): Promise<'CHECK_IN' | 'CHECK_OUT'> {
    const open = await this.prisma.occupancyRecord.findFirst({
      where: { employeeId, status: 'IN' },
      select: { id: true },
    });
    return open ? 'CHECK_OUT' : 'CHECK_IN';
  }

  private completedResponse(session: any, deviceToken?: string) {
    return {
      action: session.intendedAction,
      employee: session.employee
        ? {
            firstName: session.employee.firstName,
            lastName: session.employee.lastName,
          }
        : undefined,
      occupancyRecordId: session.occupancyRecordId,
      completedAt: session.completedAt,
      deviceToken,
    };
  }
}
