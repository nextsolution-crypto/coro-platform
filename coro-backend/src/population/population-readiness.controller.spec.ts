import { ForbiddenException } from '@nestjs/common';
import { PopulationReadinessController } from './population-readiness.controller';

describe('PopulationReadinessController', () => {
  const response = {
    population: {
      core: 'READY',
      access: 'READY',
      geocoding: 'READY',
      email: 'READY',
      sms: 'NOT_VALIDATED',
    },
  };
  const readiness = { getReadiness: jest.fn(() => response) };
  const controller = new PopulationReadinessController(readiness as any);

  it('returns sanitized capability states to a SUPER_ADMIN', () => {
    expect(controller.getReadiness({ user: { role: 'SUPER_ADMIN' } })).toBe(
      response,
    );
  });

  it('rejects non-administrative and anonymous requests', () => {
    expect(() => controller.getReadiness({ user: { role: 'ADMIN' } })).toThrow(
      ForbiddenException,
    );
    expect(() => controller.getReadiness({})).toThrow(ForbiddenException);
  });
});
