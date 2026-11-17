import {
  OPERATIONAL_LOG_FEATURE_FLAG,
  operationalLogEnabled,
} from './operational-log.config';

describe('operational log feature gate', () => {
  it('fails closed unless the server value is exactly true', () => {
    expect(operationalLogEnabled({})).toBe(false);
    expect(
      operationalLogEnabled({ [OPERATIONAL_LOG_FEATURE_FLAG]: 'TRUE' }),
    ).toBe(false);
    expect(
      operationalLogEnabled({ [OPERATIONAL_LOG_FEATURE_FLAG]: 'false' }),
    ).toBe(false);
    expect(
      operationalLogEnabled({ [OPERATIONAL_LOG_FEATURE_FLAG]: 'true' }),
    ).toBe(true);
  });
});
