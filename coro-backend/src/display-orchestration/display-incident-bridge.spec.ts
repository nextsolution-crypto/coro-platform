import { DisplayIncidentBridgeService } from './display-incident-bridge.service';
import { DisplayHeartbeatWatchService, SILENCE_ALERT_EVENT } from './display-heartbeat-watch.service';
import { displayAckLabel } from './display-orchestration.service';

function prismaWith(overrides: Record<string, any> = {}) {
  const base = {
    incidentEvent: { findMany: jest.fn().mockResolvedValue([]) },
    displayOperationalCommand: { findMany: jest.fn().mockResolvedValue([]) },
    displayLocation: { findMany: jest.fn().mockResolvedValue([{ id: 'loc-1', label: 'Hall' }]) },
    displayDevice: { findMany: jest.fn().mockResolvedValue([{ id: 'dev-1' }, { id: 'dev-2' }]) },
    displayDeviceAssignment: {
      findMany: jest.fn().mockResolvedValue([{ deviceId: 'dev-1', publicationId: 'pub-1', locationId: 'loc-1' }]),
    },
    displayPlanPublication: { findMany: jest.fn().mockResolvedValue([{ id: 'pub-1', locationId: 'loc-1' }]) },
    incidentLog: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    displayDeviceEvent: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() },
    building: { findUnique: jest.fn().mockResolvedValue({ name: 'Tour A', responsableEmail: 'resp@example.invalid', responsableFirstName: 'Rita', responsableLastName: null }) },
  };
  return Object.assign(base, overrides);
}

const incident = {
  id: 'inc-1',
  organizationId: 'org-1',
  buildingId: 'bld-1',
  type: 'FIRE_ALARM',
  isExercise: true,
  createdAt: new Date('2026-11-21T12:00:00Z'),
};

describe('M10-01 — l’incident Sentinelle commande les écrans', () => {
  it('envoie le mode exercice aux seuls écrans ayant un plan publié et journalise les autres', async () => {
    const prisma = prismaWith({ incidentEvent: { findMany: jest.fn().mockResolvedValue([incident]) } });
    const orchestration = { issueFromIncident: jest.fn().mockResolvedValue({}) };
    const bridge = new DisplayIncidentBridgeService(prisma as any, orchestration as any);
    await expect(bridge.openForActiveIncidents(new Date('2026-11-21T12:00:05Z'))).resolves.toBe(1);
    expect(orchestration.issueFromIncident).toHaveBeenCalledWith(
      'org-1',
      'bld-1',
      expect.objectContaining({
        commandType: 'ENTER_EXERCISE',
        source: 'CORO_INCIDENT',
        exercise: true,
        incidentEventId: 'inc-1',
        deviceIds: ['dev-1'],
        idempotencyKey: 'coro-incident:inc-1:enter',
      }),
    );
    expect(prisma.incidentLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'DISPLAY_AUTO_PARTIAL', incidentEventId: 'inc-1' }),
    });
  });

  it('envoie le mode urgence réel pour un incident réel', async () => {
    const prisma = prismaWith({
      incidentEvent: { findMany: jest.fn().mockResolvedValue([{ ...incident, isExercise: false }]) },
    });
    const orchestration = { issueFromIncident: jest.fn().mockResolvedValue({}) };
    await new DisplayIncidentBridgeService(prisma as any, orchestration as any).openForActiveIncidents();
    expect(orchestration.issueFromIncident.mock.calls[0][2]).toMatchObject({
      commandType: 'ENTER_EMERGENCY',
      severity: 'CRITICAL',
      exercise: false,
    });
  });

  it('ne renvoie rien si la commande existe déjà pour cet incident', async () => {
    const prisma = prismaWith({
      incidentEvent: { findMany: jest.fn().mockResolvedValue([incident]) },
      displayOperationalCommand: { findMany: jest.fn().mockResolvedValue([{ incidentEventId: 'inc-1' }]) },
    });
    const orchestration = { issueFromIncident: jest.fn() };
    await new DisplayIncidentBridgeService(prisma as any, orchestration as any).openForActiveIncidents();
    expect(orchestration.issueFromIncident).not.toHaveBeenCalled();
  });

  it('journalise un échec sans bloquer, et ne réessaie pas en boucle', async () => {
    const prisma = prismaWith({ incidentEvent: { findMany: jest.fn().mockResolvedValue([incident]) } });
    const orchestration = { issueFromIncident: jest.fn().mockRejectedValue(new Error('HIGHER_PRIORITY_COMMAND_ACTIVE')) };
    const bridge = new DisplayIncidentBridgeService(prisma as any, orchestration as any);
    const now = new Date('2026-11-21T12:00:05Z');
    await bridge.openForActiveIncidents(now);
    await bridge.openForActiveIncidents(new Date(now.getTime() + 5_000));
    expect(orchestration.issueFromIncident).toHaveBeenCalledTimes(1);
    expect(prisma.incidentLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'DISPLAY_AUTO_FAILED' }),
    });
  });

  it('termine l’exercice sur les écrans quand l’exercice est fermé', async () => {
    const prisma = prismaWith({
      displayOperationalCommand: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { incidentEventId: 'inc-1', organizationId: 'org-1', buildingId: 'bld-1', type: 'ENTER_EXERCISE', targetScope: { deviceIds: ['dev-1'] } },
          ])
          .mockResolvedValueOnce([]),
      },
      incidentEvent: { findMany: jest.fn().mockResolvedValue([{ id: 'inc-1', isExercise: true }]) },
    });
    const orchestration = { issueFromIncident: jest.fn().mockResolvedValue({}) };
    await expect(
      new DisplayIncidentBridgeService(prisma as any, orchestration as any).closeForEndedIncidents(),
    ).resolves.toBe(1);
    expect(orchestration.issueFromIncident.mock.calls[0][2]).toMatchObject({
      commandType: 'CANCEL_EXERCISE',
      deviceIds: ['dev-1'],
    });
  });

  it('garde la levée à deux personnes pour une urgence réelle fermée', async () => {
    const prisma = prismaWith({
      displayOperationalCommand: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { incidentEventId: 'inc-1', organizationId: 'org-1', buildingId: 'bld-1', type: 'ENTER_EMERGENCY', targetScope: { deviceIds: ['dev-1'] } },
          ])
          .mockResolvedValueOnce([]),
      },
      incidentEvent: { findMany: jest.fn().mockResolvedValue([{ id: 'inc-1', isExercise: false }]) },
    });
    const orchestration = { issueFromIncident: jest.fn() };
    await new DisplayIncidentBridgeService(prisma as any, orchestration as any).closeForEndedIncidents();
    expect(orchestration.issueFromIncident).not.toHaveBeenCalled();
    expect(prisma.incidentLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'DISPLAY_CLEAR_REQUIRED' }),
    });
  });

  it('libellé bilingue des accusés d’écran', () => {
    expect(displayAckLabel('APPLIED')).toContain('emergency mode applied');
  });
});

