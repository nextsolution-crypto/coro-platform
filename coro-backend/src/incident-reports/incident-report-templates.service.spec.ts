import { INITIAL_INCIDENT_REPORT_TEMPLATES } from './incident-report-form-engine';
import { IncidentReportTemplatesService } from './incident-report-templates.service';

describe('IncidentReportTemplatesService', () => {
  const organizationId = '00000000-0000-4000-8000-000000000001';
  const buildingId = '00000000-0000-4000-8000-000000000002';
  const actor = {
    actorType: 'CLIENT_USER',
    actorId: '00000000-0000-4000-8000-000000000003',
    clientId: '00000000-0000-4000-8000-000000000004',
    organizationId,
    role: 'CLIENT_MANAGER',
    sessionVersion: 1,
    permissions: ['INCIDENT_REPORT_READ'],
    buildingIds: [buildingId],
  } as never;

  beforeEach(() => {
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
  });

  it('returns all twelve published templates with their matching active policy', async () => {
    const templates = INITIAL_INCIDENT_REPORT_TEMPLATES.map(
      (template, index) => ({
        id: `template-${index}`,
        organizationId,
        status: 'PUBLISHED',
        version: 1,
        ...template,
      }),
    );
    const policies = INITIAL_INCIDENT_REPORT_TEMPLATES.map(
      (template, index) => ({
        id: `policy-${index}`,
        reportType: template.reportType,
      }),
    );
    const prisma = {
      incidentReportTemplateVersion: {
        findMany: jest.fn().mockResolvedValue(templates),
      },
      incidentReportRetentionPolicy: {
        findMany: jest.fn().mockResolvedValue(policies),
      },
    };
    const access = { require: jest.fn().mockResolvedValue(undefined) };
    const service = new IncidentReportTemplatesService(
      prisma as never,
      access as never,
    );

    const result = await service.list(organizationId, actor, buildingId);

    expect(result).toHaveLength(12);
    expect(
      result.every((template) => Boolean(template.retentionPolicyId)),
    ).toBe(true);
    expect(
      new Set(result.map((template) => template.retentionPolicyId)).size,
    ).toBe(12);
    expect(access.require).toHaveBeenCalledWith(
      actor,
      organizationId,
      buildingId,
      'INCIDENT_REPORT_READ',
    );
  });

  it('keeps a published template non-creatable when its policy is missing', async () => {
    const template = {
      id: 'template-without-policy',
      organizationId,
      status: 'PUBLISHED',
      version: 1,
      ...INITIAL_INCIDENT_REPORT_TEMPLATES[0],
    };
    const service = new IncidentReportTemplatesService(
      {
        incidentReportTemplateVersion: {
          findMany: jest.fn().mockResolvedValue([template]),
        },
        incidentReportRetentionPolicy: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as never,
      { require: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(
      service.list(organizationId, actor, buildingId),
    ).resolves.toEqual([expect.objectContaining({ retentionPolicyId: null })]);
  });
});
