import { NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { ExerciseReportAccessService } from './exercise-report-access.service';

describe('ExerciseReportAccessService', () => {
  const canonical = {
    id: 'report-a',
    organizationId: 'customer-a',
    projectId: 'project-a',
    buildingId: 'building-a',
    project: { organizationId: 'customer-a', buildingId: 'building-a', isActive: true },
    building: { organizationId: 'customer-a', isActive: true },
  };
  let prisma: any;
  let authority: any;
  let service: ExerciseReportAccessService;

  beforeEach(() => {
    prisma = {
      exerciseReport: { findUnique: jest.fn().mockResolvedValue(canonical), count: jest.fn().mockResolvedValue(1) },
      projectActivity: { findUnique: jest.fn(), count: jest.fn() },
    };
    authority = { requirePermission: jest.fn().mockResolvedValue({ kind: 'DELEGATED' }) };
    service = new ExerciseReportAccessService(prisma, authority);
  });

  it('resolves the target organization server-side for a matching ORGANIZATION grant', async () => {
    const scope = await service.governedReport(
      'report-a',
      { userId: 'operator', organizationId: 'coro-operator', role: 'OPERATOR' },
      PlatformPermission.EXERCISE_REPORT_REVIEW,
    );
    expect(authority.requirePermission).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'operator' }),
      PlatformPermission.EXERCISE_REPORT_REVIEW,
      'customer-a',
    );
    expect(scope).toMatchObject({ organizationId: 'customer-a', authorization: 'PLATFORM_AUTHORITY' });
  });

  it('accepts an explicit GLOBAL grant through the same canonical decision', async () => {
    authority.requirePermission.mockResolvedValue({ kind: 'DELEGATED', grant: { scope: 'GLOBAL' } });
    await expect(service.governedReport('report-a', { userId: 'global', organizationId: 'coro-operator', role: 'OPERATOR' }, PlatformPermission.EXERCISE_REPORT_PUBLISH)).resolves.toMatchObject({ id: 'report-a' });
  });

  it.each(['missing grant', 'revoked grant', 'inactive employee', 'customer identity', 'wrong organization scope'])(
    'fails closed without identifier disclosure for %s',
    async () => {
      authority.requirePermission.mockRejectedValue(new Error('sensitive authorization reason'));
      await expect(service.governedReport('report-a', { userId: 'denied', organizationId: 'other', role: 'ADMIN' }, PlatformPermission.EXERCISE_REPORT_PUBLISH)).rejects.toEqual(
        expect.objectContaining<Partial<NotFoundException>>({ message: 'Rapport exercice introuvable' }),
      );
    },
  );

  it('rejects inconsistent project/building provenance before permission evaluation', async () => {
    prisma.exerciseReport.findUnique.mockResolvedValue({ ...canonical, project: { ...canonical.project, buildingId: 'forged-building' } });
    await expect(service.governedReport('report-a', { userId: 'operator', organizationId: 'coro-operator', role: 'OPERATOR' }, PlatformPermission.EXERCISE_REPORT_REVIEW)).rejects.toBeInstanceOf(NotFoundException);
    expect(authority.requirePermission).not.toHaveBeenCalled();
  });

  it('preserves historical same-tenant project access for non-governance reads', async () => {
    await expect(service.report('report-a', { userId: 'customer-user', organizationId: 'customer-a', role: 'ADMIN' }, PlatformPermission.EXERCISE_REPORT_REVIEW)).resolves.toMatchObject({ authorization: 'CUSTOMER_PROJECT_SCOPE' });
    expect(authority.requirePermission).not.toHaveBeenCalled();
  });
});
