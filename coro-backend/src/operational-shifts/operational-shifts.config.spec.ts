import { operationalShiftsEnabled } from './operational-shifts.config';

describe('operationalShiftsEnabled', () => {
  it('is fail-closed unless the value is exactly true', () => {
    expect(operationalShiftsEnabled({})).toBe(false);
    expect(
      operationalShiftsEnabled({ OPERATIONAL_SHIFTS_ENABLED: 'TRUE' }),
    ).toBe(false);
    expect(operationalShiftsEnabled({ OPERATIONAL_SHIFTS_ENABLED: '1' })).toBe(
      false,
    );
    expect(
      operationalShiftsEnabled({ OPERATIONAL_SHIFTS_ENABLED: 'true' }),
    ).toBe(true);
  });
});