describe('M10-02 — alerte quand un écran se tait', () => {
  const now = new Date('2026-11-21T12:00:00Z');
  const silentDevice = {
    id: 'dev-1',
    organizationId: 'org-1',
    buildingId: 'bld-1',
    locationId: 'loc-1',
    lastHeartbeatAt: new Date('2026-11-21T11:30:00Z'),
    updatedAt: new Date('2026-11-21T11:30:00Z'),
  };

  it('prévient le responsable et l’organisation une seule fois par silence', async () => {
    const prisma = prismaWith({ displayDevice: { findMany: jest.fn().mockResolvedValue([silentDevice]) } });
    const email = { sendDisplayScreensSilent: jest.fn().mockResolvedValue({ success: true }) };
    const notifications = { createForOrganization: jest.fn().mockResolvedValue(undefined) };
    const watch = new DisplayHeartbeatWatchService(prisma as any, email as any, notifications as any);
    await expect(watch.alertSilentScreens(now)).resolves.toBe(1);
    expect(email.sendDisplayScreensSilent).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: 'resp@example.invalid', buildingName: 'Tour A', screens: [expect.objectContaining({ label: 'Hall' })] }),
    );
    expect(notifications.createForOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', type: 'DISPLAY_SCREEN_SILENT' }),
    );
    expect(prisma.displayDeviceEvent.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ deviceId: 'dev-1', eventType: SILENCE_ALERT_EVENT })],
    });
  });

  it('ne répète pas l’alerte tant que l’écran n’a pas repris puis perdu le signal', async () => {
    const prisma = prismaWith({
      displayDevice: { findMany: jest.fn().mockResolvedValue([silentDevice]) },
      displayDeviceEvent: {
        findMany: jest.fn().mockResolvedValue([{ deviceId: 'dev-1', createdAt: new Date('2026-11-21T11:45:00Z') }]),
        createMany: jest.fn(),
      },
    });
    const email = { sendDisplayScreensSilent: jest.fn() };
    const watch = new DisplayHeartbeatWatchService(prisma as any, email as any);
    await expect(watch.alertSilentScreens(now)).resolves.toBe(0);
    expect(email.sendDisplayScreensSilent).not.toHaveBeenCalled();
  });
});
