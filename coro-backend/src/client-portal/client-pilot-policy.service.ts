import { ForbiddenException, Injectable } from '@nestjs/common';

export type ClientPilotOperation =
  | 'DOCUMENT_SIGNATURE'
  | 'OFFICIAL_PDF'
  | 'EXTERNAL_INVITATION'
  | 'EXTERNAL_EMPLOYEE_EMAIL'
  | 'ARCHIVED_PROJECT_MUTATION';

export interface ClientPilotPolicy {
  restricted: boolean;
  documentSignature: boolean;
  officialPdf: boolean;
  externalInvitation: boolean;
  externalEmployeeEmail: boolean;
  archivedProjectMutation: boolean;
}

const RESTRICTION_MESSAGES: Record<ClientPilotOperation, string> = {
  DOCUMENT_SIGNATURE:
    'La signature documentaire n’est pas disponible dans ce pilote.',
  OFFICIAL_PDF:
    'Le PDF officiel n’est pas disponible dans ce pilote.',
  EXTERNAL_INVITATION:
    'Les invitations externes ne sont pas disponibles dans ce pilote.',
  EXTERNAL_EMPLOYEE_EMAIL:
    'L’envoi externe de codes employés n’est pas disponible dans ce pilote.',
  ARCHIVED_PROJECT_MUTATION:
    'Les projets archivés sont disponibles en lecture seule dans ce pilote.',
};

/**
 * Temporary, fail-closed pilot restrictions scoped by organization.
 *
 * Organizations absent from CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS
 * retain their existing behaviour. The setting is server-side only and cannot
 * be changed by a ClientUser.
 */
@Injectable()
export class ClientPilotPolicyService {
  private restrictedOrganizationIds(): Set<string> {
    return new Set(
      (process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  getPolicy(organizationId: string): ClientPilotPolicy {
    const restricted = this.restrictedOrganizationIds().has(organizationId);
    return {
      restricted,
      documentSignature: !restricted,
      officialPdf: !restricted,
      externalInvitation: !restricted,
      externalEmployeeEmail: !restricted,
      archivedProjectMutation: !restricted,
    };
  }

  assertAllowed(organizationId: string, operation: ClientPilotOperation) {
    const policy = this.getPolicy(organizationId);
    const allowed = {
      DOCUMENT_SIGNATURE: policy.documentSignature,
      OFFICIAL_PDF: policy.officialPdf,
      EXTERNAL_INVITATION: policy.externalInvitation,
      EXTERNAL_EMPLOYEE_EMAIL: policy.externalEmployeeEmail,
      ARCHIVED_PROJECT_MUTATION: policy.archivedProjectMutation,
    }[operation];

    if (!allowed) throw new ForbiddenException(RESTRICTION_MESSAGES[operation]);
  }
}
