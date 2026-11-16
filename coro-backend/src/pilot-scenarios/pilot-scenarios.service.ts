import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PilotCheckStatus, PilotRunStatus, Prisma } from '@prisma/client';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompletePilotRunDto,
  CreatePilotRunDto,
  CreatePilotScenarioDto,
  UpdatePilotCheckDto,
} from './pilot-scenario.dto';
import { TOUR_PREMONT_E2E_CHECKLIST } from './pilot-scenario.checklist';

type Actor = { userId: string; role: string };
type TenantActor = Actor & { organizationId: string };

const scenarioInclude = {
  organization: { select: { id: true, name: true, isActive: true } },
  building: {
    select: { id: true, name: true, isActive: true, organizationId: true },
  },
  project: {
    select: {
      id: true,
      name: true,
      status: true,
      isActive: true,
      organizationId: true,
      buildingId: true,
    },
  },
  runs: {
    orderBy: { sequence: 'desc' as const },
    include: {
      checks: {
        orderBy: [{ phase: 'asc' as const }, { checkKey: 'asc' as const }],
      },
    },
  },
};

export function runningPilotStatus(
  statuses: PilotCheckStatus[],
): PilotRunStatus {
  if (statuses.includes(PilotCheckStatus.FAIL)) return PilotRunStatus.FAILED;
  if (
    statuses.every(
      (status) =>
        status === PilotCheckStatus.PASS ||
        status === PilotCheckStatus.NOT_APPLICABLE,
    )
  ) {
    return PilotRunStatus.PASSED;
  }
  return statuses.some((status) => status !== PilotCheckStatus.NOT_RUN)
    ? PilotRunStatus.RUNNING
    : PilotRunStatus.PLANNED;
}

export function completedPilotStatus(
  statuses: PilotCheckStatus[],
): PilotRunStatus {
  if (statuses.includes(PilotCheckStatus.FAIL)) return PilotRunStatus.FAILED;
  if (
    statuses.every(
      (status) =>
        status === PilotCheckStatus.PASS ||
        status === PilotCheckStatus.NOT_APPLICABLE,
    )
  ) {
    return PilotRunStatus.PASSED;
  }
  return PilotRunStatus.PARTIAL;
}

