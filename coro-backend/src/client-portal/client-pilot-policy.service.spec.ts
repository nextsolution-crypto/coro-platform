import { ForbiddenException } from '@nestjs/common';
import { ClientPilotPolicyService } from './client-pilot-policy.service';

describe('ClientPilotPolicyService', () => {
  const original = process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS;
    } else {
      process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS = original;
    }
  });

  it('restricts only explicitly enrolled pilot organizations', () => {
    process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS =
      ' org-pilot-a,org-pilot-b ';
    const service = new ClientPilotPolicyService();

    expect(service.getPolicy('org-pilot-a')).toEqual({
      restricted: true,
      documentSignature: false,
      officialPdf: false,
      externalInvitation: false,
      externalEmployeeEmail: false,
      archivedProjectMutation: false,
    });
    expect(service.getPolicy('org-customer')).toEqual({
      restricted: false,
      documentSignature: true,
      officialPdf: true,
      externalInvitation: true,
      externalEmployeeEmail: true,
      archivedProjectMutation: true,
    });
  });

  it('fails closed for every excluded pilot operation', () => {
    process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS = 'org-pilot';
    const service = new ClientPilotPolicyService();
    for (const operation of [
      'DOCUMENT_SIGNATURE',
      'OFFICIAL_PDF',
      'EXTERNAL_INVITATION',
      'EXTERNAL_EMPLOYEE_EMAIL',
      'ARCHIVED_PROJECT_MUTATION',
    ] as const) {
      expect(() => service.assertAllowed('org-pilot', operation)).toThrow(
        ForbiddenException,
      );
      expect(() => service.assertAllowed('org-standard', operation)).not.toThrow();
    }
  });
});
