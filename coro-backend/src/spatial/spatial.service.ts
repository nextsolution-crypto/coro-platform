import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DisplayPermission,
  Prisma,
  SpatialResourceStatus,
} from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ArchiveSpatialResourceDto,
  CreateDisplayLocationDto,
  CreateFloorDto,
  CreateZoneDto,
  normalizeSpatialCode,
  SpatialListQueryDto,
  UpdateDisplayLocationDto,
  UpdateFloorDto,
  UpdateZoneDto,
} from './dto/spatial.dto';
import {
  SpatialActor,
  SpatialAuthorizationService,
} from './spatial-authorization.service';

@Injectable()
export class SpatialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: SpatialAuthorizationService,
    private readonly audit: AdminAuditService,
  ) {}

  async listFloors(
    organizationId: string,
    buildingId: string,
    actor: SpatialActor,
    query: SpatialListQueryDto,
  ) {
    await this.readAccess(organizationId, buildingId, actor);
    const { offset, limit } = this.page(query);
    const where: Prisma.BuildingFloorWhereInput = {
      organizationId,
      buildingId,
      status: query.status ?? { not: SpatialResourceStatus.ARCHIVED },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.buildingFloor.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.buildingFloor.count({ where }),
    ]);
    return { items, total, offset, limit };
  }

  async getFloor(
    organizationId: string,
    buildingId: string,
    floorId: string,
    actor: SpatialActor,
  ) {
    await this.readAccess(organizationId, buildingId, actor);
    return this.requireFloor(this.prisma, organizationId, buildingId, floorId);
  }

  async createFloor(
    organizationId: string,
    buildingId: string,
    dto: CreateFloorDto,
    actor: SpatialActor,
  ) {
    await this.mutationAccess(organizationId, buildingId, actor);
    return this.inTransaction(buildingId, async (tx) => {
      await this.requireActiveBuilding(tx, organizationId, buildingId);
      try {
        const floor = await tx.buildingFloor.create({
          data: {
            organizationId,
            buildingId,
            code: this.code(dto.code),
            name: this.text(dto.name, 'nom'),
            levelNumber: dto.levelNumber,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
        await this.record(
          tx,
          actor,
          organizationId,
          'BUILDING_FLOOR_CREATED',
          'BuildingFloor',
          floor.id,
          floor.name,
          undefined,
          floor,
        );
        return floor;
      } catch (error) {
        this.rethrowConstraint(
          error,
          'Un étage porte déjà ce code dans ce bâtiment.',
        );
      }
    });
  }

  async updateFloor(
    organizationId: string,
    buildingId: string,
    floorId: string,
    dto: UpdateFloorDto,
    actor: SpatialActor,
  ) {
    await this.mutationAccess(organizationId, buildingId, actor);
    return this.inTransaction(buildingId, async (tx) => {
      await this.requireActiveBuilding(tx, organizationId, buildingId);
      const current = await this.requireFloor(
        tx,
        organizationId,
        buildingId,
        floorId,
        true,
      );
      const data: Prisma.BuildingFloorUpdateManyMutationInput = {
        ...(dto.code !== undefined && { code: this.code(dto.code) }),
        ...(dto.name !== undefined && { name: this.text(dto.name, 'nom') }),
        ...(dto.levelNumber !== undefined && { levelNumber: dto.levelNumber }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        lockVersion: { increment: 1 },
      };
      try {
        await this.optimisticUpdate(
          tx.buildingFloor,
          {
            id: floorId,
            organizationId,
            buildingId,
            status: { not: 'ARCHIVED' },
            lockVersion: dto.expectedLockVersion,
          },
          data,
        );
      } catch (error) {
        this.rethrowConstraint(
          error,
          'Un étage porte déjà ce code dans ce bâtiment.',
        );
      }
      const updated = await this.requireFloor(
        tx,
        organizationId,
        buildingId,
        floorId,
      );
      await this.record(
        tx,
        actor,
        organizationId,
        'BUILDING_FLOOR_UPDATED',
        'BuildingFloor',
        floorId,
        updated.name,
        current,
        updated,
      );
      return updated;
    });
  }

  async archiveFloor(
    organizationId: string,
    buildingId: string,
    floorId: string,
    dto: ArchiveSpatialResourceDto,
    actor: SpatialActor,
  ) {
    await this.mutationAccess(organizationId, buildingId, actor);
    return this.inTransaction(buildingId, async (tx) => {
      await this.requireActiveBuilding(tx, organizationId, buildingId);
      const current = await this.requireFloor(
        tx,
        organizationId,
        buildingId,
        floorId,
        true,
      );
      const dependants = await Promise.all([
        tx.buildingZone.count({
          where: {
            organizationId,
            buildingId,
            floorId,
            status: { not: 'ARCHIVED' },
          },
        }),
        tx.displayLocation.count({
          where: {
            organizationId,
            buildingId,
            floorId,
            status: { not: 'ARCHIVED' },
          },
        }),
      ]);
      if (dependants[0] || dependants[1])
        throw new ConflictException(
          "L'étage possède encore des zones ou emplacements actifs.",
        );
      await this.optimisticUpdate(
        tx.buildingFloor,
        {
          id: floorId,
          organizationId,
          buildingId,
          status: { not: 'ARCHIVED' },
          lockVersion: dto.expectedLockVersion,
        },
        { status: 'ARCHIVED', lockVersion: { increment: 1 } },
      );
      const archived = await this.requireFloor(
        tx,
        organizationId,
        buildingId,
        floorId,
      );
      await this.record(
        tx,
        actor,
        organizationId,
        'BUILDING_FLOOR_ARCHIVED',
        'BuildingFloor',
        floorId,
        archived.name,
        current,
        archived,
      );
      return archived;
    });
  }

  async listZones(
    organizationId: string,
    buildingId: string,
    floorId: string,
    actor: SpatialActor,
    query: SpatialListQueryDto,
  ) {
    await this.readAccess(organizationId, buildingId, actor);
    await this.requireFloor(this.prisma, organizationId, buildingId, floorId);
    const { offset, limit } = this.page(query);
    const where: Prisma.BuildingZoneWhereInput = {
      organizationId,
      buildingId,
      floorId,
      status: query.status ?? { not: 'ARCHIVED' },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.buildingZone.findMany({
        where,
        orderBy: [{ code: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.buildingZone.count({ where }),
    ]);
    return { items, total, offset, limit };
  }

  async getZone(
    organizationId: string,
    buildingId: string,
    floorId: string,
    zoneId: string,
    actor: SpatialActor,
  ) {
    await this.readAccess(organizationId, buildingId, actor);
    return this.requireZone(
      this.prisma,
      organizationId,
      buildingId,
      floorId,
      zoneId,
    );
  }

  async createZone(
    organizationId: string,
    buildingId: string,
    floorId: string,
    dto: CreateZoneDto,
    actor: SpatialActor,
  ) {
    await this.mutationAccess(organizationId, buildingId, actor);
    return this.inTransaction(buildingId, async (tx) => {
      await this.requireActiveBuilding(tx, organizationId, buildingId);
      await this.requireFloor(tx, organizationId, buildingId, floorId, true);
      try {
        const zone = await tx.buildingZone.create({
          data: {
            organizationId,
            buildingId,
            floorId,
            code: this.code(dto.code),
            name: this.text(dto.name, 'nom'),
            description: dto.description?.trim() || null,
            geometry: dto.geometry as Prisma.InputJsonValue | undefined,
          },
        });
        await this.record(
          tx,
          actor,
          organizationId,
          'BUILDING_ZONE_CREATED',
          'BuildingZone',
          zone.id,
          zone.name,
          undefined,
          zone,
        );
        return zone;
      } catch (error) {
        this.rethrowConstraint(
          error,
          'Une zone porte déjà ce code à cet étage.',
        );
      }
    });
  }

  async updateZone(
    organizationId: string,
    buildingId: string,
    floorId: string,
    zoneId: string,
    dto: UpdateZoneDto,
    actor: SpatialActor,
  ) {
    await this.mutationAccess(organizationId, buildingId, actor);
    return this.inTransaction(buildingId, async (tx) => {
      await this.requireActiveBuilding(tx, organizationId, buildingId);
      const current = await this.requireZone(
        tx,
        organizationId,
        buildingId,
        floorId,
        zoneId,
        true,
      );
      try {
        await this.optimisticUpdate(
          tx.buildingZone,
          {
            id: zoneId,
            organizationId,
            buildingId,
            floorId,
            status: { not: 'ARCHIVED' },
            lockVersion: dto.expectedLockVersion,
          },
          {
            ...(dto.code !== undefined && { code: this.code(dto.code) }),
            ...(dto.name !== undefined && { name: this.text(dto.name, 'nom') }),
            ...(dto.description !== undefined && {
              description: dto.description?.trim() || null,
            }),
            ...(dto.geometry !== undefined && {
              geometry: dto.geometry,
            }),
            lockVersion: { increment: 1 },
          },
        );
      } catch (error) {
        this.rethrowConstraint(
          error,
          'Une zone porte déjà ce code à cet étage.',
        );
      }
      const updated = await this.requireZone(
        tx,
        organizationId,
        buildingId,
        floorId,
        zoneId,
      );
      await this.record(
        tx,
        actor,
        organizationId,
        'BUILDING_ZONE_UPDATED',
        'BuildingZone',
        zoneId,
        updated.name,
        current,
        updated,
      );
      return updated;
    });
  }

  async archiveZone(
    organizationId: string,
    buildingId: string,
    floorId: string,
    zoneId: string,
    dto: ArchiveSpatialResourceDto,
    actor: SpatialActor,
  ) {
    await this.mutationAccess(organizationId, buildingId, actor);
    return this.inTransaction(buildingId, async (tx) => {
      await this.requireActiveBuilding(tx, organizationId, buildingId);
      const current = await this.requireZone(
        tx,
        organizationId,
        buildingId,
        floorId,
        zoneId,
        true,
      );
      if (
        await tx.displayLocation.count({
          where: {
            organizationId,
            buildingId,
            floorId,
            zoneId,
            status: { not: 'ARCHIVED' },
          },
        })
      )
        throw new ConflictException(
          'La zone possède encore des emplacements actifs.',
        );
      await this.optimisticUpdate(
        tx.buildingZone,
        {
          id: zoneId,
          organizationId,
          buildingId,
          floorId,
          status: { not: 'ARCHIVED' },
          lockVersion: dto.expectedLockVersion,
        },
        { status: 'ARCHIVED', lockVersion: { increment: 1 } },
      );
      const archived = await this.requireZone(
        tx,
        organizationId,
        buildingId,
        floorId,
        zoneId,
      );
      await this.record(
        tx,
        actor,
        organizationId,
        'BUILDING_ZONE_ARCHIVED',
        'BuildingZone',
        zoneId,
        archived.name,
        current,
        archived,
      );
      return archived;
    });
  }

  async listLocations(
    organizationId: string,
    buildingId: string,
    actor: SpatialActor,
    query: SpatialListQueryDto,
  ) {
    await this.readAccess(organizationId, buildingId, actor);
    const { offset, limit } = this.page(query);
    const where: Prisma.DisplayLocationWhereInput = {
      organizationId,
      buildingId,
      status: query.status ?? { not: 'ARCHIVED' },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.displayLocation.findMany({
        where,
        orderBy: [{ floorId: 'asc' }, { code: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.displayLocation.count({ where }),
    ]);
    return { items, total, offset, limit };
  }

  async getLocation(
    organizationId: string,
    buildingId: string,
    locationId: string,
    actor: SpatialActor,
  ) {
    await this.readAccess(organizationId, buildingId, actor);
    return this.requireLocation(
      this.prisma,
      organizationId,
      buildingId,
      locationId,
    );
  }

  async createLocation(
    organizationId: string,
    buildingId: string,
    dto: CreateDisplayLocationDto,
    actor: SpatialActor,
  ) {
    await this.mutationAccess(organizationId, buildingId, actor);
    return this.inTransaction(buildingId, async (tx) => {
      await this.requireActiveBuilding(tx, organizationId, buildingId);
      await this.requireFloor(
        tx,
        organizationId,
        buildingId,
        dto.floorId,
        true,
      );
      if (dto.zoneId)
        await this.requireZone(
          tx,
          organizationId,
          buildingId,
          dto.floorId,
          dto.zoneId,
          true,
        );
      this.validateCoordinatePairs(dto);
      try {
        const location = await tx.displayLocation.create({
          data: {
            organizationId,
            buildingId,
            floorId: dto.floorId,
            zoneId: dto.zoneId,
            code: this.code(dto.code),
            label: this.text(dto.label, 'libellé'),
            description: dto.description?.trim() || null,
            positionX: dto.positionX,
            positionY: dto.positionY,
            orientationDegrees: dto.orientationDegrees,
            youAreHereX: dto.youAreHereX,
            youAreHereY: dto.youAreHereY,
          },
        });
        await this.record(
          tx,
          actor,
          organizationId,
          'DISPLAY_LOCATION_CREATED',
          'DisplayLocation',
          location.id,
          location.label,
          undefined,
          location,
        );
        return location;
      } catch (error) {
        this.rethrowConstraint(
          error,
          'Un emplacement porte déjà ce code dans ce bâtiment.',
        );
      }
    });
  }

  async updateLocation(
    organizationId: string,
    buildingId: string,
    locationId: string,
    dto: UpdateDisplayLocationDto,
    actor: SpatialActor,
  ) {
    await this.mutationAccess(organizationId, buildingId, actor);
    return this.inTransaction(buildingId, async (tx) => {
      await this.requireActiveBuilding(tx, organizationId, buildingId);
      const current = await this.requireLocation(
        tx,
        organizationId,
        buildingId,
        locationId,
        true,
      );
      const floorId = dto.floorId ?? current.floorId;
      const zoneId = dto.zoneId === undefined ? current.zoneId : dto.zoneId;
      await this.requireFloor(tx, organizationId, buildingId, floorId, true);
      if (zoneId)
        await this.requireZone(
          tx,
          organizationId,
          buildingId,
          floorId,
          zoneId,
          true,
        );
      this.validateCoordinatePairs({ ...current, ...dto });
      try {
        await this.optimisticUpdate(
          tx.displayLocation,
          {
            id: locationId,
            organizationId,
            buildingId,
            status: { not: 'ARCHIVED' },
            lockVersion: dto.expectedLockVersion,
          },
          {
            ...(dto.floorId !== undefined && { floorId: dto.floorId }),
            ...(dto.zoneId !== undefined && { zoneId: dto.zoneId }),
            ...(dto.code !== undefined && { code: this.code(dto.code) }),
            ...(dto.label !== undefined && {
              label: this.text(dto.label, 'libellé'),
            }),
            ...(dto.description !== undefined && {
              description: dto.description?.trim() || null,
            }),
            ...(dto.positionX !== undefined && { positionX: dto.positionX }),
            ...(dto.positionY !== undefined && { positionY: dto.positionY }),
            ...(dto.orientationDegrees !== undefined && {
              orientationDegrees: dto.orientationDegrees,
            }),
            ...(dto.youAreHereX !== undefined && {
              youAreHereX: dto.youAreHereX,
            }),
            ...(dto.youAreHereY !== undefined && {
              youAreHereY: dto.youAreHereY,
            }),
            lockVersion: { increment: 1 },
          },
        );
      } catch (error) {
        this.rethrowConstraint(
          error,
          'Un emplacement porte déjà ce code dans ce bâtiment.',
        );
      }
      const updated = await this.requireLocation(
        tx,
        organizationId,
        buildingId,
        locationId,
      );
      await this.record(
        tx,
        actor,
        organizationId,
        'DISPLAY_LOCATION_UPDATED',
        'DisplayLocation',
        locationId,
        updated.label,
        current,
        updated,
      );
      return updated;
    });
  }

  async archiveLocation(
    organizationId: string,
    buildingId: string,
    locationId: string,
    dto: ArchiveSpatialResourceDto,
    actor: SpatialActor,
  ) {
    await this.mutationAccess(organizationId, buildingId, actor);
    return this.inTransaction(buildingId, async (tx) => {
      await this.requireActiveBuilding(tx, organizationId, buildingId);
      const current = await this.requireLocation(
        tx,
        organizationId,
        buildingId,
        locationId,
        true,
      );
      await this.optimisticUpdate(
        tx.displayLocation,
        {
          id: locationId,
          organizationId,
          buildingId,
          status: { not: 'ARCHIVED' },
          lockVersion: dto.expectedLockVersion,
        },
        { status: 'ARCHIVED', lockVersion: { increment: 1 } },
      );
      const archived = await this.requireLocation(
        tx,
        organizationId,
        buildingId,
        locationId,
      );
      await this.record(
        tx,
        actor,
        organizationId,
        'DISPLAY_LOCATION_ARCHIVED',
        'DisplayLocation',
        locationId,
        archived.label,
        current,
        archived,
      );
      return archived;
    });
  }

  private async readAccess(
    organizationId: string,
    buildingId: string,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      DisplayPermission.DISPLAY_READ,
    );
    await this.requireBuilding(this.prisma, organizationId, buildingId);
  }

  private async mutationAccess(
    organizationId: string,
    buildingId: string,
    actor: SpatialActor,
  ) {
    await this.authorization.require(
      actor,
      organizationId,
      DisplayPermission.DISPLAY_DEVICE_MANAGE,
    );
    await this.requireActiveBuilding(this.prisma, organizationId, buildingId);
  }

  private async requireBuilding(
    db: PrismaService | Prisma.TransactionClient,
    organizationId: string,
    buildingId: string,
  ) {
    const value = await db.building.findFirst({
      where: { id: buildingId, organizationId },
      select: { id: true, isActive: true },
    });
    if (!value) throw new NotFoundException('Bâtiment introuvable.');
    return value;
  }

  private async requireActiveBuilding(
    db: PrismaService | Prisma.TransactionClient,
    organizationId: string,
    buildingId: string,
  ) {
    const value = await this.requireBuilding(db, organizationId, buildingId);
    if (!value.isActive)
      throw new ConflictException(
        'Le bâtiment est inactif et demeure en lecture seule.',
      );
    return value;
  }

  private async requireFloor(
    db: PrismaService | Prisma.TransactionClient,
    organizationId: string,
    buildingId: string,
    floorId: string,
    mutable = false,
  ) {
    const value = await db.buildingFloor.findFirst({
      where: { id: floorId, organizationId, buildingId },
    });
    if (!value) throw new NotFoundException('Étage introuvable.');
    if (mutable && value.status !== 'ACTIVE')
      throw new ConflictException(
        "L'étage inactif ou archivé est en lecture seule.",
      );
    return value;
  }

  private async requireZone(
    db: PrismaService | Prisma.TransactionClient,
    organizationId: string,
    buildingId: string,
    floorId: string,
    zoneId: string,
    mutable = false,
  ) {
    const value = await db.buildingZone.findFirst({
      where: { id: zoneId, organizationId, buildingId, floorId },
    });
    if (!value) throw new NotFoundException('Zone introuvable.');
    if (mutable && value.status !== 'ACTIVE')
      throw new ConflictException(
        'La zone inactive ou archivée est en lecture seule.',
      );
    return value;
  }

  private async requireLocation(
    db: PrismaService | Prisma.TransactionClient,
    organizationId: string,
    buildingId: string,
    locationId: string,
    mutable = false,
  ) {
    const value = await db.displayLocation.findFirst({
      where: { id: locationId, organizationId, buildingId },
    });
    if (!value) throw new NotFoundException('Emplacement introuvable.');
    if (mutable && value.status !== 'ACTIVE')
      throw new ConflictException(
        "L'emplacement inactif ou archivé est en lecture seule.",
      );
    return value;
  }

  private async inTransaction<T>(
    buildingId: string,
    action: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`spatial:${buildingId}`}, 0))`;
      return action(tx);
    });
  }

  private async optimisticUpdate(
    delegate: { updateMany(args: any): Promise<{ count: number }> },
    where: Record<string, unknown>,
    data: Record<string, unknown>,
  ) {
    const result = await delegate.updateMany({ where, data });
    if (result.count !== 1)
      throw new ConflictException(
        'La ressource a été modifiée par une autre opération. Rechargez-la.',
      );
  }

  private async record(
    tx: Prisma.TransactionClient,
    actor: SpatialActor,
    organizationId: string,
    action: string,
    targetType: string,
    targetId: string,
    targetLabel: string,
    beforeData?: unknown,
    afterData?: unknown,
  ) {
    await this.audit.record(tx, {
      actorUserId: actor.userId,
      organizationId,
      action,
      targetType,
      targetId,
      targetLabel,
      beforeData: beforeData as Prisma.InputJsonValue | undefined,
      afterData: afterData as Prisma.InputJsonValue | undefined,
    });
  }

  private code(value: string) {
    try {
      return normalizeSpatialCode(value);
    } catch {
      throw new BadRequestException(
        'Le code spatial doit contenir uniquement A-Z, 0-9, _ ou -.',
      );
    }
  }

  private text(value: string, label: string) {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException(`Le ${label} est requis.`);
    return normalized;
  }

  private validateCoordinatePairs(value: {
    positionX?: number | null;
    positionY?: number | null;
    youAreHereX?: number | null;
    youAreHereY?: number | null;
  }) {
    if ((value.positionX == null) !== (value.positionY == null))
      throw new BadRequestException(
        'La position X/Y doit être fournie en paire.',
      );
    if ((value.youAreHereX == null) !== (value.youAreHereY == null))
      throw new BadRequestException(
        'Le repère Vous êtes ici X/Y doit être fourni en paire.',
      );
  }

  private page(query: SpatialListQueryDto) {
    return { offset: query.offset ?? 0, limit: query.limit ?? 50 };
  }

  private rethrowConstraint(error: unknown, message: string): never {
    if (error instanceof ConflictException) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2003', 'P2014'].includes(error.code)
    )
      throw new ConflictException(message);
    throw error;
  }
}
