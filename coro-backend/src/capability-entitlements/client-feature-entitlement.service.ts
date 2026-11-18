import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientOperationalPermission } from '@prisma/client';
import type { ClientUserAuthority } from '../auth/coro-authority';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementResolver } from './entitlement-resolver.service';

export const CLIENT_COMMERCIAL_FEATURES = [
  'INCIDENT_REPORTS',
  'OPERATIONAL_LOG',
  'OPERATIONAL_SHIFTS',
  'OPERATIONAL_DIRECTIVES',
  'OPERATIONAL_FOLLOWUPS',
  'SECURITY_WORKSTATION',
] as const;

export type ClientCommercialFeature =
  (typeof CLIENT_COMMERCIAL_FEATURES)[number];

const TECHNICAL_FLAGS: Record<ClientCommercialFeature, string[]> = {
  INCIDENT_REPORTS: ['INCIDENT_REPORTS_ENABLED'],
  OPERATIONAL_LOG: ['OPERATIONAL_LOG_ENABLED'],
  OPERATIONAL_SHIFTS: ['OPERATIONAL_SHIFTS_ENABLED'],
  OPERATIONAL_DIRECTIVES: ['OPERATIONAL_DIRECTIVES_ENABLED'],
  OPERATIONAL_FOLLOWUPS: ['OPERATIONAL_FOLLOWUPS_ENABLED'],
  SECURITY_WORKSTATION: [
    'INCIDENT_REPORTS_ENABLED',
    'OPERATIONAL_LOG_ENABLED',
    'OPERATIONAL_SHIFTS_ENABLED',
    'OPERATIONAL_DIRECTIVES_ENABLED',
    'OPERATIONAL_FOLLOWUPS_ENABLED',
  ],
};

const PERMISSION_FEATURE: Partial<
  Record<ClientOperationalPermission, ClientCommercialFeature>
> = {
  INCIDENT_REPORT_READ: 'INCIDENT_REPORTS',
  INCIDENT_REPORT_CREATE: 'INCIDENT_REPORTS',
  INCIDENT_REPORT_EDIT: 'INCIDENT_REPORTS',
  INCIDENT_REPORT_REVIEW: 'INCIDENT_REPORTS',
  INCIDENT_REPORT_APPROVE: 'INCIDENT_REPORTS',
  INCIDENT_REPORT_EXPORT: 'INCIDENT_REPORTS',
  INCIDENT_REPORT_ADMIN: 'INCIDENT_REPORTS',
  OPERATIONAL_LOG_READ: 'OPERATIONAL_LOG',
  OPERATIONAL_LOG_CREATE: 'OPERATIONAL_LOG',
  OPERATIONAL_LOG_EDIT: 'OPERATIONAL_LOG',
  OPERATIONAL_LOG_ADMIN: 'OPERATIONAL_LOG',
  OPERATIONAL_SHIFT_READ: 'OPERATIONAL_SHIFTS',
  OPERATIONAL_SHIFT_OPEN: 'OPERATIONAL_SHIFTS',
  OPERATIONAL_SHIFT_EDIT_OWN: 'OPERATIONAL_SHIFTS',
  OPERATIONAL_HANDOVER_PREPARE: 'OPERATIONAL_SHIFTS',
  OPERATIONAL_HANDOVER_ACKNOWLEDGE: 'OPERATIONAL_SHIFTS',
  OPERATIONAL_SHIFT_SUPERVISE: 'OPERATIONAL_SHIFTS',
  OPERATIONAL_SHIFT_EXCEPTION_CLOSE: 'OPERATIONAL_SHIFTS',
  OPERATIONAL_SHIFT_ADMIN: 'OPERATIONAL_SHIFTS',
  OPERATIONAL_DIRECTIVE_READ: 'OPERATIONAL_DIRECTIVES',
  OPERATIONAL_DIRECTIVE_CREATE: 'OPERATIONAL_DIRECTIVES',
  OPERATIONAL_DIRECTIVE_EDIT: 'OPERATIONAL_DIRECTIVES',
  OPERATIONAL_DIRECTIVE_REVIEW: 'OPERATIONAL_DIRECTIVES',
  OPERATIONAL_DIRECTIVE_APPROVE: 'OPERATIONAL_DIRECTIVES',
  OPERATIONAL_DIRECTIVE_PUBLISH: 'OPERATIONAL_DIRECTIVES',
  OPERATIONAL_DIRECTIVE_REVOKE: 'OPERATIONAL_DIRECTIVES',
  OPERATIONAL_DIRECTIVE_ACKNOWLEDGE: 'OPERATIONAL_DIRECTIVES',
  OPERATIONAL_FOLLOWUP_READ: 'OPERATIONAL_FOLLOWUPS',
  OPERATIONAL_FOLLOWUP_CREATE: 'OPERATIONAL_FOLLOWUPS',
  OPERATIONAL_FOLLOWUP_ASSIGN: 'OPERATIONAL_FOLLOWUPS',
  OPERATIONAL_FOLLOWUP_EXECUTE: 'OPERATIONAL_FOLLOWUPS',
  OPERATIONAL_FOLLOWUP_VERIFY: 'OPERATIONAL_FOLLOWUPS',
  OPERATIONAL_FOLLOWUP_CLOSE: 'OPERATIONAL_FOLLOWUPS',
  OPERATIONAL_FOLLOWUP_ADMIN: 'OPERATIONAL_FOLLOWUPS',
  CLIENT_OPERATIONAL_AUTHORITY_MANAGE: 'SECURITY_WORKSTATION',
};

