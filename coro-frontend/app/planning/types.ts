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
  bookingId?: string; projectId?: string; activityId?: string; buildingId?: string; clientId?: string;
  projectName?: string; clientName?: string; buildingName?: string; ownerName?: string;
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
