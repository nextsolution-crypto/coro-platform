import { PilotCheckStatus, PilotRunStatus } from '@prisma/client';
import { TOUR_PREMONT_E2E_CHECKLIST } from './pilot-scenario.checklist';
import {
  completedPilotStatus,
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
});
