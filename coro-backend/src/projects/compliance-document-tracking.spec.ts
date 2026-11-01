import { ProjectsService } from './projects.service';

const operator = { userId: 'operator-1', organizationId: 'org-1', role: 'OPERATOR' } as const;
const admin = { userId: 'admin-1', organizationId: 'org-1', role: 'ADMIN' } as const;

const building = (projects: any[]) => ({
  id: 'building-1', name: 'Édifice QA', address: '1 Test', city: 'Québec',
  province: 'QC', buildingType: 'OFFICE', client: { name: 'Client QA' }, projects,
});
const project = (documents: any[], overrides: Record<string, unknown> = {}) => ({
  id: 'project-1', name: 'PSI QA', status: 'ACTIVE', documentType: 'PSI',
  approvedAt: null, updatedAt: new Date('2026-10-01'), documents, ...overrides,
});
const document = (status: string, overrides: Record<string, unknown> = {}) => ({
  id: `document-${status}`, title: `Document ${status}`, status, version: 1,
  updatedAt: new Date('2026-10-01'), ...overrides,
});

describe('ProjectsService compliance document tracking', () => {
  const prisma: any = { building: { findMany: jest.fn() } };
  let service: ProjectsService;
  beforeEach(() => { jest.clearAllMocks(); service = new ProjectsService(prisma); });

  it('applies canonical project scope to operator building discovery and sources', async () => {
    prisma.building.findMany.mockResolvedValue([]);
    await service.getBuildingsCompliance(operator);
    const query = prisma.building.findMany.mock.calls[0][0];
    const scope = { organizationId: 'org-1', OR: [{ userId: 'operator-1' }, { lastEditedById: 'operator-1' }] };
    expect(query.where).toEqual({ organizationId: 'org-1', isActive: true, projects: { some: scope } });
    expect(query.include.projects.where).toMatchObject({ ...scope, isActive: true, status: { not: 'ARCHIVED' } });
  });

  it('keeps administrators organization-scoped without an operator assignment predicate', async () => {
    prisma.building.findMany.mockResolvedValue([]);
    await service.getBuildingsCompliance(admin);
    const query = prisma.building.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ organizationId: 'org-1', isActive: true });
    expect(query.include.projects.where).toMatchObject({ organizationId: 'org-1', isActive: true });
  });

  it('never qualifies a draft as approved', async () => {
    prisma.building.findMany.mockResolvedValue([building([project([document('DRAFT')])])]);
    const [result] = await service.getBuildingsCompliance(admin);
    expect(result).toMatchObject({ documentaryStatus: 'DRAFT_ONLY', approvedCount: 0, draftCount: 1, regulatoryAttestation: false });
    expect(result.primarySource.dateMeaning).toBe('LAST_MODIFIED_DATE');
  });

  it('finds an approved source even when a newer project has no document', async () => {
    prisma.building.findMany.mockResolvedValue([building([
      project([], { id: 'new-empty', name: 'Nouveau projet', updatedAt: new Date('2026-10-30') }),
      project([document('VALIDATED')], { id: 'older-approved', approvedAt: new Date('2026-09-01') }),
    ])]);
    const [result] = await service.getBuildingsCompliance(admin);
    expect(result.documentaryStatus).toBe('APPROVED_AVAILABLE');
    expect(result.primarySource).toMatchObject({ projectId: 'older-approved', dateMeaning: 'PROJECT_APPROVAL_DATE' });
  });

  it('preserves all document types and prefers approved over a newer draft', async () => {
    prisma.building.findMany.mockResolvedValue([building([
      project([document('DRAFT', { id: 'draft' })], { id: 'pca', name: 'PCA', documentType: 'PCA' }),
      project([document('EXPORTED', { id: 'approved' })], { id: 'pmu', name: 'PMU', documentType: 'PMU' }),
    ])]);
    const [result] = await service.getBuildingsCompliance(admin);
    expect(result).toMatchObject({ documentaryStatus: 'APPROVED_AVAILABLE', sourceCount: 2, approvedCount: 1, draftCount: 1 });
    expect(result.primarySource.documentId).toBe('approved');
    expect(result.sources.map((source: any) => source.documentType)).toEqual(['PCA', 'PMU']);
  });

  it('distinguishes historical-only and no-document states', async () => {
    prisma.building.findMany.mockResolvedValue([
      building([project([document('ARCHIVED')])]),
      { ...building([project([])]), id: 'building-2' },
    ]);
    const results = await service.getBuildingsCompliance(admin);
    expect(Object.fromEntries(results.map((result) => [result.id, result.documentaryStatus]))).toEqual({
      'building-1': 'HISTORICAL_ONLY',
      'building-2': 'NO_ACCESSIBLE_DOCUMENT',
    });
  });
});
