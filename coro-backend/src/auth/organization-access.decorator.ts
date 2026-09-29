import { SetMetadata } from '@nestjs/common';

export enum OrganizationAccessMode {
  NORMAL = 'NORMAL',
  OPERATIONAL_CONTINUITY = 'OPERATIONAL_CONTINUITY',
  EVIDENCE_READ = 'EVIDENCE_READ',
}

export const ORGANIZATION_ACCESS_KEY = 'organizationAccessMode';

export const OrganizationAccess = (mode: OrganizationAccessMode) =>
  SetMetadata(ORGANIZATION_ACCESS_KEY, mode);

export const OperationalContinuityAccess = () =>
  OrganizationAccess(OrganizationAccessMode.OPERATIONAL_CONTINUITY);

export const EvidenceReadAccess = () =>
  OrganizationAccess(OrganizationAccessMode.EVIDENCE_READ);
