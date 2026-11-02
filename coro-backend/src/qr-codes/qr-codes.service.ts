import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QrCodeStatus } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQrCodeDto, UpdateQrCodeDto } from './qr-codes.dto';

const ALLOWED_HOSTS = new Set([
  'getcoro.io',
  'www.getcoro.io',
  'app.getcoro.io',
  'client.getcoro.io',
]);
const TECHNICAL_USER_AGENT =
  /bot|crawler|spider|preview|monitor|health|uptime|headless|curl|wget|postman|insomnia/iu;

type Snapshot = {
  slug: string;
  permanentPath: string;
  destinationUrl: string;
  status: QrCodeStatus;
};

export const QR_CODE_SCOPE = 'GLOBAL' as const;

function decodedPathname(pathname: string): string {
  let decoded = pathname;
  for (let index = 0; index < 3; index += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      throw new BadRequestException('Chemin de destination ambigu.');
    }
  }
  return decoded.replace(/\\/gu, '/').replace(/\/{2,}/gu, '/');
}

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  private destination(value: string, permanentPath: string): string {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Destination URL invalide.');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      !ALLOWED_HOSTS.has(url.hostname.toLowerCase())
    )
      throw new BadRequestException(
        'La destination doit utiliser HTTPS sur un domaine CORO autorisé.',
      );
    if (
      url.hostname.replace(/^www\./u, '') === 'getcoro.io' &&
      decodedPathname(url.pathname).toLowerCase().startsWith('/qr/')
    )
      throw new BadRequestException(
        'Une destination QR ne peut pas pointer vers une autre route QR.',
      );
    if (`${url.pathname}${url.search}` === permanentPath)
      throw new BadRequestException('Boucle de redirection refusée.');
    return url.toString();
  }

  private snapshot(code: Snapshot): Snapshot {
    return {
      slug: code.slug,
      permanentPath: code.permanentPath,
      destinationUrl: code.destinationUrl,
      status: code.status,
    };
  }

  list() {
    return this.prisma.qrCode.findMany({
      orderBy: { createdAt: 'asc' },
      include: { changes: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async resolve(slug: string, userAgent = '', method = 'GET') {
    const code = await this.prisma.qrCode.findUnique({ where: { slug } });
    if (!code) throw new NotFoundException('Code QR inconnu.');
    if (code.status !== QrCodeStatus.ACTIVE)
      throw new GoneException('Code QR désactivé.');
    const destinationUrl = this.destination(
      code.destinationUrl,
      code.permanentPath,
    );
    const technical =
      method === 'HEAD' || !userAgent || TECHNICAL_USER_AGENT.test(userAgent);
    await this.prisma.qrCode.update({
      where: { id: code.id },
      data: technical
        ? { technicalRequestCount: { increment: 1 } }
        : { humanScanCount: { increment: 1 }, lastScanAt: new Date() },
    });
    return {
      destinationUrl,
      redirectStatus: 307,
      classification: technical ? 'TECHNICAL' : 'HUMAN_ESTIMATE',
      scope: QR_CODE_SCOPE,
    };
  }

  async create(dto: CreateQrCodeDto, actorUserId: string) {
    const permanentPath = `/qr/${dto.slug}`;
    const destinationUrl = this.destination(dto.destinationUrl, permanentPath);
    return this.prisma.$transaction(async (tx) => {
      const code = await tx.qrCode.create({
        data: { slug: dto.slug, permanentPath, destinationUrl },
      });
      const next = this.snapshot(code);
      await tx.qrCodeChange.create({
        data: {
          qrCodeId: code.id,
          actorUserId,
          action: 'QR_CODE_CREATED',
          reason: dto.reason.trim(),
          nextState: next,
        },
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'QR_CODE_CREATED',
        targetType: 'QR_CODE',
        targetId: code.id,
        targetLabel: code.slug,
        reason: dto.reason.trim(),
        afterData: next,
      });
      return code;
    });
  }

  async update(slug: string, dto: UpdateQrCodeDto, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.qrCode.findUnique({ where: { slug } });
      if (!current) throw new NotFoundException('Code QR inconnu.');
      const data: Prisma.QrCodeUpdateInput = {};
      if (dto.destinationUrl !== undefined)
        data.destinationUrl = this.destination(
          dto.destinationUrl,
          current.permanentPath,
        );
      if (dto.enabled !== undefined)
        data.status = dto.enabled ? QrCodeStatus.ACTIVE : QrCodeStatus.DISABLED;
      if (!Object.keys(data).length)
        throw new BadRequestException('Aucune modification demandée.');
      const result = await tx.qrCode.updateMany({
        where: {
          id: current.id,
          configurationVersion: dto.expectedVersion,
        },
        data: { ...data, configurationVersion: { increment: 1 } },
      });
      if (result.count !== 1)
        throw new ConflictException(
          'Ce code QR a été modifié par une autre session. Rechargez la page.',
        );
      const updated = await tx.qrCode.findUniqueOrThrow({
        where: { id: current.id },
      });
      const before = this.snapshot(current);
      const next = this.snapshot(updated);
      await tx.qrCodeChange.create({
        data: {
          qrCodeId: current.id,
          actorUserId,
          action: 'QR_CODE_UPDATED',
          reason: dto.reason.trim(),
          previousState: before,
          nextState: next,
        },
      });
      await this.audit.record(tx, {
        actorUserId,
        action: 'QR_CODE_UPDATED',
        targetType: 'QR_CODE',
        targetId: current.id,
        targetLabel: current.slug,
        reason: dto.reason.trim(),
        beforeData: before,
        afterData: next,
      });
      return updated;
    });
  }
}
