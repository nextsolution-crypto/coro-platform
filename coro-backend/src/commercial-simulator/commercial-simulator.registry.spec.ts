import { PROPOSAL_INPUT_REGISTRY } from '../commercial-proposals/proposal-input-registry';
import {
  SIMULATOR_DRIVER_REGISTRY,
  resolveSimulatorDriver,
} from './commercial-simulator.registry';

describe('commercial simulator driver registry', () => {
  it('covers every existing Proposal input without mutable database definitions', () => {
    expect(SIMULATOR_DRIVER_REGISTRY.map((item) => item.code).sort()).toEqual(
      Object.keys(PROPOSAL_INPUT_REGISTRY).sort(),
    );
    expect(
      new Set(SIMULATOR_DRIVER_REGISTRY.map((item) => item.version)),
    ).toEqual(new Set(['v1']));
  });

  it('rejects unsupported identities', () => {
    expect(() => resolveSimulatorDriver('UNKNOWN', 'v1')).toThrow(
      'SIMULATOR_DRIVER_NOT_SUPPORTED',
    );
    expect(() => resolveSimulatorDriver('SITES', 'v2')).toThrow(
      'SIMULATOR_DRIVER_NOT_SUPPORTED',
    );
  });
});
