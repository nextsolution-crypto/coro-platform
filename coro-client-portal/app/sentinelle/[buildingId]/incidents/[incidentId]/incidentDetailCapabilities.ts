export type IncidentDetailCapabilities = {
  canRead: boolean;
  canParticipate: boolean;
  canSupervise: boolean;
  canCommand: boolean;
  canActivatePca: boolean;
};

const DENIED_STATUS = new Set([401, 403, 404]);

export function normalizeIncidentDetailCapabilities(value: unknown): IncidentDetailCapabilities {
  const candidate = value && typeof value === 'object'
    ? value as Partial<IncidentDetailCapabilities>
    : {};
  return {
    canRead: candidate.canRead === true,
    canParticipate: candidate.canParticipate === true,
    canSupervise: candidate.canSupervise === true,
    canCommand: candidate.canCommand === true,
    canActivatePca: candidate.canActivatePca === true,
  };
}

export function canShowIncidentActions(
  status: string | undefined,
  capabilities: IncidentDetailCapabilities,
  revoked = false,
) {
  return !revoked
    && capabilities.canCommand
    && (status === 'ACTIVE' || status === 'CONTAINED');
}

export function canEditIncidentRex(
  capabilities: IncidentDetailCapabilities,
  revoked = false,
) {
  return !revoked && capabilities.canSupervise;
}

export function isIncidentAuthorizationError(status: number) {
  return DENIED_STATUS.has(status);
}
