import { readFileSync } from 'fs';

describe('Phase 2D schema contract', () => {
  const schema = readFileSync(
    __dirname + '/../../prisma/schema.prisma',
    'utf8',
  );
  const migration = readFileSync(
    __dirname +
      '/../../prisma/migrations/20261001010000_super_admin_v2_phase_2d_commercial_proposals/migration.sql',
    'utf8',
  );

  it('contains exactly the 13 approved Phase 2D models', () => {
    const models = [
      'CommercialProspect',
      'CommercialProposal',
      'CommercialProposalRevision',
      'ProposalInput',
      'ProposalLine',
      'ProposalTierSnapshot',
      'ProposalAdjustment',
      'ProposalExclusivity',
      'ProposalExclusivitySector',
      'ProposalExclusivityCapability',
      'ProposalMinimumCommitment',
      'ProposalDocument',
      'ProposalValueAnalysis',
    ];
    for (const model of models) {
      expect(schema).toContain(`model ${model} {`);
      expect(migration).toContain(`CREATE TABLE "${model}"`);
    }
  });

  it('adds no entitlement, billing, invoice or payment object', () => {
    expect(migration).not.toMatch(
      /CREATE (?:TABLE|TYPE) "[^"]*(Entitlement|Invoice|Payment|Billing)/i,
    );
    expect(migration).not.toContain('INSERT INTO "CapabilityEntitlement"');
  });

  it('keeps the approved structured Partner snapshot fields nullable', () => {
    for (const field of [
      'internalUse',
      'distributable',
      'distributionLimit',
      'distributionMetric',
    ]) {
      expect(migration).toMatch(
        new RegExp(`ADD COLUMN\\s+"${field}"[^,;]*(?:,|;)`),
      );
    }
    expect(migration).toContain('ContractPriceSnapshotLine_distribution_check');
  });
});