@Injectable()
export class PilotScenariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  eligibleTargets() {
    return this.prisma.organization.findMany({
      where: {
        isActive: true,
        demoEnvironment: { is: { status: 'ACTIVE' } },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        buildings: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        },
        projects: {
          where: { isActive: true },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            name: true,
            buildingId: true,
            documentType: true,
            status: true,
          },
        },
      },
    });
  }

  list() {
    return this.prisma.pilotScenario.findMany({
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: scenarioInclude,
    });
  }

  listForTenant(actor: TenantActor) {
    this.requireTenantAdministrator(actor);
    return this.prisma.pilotScenario.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: scenarioInclude,
    });
  }

  async getForTenant(id: string, actor: TenantActor) {
    this.requireTenantAdministrator(actor);
    const scenario = await this.prisma.pilotScenario.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: scenarioInclude,
    });
    if (!scenario) throw new NotFoundException('ScÃ©nario pilote introuvable.');
    return scenario;
  }

  async get(id: string) {
    const scenario = await this.prisma.pilotScenario.findUnique({
      where: { id },
      include: scenarioInclude,
    });
    if (!scenario) throw new NotFoundException('Scénario pilote introuvable.');
    return scenario;
  }

  async create(dto: CreatePilotScenarioDto, actor: Actor) {
    return this.prisma.$transaction(
      async (tx) => {
        const organization = await tx.organization.findUnique({
          where: { id: dto.organizationId },
          select: {
            id: true,
            name: true,
            isActive: true,
            demoEnvironment: true,
          },
        });
        if (
          !organization?.isActive ||
          !organization.demoEnvironment ||
          organization.demoEnvironment.status !== 'ACTIVE'
        ) {
          throw new BadRequestException(
            'Le scénario doit cibler un environnement Démo actif et gouverné.',
          );
        }
        const [building, project] = await Promise.all([
          tx.building.findUnique({
            where: { id: dto.buildingId },
            select: { id: true, organizationId: true, isActive: true },
          }),
          tx.project.findUnique({
            where: { id: dto.projectId },
            select: {
              id: true,
              organizationId: true,
              buildingId: true,
              isActive: true,
            },
          }),
        ]);
        if (!building || building.organizationId !== dto.organizationId) {
          throw new BadRequestException(
            'Le bâtiment ne relève pas de l’organisation ciblée.',
          );
        }
        if (
          !project ||
          project.organizationId !== dto.organizationId ||
          project.buildingId !== dto.buildingId
        ) {
          throw new BadRequestException(
            'Le projet ne relève pas du bâtiment et de l’organisation ciblés.',
          );
        }
        if (!building.isActive)
          throw new BadRequestException('Le bâtiment ciblé est inactif.');
        if (!project.isActive)
          throw new BadRequestException('Le projet pilote ciblé est inactif.');

        try {
          const scenario = await tx.pilotScenario.create({
            data: {
              scenarioKey: dto.scenarioKey,
              name: dto.name.trim(),
              description: dto.description?.trim() || null,
              organizationId: dto.organizationId,
              buildingId: dto.buildingId,
              projectId: dto.projectId,
              createdById: actor.userId,
            },
            include: scenarioInclude,
          });
          await this.audit.record(tx, {
            actorUserId: actor.userId,
            action: 'PILOT_SCENARIO_CREATED',
            targetType: 'PilotScenario',
            targetId: scenario.id,
            targetLabel: scenario.name,
            organizationId: dto.organizationId,
            reason: this.audit.normalizeReason(dto.reason, true),
            afterData: {
              scenarioKey: scenario.scenarioKey,
              buildingId: dto.buildingId,
              projectId: dto.projectId,
            },
          });
          return scenario;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            throw new ConflictException(
              'Cette clé de scénario pilote existe déjà.',
            );
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createRun(scenarioId: string, dto: CreatePilotRunDto, actor: Actor) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const scenario = await tx.pilotScenario.findUnique({
            where: { id: scenarioId },
          });
          if (!scenario || scenario.status !== 'ACTIVE')
            throw new NotFoundException('Scénario pilote actif introuvable.');
          const latest = await tx.pilotScenarioRun.findFirst({
            where: { scenarioId },
            orderBy: { sequence: 'desc' },
            select: { sequence: true },
          });
          const run = await tx.pilotScenarioRun.create({
            data: {
              scenarioId,
              sequence: (latest?.sequence ?? 0) + 1,
              environment: dto.environment,
              sourceCommit: dto.sourceCommit ?? null,
              createdById: actor.userId,
              checks: {
                create: TOUR_PREMONT_E2E_CHECKLIST.map((check) => ({
                  phase: check.phase,
                  checkKey: check.checkKey,
                  label: check.label,
                })),
              },
            },
            include: {
              checks: { orderBy: [{ phase: 'asc' }, { checkKey: 'asc' }] },
            },
          });
          await this.audit.record(tx, {
            actorUserId: actor.userId,
            action: 'PILOT_SCENARIO_RUN_CREATED',
            targetType: 'PilotScenarioRun',
            targetId: run.id,
            targetLabel: `${scenario.name} #${run.sequence}`,
            organizationId: scenario.organizationId,
            reason: this.audit.normalizeReason(dto.reason, true),
            afterData: {
              environment: run.environment,
              sourceCommit: run.sourceCommit,
              checkCount: run.checks.length,
            },
          });
          return run;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      ) {
        throw new ConflictException(
          'Une autre exécution a été créée simultanément. Actualisez le registre.',
        );
      }
      throw error;
    }
  }

  async updateCheck(
    scenarioId: string,
    runId: string,
    checkKey: string,
    dto: UpdatePilotCheckDto,
    actor: Actor,
  ) {
    return this.updateCheckInternal(scenarioId, runId, checkKey, dto, actor);
  }

  private async updateCheckInternal(
    scenarioId: string,
    runId: string,
    checkKey: string,
    dto: UpdatePilotCheckDto,
    actor: Actor,
    organizationId?: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const run = await tx.pilotScenarioRun.findFirst({
          where: {
            id: runId,
            scenarioId,
            ...(organizationId ? { scenario: { organizationId } } : {}),
          },
          include: { scenario: true, checks: true },
        });
        if (!run) throw new NotFoundException('Exécution pilote introuvable.');
        if (run.completedAt)
          throw new ConflictException('Cette exécution est déjà clôturée.');
        const existing = run.checks.find(
          (check) => check.checkKey === checkKey,
        );
        if (!existing)
          throw new NotFoundException('Contrôle pilote introuvable.');
        const observed = dto.status !== PilotCheckStatus.NOT_RUN;
        const updated = await tx.pilotScenarioCheck.update({
          where: { id: existing.id },
          data: {
            status: dto.status,
            notes: dto.notes?.trim() || null,
            evidence: dto.evidence,
            observedAt: observed ? new Date() : null,
            observedById: observed ? actor.userId : null,
          },
        });
        const statuses = run.checks.map((check) =>
          check.id === existing.id ? dto.status : check.status,
        );
        await tx.pilotScenarioRun.update({
          where: { id: runId },
          data: {
            status: runningPilotStatus(statuses),
            startedAt: run.startedAt ?? new Date(),
          },
        });
        await this.audit.record(tx, {
          actorUserId: actor.userId,
          action: 'PILOT_SCENARIO_CHECK_UPDATED',
          targetType: 'PilotScenarioCheck',
          targetId: updated.id,
          targetLabel: updated.checkKey,
          organizationId: run.scenario.organizationId,
          reason: this.audit.normalizeReason(dto.reason, true),
          beforeData: { status: existing.status },
          afterData: {
            status: updated.status,
            evidence: updated.evidence ?? null,
          },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async updateCheckForTenant(
    scenarioId: string,
    runId: string,
    checkKey: string,
    dto: UpdatePilotCheckDto,
    actor: TenantActor,
  ) {
    this.requireTenantAdministrator(actor);
    return this.updateCheckInternal(
      scenarioId,
      runId,
      checkKey,
      dto,
      actor,
      actor.organizationId,
    );
  }

  private requireTenantAdministrator(actor: TenantActor) {
    if (actor.role !== 'ADMIN' || !actor.organizationId) {
      throw new ForbiddenException(
        'Seul un administrateur du tenant peut exÃ©cuter cette recette pilote.',
      );
    }
  }

  async completeRun(
    scenarioId: string,
    runId: string,
    dto: CompletePilotRunDto,
    actor: Actor,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const run = await tx.pilotScenarioRun.findFirst({
          where: { id: runId, scenarioId },
          include: { scenario: true, checks: true },
        });
        if (!run) throw new NotFoundException('Exécution pilote introuvable.');
        if (run.completedAt) return run;
        const status = completedPilotStatus(
          run.checks.map((check) => check.status),
        );
        const updated = await tx.pilotScenarioRun.update({
          where: { id: runId },
          data: {
            status,
            startedAt: run.startedAt ?? new Date(),
            completedAt: new Date(),
          },
          include: {
            checks: { orderBy: [{ phase: 'asc' }, { checkKey: 'asc' }] },
          },
        });
        await this.audit.record(tx, {
          actorUserId: actor.userId,
          action: 'PILOT_SCENARIO_RUN_COMPLETED',
          targetType: 'PilotScenarioRun',
          targetId: run.id,
          targetLabel: `${run.scenario.name} #${run.sequence}`,
          organizationId: run.scenario.organizationId,
          reason: this.audit.normalizeReason(dto.reason, true),
          afterData: { status },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
