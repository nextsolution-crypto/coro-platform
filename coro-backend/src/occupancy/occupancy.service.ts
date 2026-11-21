import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CheckInDto,
  CheckOutDto,
  TriggerEvacuationDto,
  AccountForOccupantDto,
} from './occupancy.dto';

@Injectable()
export class OccupancyService {
  constructor(private prisma: PrismaService) {}

  // Valider le token de la borne
  private async validateKioskToken(buildingId: string, token: string) {
    const kiosk = await this.prisma.buildingKioskToken.findFirst({
      where: { buildingId, token, isActive: true },
    });
    if (!kiosk) throw new UnauthorizedException('Token de borne invalide');
    return kiosk;
  }

  // Obtenir ou créer le token de borne pour un bâtiment
  async getOrCreateKioskToken(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const existing = await this.prisma.buildingKioskToken.findUnique({
      where: { buildingId },
    });
    if (existing) return existing;

    return this.prisma.buildingKioskToken.create({
      data: { buildingId },
    });
  }

  // Régénérer le token (sécurité)
  async regenerateKioskToken(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const { randomUUID } = await import('crypto');
    return this.prisma.buildingKioskToken.upsert({
      where: { buildingId },
      update: { token: randomUUID(), updatedAt: new Date() },
      create: { buildingId, token: randomUUID() },
    });
  }

  // Obtenir ou créer le jeton du pont panneau d'alarme incendie (PAI)
  async getOrCreateAlarmToken(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const existing = await this.prisma.buildingAlarmToken.findUnique({
      where: { buildingId },
    });
    if (existing) return existing;

    return this.prisma.buildingAlarmToken.create({
      data: { buildingId },
    });
  }

  // Régénérer le jeton du pont panneau d'alarme (sécurité)
  async regenerateAlarmToken(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const { randomUUID } = await import('crypto');
    return this.prisma.buildingAlarmToken.upsert({
      where: { buildingId },
      update: { token: randomUUID(), updatedAt: new Date() },
      create: { buildingId, token: randomUUID() },
    });
  }

  // Check-in d'un occupant
  async checkIn(body: any) {
    const buildingId = typeof body?.buildingId === 'string' ? body.buildingId : '';
    const kioskToken = typeof body?.kioskToken === 'string' ? body.kioskToken : '';

    if (!buildingId) throw new BadRequestException('buildingId manquant');
    if (!kioskToken) throw new BadRequestException('kioskToken manquant');
    if (!['EMPLOYE', 'VISITEUR', 'CONTRACTEUR'].includes(body?.type)) {
      throw new BadRequestException('Type d’occupant invalide');
    }
    const text = (value: unknown, max: number) =>
      typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
    const firstName = text(body?.firstName, 80);
    const lastName = text(body?.lastName, 80);
    if (!firstName || !lastName) throw new BadRequestException('Prénom et nom requis');

    await this.validateKioskToken(buildingId, kioskToken);

    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { organizationId: true },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    return this.prisma.occupancyRecord.create({
      data: {
        buildingId,
        organizationId: building.organizationId,
        type: body.type,
        status: 'IN',
        firstName,
        lastName,
        company: text(body?.company, 120),
        email: text(body?.email, 160),
        phone: text(body?.phone, 40),
        reason: text(body?.reason, 200),
        hostName: text(body?.hostName, 120),
        floor: text(body?.floor, 40),
      },
      select: { id: true, type: true, checkedInAt: true },
    });
  }

  // Check-out d'un occupant
  // Sortie manuelle à la borne. Seules les entrées manuelles (sans profil
  // employé lié) peuvent sortir ici : un employé enregistré sort par son
  // propre parcours QR + NIP. Cela empêche de vider le registre
  // d'évacuation à distance avec le seul jeton de borne.
  async checkOut(body: any) {
    const recordId = typeof body?.recordId === 'string' ? body.recordId : '';
    const kioskToken = typeof body?.kioskToken === 'string' ? body.kioskToken : '';

    if (!recordId) throw new BadRequestException('recordId manquant');
    if (!kioskToken) throw new BadRequestException('kioskToken manquant');

    const record = await this.prisma.occupancyRecord.findUnique({
      where: { id: recordId },
      select: { id: true, buildingId: true, status: true, employeeId: true },
    });
    if (!record) throw new NotFoundException('Enregistrement introuvable');

    await this.validateKioskToken(record.buildingId, kioskToken);

    if (record.employeeId) {
      throw new ForbiddenException(
        'Les employés enregistrés sortent avec leur code QR et leur NIP.',
      );
    }
    const updated = await this.prisma.occupancyRecord.updateMany({
      where: { id: record.id, status: 'IN', employeeId: null },
      data: {
        status: 'OUT',
        checkedOutAt: new Date(),
        checkoutSource: 'KIOSK_MANUAL',
      },
    });
    if (updated.count !== 1) throw new NotFoundException('Présence active introuvable');
    return { id: record.id, status: 'OUT' };
  }

