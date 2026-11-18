import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CLIENT-01B database provenance contract', () => {
  const schema = readFileSync(
    join(process.cwd(), 'prisma/schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20261219010000_typed_business_actor_provenance/migration.sql',
    ),
    'utf8',
  );

  it('keeps a tenant-scoped concrete identity registry', () => {
    expect(schema).toContain('model CoroActorIdentity');
    expect(migration).toContain('CoroActorIdentity_exact_identity_check');
    expect(migration).toContain('CoroActorIdentity_user_fkey');
    expect(migration).toContain('CoroActorIdentity_client_user_fkey');
  });

  it.each([
    'IncidentReport_creator_actor_fkey',
    'IncidentReportApproval_actor_fkey',
    'OperationalLogEntry_author_actor_fkey',
    'OperationalShiftHistory_actor_fkey',
    'OperationalDirective_approver_actor_fkey',
    'OperationalFollowUpEvent_actor_fkey',
  ])('enforces %s in PostgreSQL', (constraint) => {
    expect(migration).toContain(constraint);
  });

  it('preserves append-only decisions and operational histories', () => {
    for (const trigger of [
      'IncidentReportApproval_append_only_guard',
      'IncidentReportAuditEvent_append_only_guard',
      'OperationalShiftHistory_append_only_guard',
      'OperationalHandoverAction_append_only_guard',
      'OperationalFollowUpEvent_append_only_guard',
      'OperationalLogAuditEvent_append_only_guard',
    ])
      expect(migration).toContain(trigger);
  });
});
