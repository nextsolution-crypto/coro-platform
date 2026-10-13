export type ProposalGateStatus = 'READY' | 'BLOCKED' | 'NEEDS_REVIEW';

export type ProposalGateBlocker = {
  code: string;
  severity: 'BLOCKING' | 'REVIEW';
  labelFR: string;
  labelEN: string;
  explanation: string;
  authority: string;
  correctiveAction: string;
  navigationTarget?: string;
};

export type ProposalGatePhase = 'APPROVAL' | 'ISSUANCE';
