import { PilotCheckStatus, PilotRunStatus } from '@prisma/client';
import { TOUR_PREMONT_E2E_CHECKLIST } from './pilot-scenario.checklist';
import {
  completedPilotStatus,
  PilotScenariosService,
  runningPilotStatus,
} from './pilot-scenarios.service';

describe('PilotScenariosService', () => {
  it('publishes a stable, unique checklist spanning every pilot phase', () => {
    const keys = TOUR_PREMONT_E2E_CHECKLIST.map((check) => check.checkKey);
    expect(keys.length).toBeGreaterThanOrEqual(50);
    expect(new Set(keys).size).toBe(keys.length);
    expect(
      new Set(TOUR_PREMONT_E2E_CHECKLIST.map((check) => check.phase)).size,
    ).toBe(12);
  });

  it('never reports a passing run while a check is unexecuted or blocked', () => {
    expect(
      runningPilotStatus([PilotCheckStatus.PASS, PilotCheckStatus.NOT_RUN]),
    ).toBe(PilotRunStatus.RUNNING);
    expect(
      runningPilotStatus([PilotCheckStatus.PASS, PilotCheckStatus.BLOCKED]),
    ).toBe(PilotRunStatus.RUNNING);
    expect(
      completedPilotStatus([PilotCheckStatus.PASS, PilotCheckStatus.BLOCKED]),
    ).toBe(PilotRunStatus.PARTIAL);
  });

  it('makes any demonstrated failure fail the run', () => {
    expect(
      runningPilotStatus([PilotCheckStatus.PASS, PilotCheckStatus.FAIL]),
    ).toBe(PilotRunStatus.FAILED);
    expect(
      completedPilotStatus([PilotCheckStatus.NOT_RUN, PilotCheckStatus.FAIL]),
    ).toBe(PilotRunStatus.FAILED);
  });

  it('accepts only PASS and NOT_APPLICABLE as a complete passing run', () => {
    expect(
      completedPilotStatus([
        PilotCheckStatus.PASS,
        PilotCheckStatus.NOT_APPLICABLE,
      ]),
    ).toBe(PilotRunStatus.PASSED);
  });

  it('scopes tenant scenario lists to the authenticated administrator organization', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new PilotScenariosService(
      { pilotScenario: { findMany } } as never,
      {} as never,
    );

    await service.listForTenant({
      userId: 'admin-1',
      role: 'ADMIN',
      organizationId: 'organization-a',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'organization-a' } }),
    );
  });

  it('rejects non-administrators before reading tenant pilot scenarios', async () => {
    const findMany = jest.fn();
    const service = new PilotScenariosService(
      { pilotScenario: { findMany } } as never,
      {} as never,
    );

    expect(() =>
      service.listForTenant({
        userId: 'operator-1',
        role: 'OPERATOR',
        organizationId: 'organization-a',
      }),
    ).toThrow('Seul un administrateur du tenant');
    expect(findMany).not.toHaveBeenCalled();
  });

  it('includes the tenant organization in the check mutation lookup', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const transaction = jest.fn(async (callback) =>
      callback({ pilotScenarioRun: { findFirst } }),
    );
    const service = new PilotScenariosService(
      { $transaction: transaction } as never,
      {} as never,
    );

    await expect(
      service.updateCheckForTenant(
        'scenario-1',
        'run-1',
        'document.private-file',
        { status: PilotCheckStatus.PASS, reason: 'Preuve QA' },
        {
          userId: 'admin-1',
          role: 'ADMIN',
          organizationId: 'organization-a',
        },
      ),
    ).rejects.toThrow('Exécution pilote introuvable');
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'run-1',
          scenarioId: 'scenario-1',
          scenario: { organizationId: 'organization-a' },
        },
      }),
    );
  });
});
