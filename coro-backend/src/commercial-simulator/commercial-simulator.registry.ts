import { BadRequestException } from '@nestjs/common';
import { PROPOSAL_INPUT_REGISTRY } from '../commercial-proposals/proposal-input-registry';

export type SimulatorValueType =
  | 'DECIMAL'
  | 'INTEGER'
  | 'MONEY'
  | 'BOOLEAN'
  | 'TEXT';

export type SimulatorDriverDefinition = Readonly<{
  code: string;
  version: 'v1';
  valueType: SimulatorValueType;
  category: 'QUANTITY' | 'COMPLEXITY' | 'VALUE_ANALYSIS';
  unit: string | null;
  proposalInputCode: keyof typeof PROPOSAL_INPUT_REGISTRY;
}>;

const typeMap = {
  DECIMAL: 'DECIMAL',
  INTEGER: 'INTEGER',
  MONEY: 'MONEY',
  TEXT: 'TEXT',
} as const;

export const SIMULATOR_DRIVER_REGISTRY: readonly SimulatorDriverDefinition[] =
  Object.freeze(
    Object.entries(PROPOSAL_INPUT_REGISTRY).map(
      ([code, [valueType, category, unit]]) =>
        Object.freeze({
          code,
          version: 'v1' as const,
          valueType: typeMap[valueType],
          category,
          unit,
          proposalInputCode: code as keyof typeof PROPOSAL_INPUT_REGISTRY,
        }),
    ),
  );

const byIdentity = new Map(
  SIMULATOR_DRIVER_REGISTRY.map((definition) => [
    `${definition.code}@${definition.version}`,
    definition,
  ]),
);

export function resolveSimulatorDriver(code: string, version: string) {
  const definition = byIdentity.get(`${code}@${version}`);
  if (!definition) {
    throw new BadRequestException('SIMULATOR_DRIVER_NOT_SUPPORTED');
  }
  return definition;
}
