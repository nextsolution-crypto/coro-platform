import { generateKeyPairSync, sign } from 'node:crypto';
import { canonicalize } from '../display-player/manifest-validator';
import { GovernedDisplayCommandProcessor } from './player-command-processor';
import type { SignedDisplayCommand } from './player-command-verifier';

describe('GovernedDisplayCommandProcessor', () => {
  type Acknowledgement = {
    status: string;
    errorCode?: string;
    declaredState?: { physicalDisplayProof: boolean };
  };
  const pair = generateKeyPairSync('ed25519');
  const key = {
    keyId: 'authority',
    publicKeyPem: pair.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString(),
    activeFrom: '2026-01-01T00:00:00.000Z',
  };
  const identity = {
    deviceId: 'device-a',
    organizationId: 'org-a',
    buildingId: 'building-a',
    locationId: 'location-a',
    displayProfile: 'WIDESCREEN_16X9',
    softwareVersion: '0.7.0',
  } as const;
  const makeCommand = (
    overrides: Partial<SignedDisplayCommand['payload']> = {},
  ): SignedDisplayCommand => {
    const payload = {
      schemaVersion: 1 as const,
      commandId: 'command-a',
      organizationId: 'org-a',
      buildingId: 'building-a',
      incidentEventId: 'incident-a',
      type: 'ENTER_EMERGENCY' as const,
      priority: 'EMERGENCY_REAL' as const,
      sequence: 1,
      issuedAt: new Date().toISOString(),
      targetScope: { deviceIds: ['device-a'] },
      policyVersion: 'DISPLAY-07/1',
      ...overrides,
    };
    return {
      keyId: key.keyId,
      algorithm: 'Ed25519',
      payload,
      signature: sign(
        null,
        Buffer.from(canonicalize(payload)),
        pair.privateKey,
      ).toString('base64'),
    };
  };
  const setup = () => {
    const gateway = {
      commands: jest.fn(),
      acknowledgeCommand: jest.fn().mockResolvedValue({}),
    };
    const player = { setMode: jest.fn() };
    const emergency = {
      read: jest.fn().mockResolvedValue(null),
      write: jest.fn().mockResolvedValue(undefined),
    };
    const journal = { append: jest.fn().mockResolvedValue({}) };
    return {
      gateway,
      player,
      emergency,
      journal,
      processor: new GovernedDisplayCommandProcessor(
        identity,
        [key],
        gateway as never,
        player as never,
        emergency as never,
        journal as never,
      ),
    };
  };

  it('persists emergency before declaring APPLIED and distinguishes physical proof', async () => {
    const ctx = setup();
    await ctx.processor.apply(makeCommand());
    const calls = ctx.gateway.acknowledgeCommand.mock.calls as [
      Acknowledgement,
    ][];
    expect(calls.map(([value]) => value.status)).toEqual([
      'RECEIVED',
      'APPLIED',
    ]);
    expect(ctx.emergency.write).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'EMERGENCY_REAL', version: 1 }),
      { governedClear: false },
    );
    expect(ctx.player.setMode).toHaveBeenCalledWith('EMERGENCY_REAL');
    expect(calls[1][0].declaredState?.physicalDisplayProof).toBe(false);
  });

  it('restores a persisted real emergency after restart', async () => {
    const ctx = setup();
    ctx.emergency.read.mockResolvedValue({
      mode: 'EMERGENCY_REAL',
      eventId: 'incident-a',
      source: 'FUTURE_GOVERNED_GATEWAY',
      priority: 3,
      occurredAt: new Date().toISOString(),
      version: 8,
      authorizationId: 'command-old',
    });
    await ctx.processor.restore();
    expect(ctx.player.setMode).toHaveBeenCalledWith('EMERGENCY_REAL');
  });

  it('rejects an exercise that arrives after a real emergency', async () => {
    const ctx = setup();
    await ctx.processor.apply(makeCommand());
    await ctx.processor.apply(
      makeCommand({
        commandId: 'exercise',
        type: 'ENTER_EXERCISE',
        priority: 'EMERGENCY_EXERCISE',
        sequence: 2,
      }),
    );
    const calls = ctx.gateway.acknowledgeCommand.mock.calls as [
      Acknowledgement,
    ][];
    expect(calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        status: 'REJECTED',
        errorCode: 'COMMAND_PRIORITY_LOWER',
      }),
    );
  });
});
