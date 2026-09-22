import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { effectiveBookingDate, OPEN_BOOKING_STATUSES } from '../bookings/booking-status';
import { effectiveActivityHours } from './capacity-duration';

const CONFIRMED_BOOKING_STATUSES = new Set(['CONFIRMEE', 'REPORTEE', 'REASSIGNEE']);
const OPEN_STATUSES = new Set<string>(OPEN_BOOKING_STATUSES);

type ChargeDetail = {
  source: 'BOOKING' | 'LEGACY_ACTIVITY' | 'MANDATE';
  projectId: string;
  activityId?: string;
  bookingId?: string;
  assignmentId?: string;
  role?: string;
  assignmentStatus?: string;
  bookingStatus?: string;
  label: string;
  effectiveDate: Date | null;
  durationHours: number;
  category: 'CONFIRMED' | 'PENDING';
};

@Injectable()
export class CapacityService {
  constructor(private prisma: PrismaService) {}

  async getCapacityPlanning(organizationId: string) {
    const horizonStart = new Date();
    const horizonEnd = new Date(horizonStart.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
    const inHorizon = (date: Date | null | undefined) =>
      !!date && date >= horizonStart && date < horizonEnd;

    const [users, taskEntries, timelogEntries, mandates, activities] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId, isActive: true, role: { not: 'SUPER_ADMIN' } },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, horaireBase: true },
      }),
      this.prisma.taskTimeEntry.findMany({
        where: { organizationId },
        select: { userId: true, heures: true, task: { select: { projectId: true } } },
      }),
      this.prisma.timelogEntry.findMany({
        where: { organizationId },
        select: { userId: true, heures: true },
      }),
      this.prisma.projectMandate.findMany({
        where: {
          organizationId,
          project: { isActive: true, status: { notIn: ['VALIDATED', 'EXPORTED', 'ARCHIVED'] } },
        },
        include: {
          project: { select: {
            id: true, userId: true, name: true, documentType: true, status: true,
            client: { select: { name: true } },
          } },
        },
      }),
      this.prisma.projectActivity.findMany({
        where: { organizationId, status: { notIn: ['annule', 'fait', 'termine'] } },
        include: {
          project: { select: {
            id: true, userId: true, name: true,
            mandate: { select: { ownerId: true } },
          } },
          bookings: {
            where: { organizationId },
            select: {
              id: true, status: true, requestedDate: true, reportedDate: true, duration: true,
              assignments: { select: { id: true, userId: true, role: true, status: true } },
            },
          },
        },
      }),
    ]);

    const userById = new Map(users.map(user => [user.id, user]));
    const userByEmail = new Map(users.map(user => [user.email.trim().toLowerCase(), user]));
    const summaryByUser = new Map(users.map(user => [user.id, {
      heuresTaskTotal: 0,
      heuresTimelogTotal: 0,
      heuresRestantesMandats: 0,
      chargeConfirmee: 0,
      chargeProvisoire: 0,
      activitesFuturesCount: 0,
      mandatsDetail: [] as Array<Record<string, unknown>>,
      chargeDetails: [] as ChargeDetail[],
    }]));
    const actualByProject = new Map<string, number>();
    for (const entry of taskEntries) {
      const projectId = entry.task.projectId;
      actualByProject.set(projectId, (actualByProject.get(projectId) ?? 0) + entry.heures);
      const summary = summaryByUser.get(entry.userId);
      if (!summary) continue;
      summary.heuresTaskTotal += entry.heures;
    }
    for (const entry of timelogEntries) {
      const summary = summaryByUser.get(entry.userId);
      if (summary) summary.heuresTimelogTotal += entry.heures;
    }

    const activeMandateProjectIds = new Set(mandates.map(mandate => mandate.projectId));
    const confirmedMandateHoursByProject = new Map<string, number>();
    const addMandateHours = (projectId: string, hours: number) => {
      confirmedMandateHoursByProject.set(projectId,
        (confirmedMandateHoursByProject.get(projectId) ?? 0) + hours);
    };

    for (const activity of activities) {
      const booking = activity.bookings.find(item => OPEN_STATUSES.has(item.status));
      if (booking) {
        const date = effectiveBookingDate(booking);
        if (!inHorizon(date)) continue;
        const durationHours = effectiveActivityHours(activity, booking);
        for (const assignment of booking.assignments) {
          const summary = summaryByUser.get(assignment.userId);
          if (!summary || !['ACCEPTED', 'PENDING'].includes(assignment.status)) continue;
          const confirmed = CONFIRMED_BOOKING_STATUSES.has(booking.status) && assignment.status === 'ACCEPTED';
          if (confirmed) {
            summary.chargeConfirmee += durationHours;
            summary.activitesFuturesCount++;
            if (activity.sourceMandate && activeMandateProjectIds.has(activity.projectId)) {
              addMandateHours(activity.projectId, durationHours);
            }
          } else {
            summary.chargeProvisoire += durationHours;
          }
          summary.chargeDetails.push({
            source: 'BOOKING', projectId: activity.projectId, activityId: activity.id,
            bookingId: booking.id, assignmentId: assignment.id, role: assignment.role,
            assignmentStatus: assignment.status, bookingStatus: booking.status,
            label: activity.customLabel || activity.label, effectiveDate: date,
            durationHours, category: confirmed ? 'CONFIRMED' : 'PENDING',
          });
        }
        continue;
      }

      // Un historique lié fermé ne réactive pas la charge de l'Activity.
      if (activity.bookings.length || !inHorizon(activity.scheduledDate)) continue;
      const assignee = activity.assigneeEmail
        ? userByEmail.get(activity.assigneeEmail.trim().toLowerCase()) : undefined;
      const ownerId = activity.project.mandate?.ownerId;
      const userId = assignee?.id ??
        (ownerId && userById.has(ownerId) ? ownerId : activity.project.userId);
      const summary = summaryByUser.get(userId);
      if (!summary) continue;
      const durationHours = effectiveActivityHours(activity);
      summary.chargeConfirmee += durationHours;
      summary.activitesFuturesCount++;
      if (activity.sourceMandate && activeMandateProjectIds.has(activity.projectId)) {
        addMandateHours(activity.projectId, durationHours);
      }
      summary.chargeDetails.push({
        source: 'LEGACY_ACTIVITY', projectId: activity.projectId, activityId: activity.id,
        label: activity.customLabel || activity.label, effectiveDate: activity.scheduledDate,
        durationHours, category: 'CONFIRMED',
      });
    }

    // Le budget est en heures-conseiller : les TimeEntries et les intervenants
    // confirmés sont additionnés par personne. Seules les Activities issues du
    // mandat prouvent ici leur appartenance au budget; les manuelles restent à part.
    for (const mandate of mandates) {
      const ownerId = mandate.ownerId && userById.has(mandate.ownerId)
        ? mandate.ownerId : mandate.project.userId;
      const summary = summaryByUser.get(ownerId);
      if (!summary) continue;
      const heuresReelles = actualByProject.get(mandate.projectId) ?? 0;
      const heuresBudgetees = mandate.heuresBudgetees ?? 0;
      const heuresRestantesBrutes = Math.max(0, heuresBudgetees - heuresReelles);
      const heuresPlanifieesMandat = confirmedMandateHoursByProject.get(mandate.projectId) ?? 0;
      const chargeMandatNonVentilee = Math.max(0, heuresRestantesBrutes - heuresPlanifieesMandat);
      summary.heuresRestantesMandats += chargeMandatNonVentilee;
      summary.mandatsDetail.push({
        source: 'MANDATE', projectId: mandate.projectId, projectName: mandate.project.name,
        documentType: mandate.project.documentType, clientName: mandate.project.client.name,
        projectStatus: mandate.project.status, heuresBudgetees, heuresReelles,
        heuresRestantes: heuresRestantesBrutes, heuresPlanifieesMandat,
        chargeMandatNonVentilee, dateLimite: mandate.dateLimite,
      });
      summary.chargeDetails.push({
        source: 'MANDATE', projectId: mandate.projectId, label: mandate.project.name,
        effectiveDate: null, durationHours: chargeMandatNonVentilee, category: 'CONFIRMED',
      });
    }

    const results = users.map(user => {
      const summary = summaryByUser.get(user.id)!;
      const horaireBase = user.horaireBase ?? 40;
      const capacite12Semaines = horaireBase * 12;
      const chargeFutureTotale = summary.heuresRestantesMandats + summary.chargeConfirmee;
      const chargeAvecProvisoire = chargeFutureTotale + summary.chargeProvisoire;
      const tauxUtilisationConfirmee = capacite12Semaines > 0
        ? Math.round(summary.chargeConfirmee / capacite12Semaines * 100) : 0;
      const tauxAvecProvisoire = capacite12Semaines > 0
        ? Math.round(chargeAvecProvisoire / capacite12Semaines * 100) : 0;
      const semainesChargees = horaireBase > 0 ? chargeFutureTotale / horaireBase : 0;
      const dateDisponibilite = new Date(horizonStart);
      dateDisponibilite.setDate(dateDisponibilite.getDate() + Math.ceil(semainesChargees * 7));
      const tauxOccupation = capacite12Semaines > 0
        ? Math.min(Math.round(chargeFutureTotale / capacite12Semaines * 100), 150) : 0;
      const niveau = tauxOccupation >= 100 ? 'SURCHARGE' :
        tauxOccupation >= 80 ? 'CHARGE' :
        tauxOccupation >= 40 ? 'NORMAL' : 'DISPONIBLE';
      return {
        userId: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role,
        horaireBase, horizonStart, horizonEnd, capacite12Semaines,
        heuresTaskTotal: summary.heuresTaskTotal,
        heuresTimelogTotal: summary.heuresTimelogTotal,
        heuresTotalSaisies: summary.heuresTaskTotal + summary.heuresTimelogTotal,
        heuresRestantesMandats: summary.heuresRestantesMandats,
        heuresActivitesFutures: summary.chargeConfirmee,
        chargePlanifiee: summary.chargeConfirmee,
        chargeConfirmee: summary.chargeConfirmee,
        chargeProvisoire: summary.chargeProvisoire,
        chargeMandatNonVentilee: summary.heuresRestantesMandats,
        chargeMandats: summary.heuresRestantesMandats,
        chargeEngagee: chargeFutureTotale,
        chargeFutureTotale, chargeAvecProvisoire,
        capaciteRestanteTheorique: Math.max(0, capacite12Semaines - chargeFutureTotale),
        tauxUtilisationConfirmee, tauxAvecProvisoire,
        tauxOccupation, semainesChargees: Math.round(semainesChargees * 10) / 10,
        dateDisponibilite, niveau, mandatsDetail: summary.mandatsDetail,
        activitesFuturesCount: summary.activitesFuturesCount,
        chargeDetails: summary.chargeDetails,
      };
    });
    return results.sort((a, b) => b.tauxOccupation - a.tauxOccupation);
  }
}