  // Obtenir les occupants actuellement présents
  async getCurrentOccupants(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const records = await this.prisma.occupancyRecord.findMany({
      where: { buildingId, status: 'IN' },
      orderBy: { checkedInAt: 'desc' },
    });

    const total = records.length;
    const byType = {
      EMPLOYE: records.filter((r) => r.type === 'EMPLOYE').length,
      VISITEUR: records.filter((r) => r.type === 'VISITEUR').length,
      CONTRACTEUR: records.filter((r) => r.type === 'CONTRACTEUR').length,
    };

    return { total, byType, records };
  }

  // Historique (tous IN et OUT du jour)
  async getTodayHistory(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.occupancyRecord.findMany({
      where: { buildingId, checkedInAt: { gte: startOfDay } },
      orderBy: { checkedInAt: 'desc' },
    });
  }

  // Déclencher une évacuation (snapshot figé)
  async triggerEvacuation(dto: TriggerEvacuationDto, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: dto.buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`sentinelle-evacuation:${dto.buildingId}`}, 0))`;
      const active = await tx.evacuationEvent.findFirst({
        where: { buildingId: dto.buildingId, organizationId, status: 'ACTIVE' }, select: { id: true },
      });
      if (active) throw new ConflictException('Une évacuation est déjà active pour ce bâtiment.');
      // Snapshot et dénombrement sont créés dans la même transaction.
    const presentOccupants = await tx.occupancyRecord.findMany({
      where: { buildingId: dto.buildingId, status: 'IN' },
    });

    const event = await tx.evacuationEvent.create({
      data: {
        buildingId: dto.buildingId,
        organizationId,
        triggeredBy: dto.triggeredBy,
        notes: dto.notes,
        totalPresent: presentOccupants.length,
        snapshot: presentOccupants as any,
        status: 'ACTIVE',
      },
    });

    // Créer les entrées de dénombrement pour chaque occupant
    if (presentOccupants.length > 0) {
      await tx.evacuationCheckIn.createMany({
        data: presentOccupants.map((o) => ({
          evacuationEventId: event.id,
          occupantRecordId: o.id,
          isAccountedFor: false,
        })),
      });
    }

    return event;
    });
  }

  // Obtenir l'évacuation active d'un bâtiment
  async getActiveEvacuation(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const event = await this.prisma.evacuationEvent.findFirst({
      where: { buildingId, status: 'ACTIVE' },
      orderBy: { triggeredAt: 'desc' },
      include: {
        checkins: {
          include: { occupantRecord: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!event) return null;

    return { ...event, ...summarizeAccountability(event.checkins) };
  }

  /** Identité d'un utilisateur du portail, lue en base (M5-05). */
  async resolveClientActor(clientUserId: string, organizationId: string): Promise<AccountabilityActor> {
    const user = clientUserId
      ? await this.prisma.clientUser.findFirst({
          where: { id: clientUserId, organizationId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : null;
    const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Utilisateur du portail';
    return { type: 'CLIENT_USER', id: user?.id ?? clientUserId ?? null, name };
  }

  /** Identité d'un conseiller, lue en base (M5-05). */
  async resolveAdvisorActor(userId: string, organizationId: string): Promise<AccountabilityActor> {
    const user = userId
      ? await this.prisma.user.findFirst({
          where: { id: userId, organizationId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : null;
    const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Conseiller';
    return { type: 'USER', id: user?.id ?? userId ?? null, name };
  }

  // Ancien parcours « ✓ Présent » : conservé, il passe par le même journal.
  async accountForOccupant(dto: AccountForOccupantDto, organizationId: string, actor?: AccountabilityActor) {
    return this.setAccountabilityStatus(
      {
        evacuationEventId: dto.evacuationEventId,
        occupantRecordId: dto.occupantRecordId,
        status: 'PRESENT',
      },
      organizationId,
      actor ?? { type: 'LEGACY', id: null, name: dto.checkedBy?.trim().slice(0, 120) || 'Responsable' },
    );
  }

  /**
   * Change l'état de dénombrement d'une personne (audit M5-04).
   * Chaque changement ajoute une ligne au journal ; rien n'est effacé.
   * L'identité vient de la session (M5-05), jamais du navigateur.
   */
  async setAccountabilityStatus(
    input: {
      evacuationEventId: string;
      occupantRecordId: string;
      status: string;
      note?: string | null;
      lastKnownLocation?: string | null;
      reportedToFire?: boolean;
      source?: string;
    },
    organizationId: string,
    actor: AccountabilityActor,
  ) {
    const status = input.status as AccountabilityStatus;
    if (!ACCOUNTABILITY_STATUSES.includes(status)) {
      throw new BadRequestException('État de dénombrement invalide.');
    }
    const note = cleanText(input.note, 500);
    const lastKnownLocation = cleanText(input.lastKnownLocation, 200);
    if (status === 'MISSING' && !lastKnownLocation) {
      throw new BadRequestException('Indiquez le dernier emplacement connu (étage, zone, ou « inconnu ») pour une personne manquante.');
    }
    const checkin = await this.prisma.evacuationCheckIn.findFirst({
      where: {
        evacuationEventId: input.evacuationEventId,
        evacuationEvent: { organizationId, status: 'ACTIVE' },
        occupantRecordId: input.occupantRecordId,
      },
    });
    if (!checkin)
      throw new NotFoundException('Entrée de dénombrement introuvable');

    const now = new Date();
    const reportedToFire = status === 'MISSING' && input.reportedToFire === true;
    const accounted = ACCOUNTED_STATUSES.includes(status);
    const [updated] = await this.prisma.$transaction([
      this.prisma.evacuationCheckIn.update({
        where: { id: checkin.id },
        data: {
          status,
          isAccountedFor: accounted,
          checkedAt: now,
          checkedBy: actor.name,
          note: note ?? (status === checkin.status ? checkin.note : null),
          lastKnownLocation: lastKnownLocation ?? checkin.lastKnownLocation ?? null,
          ...(reportedToFire && !checkin.reportedToFireAt ? { reportedToFireAt: now } : {}),
        },
      }),
      this.prisma.evacuationAccountabilityEvent.create({
        data: {
          checkinId: checkin.id,
          evacuationEventId: input.evacuationEventId,
          fromStatus: (checkin.status as AccountabilityStatus) ?? 'PENDING',
          toStatus: status,
          actorType: actor.type,
          actorId: actor.id,
          actorName: actor.name,
          source: input.source === 'SMS_REPLY' || input.source === 'MUSTER_QR' ? input.source : 'WARDEN',
          note,
          lastKnownLocation,
          reportedToFire,
        },
      }),
    ]);
    return updated;
  }

  /**
   * Clore une évacuation. Refusé tant qu'il reste des personnes « à
   * confirmer » ou « manquantes », sauf motif écrit (audit M5-04).
   */
  async resolveEvacuation(
    evacuationEventId: string,
    organizationId: string,
    options: { closureReason?: string | null; actorName?: string | null } = {},
  ) {
    const event = await this.prisma.evacuationEvent.findFirst({
      where: { id: evacuationEventId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Évacuation active introuvable');
    const unresolved = await this.prisma.evacuationCheckIn.count({
      where: { evacuationEventId, status: { in: ['PENDING', 'MISSING'] } },
    });
    const closureReason = cleanText(options.closureReason, 1000);
    if (unresolved > 0 && (!closureReason || closureReason.length < 10)) {
      throw new BadRequestException(
        `${unresolved} personne(s) restent à confirmer ou manquantes. Indiquez le motif de clôture et à quelle heure la liste a été remise aux pompiers.`,
      );
    }
    return this.prisma.evacuationEvent.update({
      where: { id: evacuationEventId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: cleanText(options.actorName, 120),
        closureReason,
      },
    });
  }

  // Historique des évacuations d'un bâtiment
  async getEvacuationHistory(buildingId: string, organizationId: string) {
    return this.prisma.evacuationEvent.findMany({
      where: { buildingId, organizationId },
      orderBy: { triggeredAt: 'desc' },
      take: 20,
    });
  }

    // Résoudre le buildingId depuis un token kiosque (route publique)
  async resolveBuildingFromToken(token: string) {
    const kiosk = await this.prisma.buildingKioskToken.findFirst({
      where: { token, isActive: true },
      select: { buildingId: true },
    });
    if (!kiosk) throw new NotFoundException('Token invalide');
    return { buildingId: kiosk.buildingId };
  }

  // Recherche d'occupants présents pour le checkout (par nom)
  // Recherche à la borne : uniquement les entrées manuelles présentes, avec
  // le strict minimum pour se reconnaître (prénom, initiale du nom, type,
  // heure d'arrivée). Jamais de courriel, téléphone, entreprise ou hôte.
  async searchOccupantsForCheckout(buildingId: string, token: string, query: string) {
    await this.validateKioskToken(buildingId, token);
    const q = typeof query === 'string' ? query.trim().slice(0, 60) : '';
    if (q.length < 2) return [];
    const records = await this.prisma.occupancyRecord.findMany({
      where: {
        buildingId,
        status: 'IN',
        employeeId: null,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName:  { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, type: true, firstName: true, lastName: true, checkedInAt: true },
      orderBy: { checkedInAt: 'desc' },
      take: 5,
    });
    return records.map((r) => ({
      id: r.id,
      type: r.type,
      firstName: r.firstName,
      lastName: r.lastName ? `${r.lastName.charAt(0)}.` : '',
      checkedInAt: r.checkedInAt,
    }));
  }

    // Historique filtré par date
  async getHistory(buildingId: string, organizationId: string, from: string, to: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const records = await this.prisma.occupancyRecord.findMany({
      where: {
        buildingId,
        checkedInAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { checkedInAt: 'desc' },
    });

    // Stats
    const total = records.length;
    const byType = {
      EMPLOYE:     records.filter(r => r.type === 'EMPLOYE').length,
      VISITEUR:    records.filter(r => r.type === 'VISITEUR').length,
      CONTRACTEUR: records.filter(r => r.type === 'CONTRACTEUR').length,
    };
    const avgDuration = records
      .filter(r => r.checkedOutAt)
      .reduce((acc, r) => {
        const diff = new Date(r.checkedOutAt!).getTime() - new Date(r.checkedInAt).getTime();
        return acc + diff;
      }, 0) / (records.filter(r => r.checkedOutAt).length || 1);

    return { records, total, byType, avgDurationMs: avgDuration };
  }

  // Détail complet d'une évacuation pour rapport
  async getEvacuationDetail(evacuationEventId: string, organizationId: string) {
    const event = await this.prisma.evacuationEvent.findFirst({
      where: { id: evacuationEventId, organizationId },
      include: {
        building: { select: { name: true, address: true, city: true } },
        checkins: {
          include: { occupantRecord: true },
          orderBy: [{ isAccountedFor: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!event) throw new NotFoundException('Évacuation introuvable');

    const duration  = event.resolvedAt
      ? Math.round((new Date(event.resolvedAt).getTime() - new Date(event.triggeredAt).getTime()) / 60000)
      : null;
    const journal = await this.prisma.evacuationAccountabilityEvent.findMany({
      where: { evacuationEventId },
      orderBy: { createdAt: 'asc' },
    });

    return { ...event, ...summarizeAccountability(event.checkins), durationMinutes: duration, journal };
  }

  // ── Résilience opérationnelle ─────────────────────────────────────────────

  async getReadiness(buildingId: string, token: string) {
    await this.validateKioskToken(buildingId, token);

    // Tous les membres de l'équipe d'urgence du bâtiment
    const allMembers = await this.prisma.buildingEmployee.findMany({
      where: { buildingId, isActive: true, isEmergencyMember: true },
      include: {
        emergencyRoles: { orderBy: { priority: 'asc' } },
        qualifications: true,
      },
    });

    // Toute présence ouverte, y compris les quarts traversant minuit.
    const presentRecords = await this.prisma.occupancyRecord.findMany({
      where: {
        buildingId,
        status: 'IN',
        type: 'EMPLOYE',
      },
      select: { employeeId: true },
    });
    const presentIds = new Set(
      presentRecords.map((r) => r.employeeId).filter(Boolean),
    );

    // Membres avec statut de présence
    const membersWithPresence = allMembers.map((emp) => ({
      ...emp,
      isPresent: presentIds.has(emp.id),
    }));

    // Couverture par rôle avec logique de substitution
    const ROLE_TYPES = [
      'COORDINATOR',
      'EPI',
      'ASSEMBLY_WARDEN',
      'SEARCHER',
      'EXIT_WARDEN',
      'PNA_ESCORT',
      'FIRST_AIDER',
    ];
    const roleCoverage = ROLE_TYPES.map((roleType) => {
      const membersForRole = allMembers
        .filter((m) => m.emergencyRoles.some((r) => r.role === roleType))
        .map((m) => {
          const roleEntry = m.emergencyRoles.find((r) => r.role === roleType)!;
          return {
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            isPresent: presentIds.has(m.id),
            assignType: roleEntry.assignType,
            priority: roleEntry.priority,
            zone: roleEntry.zone ?? null,
          };
        })
        // Tri : titulaires en premier (PRIMARY avant ALTERNATE), puis par priorité croissante
        .sort((a, b) => {
          if (a.assignType === b.assignType) return a.priority - b.priority;
          return a.assignType === 'PRIMARY' ? -1 : 1;
        });

      const presentForRole = membersForRole.filter((m) => m.isPresent);

      // Membre effectif : le premier présent dans l'ordre de priorité
      const effectiveMember =
        presentForRole.length > 0 ? presentForRole[0] : null;

      // Titulaire théorique (PRIMARY priorité 1)
      const primaryMember =
        membersForRole.find(
          (m) => m.assignType === 'PRIMARY' && m.priority === 1,
        ) ?? null;

      // Substitution active si le titulaire est absent et que le membre effectif est un substitut
      const substitutionActive =
        !!effectiveMember &&
        !!primaryMember &&
        !primaryMember.isPresent &&
        effectiveMember.id !== primaryMember.id;

      return {
        role: roleType,
        total: membersForRole.length,
        present: presentForRole.length,
        effectiveMember,
        primaryMember,
        substitutionActive,
        members: membersForRole,
      };
    }).filter((r) => r.total > 0);

    // Lacunes (aucun membre présent) et capacité réduite
    const gaps = roleCoverage.filter((r) => r.present === 0);
    const reduced = roleCoverage.filter(
      (r) => r.present > 0 && r.present < r.total,
    );

    // Rôles avec substitution active
    const substitutions = roleCoverage.filter((r) => r.substitutionActive);

    // Indice de préparation (% rôles couverts par au moins 1 membre présent)
    const totalRoles = roleCoverage.length;
    const coveredRoles = roleCoverage.filter((r) => r.present > 0).length;
    const readinessIndex =
      totalRoles > 0 ? Math.round((coveredRoles / totalRoles) * 100) : 100;
    const status =
      readinessIndex === 100
        ? 'READY'
        : readinessIndex >= 60
          ? 'REDUCED'
          : 'CRITICAL';

    return {
      status,
      readinessIndex,
      totalMembers: allMembers.length,
      presentMembers: membersWithPresence.filter((m) => m.isPresent).length,
      roleCoverage,
      gaps,
      reduced,
      substitutions,
      members: membersWithPresence,
      computedAt: new Date().toISOString(),
    };
  }

  // ── Résilience enrichie + Intelligence organisationnelle ──────────────────

  async getReadinessEnriched(buildingId: string, token: string) {
    const base = await this.getReadiness(buildingId, token);
    const recommendations: Array<{ type: string; category: string; message: string; action: string }> = [];

    // ── Plans (PMU/PSI) ───────────────────────────────────────────────────
    const activePlan = await this.prisma.project.findFirst({
      where: {
        buildingId,
        documentType: { in: ['PMU', 'PSI'] },
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      select: { status: true, updatedAt: true, documentType: true },
    });

    const planStatus    = activePlan?.status || null;
    const planUpdatedAt = activePlan?.updatedAt || null;
    const daysSincePlan = planUpdatedAt
      ? Math.floor((Date.now() - new Date(planUpdatedAt).getTime()) / 86400000)
      : null;
    const isPlanValid   = planStatus === 'VALIDATED' || planStatus === 'EXPORTED';
    const isPlanCurrent = daysSincePlan !== null && daysSincePlan < 548; // 18 mois

    let plansScore = 0;
    if (!activePlan)           { plansScore = 0;  }
    else if (!isPlanValid)     { plansScore = 40; }
    else if (!isPlanCurrent)   { plansScore = 70; }
    else                       { plansScore = 100; }

    if (!activePlan) {
      recommendations.push({ type: 'CRITICAL', category: 'PLANS', message: 'Aucun PMU ou PSI actif associé à ce bâtiment.', action: 'Créer et approuver un plan de mesures d\'urgence dans CORO.' });
    } else if (!isPlanValid) {
      recommendations.push({ type: 'CRITICAL', category: 'PLANS', message: `Le ${activePlan.documentType} est en statut ${planStatus} — non approuvé.`, action: 'Soumettre le plan pour approbation dans CORO.' });
    } else if (daysSincePlan !== null && daysSincePlan > 548) {
      recommendations.push({ type: 'WARNING', category: 'PLANS', message: `Le ${activePlan.documentType} n'a pas été mis à jour depuis ${Math.floor(daysSincePlan / 30)} mois.`, action: 'Réviser et mettre à jour le plan de mesures d\'urgence.' });
    } else if (daysSincePlan !== null && daysSincePlan > 365) {
      recommendations.push({ type: 'INFO', category: 'PLANS', message: `Le ${activePlan.documentType} approuvé a ${Math.floor(daysSincePlan / 30)} mois — une révision annuelle est recommandée.`, action: 'Planifier une révision du plan.' });
    }

    // ── Exercices (CNPI 2020 : 1x/an minimum) ────────────────────────────
    const lastExercise = await this.prisma.evacuationEvent.findFirst({
      where: { buildingId, status: 'RESOLVED' },
      orderBy: { triggeredAt: 'desc' },
      select: { triggeredAt: true },
    });
    const totalExercises = await this.prisma.evacuationEvent.count({ where: { buildingId } });
    const daysSinceExercise = lastExercise
      ? Math.floor((Date.now() - new Date(lastExercise.triggeredAt).getTime()) / 86400000)
      : null;
    const isExerciseCurrent = daysSinceExercise !== null && daysSinceExercise < 365;

    let exercisesScore = 0;
    if (!lastExercise)                                       { exercisesScore = 0;  }
    else if (daysSinceExercise !== null && daysSinceExercise > 730) { exercisesScore = 20; }
    else if (daysSinceExercise !== null && daysSinceExercise > 365) { exercisesScore = 60; }
    else                                                      { exercisesScore = 100; }

    if (!lastExercise) {
      recommendations.push({ type: 'CRITICAL', category: 'EXERCISES', message: 'Aucun exercice d\'évacuation enregistré pour ce bâtiment.', action: 'Planifier et réaliser un exercice d\'évacuation (exigence CNPI 2020).' });
    } else if (daysSinceExercise !== null && daysSinceExercise > 365) {
      recommendations.push({ type: 'WARNING', category: 'EXERCISES', message: `Dernier exercice il y a ${Math.floor(daysSinceExercise / 30)} mois — exigence CNPI : 1 exercice par an.`, action: 'Planifier un exercice d\'évacuation dans les 30 prochains jours.' });
    }

    // ── Qualifications ────────────────────────────────────────────────────
    const allMembers = base.members as any[];
    const presentMembers = allMembers.filter(m => m.isPresent);
    const criticalQuals  = ['FIRST_AID_CPR', 'AED'];

    const membersWithCriticalQuals = presentMembers.filter(m =>
      (m.qualifications || []).some((q: any) => criticalQuals.includes(q.type))
    ).length;

    const hasFirstAid = presentMembers.some(m =>
      (m.qualifications || []).some((q: any) => q.type === 'FIRST_AID_CPR')
    );
    const hasAed = presentMembers.some(m =>
      (m.qualifications || []).some((q: any) => q.type === 'AED')
    );

    const qualRatio      = presentMembers.length > 0 ? membersWithCriticalQuals / presentMembers.length : 0;
    const qualScore      = Math.round(qualRatio * 100);

    if (presentMembers.length > 0) {
      if (!hasFirstAid) recommendations.push({ type: 'CRITICAL', category: 'QUALIFICATIONS', message: 'Aucun membre présent ne possède une certification de premiers soins / RCR.', action: 'S\'assurer qu\'au moins un secouriste certifié est présent en tout temps.' });
      if (!hasAed)      recommendations.push({ type: 'WARNING',  category: 'QUALIFICATIONS', message: 'Aucun membre présent n\'est certifié pour l\'utilisation du DEA.', action: 'Former au moins un membre à l\'utilisation du défibrillateur automatisé.' });
    }

    // ── Rôles critiques ───────────────────────────────────────────────────
    if (base.gaps.some((g: any) => g.role === 'COORDINATOR')) {
      recommendations.push({ type: 'CRITICAL', category: 'ROLES', message: 'Aucun coordonnateur d\'urgence ou substitut présent dans le bâtiment.', action: 'Assigner un coordonnateur substitut disponible immédiatement.' });
    }
    if (base.substitutions.some((s: any) => s.role === 'COORDINATOR')) {
      recommendations.push({ type: 'WARNING', category: 'ROLES', message: 'Le coordonnateur titulaire est absent — le substitut est en fonction.', action: 'Informer le substitut de sa responsabilité opérationnelle actuelle.' });
    }
    if (base.reduced.length > 2) {
      recommendations.push({ type: 'WARNING', category: 'ROLES', message: `${base.reduced.length} rôles d'urgence ont une couverture réduite.`, action: 'Vérifier la disponibilité des membres absents ou former des substituts supplémentaires.' });
    }

    // ── Incidents répétés (90 derniers jours) ─────────────────────────────
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const recentIncidents = await this.prisma.incidentEvent.findMany({
      where: { buildingId, triggeredAt: { gte: ninetyDaysAgo } },
      select: { type: true, rexCorrectiveActions: true },
    });

    const incidentCounts: Record<string, number> = {};
    for (const inc of recentIncidents) {
      incidentCounts[inc.type] = (incidentCounts[inc.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(incidentCounts)) {
      if (count >= 3) {
        recommendations.push({ type: 'WARNING', category: 'INCIDENTS', message: `${count} incidents de type « ${type} » en 90 jours — récurrence anormale.`, action: 'Consulter l\'historique des incidents et les REX associés pour identifier la cause racine.' });
      }
    }

    const pendingRex = recentIncidents.filter(i => i.rexCorrectiveActions && i.rexCorrectiveActions.length > 0).length;
    if (pendingRex > 0) {
      recommendations.push({ type: 'INFO', category: 'INCIDENTS', message: `${pendingRex} incident(s) récent(s) ont des actions correctives documentées dans leur REX.`, action: 'S\'assurer que les actions correctives ont été mises en œuvre.' });
    }

    // ── Score global enrichi ──────────────────────────────────────────────
    const roleScore    = Math.round((base.roleCoverage.filter((r: any) => r.present > 0).length / Math.max(base.roleCoverage.length, 1)) * 100);
    const enrichedScore = Math.round(
      roleScore    * 0.40 +
      qualScore    * 0.20 +
      plansScore   * 0.25 +
      exercisesScore * 0.15
    );
    const enrichedStatus = enrichedScore >= 85 ? 'READY' : enrichedScore >= 60 ? 'REDUCED' : 'CRITICAL';

    // Trier les recommandations : CRITICAL → WARNING → INFO
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    recommendations.sort((a, b) => (order[a.type as keyof typeof order] || 0) - (order[b.type as keyof typeof order] || 0));

    return {
      ...base,
      enriched: {
        score:          enrichedScore,
        status:         enrichedStatus,
        components: {
          roles:       { score: roleScore,      weight: 40 },
          qualifications: { score: qualScore,   weight: 20 },
          plans:       { score: plansScore,     weight: 25 },
          exercises:   { score: exercisesScore, weight: 15 },
        },
      },
      plansAnalysis: {
        hasPlan:         !!activePlan,
        planType:        activePlan?.documentType || null,
        planStatus,
        planUpdatedAt,
        daysSincePlan,
        isPlanValid,
        isPlanCurrent,
      },
      exercisesAnalysis: {
        lastExerciseDate:    lastExercise?.triggeredAt || null,
        daysSinceExercise,
        isExerciseCurrent,
        totalExercises,
      },
      qualificationsAnalysis: {
        membersWithCriticalQuals,
        totalPresentEmergencyMembers: presentMembers.length,
        qualScore,
        hasFirstAid,
        hasAed,
      },
      recentIncidentsCount: recentIncidents.length,
      recommendations,
    };
  }

  async getOrCreateKioskTokenForOrg(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({ where: { id: buildingId, organizationId } });
    if (!building) throw new NotFoundException('Bâtiment introuvable');
    const existing = await this.prisma.buildingKioskToken.findUnique({ where: { buildingId } });
    if (existing) return existing;
    return this.prisma.buildingKioskToken.create({ data: { buildingId } });
  }

  // ── ResilienceSnapshot ───────────────────────────────────────────────────

  async saveResilienceSnapshot(buildingId: string, token: string) {
    try {
      const enriched = await this.getReadinessEnriched(buildingId, token);
      const e = enriched.enriched || {};
      await this.prisma.resilienceSnapshot.create({
        data: {
          buildingId,
          organizationId: (await this.prisma.building.findUnique({ where: { id: buildingId }, select: { organizationId: true } }))!.organizationId,
          score:          e.score          ?? enriched.readinessIndex ?? 0,
          status:         e.status         ?? enriched.status         ?? 'CRITICAL',
          rolesScore:     e.components?.roles?.score          ?? 0,
          qualScore:      e.components?.qualifications?.score ?? 0,
          plansScore:     e.components?.plans?.score          ?? 0,
          exercisesScore: e.components?.exercises?.score      ?? 0,
          presentMembers: enriched.presentMembers ?? 0,
          totalMembers:   enriched.totalMembers   ?? 0,
        },
      });
    } catch (err) { console.error('[ResilienceSnapshot] Erreur:', err); }
  }

  async getIntelligenceOverview(actor: {
    organizationId: string;
    clientId: string;
    role: string;
    buildingIds?: string[];
  }) {
    if (!['CLIENT_MANAGER', 'CLIENT_CORPORATE'].includes(actor.role)) {
      throw new ForbiddenException('Accès Intelligence refusé');
    }
    const buildingScope =
      actor.role === 'CLIENT_MANAGER'
        ? {
            clientId: actor.clientId,
            id: { in: actor.buildingIds ?? [] },
          }
        : { clientId: actor.clientId };
    const buildings = await this.prisma.building.findMany({
      where: {
        organizationId: actor.organizationId,
        isActive: true,
        ...buildingScope,
      },
      include: { kioskToken: { select: { token: true } } },
    });

    const results: any[] = [];
    for (const building of buildings) {
      if (!building.kioskToken?.token) {
        results.push({ buildingId: building.id, buildingName: building.name, score: 0, status: 'CRITICAL', recommendations: [] } as any);
        continue;
      }
      try {
        const enriched: any = await this.getReadinessEnriched(building.id, building.kioskToken.token);
        results.push({
          buildingId:      building.id,
          buildingName:    building.name,
          score:           enriched?.enriched?.score          ?? enriched?.readinessIndex ?? 0,
          status:          enriched?.enriched?.status         ?? enriched?.status         ?? 'CRITICAL',
          components:      enriched?.enriched?.components     ?? {},
          recommendations: enriched?.recommendations          ?? [],
          presentMembers:  enriched?.presentMembers           ?? 0,
          totalMembers:    enriched?.totalMembers             ?? 0,
        } as any);
      } catch {
        results.push({ buildingId: building.id, buildingName: building.name, score: 0, status: 'CRITICAL', recommendations: [] } as any);
      }
    }

    // Agrégation globale
    const allRecs = results.flatMap(r =>
      (r.recommendations || []).map((rec: any) => ({ ...rec, buildingId: r.buildingId, buildingName: r.buildingName }))
    );
    allRecs.sort((a, b) => {
      const order: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return (order[a.type] ?? 9) - (order[b.type] ?? 9);
    });

    const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
    const criticalCount  = allRecs.filter(r => r.type === 'CRITICAL').length;
    const warningCount   = allRecs.filter(r => r.type === 'WARNING').length;
    const infoCount      = allRecs.filter(r => r.type === 'INFO').length;

    return {
      organizationId: actor.organizationId,
      avgScore,
      globalStatus:  avgScore >= 85 ? 'READY' : avgScore >= 60 ? 'REDUCED' : 'CRITICAL',
      totalBuildings: results.length,
      buildings:      results,
      recommendations: allRecs,
      summary: { criticalCount, warningCount, infoCount, total: allRecs.length },
    };
  }

  async getResilienceHistory(buildingId: string, organizationId: string, days = 90) {
    const building = await this.prisma.building.findFirst({ where: { id: buildingId, organizationId } });
    if (!building) throw new NotFoundException('Bâtiment introuvable');
    const since = new Date(Date.now() - days * 86400000);
    return this.prisma.resilienceSnapshot.findMany({
      where: { buildingId, snapshotAt: { gte: since } },
      orderBy: { snapshotAt: 'asc' },
      select: { score: true, status: true, rolesScore: true, qualScore: true, plansScore: true, exercisesScore: true, presentMembers: true, snapshotAt: true },
    });
  }

}

