import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 3B command contract', () => {
  const source = readFileSync(
    join(__dirname, 'entitlement-command.service.ts'),
    'utf8',
  );

  it('shares derivation between zero-write preview and execution', () => {
    expect(source).toContain('deriveTransition');
    expect(source).toContain('deriveCreation');
    expect(source).toContain('operationalMutationPerformed: false');
    expect(source).toContain("enforcement: 'NONE'");
  });

  it('preserves complete limits and requires explicit remove-all', () => {
    expect(source).toContain('sourceRevision.limits.map');
    expect(source).toContain("command.operation === 'CHANGE_LIMITS'");
    expect(source).toContain('if (command.removeAllLimits) limits = []');
    expect(source).toContain('COMPLETE_LIMIT_SNAPSHOT_REQUIRED');
  });

  it('uses server time for revoke and refuses pending mutations', () => {
    expect(source).toContain("command.operation === 'REVOKE' ? now");
    expect(source).toContain('rejectPendingRevision');
  });
});