export interface ClientFeatureDecision {
  feature: ClientCommercialFeature;
  technicallyAvailable: boolean;
  entitled: boolean;
  individuallyAuthorized: boolean;
  buildingAssigned: boolean;
  available: boolean;
  reason:
    | 'AVAILABLE'
    | 'TECHNICALLY_DISABLED'
    | 'NOT_ENTITLED'
    | 'PERMISSION_REQUIRED'
    | 'BUILDING_ASSIGNMENT_REQUIRED';
}

@Injectable()
export class ClientFeatureEntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: EntitlementResolver,
  ) {}

  featureForPermission(
    permission: ClientOperationalPermission,
  ): ClientCommercialFeature {
    const feature = PERMISSION_FEATURE[permission];
    if (!feature)
      throw new Error(`CLIENT_FEATURE_MAPPING_MISSING:${permission}`);
    return feature;
  }

  async evaluate(input: {
    authority: Pick<ClientUserAuthority, 'actorId' | 'organizationId'>;
    organizationId: string;
    buildingId: string;
    feature: ClientCommercialFeature;
  }): Promise<ClientFeatureDecision> {
    const { authority, organizationId, buildingId, feature } = input;
    const technicallyAvailable = TECHNICAL_FLAGS[feature].every(
      (name) => process.env[name] === 'true',
    );
    const canonicalIdentity =
      authority.organizationId === organizationId
        ? await this.prisma.clientUser.findFirst({
            where: {
              id: authority.actorId,
              organizationId,
              isActive: true,
            },
            select: { clientId: true, operationalPermissions: true },
          })
        : null;
    const now = new Date();
    const assignment = canonicalIdentity
      ? await this.prisma.clientOperationalBuildingAssignment.findFirst({
          where: {
            organizationId,
            buildingId,
            clientUserId: authority.actorId,
            status: 'ACTIVE',
            effectiveFrom: { lte: now },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
          },
          select: { id: true },
        })
      : null;
    const individuallyAuthorized = Boolean(
      canonicalIdentity?.operationalPermissions.some(
        (permission) => PERMISSION_FEATURE[permission] === feature,
      ),
    );
    const entitlement = assignment
      ? await this.resolver.resolve({
          organizationId,
          clientId: canonicalIdentity.clientId,
          buildingId,
          capabilityCode: feature,
          atTime: now,
        })
      : null;
    const entitled = Boolean(
      entitlement?.availability.isAvailable &&
      entitlement.licensed &&
      entitlement.enabled &&
      entitlement.effectiveState === 'EFFECTIVE',
    );
    const buildingAssigned = Boolean(assignment);
    const available =
      technicallyAvailable &&
      entitled &&
      individuallyAuthorized &&
      buildingAssigned;
    const reason: ClientFeatureDecision['reason'] = !technicallyAvailable
      ? 'TECHNICALLY_DISABLED'
      : !buildingAssigned
        ? 'BUILDING_ASSIGNMENT_REQUIRED'
        : !entitled
          ? 'NOT_ENTITLED'
          : !individuallyAuthorized
            ? 'PERMISSION_REQUIRED'
            : 'AVAILABLE';
    return {
      feature,
      technicallyAvailable,
      entitled,
      individuallyAuthorized,
      buildingAssigned,
      available,
      reason,
    };
  }

  async require(input: {
    authority: Pick<ClientUserAuthority, 'actorId' | 'organizationId'>;
    organizationId: string;
    buildingId: string;
    feature: ClientCommercialFeature;
    hiddenMessage: string;
  }): Promise<void> {
    const decision = await this.evaluate(input);
    if (!decision.available) throw new NotFoundException(input.hiddenMessage);
  }
}
