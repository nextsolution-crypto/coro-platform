export type PlannerUser = {
  id: string; name: string; title?: string | null; availability?: 'GENERIC';
  timeZone?: string; timeZoneVerified?: boolean; workScheduleConfigured?: boolean;
  capacity?: { label: string; chargeEngagee: number; chargeProvisoire: number; tauxUtilisationConfirmee: number } | null;
};

export type PlannerEvent = {
  id: string; source: 'BOOKING' | 'USER_UNAVAILABILITY' | 'LEGACY_ACTIVITY';
  startUtc: string; endUtc: string; sourceTimeZone: string; userIds: string[];
  status: string; label: string; needsAction: boolean; warnings: string[];
  bookingStatus?: string;
  assignments?: Array<{ userId: string; role: string; status: string }>;
  bookingId?: string; projectId?: string; activityId?: string; activityTypeId?: string; buildingId?: string; clientId?: string;
  projectName?: string; clientName?: string; buildingName?: string; ownerName?: string;
  activityType?: { code: string; nameFR: string; visualToken: string; iconKey?: string | null };
};

export type PlannerWorkInterval = { userId: string; startUtc: string; endUtc: string; verified: boolean };

export type PlannerResponse = {
  version: number; asOf: string; window: { startUtc: string; endUtc: string };
  displayTimeZone: string; users: PlannerUser[]; events: PlannerEvent[];
  workIntervals: PlannerWorkInterval[];
  actionSummary: { requestedBookings: number; bookingsWithoutAcceptedLead: number;
    pendingAssignments: number; blockedConflicts: number; unknownAvailability: number; unplannedActivities: number };
  warnings: string[];
};

export type PlanningContext = {
  version: number;
  clients: Array<{ id: string; name: string }>;
  buildings: Array<{ id: string; name: string; clientId: string; timeZone: string; timeZoneVerified: boolean }>;
  projects: Array<{ id: string; name: string; clientId: string; buildingId: string; status: string; year: number;
    mandateId: string | null; owner: { id?: string; firstName: string; lastName: string } | null }>;
  activityTypes: Array<{ id: string; code: string; nameFR: string; defaultDurationMinutes: number | null;
    clientBookableDefault: boolean; displayOrder: number }>;
};

export type PlanningAction = { id: string; type: string; label: string; startUtc: string | null;
  bookingId?: string; activityId?: string; userId?: string; userName?: string; clientId?: string; buildingId?: string;
  projectId?: string; projectName?: string; clientName?: string; buildingName?: string;
  activityTypeId?: string; activityTypeName?: string; durationMinutes?: number;
  hasBookingHistory?: boolean; lastBookingId?: string; lastEffectiveStartUtc?: string;
  lastDurationMinutes?: number; lastBookingStatus?: string;
  lastLead?: { userId: string; displayName: string }; removalAction?: 'DELETE' | 'CANCEL' };

export type TeamCandidate = { userId: string; displayName: string; email?: string;
  availabilityStatus: 'AVAILABLE' | 'UNKNOWN' | 'BLOCKED'; genericReason: string;
  blockedInterval?: { startUtc: string; endUtc: string };
  capacityCommittedPercent: number | null; capacityHorizonWeeks: number };

export type TeamPreview = { version: number; slot: { startUtc: string; endUtc: string; durationMinutes: number;
  buildingId: string; timeZone: string; timeZoneVerified: boolean }; candidates: TeamCandidate[] };

export type MyAssignment = {
  assignmentId: string; bookingId: string; activityId: string | null; role: 'LEAD' | 'SUPPORT';
  assignmentStatus: 'PENDING'; requiresMyAction: true; title: string; activityType: string;
  client: string; building: string | null; project: string; projectId: string;
  effectiveStartUtc: string; durationMinutes: number; timeZone: string;
};

export type MyAssignmentsResponse = { version: number; asOf: string; pendingCount: number; items: MyAssignment[] };
