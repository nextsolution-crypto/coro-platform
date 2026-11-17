import { operationalDirectivesEnabled, operationalFollowUpsEnabled } from './operational-directives.config';

describe('operational directives feature flags', () => {
  it('fail closed and accept only literal true', () => {
    expect(operationalDirectivesEnabled({})).toBe(false);
    expect(operationalDirectivesEnabled({ OPERATIONAL_DIRECTIVES_ENABLED: 'TRUE' })).toBe(false);
    expect(operationalDirectivesEnabled({ OPERATIONAL_DIRECTIVES_ENABLED: '1' })).toBe(false);
    expect(operationalDirectivesEnabled({ OPERATIONAL_DIRECTIVES_ENABLED: 'true' })).toBe(true);
    expect(operationalFollowUpsEnabled({})).toBe(false);
    expect(operationalFollowUpsEnabled({ OPERATIONAL_FOLLOWUPS_ENABLED: 'true' })).toBe(true);
  });
});
