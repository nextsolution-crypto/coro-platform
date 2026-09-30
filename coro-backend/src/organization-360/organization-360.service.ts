import { Injectable, NotFoundException } from '@nestjs/common';
import { EntitlementResolver } from '../capability-entitlements/entitlement-resolver.service';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CAPABILITY_REGISTRY } from './capability-registry';
import { redactAuditLabel, redactAuditValue } from './audit-redaction';
import { AuditQueryDto, PageQueryDto } from './organization-360.dto';

type MetricClassification = 'CANONICAL' | 'INFERRED' | 'NOT_AVAILABLE';

@Injectable()
export class Organization360Service {
  constructor(private readonly prisma: PrismaService) {}

  private async organization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        isInternal: true,
        licenseType: true,
        commercialRelationship: true,
        isActive: true,
        sector: true,
        employeeCount: true,
        operatingHours: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!organization) throw new NotFoundException('Organisation introuvable.');
    return organization;
  }

  private pagination(query: PageQueryDto) {
    return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
  }

  private metric(
    code: string,
    label: string,
    classification: MetricClassification,
    value: number | null,
    source: string,
  ) {
    return {
      code,
      label,
      classification,
      value,
      source,
      billable: false,
      billingUsage: false,
      note:
        classification === 'INFERRED'
          ? 'Signal observationnel inféré; ne peut pas servir à la facturation.'
          : classification === 'NOT_AVAILABLE'
            ? 'Aucune source canonique disponible.'
            : 'Mesure canonique exposée en observation uniquement.',
    };
  }

  async overview(organizationId: string) {
    const organization = await this.organization(organizationId);
    const [
      users,
      activeUsers,
      clients,
      activeClients,
      sites,
      activeSites,
      projects,
      activeProjects,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { organizationId } }),
      this.prisma.user.count({ where: { organizationId, isActive: true } }),
      this.prisma.client.count({ where: { organizationId } }),
      this.prisma.client.count({ where: { organizationId, isActive: true } }),
      this.prisma.building.count({ where: { organizationId } }),
      this.prisma.building.count({ where: { organizationId, isActive: true } }),
      this.prisma.project.count({ where: { organizationId } }),
      this.prisma.project.count({ where: { organizationId, isActive: true } }),
    ]);
    return {
      organization,
      counts: {
        users,
        activeUsers,
        clients,
        activeClients,
        sites,
        activeSites,
        projects,
        activeProjects,
      },
      observationMode: true,
    };
  }

  async users(organizationId: string, query: PageQueryDto) {
    await this.organization(organizationId);
    const where = { organizationId };
    const [total, active, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { organizationId, isActive: true } }),
      this.prisma.user.findMany({
        where,
        ...this.pagination(query),
        orderBy: [
          { isActive: 'desc' },
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          title: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);
    return {
      summary: { total, active, inactive: total - active },
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async clients(organizationId: string, query: PageQueryDto) {
    await this.organization(organizationId);
    const where = { organizationId };
    const [total, active, items] = await this.prisma.$transaction([
      this.prisma.client.count({ where }),
      this.prisma.client.count({ where: { organizationId, isActive: true } }),
      this.prisma.client.findMany({
        where,
        ...this.pagination(query),
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          city: true,
          province: true,
          sector: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { buildings: true, clientUsers: true, projects: true },
          },
        },
      }),
    ]);
    return {
      summary: { total, active, inactive: total - active },
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async sites(organizationId: string, query: PageQueryDto) {
    await this.organization(organizationId);
    const where = { organizationId };
    const [total, active, items] = await this.prisma.$transaction([
      this.prisma.building.count({ where }),
      this.prisma.building.count({ where: { organizationId, isActive: true } }),
      this.prisma.building.findMany({
        where,
        ...this.pagination(query),
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          province: true,
          postalCode: true,
          buildingType: true,
          isActive: true,
          timeZone: true,
          latitude: true,
          longitude: true,
          client: { select: { id: true, name: true } },
          rueFacilityProfile: {
            select: {
              assessmentStatus: true,
              populationEnabled: true,
              populationProgram: {
                select: { id: true, status: true, deliveryMode: true },
              },
            },
          },
          _count: {
            select: {
              projects: true,
              incidentEvents: true,
              occupancyRecords: true,
              employees: true,
            },
          },
        },
      }),
    ]);
    return {
      summary: { total, active, inactive: total - active },
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  private async observationCounts(organizationId: string) {
    const [
      projects,
      activities,
      bookings,
      exercises,
      timelogEntries,
      incidents,
      incidentSites,
      occupancyRecords,
      sentinelleSites,
      populationPrograms,
      populationSubscribers,
      emailDeliveries,
      smsDeliveries,
    ] = await this.prisma.$transaction([
      this.prisma.project.count({ where: { organizationId } }),
      this.prisma.projectActivity.count({ where: { organizationId } }),
      this.prisma.booking.count({ where: { organizationId } }),
      this.prisma.exerciseReport.count({ where: { organizationId } }),
      this.prisma.timelogEntry.count({ where: { organizationId } }),
      this.prisma.incidentEvent.count({ where: { organizationId } }),
      this.prisma.building.count({
        where: { organizationId, incidentEvents: { some: {} } },
      }),
      this.prisma.occupancyRecord.count({ where: { organizationId } }),
      this.prisma.building.count({
        where: {
          organizationId,
          OR: [
            { incidentEvents: { some: {} } },
            { occupancyRecords: { some: {} } },
            { evacuationEvents: { some: {} } },
            { kioskToken: { isNot: null } },
            { alarmToken: { isNot: null } },
          ],
        },
      }),
      this.prisma.populationProgram.count({
        where: { rueFacilityProfile: { building: { organizationId } } },
      }),
      this.prisma.populationSubscriber.count({
        where: {
          program: { rueFacilityProfile: { building: { organizationId } } },
        },
      }),
      this.prisma.populationAlertDelivery.count({
        where: {
          channel: 'EMAIL',
          alert: {
            program: { rueFacilityProfile: { building: { organizationId } } },
          },
        },
      }),
      this.prisma.populationAlertDelivery.count({
        where: {
          channel: 'SMS',
          alert: {
            program: { rueFacilityProfile: { building: { organizationId } } },
          },
        },
      }),
    ]);
    return {
      projects,
      activities,
      bookings,
      exercises,
      timelogEntries,
      incidents,
      incidentSites,
      occupancyRecords,
      sentinelleSites,
      populationPrograms,
      populationSubscribers,
      emailDeliveries,
      smsDeliveries,
    };
  }

  async capabilities(organizationId: string) {
    await this.organization(organizationId);
    const c = await this.observationCounts(organizationId);
    const signals: Record<string, object[]> = {
      COMPLIANCE_OPERATIONS: [
        { code: 'PROJECTS', classification: 'CANONICAL', value: c.projects },
        {
          code: 'ACTIVITIES',
          classification: 'CANONICAL',
          value: c.activities,
        },
        { code: 'BOOKINGS', classification: 'CANONICAL', value: c.bookings },
        {
          code: 'EXERCISE_REPORTS',
          classification: 'CANONICAL',
          value: c.exercises,
        },
      ],
      PERFORMANCE: [
        {
          code: 'TIMELOG_ENTRIES',
          classification: 'CANONICAL',
          value: c.timelogEntries,
        },
      ],
      INCIDENT: [
        {
          code: 'INCIDENT_EVENTS',
          classification: 'CANONICAL',
          value: c.incidents,
        },
        {
          code: 'OBSERVED_INCIDENT_SITES',
          classification: 'INFERRED',
          value: c.incidentSites,
          billable: false,
        },
      ],
      KNOWLEDGE: [
        {
          code: 'ORGANIZATION_ACTIVATION',
          classification: 'NOT_AVAILABLE',
          value: null,
        },
      ],
      AI: [
        {
          code: 'ORGANIZATION_ACTIVATION',
          classification: 'NOT_AVAILABLE',
          value: null,
        },
        { code: 'CONSUMPTION', classification: 'NOT_AVAILABLE', value: null },
      ],
      NETWORK: [
        {
          code: 'OPERATIONAL_SIGNALS',
          classification: 'NOT_AVAILABLE',
          value: null,
        },
      ],
      SENTINELLE: [
        {
          code: 'OCCUPANCY_RECORDS',
          classification: 'CANONICAL',
          value: c.occupancyRecords,
        },
        {
          code: 'OBSERVED_SITES',
          classification: 'INFERRED',
          value: c.sentinelleSites,
          billable: false,
        },
      ],
      SENTINELLE_POPULATION: [
        {
          code: 'PROGRAMS',
          classification: 'CANONICAL',
          value: c.populationPrograms,
        },
        {
          code: 'SUBSCRIBERS',
          classification: 'CANONICAL',
          value: c.populationSubscribers,
        },
      ],
      CAMPUS: [
        {
          code: 'OPERATIONAL_SIGNALS',
          classification: 'NOT_AVAILABLE',
          value: null,
        },
      ],
    };
    const resolver = new EntitlementResolver(this.prisma);
    return Promise.all(
      CAPABILITY_REGISTRY.map(async (definition) => {
        const observedSignals = signals[definition.code];
        const measurable = observedSignals.filter(
          (signal) =>
            'value' in signal &&
            typeof (signal as { value?: unknown }).value === 'number',
        );
        const observed = measurable.length
          ? measurable.some(
              (signal) => ((signal as { value: number }).value ?? 0) > 0,
            )
          : null;
        const entitlement = await resolver.resolve({
          capabilityCode: definition.code,
          organizationId,
          observed,
        });
        return {
          ...definition,
          commercialEntitlement: entitlement.licensed
            ? 'CONFIGURED_OBSERVATION_ONLY'
            : 'NOT_CONFIGURED',
          entitlement,
          observedSignals,
          mismatch: entitlement.mismatch,
          observationOnly: true,
          enforcement: 'NONE',
        };
      }),
    );
  }

  async commercial(organizationId: string) {
    const organization = await this.organization(organizationId);
    const contracts = await this.prisma.organizationContract.findMany({
      where: { organizationId },
      include: {
        revisions: {
          include: {
            priceBookVersion: { include: { priceBook: true } },
            adjustments: true,
            exclusivities: { include: { sectors: true, capabilities: true } },
            commitments: true,
            documents: true,
          },
          orderBy: { revisionNumber: 'desc' },
        },
        documents: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
    const [proposals, entitlementSummary] = await this.prisma.$transaction([
      this.prisma.commercialProposal.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          acceptedRevisionId: true,
          acceptedAt: true,
          updatedAt: true,
          acceptedRevision: {
            select: {
              id: true,
              revisionNumber: true,
              sourcePriceBookVersionId: true,
              priceBookCodeSnapshot: true,
              priceBookVersionSnapshot: true,
              sourceContractRevision: {
                select: { id: true, contractId: true },
              },
            },
          },
        },
      }),
      this.prisma.capabilityEntitlement.groupBy({
        by: ['source'],
        where: { organizationId },
        orderBy: { source: 'asc' },
        _count: { id: true },
      }),
    ]);
    const currentContract =
      contracts.find((item) => item.isPrimary && item.status === 'ACTIVE') ??
      null;
    return {
      legacy: {
        licenseType: organization.licenseType,
        organizationStatus: organization.isActive ? 'ACTIVE' : 'SUSPENDED',
      },
      futureCommercialModel: 'NOT_CONFIGURED',
      relationship: organization.commercialRelationship ?? 'NOT_CONFIGURED',
      contract: currentContract ?? 'NOT_CONFIGURED',
      contracts,
      proposals,
      acceptedProposal:
        proposals.find((proposal) => proposal.acceptedRevisionId) ?? null,
      entitlementSummary,
      pricing: currentContract ? 'CONTRACT_SNAPSHOT' : 'NOT_CONFIGURED',
      entitlements: 'OBSERVATION_ONLY',
      enforcement: 'NONE',
      billing: 'NOT_CONFIGURED',
      editable: false,
    };
  }

  async usage(organizationId: string) {
    await this.organization(organizationId);
    const c = await this.observationCounts(organizationId);
    const [activeUsers, clients, sites] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { organizationId, isActive: true } }),
      this.prisma.client.count({ where: { organizationId } }),
      this.prisma.building.count({ where: { organizationId } }),
    ]);
    return {
      observationMode: true,
      generatedAt: new Date(),
      metrics: [
        this.metric(
          'ACTIVE_USERS',
          'Utilisateurs actifs',
          'CANONICAL',
          activeUsers,
          'User.isActive',
        ),
        this.metric(
          'SERVED_CLIENTS',
          'Clients desservis',
          'CANONICAL',
          clients,
          'Client.organizationId',
        ),
        this.metric(
          'SITES',
          'Sites',
          'CANONICAL',
          sites,
          'Building.organizationId',
        ),
        this.metric(
          'PROJECTS',
          'Projets',
          'CANONICAL',
          c.projects,
          'Project.organizationId',
        ),
        this.metric(
          'BOOKINGS',
          'Réservations',
          'CANONICAL',
          c.bookings,
          'Booking.organizationId',
        ),
        this.metric(
          'INCIDENT_EVENTS',
          'Incidents',
          'CANONICAL',
          c.incidents,
          'IncidentEvent.organizationId',
        ),
        this.metric(
          'INCIDENT_SITES',
          'Sites Incident observés',
          'INFERRED',
          c.incidentSites,
          'Building avec IncidentEvent',
        ),
        this.metric(
          'SENTINELLE_SITES',
          'Sites Sentinelle observés',
          'INFERRED',
          c.sentinelleSites,
          'Signaux occupancy/évacuation/incident/tokens',
        ),
        this.metric(
          'POPULATION_INSTALLATIONS',
          'Installations Population',
          'CANONICAL',
          c.populationPrograms,
          'PopulationProgram',
        ),
        this.metric(
          'POPULATION_EMAIL_DELIVERIES',
          'Livraisons email Population',
          'CANONICAL',
          c.emailDeliveries,
          'PopulationAlertDelivery.EMAIL',
        ),
        this.metric(
          'POPULATION_SMS_DELIVERIES',
          'Livraisons SMS Population',
          'CANONICAL',
          c.smsDeliveries,
          'PopulationAlertDelivery.SMS',
        ),
        this.metric(
          'BILLABLE_PROFESSIONALS',
          'Professionnels facturables',
          'NOT_AVAILABLE',
          null,
          'Définition commerciale absente',
        ),
        this.metric(
          'KNOWLEDGE_ACTIVATIONS',
          'Activations Knowledge',
          'NOT_AVAILABLE',
          null,
          'Aucun état persistant',
        ),
        this.metric(
          'AI_ACTIVATIONS',
          'Activations AI',
          'NOT_AVAILABLE',
          null,
          'Aucun état persistant',
        ),
        this.metric(
          'AI_CONSUMPTION',
          'Consommation AI',
          'NOT_AVAILABLE',
          null,
          'Aucun usage ledger',
        ),
      ],
    };
  }

  async security(organizationId: string) {
    const organization = await this.organization(organizationId);
    const [activeUsers, inactiveUsers, roles, pendingMfaChallenges, lastAudit] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { organizationId, isActive: true } }),
        this.prisma.user.count({ where: { organizationId, isActive: false } }),
        this.prisma.user.groupBy({
          by: ['role'],
          where: { organizationId },
          orderBy: { role: 'asc' },
          _count: { id: true },
        }),
        this.prisma.platformMfaChallenge.count({
          where: {
            user: { organizationId },
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
        }),
        this.prisma.adminAuditEvent.findFirst({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, action: true },
        }),
      ]);
    return {
      organizationStatus: organization.isActive ? 'ACTIVE' : 'SUSPENDED',
      activeUsers,
      inactiveUsers,
      usersByRole: (
        roles as unknown as Array<{ role: string; _count: { id: number } }>
      ).map((entry) => ({ role: entry.role, count: entry._count.id })),
      pendingMfaChallenges,
      sessionVersioning: 'ENABLED',
      adminAudit: 'ENABLED_APPEND_ONLY',
      lastAdministrativeEvent: lastAudit,
      secretsExposed: false,
    };
  }

  async auditEvents(organizationId: string, query: AuditQueryDto) {
    await this.organization(organizationId);
    const where: Prisma.AdminAuditEventWhereInput = {
      organizationId,
      ...(query.action && { action: query.action }),
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.targetId && { targetId: query.targetId }),
      ...(query.actorUserId && { actorUserId: query.actorUserId }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: query.from }),
          ...(query.to && { lte: query.to }),
        },
      }),
    };
    const [total, events] = await this.prisma.$transaction([
      this.prisma.adminAuditEvent.count({ where }),
      this.prisma.adminAuditEvent.findMany({
        where,
        ...this.pagination(query),
        orderBy: [{ createdAt: query.order }, { id: query.order }],
        select: {
          id: true,
          actorUserId: true,
          actorDisplayName: true,
          actorRole: true,
          action: true,
          targetType: true,
          targetId: true,
          targetLabel: true,
          organizationId: true,
          reason: true,
          requestId: true,
          beforeData: true,
          afterData: true,
          schemaVersion: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      items: events.map((event) => ({
        ...event,
        targetLabel: redactAuditLabel(event.targetLabel),
        reason: redactAuditLabel(event.reason),
        beforeData: redactAuditValue(event.beforeData),
        afterData: redactAuditValue(event.afterData),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      readOnly: true,
    };
  }
}
