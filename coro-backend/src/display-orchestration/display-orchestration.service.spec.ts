import { ForbiddenException } from '@nestjs/common';
import { DisplayOrchestrationService } from './display-orchestration.service';

const base = {
  idempotencyKey: 'idempotency-key-0001',
  correlationId: 'correlation-id-0001',
  source: 'SIMULATOR',
  severity: 'INFORMATION',
  commandType: 'ENTER_EXERCISE',
  eventType: 'EXERCISE',
  exercise: true,
  occurredAt: '2026-11-12T12:00:00.000Z',
  zoneIds: [],
  deviceIds: [],
  payload: { synthetic: true },
  reason: 'Synthetic DISPLAY-07 verification',
} as const;

describe('DisplayOrchestrationService security boundaries', () => {
  const prisma = {
    displayOperationalCommand: { findUnique: jest.fn() },
    incidentEvent: { findFirst: jest.fn() },
  };
  const spatial = { require: jest.fn() };
  const gateway = {};
  const signer = { keyId: 'test', sign: jest.fn() };
  const service = new DisplayOrchestrationService(
    prisma as never,
    spatial as never,
    gateway as never,
    signer,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    spatial.require.mockResolvedValue(undefined);
    prisma.displayOperationalCommand.findUnique.mockResolvedValue(null);
    prisma.incidentEvent.findFirst.mockResolvedValue(null);
  });

  it('stops before persistence when building authority is denied', async () => {
    spatial.require.mockRejectedValue(new ForbiddenException('scope denied'));
    await expect(
      service.issue(
        'org-a',
        'building-a',
        { userId: 'actor-a', organizationId: 'org-b', role: 'OPERATOR' },
        { ...base } as never,
      ),
    ).rejects.toThrow('scope denied');
    expect(prisma.displayOperationalCommand.findUnique).not.toHaveBeenCalled();
  });

  it('keeps future Building Bridge input disabled', async () => {
    await expect(
      service.issue(
        'org-a',
        'building-a',
        { userId: 'actor-a', organizationId: 'org-a', role: 'OPERATOR' },
        { ...base, source: 'BUILDING_BRIDGE_FUTURE' } as never,
      ),
    ).rejects.toThrow('BUILDING_BRIDGE_NOT_ENABLED');
  });

  it('refuses machine provenance on the human JWT route', async () => {
    await expect(
      service.issue(
        'org-a',
        'building-a',
        { userId: 'actor-a', organizationId: 'org-a', role: 'OPERATOR' },
        { ...base, source: 'CORO_OPS', protocolId: 'protocol-a' } as never,
      ),
    ).rejects.toThrow('MACHINE_EVENT_SOURCE_REQUIRES_TRUSTED_ADAPTER');
    await expect(
      service.issue(
        'org-a',
        'building-a',
        { userId: 'actor-a', organizationId: 'org-a', role: 'OPERATOR' },
        { ...base, source: 'CORO_INCIDENT' } as never,
      ),
    ).rejects.toThrow('MACHINE_EVENT_SOURCE_REQUIRES_TRUSTED_ADAPTER');
  });

  it('restricts simulator provenance to exercises', async () => {
    await expect(
      service.issue(
        'org-a',
        'building-a',
        { userId: 'actor-a', organizationId: 'org-a', role: 'OPERATOR' },
        { ...base, source: 'SIMULATOR', exercise: false } as never,
      ),
    ).rejects.toThrow('SIMULATOR_SOURCE_REQUIRES_EXERCISE');
  });

  it('forbids a direct restore that bypasses governed clear', async () => {
    await expect(
      service.issue(
        'org-a',
        'building-a',
        { userId: 'actor-a', organizationId: 'org-a', role: 'OPERATOR' },
        { ...base, commandType: 'RESTORE_NORMAL' } as never,
      ),
    ).rejects.toThrow('DIRECT_RESTORE_FORBIDDEN_USE_GOVERNED_CLEAR');
  });

  it('requires a matching active incident for a real emergency', async () => {
    await expect(
      service.issue(
        'org-a',
        'building-a',
        { userId: 'actor-a', organizationId: 'org-a', role: 'OPERATOR' },
        {
          ...base,
          source: 'MANUAL',
          commandType: 'ENTER_EMERGENCY',
          exercise: false,
        } as never,
      ),
    ).rejects.toThrow('ACTIVE_INCIDENT_REQUIRED');
  });
});
