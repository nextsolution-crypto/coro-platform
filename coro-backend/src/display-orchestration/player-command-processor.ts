import { randomUUID } from 'node:crypto';
import type {
  PlayerDeviceIdentity,
  TrustedManifestKey,
} from '../display-player/player-contracts';
import type { ConnectedPlayerService } from '../display-device/connected-player-service';
import type { DeviceGatewayHttpClient } from '../display-device/device-gateway-http-client';
import type { DurableLocalJournal } from '../display-device/operational-resilience';
import type { EmergencyStateStore } from '../display-device/persistent-runtime';
import {
  evaluatePlayerCommand,
  type PlayerOperationalState,
} from './display-command-policy';
import {
  verifyPlayerCommand,
  type SignedDisplayCommand,
} from './player-command-verifier';

const RANK = {
  NORMAL_CYCLE: 0,
  PERMANENT_PLAN: 1,
  EMERGENCY_EXERCISE: 2,
  EMERGENCY_REAL: 3,
} as const;

export class GovernedDisplayCommandProcessor {
  private state: PlayerOperationalState = {
    priority: 'PERMANENT_PLAN',
    sequence: 0,
  };

  constructor(
    private readonly identity: PlayerDeviceIdentity,
    trustedKeys: TrustedManifestKey[],
    private readonly gateway: DeviceGatewayHttpClient,
    private readonly player: ConnectedPlayerService,
    private readonly emergency: EmergencyStateStore,
    private readonly journal: DurableLocalJournal,
  ) {
    this.trustedKeys = new Map(
      trustedKeys.map((key) => [key.keyId, key.publicKeyPem]),
    );
  }
  private readonly trustedKeys: ReadonlyMap<string, string>;

  async restore() {
    const persisted = await this.emergency.read();
    if (!persisted) return;
    this.state = {
      priority: persisted.mode,
      sequence: persisted.version,
      commandId: persisted.authorizationId,
      incidentEventId: persisted.eventId,
    };
    this.player.setMode(persisted.mode);
  }

  async pollAndApply() {
    const response = await this.gateway.commands(
      `commands-${randomUUID()}`,
      this.state.sequence,
    );
    for (const signed of response.commands as SignedDisplayCommand[])
      await this.apply(signed);
    return response.commands.length;
  }

  async apply(signed: SignedDisplayCommand) {
    try {
      verifyPlayerCommand(signed, this.trustedKeys, {
        deviceId: this.identity.deviceId,
        organizationId: this.identity.organizationId,
        buildingId: this.identity.buildingId,
      });
      const decision = evaluatePlayerCommand(this.state, signed.payload);
      if (!decision.accepted) {
        await this.gateway.acknowledgeCommand({
          requestId: `ack-${randomUUID()}`,
          commandId: signed.payload.commandId,
          status:
            decision.reason === 'COMMAND_SEQUENCE_STALE' ? 'STALE' : 'REJECTED',
          observedAt: new Date().toISOString(),
          errorCode: decision.reason,
          declaredState: this.state,
        });
        return;
      }
      await this.gateway.acknowledgeCommand({
        requestId: `ack-${randomUUID()}`,
        commandId: signed.payload.commandId,
        status: 'RECEIVED',
        observedAt: new Date().toISOString(),
        declaredState: this.state,
      });
      const clear = decision.next.priority === 'NORMAL_CYCLE';
      await this.emergency.write(
        {
          mode: decision.next.priority,
          eventId: signed.payload.incidentEventId ?? signed.payload.commandId,
          source: 'FUTURE_GOVERNED_GATEWAY',
          priority: RANK[decision.next.priority],
          occurredAt: signed.payload.issuedAt,
          version: signed.payload.sequence,
          authorizationId: signed.payload.commandId,
        },
        { governedClear: clear },
      );
      this.state = decision.next;
      this.player.setMode(decision.next.priority);
      await this.journal.append(clear ? 'GOVERNED_CLEAR' : 'EMERGENCY', {
        commandId: signed.payload.commandId,
        incidentEventId: signed.payload.incidentEventId ?? null,
        sequence: signed.payload.sequence,
        priority: signed.payload.priority,
      });
      await this.gateway.acknowledgeCommand({
        requestId: `ack-${randomUUID()}`,
        commandId: signed.payload.commandId,
        status: 'APPLIED',
        observedAt: new Date().toISOString(),
        declaredState: { ...this.state, physicalDisplayProof: false },
      });
    } catch (error) {
      await this.journal.append('ERROR', {
        code:
          error instanceof Error ? error.message : 'COMMAND_PROCESSING_FAILED',
      });
      throw error;
    }
  }
}