// ── Dénombrement (audit M5-04) ─────────────────────────────────────────────

export type AccountabilityStatus = 'PENDING' | 'PRESENT' | 'SAFE_ELSEWHERE' | 'INJURED' | 'MISSING' | 'FOUND';
export type AccountabilityActor = { type: string; id: string | null; name: string };

export const ACCOUNTABILITY_STATUSES: AccountabilityStatus[] = ['PENDING', 'PRESENT', 'SAFE_ELSEWHERE', 'INJURED', 'MISSING', 'FOUND'];
const ACCOUNTED_STATUSES: AccountabilityStatus[] = ['PRESENT', 'SAFE_ELSEWHERE', 'INJURED', 'FOUND'];

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Compteurs par état et bilan pour les pompiers : personnes à confirmer,
 * manquantes (avec dernier emplacement connu) et blessées.
 * `accounted` / `missing` gardent leur sens historique (comptabilisé ou non).
 */
export function summarizeAccountability(checkins: Array<any>) {
  const counts: Record<AccountabilityStatus, number> = {
    PENDING: 0, PRESENT: 0, SAFE_ELSEWHERE: 0, INJURED: 0, MISSING: 0, FOUND: 0,
  };
  for (const c of checkins) {
    const status = (c.status as AccountabilityStatus) || (c.isAccountedFor ? 'PRESENT' : 'PENDING');
    counts[status] = (counts[status] ?? 0) + 1;
  }
  const accounted = counts.PRESENT + counts.SAFE_ELSEWHERE + counts.INJURED + counts.FOUND;
  const missing = counts.PENDING + counts.MISSING;
  const person = (c: any) => ({
    occupantRecordId: c.occupantRecordId,
    name: [c.occupantRecord?.firstName, c.occupantRecord?.lastName].filter(Boolean).join(' '),
    type: c.occupantRecord?.type ?? null,
    floor: c.occupantRecord?.floor ?? null,
    lastKnownLocation: c.lastKnownLocation ?? null,
    note: c.note ?? null,
    reportedToFireAt: c.reportedToFireAt ?? null,
    updatedAt: c.checkedAt ?? null,
  });
  const fireBrief = {
    missing: checkins.filter((c) => c.status === 'MISSING').map(person),
    injured: checkins.filter((c) => c.status === 'INJURED').map(person),
    pending: checkins.filter((c) => (c.status ?? 'PENDING') === 'PENDING' && !c.isAccountedFor).map(person),
  };
  return { counts, accounted, missing, fireBrief };
}
