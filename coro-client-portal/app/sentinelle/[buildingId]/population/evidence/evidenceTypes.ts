export type EvidenceActor = { displayName: string | null; role: string | null };

export type EvidenceCommunication = {
  id: string;
  cycleSequence: number | null;
  type: "EMERGENCY" | "TEST" | "UPDATE" | "ALL_CLEAR";
  status: string;
  deliveryMode: "SANDBOX" | "LIVE";
  content: {
    titleFR: string; titleEN: string | null; messageFR: string;
    messageEN: string | null; instructionFR: string | null;
    instructionEN: string | null;
    materializedVariants: Array<{ channel: "EMAIL" | "SMS"; language: string; message: string }>;
  };
  timestamps: Record<string, string | null>;
  actors: Record<string, EvidenceActor | null>;
  zones: Array<{
    code: string; nameFR: string; nameEN: string | null; maxDistanceKm: number | null;
    protectiveAction: string | null; targetedSubscriberCount: number;
    geometry: { present: boolean; sha256: string | null };
  }>;
  targeting: Record<string, string | number>;
  deliverySummary: Record<string, number | null>;
  providerSummary: {
    counts: Record<string, number>; firstProviderOccurredAt: string | null;
    lastProviderOccurredAt: string | null; firstReceivedAt: string | null; lastReceivedAt: string | null;
  };
};

export type CompletionStatus = "COMPLETE" | "COMPLETE_WITH_EXCEPTIONS" | "INCOMPLETE";

export type PopulationEvidenceSnapshot = {
  schemaVersion: string; reference: string; version: number; generatedAt: string; timezone: null;
  organization: { name: string };
  building: { name: string; address: string | null; city: string | null; province: string | null; postalCode: string | null };
  program: { publicSlug: string; deliveryMode: "SANDBOX" | "LIVE" };
  scenario: { nameFR: string; nameEN: string | null };
  event: { status: string; startedAt: string; endedAt: string | null; communicationCount: number; startedBy: EvidenceActor | null; endedBy: EvidenceActor | null };
  communications: EvidenceCommunication[];
  summary: Record<string, string | number> & { completionStatus: CompletionStatus };
  closure: { endedAt: string | null; endedBy: EvidenceActor | null; closeReason: string | null };
};

export type PopulationEvidenceRecord = {
  id: string; reference: string; schemaVersion: string; version: number; status: "FINALIZED";
  generatedAt: string; generatedByType: string; snapshotSha256: string; snapshot: PopulationEvidenceSnapshot;
};

export type PopulationEvidenceManifest = {
  schemaVersion: string; version: number; generatedAt: string; manifestSha256: string;
  manifest: { canonicalization: string; integrity: { algorithm: string; snapshotSha256: string }; components: Record<string, string> };
};

export type EvidenceVerification = {
  status: "VERIFIED" | "MISMATCH" | "UNAVAILABLE"; snapshot: boolean; manifest: boolean;
  components: Record<string, boolean>; verifiedAt: string;
};

export type PopulationEvidenceReport = {
  id: string; version: number; format: "PDF"; language: "FR";
  status: "GENERATING" | "FINALIZED"; generatedAt: string; generatedByType: string;
  generatorVersion: string; fileSize: number | null; reportSha256: string | null; finalizedAt: string | null;
};
