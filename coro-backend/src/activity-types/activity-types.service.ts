import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdviserActor } from '../auth/project-access';
import { Prisma } from '@prisma/client';
import { ActivityTypeInputDto } from './activity-types.dto';

@Injectable()
export class ActivityTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertReader(actor: AdviserActor) {
    if (!['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(actor.role)) throw new ForbiddenException('Accès refusé au catalogue');
  }
  private assertAdmin(actor: AdviserActor) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new ForbiddenException('Accès réservé aux administrateurs');
  }
  private scope(actor: AdviserActor) { return { OR: [{ organizationId: null }, { organizationId: actor.organizationId }] }; }

  async list(actor: AdviserActor, includeArchived = false) {
    this.assertReader(actor);
    if (includeArchived) this.assertAdmin(actor);
    return this.prisma.activityType.findMany({
      where: { ...this.scope(actor), ...(includeArchived ? {} : { isActive: true }) },
      orderBy: [{ displayOrder: 'asc' }, { nameFR: 'asc' }, { id: 'asc' }],
    });
  }

  async get(id: string, actor: AdviserActor, allowArchived = true) {
    this.assertReader(actor);
    const item = await this.prisma.activityType.findFirst({ where: { id, ...this.scope(actor), ...(allowArchived ? {} : { isActive: true }) } });
    if (!item) throw new NotFoundException("Type d'activité introuvable");
    return item;
  }

  async create(dto: ActivityTypeInputDto, actor: AdviserActor) {
    this.assertAdmin(actor);
    const nameFR = dto.nameFR.trim();
    if (!nameFR) throw new BadRequestException('Le nom français est obligatoire');
    const last = await this.prisma.activityType.findFirst({ where: { organizationId: actor.organizationId }, orderBy: [{ displayOrder: 'desc' }] });
    const slug = nameFR.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'type';
    return this.prisma.activityType.create({ data: {
      organizationId: actor.organizationId, code: `custom-${slug}-${randomUUID().slice(0, 8)}`,
      nameFR, nameEN: dto.nameEN?.trim() || null, descriptionFR: dto.descriptionFR?.trim() || null,
      descriptionEN: dto.descriptionEN?.trim() || null, visualToken: dto.visualToken, iconKey: dto.iconKey ?? null,
      defaultDurationMinutes: dto.defaultDurationMinutes ?? null, clientBookableDefault: dto.clientBookableDefault,
      displayOrder: dto.displayOrder ?? Math.min((last?.displayOrder ?? 0) + 10, 100000), isSystem: false,
    } });
  }

  private async custom(id: string, actor: AdviserActor) {
    this.assertAdmin(actor);
    const item = await this.prisma.activityType.findFirst({ where: { id, ...this.scope(actor) } });
    if (!item) throw new NotFoundException("Type d'activité introuvable");
    if (item.isSystem) throw new ForbiddenException('Un type CORO ne peut pas être modifié');
    if (item.organizationId !== actor.organizationId) throw new NotFoundException("Type d'activité introuvable");
    return item;
  }

  async update(id: string, dto: ActivityTypeInputDto, actor: AdviserActor) {
    await this.custom(id, actor);
    return this.prisma.activityType.update({ where: { id }, data: {
      nameFR: dto.nameFR.trim(), nameEN: dto.nameEN?.trim() || null, descriptionFR: dto.descriptionFR?.trim() || null,
      descriptionEN: dto.descriptionEN?.trim() || null, visualToken: dto.visualToken, iconKey: dto.iconKey ?? null,
      defaultDurationMinutes: dto.defaultDurationMinutes ?? null, clientBookableDefault: dto.clientBookableDefault,
      ...(dto.displayOrder === undefined ? {} : { displayOrder: dto.displayOrder }),
    } });
  }
  async reorder(id: string, displayOrder: number, actor: AdviserActor) {
    await this.custom(id, actor);
    return this.prisma.activityType.update({ where: { id }, data: { displayOrder } });
  }
  async archive(id: string, actor: AdviserActor) {
    await this.custom(id, actor);
    return this.prisma.activityType.update({ where: { id }, data: { isActive: false, archivedAt: new Date() } });
  }
  async restore(id: string, actor: AdviserActor) {
    await this.custom(id, actor);
    return this.prisma.activityType.update({ where: { id }, data: { isActive: true, archivedAt: null } });
  }
  async remove(id: string, actor: AdviserActor) {
    await this.custom(id, actor);
    const used = await this.prisma.projectActivity.count({ where: { activityTypeId: id } });
    if (used) throw new BadRequestException("Ce type est utilisé; archivez-le pour préserver l'historique");
    try {
      return await this.prisma.activityType.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException("Ce type vient d'être utilisé; archivez-le pour préserver l'historique");
      }
      throw error;
    }
  }
}
