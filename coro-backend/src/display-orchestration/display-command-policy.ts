export type DisplayPriority =
  | 'NORMAL_CYCLE'
  | 'PERMANENT_PLAN'
  | 'EMERGENCY_EXERCISE'
  | 'EMERGENCY_REAL';

export type PlayerCommandType =
  | 'ENTER_EMERGENCY'
  | 'ENTER_EXERCISE'
  | 'MAINTAIN_EMERGENCY'
  | 'UPDATE_EMERGENCY_CONTEXT'
  | 'REQUEST_CLEAR'
  | 'APPROVE_CLEAR'
  | 'CANCEL_EXERCISE'
  | 'RESTORE_NORMAL';

export type PlayerOperationalState = {
  priority: DisplayPriority;
  sequence: number;
  commandId?: string;
  incidentEventId?: string;
};

export type PlayerCommandEnvelope = {
  commandId: string;
  organizationId: string;
  buildingId: string;
  incidentEventId?: string | null;
  type: PlayerCommandType;
  priority: DisplayPriority;
  sequence: number;
  issuedAt: string;
};

const PRIORITY: Record<DisplayPriority, number> = {
  NORMAL_CYCLE: 0,
  PERMANENT_PLAN: 1,
  EMERGENCY_EXERCISE: 2,
  EMERGENCY_REAL: 3,
};

export function commandPriority(exercise: boolean): DisplayPriority {
  return exercise ? 'EMERGENCY_EXERCISE' : 'EMERGENCY_REAL';
}

export function evaluatePlayerCommand(
  current: PlayerOperationalState,
  command: PlayerCommandEnvelope,
): { accepted: boolean; reason: string; next: PlayerOperationalState } {
  if (
    !Number.isSafeInteger(command.sequence) ||
    command.sequence <= current.sequence
  )
    return { accepted: false, reason: 'COMMAND_SEQUENCE_STALE', next: current };

  const isClear = [
    'APPROVE_CLEAR',
    'CANCEL_EXERCISE',
    'RESTORE_NORMAL',
  ].includes(command.type);
  if (isClear) {
    if (
      current.priority === 'EMERGENCY_REAL' &&
      command.priority !== 'EMERGENCY_REAL'
    )
      return {
        accepted: false,
        reason: 'CLEAR_PRIORITY_INSUFFICIENT',
        next: current,
      };
    if (
      current.incidentEventId &&
      command.incidentEventId !== current.incidentEventId
    )
      return {
        accepted: false,
        reason: 'CLEAR_INCIDENT_MISMATCH',
        next: current,
      };
    return {
      accepted: true,
      reason: 'GOVERNED_CLEAR_ACCEPTED',
      next: {
        priority: 'NORMAL_CYCLE',
        sequence: command.sequence,
        commandId: command.commandId,
      },
    };
  }

  if (PRIORITY[command.priority] < PRIORITY[current.priority])
    return { accepted: false, reason: 'COMMAND_PRIORITY_LOWER', next: current };
  return {
    accepted: true,
    reason: 'COMMAND_ACCEPTED',
    next: {
      priority: command.priority,
      sequence: command.sequence,
      commandId: command.commandId,
      incidentEventId: command.incidentEventId ?? undefined,
    },
  };
}

const DELIVERY_TRANSITIONS: Record<string, readonly string[]> = {
  QUEUED: ['DELIVERED', 'REJECTED', 'FAILED', 'SUPERSEDED'],
  DELIVERED: ['RECEIVED', 'REJECTED', 'FAILED', 'STALE', 'SUPERSEDED'],
  RECEIVED: ['APPLIED', 'REJECTED', 'FAILED', 'STALE', 'SUPERSEDED'],
  APPLIED: [],
  REJECTED: [],
  FAILED: [],
  STALE: [],
  SUPERSEDED: [],
};

export function canTransitionDelivery(from: string, to: string): boolean {
  return from === to || (DELIVERY_TRANSITIONS[from] ?? []).includes(to);
}
