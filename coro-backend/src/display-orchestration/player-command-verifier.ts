import { createPublicKey, verify } from 'node:crypto';
import { canonicalize } from '../display-player/manifest-validator';
import type { PlayerCommandEnvelope } from './display-command-policy';

export type SignedDisplayCommand = {
  keyId: string;
  algorithm: 'Ed25519';
  payload: PlayerCommandEnvelope & {
    schemaVersion: number;
    targetScope: { deviceIds: string[] };
    policyVersion: string;
  };
  signature: string;
};

export function verifyPlayerCommand(
  command: SignedDisplayCommand,
  trustedKeys: ReadonlyMap<string, string>,
  expected: { deviceId: string; organizationId: string; buildingId: string },
  now = new Date(),
): void {
  if (command.algorithm !== 'Ed25519')
    throw new Error('COMMAND_ALGORITHM_INVALID');
  const publicKey = trustedKeys.get(command.keyId);
  if (!publicKey) throw new Error('COMMAND_SIGNER_UNTRUSTED');
  if (
    command.payload.organizationId !== expected.organizationId ||
    command.payload.buildingId !== expected.buildingId ||
    !command.payload.targetScope.deviceIds.includes(expected.deviceId)
  )
    throw new Error('COMMAND_SCOPE_MISMATCH');
  const issuedAt = Date.parse(command.payload.issuedAt);
  if (!Number.isFinite(issuedAt) || issuedAt > now.getTime() + 120_000)
    throw new Error('COMMAND_TIME_INVALID');
  let valid = false;
  try {
    valid = verify(
      null,
      Buffer.from(canonicalize(command.payload)),
      createPublicKey(publicKey),
      Buffer.from(command.signature, 'base64'),
    );
  } catch {
    valid = false;
  }
  if (!valid) throw new Error('COMMAND_SIGNATURE_INVALID');
}
