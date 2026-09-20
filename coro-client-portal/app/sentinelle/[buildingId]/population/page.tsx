"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Map,
  MessageSquareText,
  RadioTower,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { apiGet, apiPost, apiPut, getUser } from "../../../store/auth";
import PortalLayout from "../../../components/PortalLayout";
import PopulationOperationalMap from "./PopulationOperationalMap";
import {
  normalizeOperationalEvent,
  normalizeLegacyActiveAlerts,
  mergePopulationRegistry,
  getPopulationAlertWorkflowStage,
  getPopulationDeliveryModeLabel,
  derivePopulationWorkflowState,
  getPopulationResumeAction,
  buildPopulationResumePlan,
  canCompletePopulationResumeMount,
  derivePopulationCloseState,
  openPopulationCloseConfirmation,
  confirmPopulationEventClose,
  derivePopulationEventPresentation,
} from "./populationEventState.mjs";
import styles from "./population.module.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

type PopulationStatus = {
  eligible: boolean;
  rueStatus:
    | "NOT_ASSESSED"
    | "ASSESSMENT_IN_PROGRESS"
    | "CONFIRMED_SUBJECT"
    | "CONFIRMED_NOT_SUBJECT"
    | "EXEMPT";
  populationEnabled: boolean;
  programStatus:
    | "NOT_CONFIGURED"
    | "CONFIGURING"
    | "READY"
    | "ACTIVE"
    | "SUSPENDED"
    | "ARCHIVED";
  deliveryMode: "SANDBOX" | "LIVE";
  governanceMode: "STANDARD" | "DUAL_CONTROL";
  populationPermissions: Array<
    "POPULATION_PREPARE" | "POPULATION_APPROVE" | "POPULATION_SEND"
  >;
};

type PopulationProgram = {
  id: string;
  publicSlug: string;
  nameFR: string;
  nameEN: string | null;
  descriptionFR: string | null;
  descriptionEN: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  websiteUrl: string | null;
  registrationEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  privacyTextFR: string | null;
  privacyTextEN: string | null;
  consentTextFR: string | null;
  consentTextEN: string | null;
  consentVersion: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deliveryMode: "SANDBOX" | "LIVE";
  governanceMode: "STANDARD" | "DUAL_CONTROL";
};

type PopulationConfiguration = {
  configured: boolean;
  rueFacilityProfileId: string;
  status: PopulationStatus["programStatus"];
  program: PopulationProgram | null;
};

type PopulationImpactZone = {
  id: string;
  code: string;
  nameFR: string;
  nameEN: string | null;
  protectiveAction: string | null;
  instructionFR: string | null;
  instructionEN: string | null;
  validatedAt: string | null;
  hasGeometry: boolean;
  maxDistanceKm: number | null;
  operational: boolean;
};

type PopulationScenario = {
  id: string;
  nameFR: string;
  nameEN: string | null;
  description: string | null;
  type: string;
  eventType: string | null;
  impactDistanceKm: number | null;
  impactMethod: string | null;
  defaultProtectiveAction: string | null;
  publicInstructionFR: string | null;
  publicInstructionEN: string | null;
  validatedAt: string | null;
  operational: boolean;
  impactZones: PopulationImpactZone[];
};

type PopulationScenarioList = {
  scenarios: PopulationScenario[];
};

type PopulationPreview = {
  building: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    province: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  scenario: {
    id: string;
    nameFR: string;
    nameEN: string | null;
  };
  population: {
    activeSubscriberCount: number;
    geolocatedSubscriberCount: number;
    unlocatedSubscriberCount: number;
    uniqueTargetCount: number;
    uniqueSmsTargetCount: number;
    uniqueEmailTargetCount: number;
  };
  zones: Array<{
    id: string;
    code: string;
    nameFR: string;
    nameEN: string | null;
    geometry: unknown | null;
    maxDistanceKm: number | null;
    protectiveAction: string | null;
    instructionFR: string | null;
    instructionEN: string | null;
    targetCount: number;
    smsTargetCount: number;
    emailTargetCount: number;
  }>;
};

type PopulationAlertDraftForm = {
  type: "EMERGENCY" | "TEST" | "UPDATE" | "ALL_CLEAR";
  titleFR: string;
  titleEN: string;
  messageFR: string;
  messageEN: string;
  instructionFR: string;
  instructionEN: string;
};

type CreatedPopulationAlert = {
  id: string;
  status: string;
  type: string;
  titleFR: string;
  titleEN?: string | null;
  messageFR: string;
  messageEN?: string | null;
  instructionFR?: string | null;
  instructionEN?: string | null;
  emergencyScenarioId?: string | null;
  incidentEventId?: string | null;
  approvedAt?: string | null;
  approvedByType?: string | null;
  approvedById?: string | null;
  readyAt?: string | null;
  readyByType?: string | null;
  readyById?: string | null;
  recipientsFrozenAt?: string | null;
  frozenByType?: string | null;
  frozenById?: string | null;
  deliveryModeSnapshot?: "SANDBOX" | "LIVE" | null;
  sendingAt?: string | null;
  sentByType?: string | null;
  sentById?: string | null;
  createdByType?: string | null;
  createdById?: string | null;
  activatedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  operationalEventId?: string | null;
  cycleSequence?: number | null;
  contextSnapshot?: { targeting?: PopulationEventTargeting | null } | null;
  deliveryCounts?: Record<string, number>;
};

type PopulationEventTargeting = {
  strategy?: "HISTORICAL_UNION_CURRENT";
  currentZoneSubscriberCount?: number;
  historicalSubscriberCount?: number;
  uniqueTargetCount?: number;
  overlapSubscriberCount?: number;
  revalidationSuppressedSubscriberCount?: number;
  deliverableSubscriberCount?: number;
};

type PopulationOperationalEventAlert = {
  id: string;
  type: "EMERGENCY" | "TEST" | "UPDATE" | "ALL_CLEAR";
  status: string;
  cycleSequence: number | null;
  titleFR: string;
  titleEN: string | null;
  messageFR: string;
  messageEN: string | null;
  instructionFR: string | null;
  instructionEN: string | null;
  readyAt: string | null;
  approvedAt: string | null;
  recipientsFrozenAt: string | null;
  deliveryModeSnapshot: "SANDBOX" | "LIVE" | null;
  createdAt: string;
  activatedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  deliveryCounts: Record<string, number>;
  deliveryChannelCounts: Record<string, number>;
  targetedSubscriberCount: number;
  deliverableDeliveryCount: number;
  targeting: PopulationEventTargeting | null;
};

type PopulationOperationalEvent = {
  id: string;
  status: "ACTIVE" | "ENDED" | "CANCELLED";
  emergencyScenarioId: string;
  incidentEventId: string | null;
  startedAt: string;
  endedAt: string | null;
  endedById: string | null;
  closeReason: string | null;
  emergencyScenario: { id: string; nameFR: string; nameEN: string | null };
  alerts: PopulationOperationalEventAlert[];
  communicationCount: number;
  latestCommunication: PopulationOperationalEventAlert | null;
};

type FrozenPopulationDelivery = {
  id: string;
  channel: "SMS" | "EMAIL";
  status: string;
  language: string;
  queuedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  suppressionReason?: "SYNTHETIC_RECIPIENT" | "SANDBOX_MODE" | null;
};

type PopulationIncident = {
  id: string;
  type: string;
  status: string;
  description?: string | null;
  triggeredAt: string;
  triggeredBy?: string | null;
  isExercise?: boolean;
};

type PopulationIncidentAlertDelivery = {
  id: string;
  channel: "SMS" | "EMAIL";
  status:
    | "QUEUED"
    | "SENDING"
    | "SENT"
    | "DELIVERED"
    | "FAILED"
    | "CANCELLED"
    | "SUPPRESSED";
  language: string;
  queuedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  provider: string | null;
};

type PopulationIncidentAlertZone = {
  id: string;
  zoneCodeSnapshot?: string | null;
  zoneNameFRSnapshot?: string | null;
  zoneNameENSnapshot?: string | null;
  protectiveActionSnapshot?: string | null;
  instructionFRSnapshot?: string | null;
  instructionENSnapshot?: string | null;
};

type PopulationIncidentAlert = CreatedPopulationAlert & {
  recipientsFrozenAt?: string | null;
  sendingAt?: string | null;
  activatedAt?: string | null;
  endedAt?: string | null;
  cancelledAt?: string | null;
  zones?: PopulationIncidentAlertZone[];
  deliveries?: PopulationIncidentAlertDelivery[];
  operationalEventId?: string | null;
};

type PopulationLegacyAlert = {
  id: string;
  type: string;
  status: "ACTIVE";
  titleFR: string;
  createdAt: string;
  readyAt: string | null;
  approvedAt: string | null;
  recipientsFrozenAt: string | null;
  activatedAt: string | null;
  endedAt: string | null;
  deliveryModeSnapshot: "SANDBOX" | "LIVE" | null;
  targeted: number;
  deliverable: number;
  sent: number;
  delivered: number;
  failed: number;
  suppressed: number;
};

type PopulationFreezeResult = {
  alertId: string;
  status: string;
  approvedAt: string | null;
  recipientsFrozenAt: string;
  deliveryMode: "SANDBOX" | "LIVE";
  targeting: {
    subscriberCount: number;
    deliveryCount: number;
    smsDeliveryCount: number;
    emailDeliveryCount: number;
    deliverableCount: number;
    deliverableSmsCount: number;
    deliverableEmailCount: number;
    suppressedCount: number;
    strategy?: "HISTORICAL_UNION_CURRENT";
    currentZoneSubscriberCount?: number;
    historicalSubscriberCount?: number;
    uniqueTargetCount?: number;
    overlapSubscriberCount?: number;
    revalidationSuppressedSubscriberCount?: number;
    deliverableSubscriberCount?: number;
  };
  deliveries: FrozenPopulationDelivery[];
};

type PopulationLivePreflight = {
  ready: boolean;
  blockingReasons: string[];
  mode: "SANDBOX" | "LIVE" | null;
  targetedPeople: number;
  materialized: number;
  deliverable: number;
  email: number;
  sms: number;
  synthetic: number;
  suppressed: number;
  retryPending: number;
  reconciliation: number;
};

type PopulationDeliverySummary = {
  counts: {
    total: number;
    queued: number;
    sending: number;
    sent: number;
    delivered: number;
    failed: number;
    suppressed: number;
    retryPending: number;
    reconciliationRequired: number;
    email: number;
    sms: number;
  };
};

type PopulationConfigurationForm = {
  publicSlug: string;
  nameFR: string;
  nameEN: string;
  descriptionFR: string;
  descriptionEN: string;
  publicPhone: string;
  publicEmail: string;
  websiteUrl: string;
  registrationEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  privacyTextFR: string;
  privacyTextEN: string;
  consentTextFR: string;
  consentTextEN: string;
  consentVersion: string;
};

const EMPTY_CONFIGURATION_FORM: PopulationConfigurationForm = {
  publicSlug: "",
  nameFR: "",
  nameEN: "",
  descriptionFR: "",
  descriptionEN: "",
  publicPhone: "",
  publicEmail: "",
  websiteUrl: "",
  registrationEnabled: true,
  smsEnabled: true,
  emailEnabled: true,
  privacyTextFR: "",
  privacyTextEN: "",
  consentTextFR: "",
  consentTextEN: "",
  consentVersion: "1.0",
};

const STATUS_LABELS: Record<PopulationStatus["programStatus"], string> = {
  NOT_CONFIGURED: "À configurer",
  CONFIGURING: "Configuration",
  READY: "Prêt à activer",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  ARCHIVED: "Archivé",
};

const RUE_LABELS: Record<PopulationStatus["rueStatus"], string> = {
  NOT_ASSESSED: "Non évalué",
  ASSESSMENT_IN_PROGRESS: "Évaluation en cours",
  CONFIRMED_SUBJECT: "Site assujetti",
  CONFIRMED_NOT_SUBJECT: "Non assujetti",
  EXEMPT: "Exempté",
};

const READINESS_LABELS: Record<string, string> = {
  PROGRAM_NOT_CONFIGURED: "Le programme doit être configuré.",
  PUBLIC_SLUG_REQUIRED: "L’identifiant public du programme est requis.",
  NAME_FR_REQUIRED: "Le nom français du programme est requis.",
  DELIVERY_CHANNEL_REQUIRED:
    "Au moins un canal de diffusion SMS ou courriel doit être activé.",
  PRIVACY_TEXT_FR_REQUIRED: "Le texte français de confidentialité est requis.",
  CONSENT_TEXT_FR_REQUIRED: "Le texte français de consentement est requis.",
  CONSENT_VERSION_REQUIRED: "Une version du consentement doit être définie.",
  OPERATIONAL_SCENARIO_REQUIRED:
    "Au moins un scénario RUE actif et validé avec une zone d’impact opérationnelle est requis.",
};

export default function PopulationPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [status, setStatus] = useState<PopulationStatus | null>(null);
  const [configuration, setConfiguration] =
    useState<PopulationConfiguration | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [configurationSaving, setConfigurationSaving] = useState(false);
  const [configurationMessage, setConfigurationMessage] = useState<
    string | null
  >(null);
  const [configurationError, setConfigurationError] = useState<string | null>(
    null,
  );

  const [configurationForm, setConfigurationForm] =
    useState<PopulationConfigurationForm>(EMPTY_CONFIGURATION_FORM);

  const [scenarios, setScenarios] = useState<PopulationScenario[]>([]);
  const scenariosRef = useRef<PopulationScenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );

  const [preview, setPreview] = useState<PopulationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [alertComposerOpen, setAlertComposerOpen] = useState(false);
  const alertComposerRef = useRef<HTMLElement | null>(null);
  const [alertStep, setAlertStep] = useState(1);
  const [alertCreating, setAlertCreating] = useState(false);
  const [alertWorkflowLoading, setAlertWorkflowLoading] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [createdAlert, setCreatedAlert] =
    useState<CreatedPopulationAlert | null>(null);

  const [freezeConfirmationOpen, setFreezeConfirmationOpen] = useState(false);

  const [freezeResult, setFreezeResult] =
    useState<PopulationFreezeResult | null>(null);

  const [sendConfirmationOpen, setSendConfirmationOpen] = useState(false);
  const [livePreflight, setLivePreflight] =
    useState<PopulationLivePreflight | null>(null);
  const [deliverySummary, setDeliverySummary] =
    useState<PopulationDeliverySummary | null>(null);

  const [incidents, setIncidents] = useState<PopulationIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);

  const [incidentHistory, setIncidentHistory] = useState<PopulationIncident[]>(
    [],
  );

  const [incidentHistoryLoading, setIncidentHistoryLoading] = useState(false);

  const [incidentHistoryError, setIncidentHistoryError] = useState<
    string | null
  >(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );

  const [incidentAlerts, setIncidentAlerts] = useState<
    PopulationIncidentAlert[]
  >([]);

  const [incidentAlertsLoading, setIncidentAlertsLoading] = useState(false);

  const [incidentAlertsError, setIncidentAlertsError] = useState<string | null>(
    null,
  );

  const [communicationsOpen, setCommunicationsOpen] = useState(false);

  const [followUpCreating, setFollowUpCreating] = useState(false);
  const [activeEvent, setActiveEvent] =
    useState<PopulationOperationalEvent | null>(null);
  const [lastClosedEvent, setLastClosedEvent] =
    useState<PopulationOperationalEvent | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventRefreshing, setEventRefreshing] = useState(false);
  const eventStateKnownRef = useRef(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [closeEventOpen, setCloseEventOpen] = useState(false);
  const [closeEventReason, setCloseEventReason] = useState("");
  const [confirmIncompleteClose, setConfirmIncompleteClose] = useState(false);
  const [legacyEndingId, setLegacyEndingId] = useState<string | null>(null);
  const [pendingResumeAlertId, setPendingResumeAlertId] = useState<
    string | null
  >(null);
  const [legacyActiveAlerts, setLegacyActiveAlerts] = useState<
    PopulationLegacyAlert[]
  >([]);
  const [populationRegistry, setPopulationRegistry] = useState<any[]>([]);
  const [populationRegistryLoading, setPopulationRegistryLoading] =
    useState(false);
  const [populationRegistryError, setPopulationRegistryError] = useState<
    string | null
  >(null);

  const [alertForm, setAlertForm] = useState<PopulationAlertDraftForm>({
    type: "EMERGENCY",
    titleFR: "",
    titleEN: "",
    messageFR: "",
    messageEN: "",
    instructionFR: "",
    instructionEN: "",
  });

  useEffect(() => {
    eventStateKnownRef.current = false;
    const user = getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    fetchStatus();
  }, [buildingId]);

  useEffect(() => {
    if (
      !createdAlert?.id ||
      createdAlert.deliveryModeSnapshot !== "LIVE" ||
      !["SENDING", "ACTIVE"].includes(createdAlert.status)
    ) {
      return;
    }
    let polls = 0;
    const refresh = async () => {
      polls += 1;
      try {
        const [deliveryResult, eventResult] = await Promise.all([
          apiGet(
            `/client-portal/buildings/${buildingId}/population/alerts/${createdAlert.id}/delivery-status`,
          ) as Promise<PopulationDeliverySummary>,
          createdAlert.operationalEventId
            ? (apiGet(
                `/client-portal/buildings/${buildingId}/population/operational-events/${createdAlert.operationalEventId}`,
              ) as Promise<PopulationOperationalEvent>)
            : Promise.resolve(null),
        ]);
        setDeliverySummary(deliveryResult);
        if (eventResult) {
          setActiveEvent(
            normalizeOperationalEvent(
              eventResult,
            ) as PopulationOperationalEvent | null,
          );
        }
      } catch {
        // Le statut courant reste affiché; le polling est borné et non bloquant.
      }
    };
    void refresh();
    const interval = window.setInterval(() => {
      if (polls >= 24) {
        window.clearInterval(interval);
        return;
      }
      void refresh();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [
    buildingId,
    createdAlert?.id,
    createdAlert?.status,
    createdAlert?.deliveryModeSnapshot,
  ]);

  const loadLivePreflight = async (alertId: string) => {
    const result = (await apiGet(
      `/client-portal/buildings/${buildingId}/population/alerts/${alertId}/live-preflight`,
    )) as PopulationLivePreflight;
    setLivePreflight(result);
    return result;
  };

  const resumeOperationalCommunication = async (
    event: PopulationOperationalEvent,
    alert: PopulationOperationalEventAlert,
  ) => {
    let restoredPreview: PopulationPreview;
    try {
      restoredPreview = (await apiGet(
        `/client-portal/buildings/${buildingId}/population/scenarios/${event.emergencyScenarioId}/preview`,
      )) as PopulationPreview;
    } catch {
      setAlertError(
        "La communication a été retrouvée, mais son contexte opérationnel n’a pas pu être restauré. Actualisez les données ou contactez l’administrateur.",
      );
      setPendingResumeAlertId(null);
      return;
    }

    const plan = buildPopulationResumePlan(
      event,
      alert,
      scenariosRef.current,
      restoredPreview,
    );
    if (!plan) {
      setAlertError(
        "La communication a été retrouvée, mais son contexte opérationnel n’a pas pu être restauré. Actualisez les données ou contactez l’administrateur.",
      );
      setPendingResumeAlertId(null);
      return;
    }

    setSelectedScenarioId(plan.scenarioId);
    setPreview(plan.preview);
    setCreatedAlert(alert as CreatedPopulationAlert);
    setAlertForm({
      type: alert.type,
      titleFR: alert.titleFR || "",
      titleEN: alert.titleEN || "",
      messageFR: alert.messageFR || "",
      messageEN: alert.messageEN || "",
      instructionFR: alert.instructionFR || "",
      instructionEN: alert.instructionEN || "",
    });
    setFreezeResult(null);
    setLivePreflight(null);
    setAlertStep(plan.step);
    setPendingResumeAlertId(alert.id);
    setAlertComposerOpen(true);

    if (
      derivePopulationWorkflowState({ event, alert }) === "SEND_READY"
    ) {
      const deliveryCount = Object.values(alert.deliveryCounts ?? {}).reduce(
        (sum, count) => sum + count,
        0,
      );
      setFreezeResult({
        alertId: alert.id,
        status: alert.status,
        approvedAt: alert.approvedAt,
        recipientsFrozenAt: alert.recipientsFrozenAt!,
        deliveryMode: alert.deliveryModeSnapshot!,
        targeting: {
          subscriberCount: alert.targetedSubscriberCount ?? 0,
          deliveryCount,
          smsDeliveryCount: alert.deliveryChannelCounts?.SMS ?? 0,
          emailDeliveryCount: alert.deliveryChannelCounts?.EMAIL ?? 0,
          deliverableCount: alert.deliverableDeliveryCount ?? 0,
          deliverableSmsCount: 0,
          deliverableEmailCount: 0,
          suppressedCount: alert.deliveryCounts?.SUPPRESSED ?? 0,
          ...(alert.targeting ?? {}),
        },
        deliveries: [],
      });
      if (alert.deliveryModeSnapshot === "LIVE") {
        await loadLivePreflight(alert.id);
      }
    }

  };

  useEffect(() => {
    const target = alertComposerRef.current;
    if (!canCompletePopulationResumeMount({
      pendingAlertId: pendingResumeAlertId,
      composerOpen: alertComposerOpen,
      scenarioReady: Boolean(
        selectedScenarioId &&
          scenarios.some((scenario) => scenario.id === selectedScenarioId),
      ),
      previewReady: Boolean(preview),
      createdAlertId: createdAlert?.id,
      targetMounted: Boolean(target),
    })) {
      return;
    }
    target!.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    const nextAction = target!.querySelector<HTMLElement>(
      "[data-resume-next-action] button",
    );
    nextAction?.focus({ preventScroll: true });
    setPendingResumeAlertId(null);
  }, [
    pendingResumeAlertId,
    alertComposerOpen,
    selectedScenarioId,
    scenarios,
    preview,
    createdAlert?.id,
  ]);

  const loadIncidentAlertHistory = async (incidentId: string) => {
    setIncidentAlertsLoading(true);
    setIncidentAlertsError(null);

    try {
      const result = (await apiGet(
        `/client-portal/buildings/${buildingId}/population/incidents/${incidentId}/alerts`,
      )) as PopulationIncidentAlert[];

      setIncidentAlerts(Array.isArray(result) ? result : []);
    } catch (error: any) {
      setIncidentAlerts([]);

      setIncidentAlertsError(
        typeof error?.message === "string"
          ? error.message
          : "L’historique des communications de l’incident n’a pas pu être chargé.",
      );
    } finally {
      setIncidentAlertsLoading(false);
    }
  };

  const loadIncidentHistory = async () => {
    setIncidentHistoryLoading(true);
    setIncidentHistoryError(null);

    try {
      const result = await apiGet(
        `/client-portal/incidents/buildings/${buildingId}/history`,
      );

      const receivedHistory: PopulationIncident[] = Array.isArray(result)
        ? result
        : result
          ? [result as PopulationIncident]
          : [];

      setIncidentHistory(receivedHistory);
    } catch (error: any) {
      setIncidentHistory([]);

      setIncidentHistoryError(
        typeof error?.message === "string"
          ? error.message
          : "L’historique des incidents du bâtiment n’a pas pu être chargé.",
      );
    } finally {
      setIncidentHistoryLoading(false);
    }
  };

  const loadActiveIncidents = async () => {
    setIncidentsLoading(true);
    setIncidentsError(null);

    try {
      const result = await apiGet(
        `/client-portal/incidents/buildings/${buildingId}/active-all`,
      );

      const receivedIncidents: PopulationIncident[] = Array.isArray(result)
        ? result
        : result
          ? [result as PopulationIncident]
          : [];

      /*
       * PRE_ALERT n'est pas encore une situation confirmée.
       * RESOLVED et CANCELLED ne doivent pas servir de contexte
       * opérationnel pour une nouvelle communication Population.
       */
      const operationalIncidents = receivedIncidents.filter(
        (incident) =>
          incident.status !== "PRE_ALERT" &&
          incident.status !== "RESOLVED" &&
          incident.status !== "CANCELLED",
      );

      setIncidents(operationalIncidents);

      const firstIncident = operationalIncidents[0] ?? null;

      setSelectedIncidentId(firstIncident?.id ?? null);

      if (firstIncident) {
        await loadIncidentAlertHistory(firstIncident.id);
      } else {
        setIncidentAlerts([]);
        setIncidentAlertsError(null);
      }
    } catch (error: any) {
      setIncidents([]);
      setSelectedIncidentId(null);
      setIncidentAlerts([]);

      setIncidentsError(
        typeof error?.message === "string"
          ? error.message
          : "Les incidents actifs du bâtiment n’ont pas pu être chargés.",
      );
    } finally {
      setIncidentsLoading(false);
    }
  };

  const selectPopulationIncident = async (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setCommunicationsOpen(false);
    await loadIncidentAlertHistory(incidentId);
  };

  const openHistoricalIncident = async (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setCommunicationsOpen(true);
    await loadIncidentAlertHistory(incidentId);
  };

  const loadActiveOperationalEvent = async (background = false) => {
    const refreshInBackground = background || eventStateKnownRef.current;
    if (refreshInBackground) setEventRefreshing(true);
    else setEventLoading(true);
    setEventError(null);
    try {
      const response = await apiGet(
        `/client-portal/buildings/${buildingId}/population/operational-events/active`,
      );
      const result = normalizeOperationalEvent(
        response,
      ) as PopulationOperationalEvent | null;
      setActiveEvent(result);
      if (result) {
        setLastClosedEvent(null);
        const resumable = [...result.alerts]
          .reverse()
          .find((alert) =>
            ["DRAFT", "READY"].includes(alert.status),
          );
        if (resumable && createdAlert?.id !== resumable.id) {
          await resumeOperationalCommunication(result, resumable);
        }
      }
      return result;
    } catch (error: any) {
      setEventError(
        typeof error?.message === "string"
          ? error.message
          : "L’événement Population n’a pas pu être chargé.",
      );
      return null;
    } finally {
      eventStateKnownRef.current = true;
      if (refreshInBackground) setEventRefreshing(false);
      else setEventLoading(false);
    }
  };

  useEffect(() => {
    if (!status?.populationEnabled || status.programStatus !== "ACTIVE") {
      return;
    }
    const interval = window.setInterval(() => {
      if (
        !alertWorkflowLoading &&
        !followUpCreating &&
        createdAlert?.status !== "DRAFT"
      ) {
        void loadActiveOperationalEvent(true);
      }
    }, 15000);
    return () => window.clearInterval(interval);
  }, [
    buildingId,
    status?.populationEnabled,
    status?.programStatus,
    alertWorkflowLoading,
    followUpCreating,
    createdAlert?.status,
  ]);

  const loadLegacyActiveAlerts = async () => {
    try {
      const response = await apiGet(
        `/client-portal/buildings/${buildingId}/population/alerts/legacy-active`,
      );
      const result = normalizeLegacyActiveAlerts(
        response,
      ) as PopulationLegacyAlert[];
      setLegacyActiveAlerts(result);
      return result;
    } catch (error: any) {
      setLegacyActiveAlerts([]);
      setEventError(
        typeof error?.message === "string"
          ? error.message
          : "Les communications historiques actives n’ont pas pu être chargées.",
      );
      return [];
    }
  };

  const loadPopulationRegistry = async () => {
    setPopulationRegistryLoading(true);
    setPopulationRegistryError(null);
    try {
      const [events, legacy] = await Promise.all([
        apiGet(
          `/client-portal/buildings/${buildingId}/population/operational-events`,
        ),
        apiGet(
          `/client-portal/buildings/${buildingId}/population/alerts/legacy-history`,
        ),
      ]);
      setPopulationRegistry(mergePopulationRegistry(events, legacy));
    } catch (error: any) {
      setPopulationRegistry([]);
      setPopulationRegistryError(
        typeof error?.message === "string"
          ? error.message
          : "Le registre Population n’a pas pu être chargé.",
      );
    } finally {
      setPopulationRegistryLoading(false);
    }
  };

  const fetchStatus = async () => {
    setLoading(true);

    try {
      const statusRes = (await apiGet(
        `/client-portal/buildings/${buildingId}/population/status`,
      )) as PopulationStatus;

      setStatus(statusRes);

      if (statusRes.eligible) {
        const configurationRes = (await apiGet(
          `/client-portal/buildings/${buildingId}/population/configuration`,
        )) as PopulationConfiguration;

        setScenariosLoading(true);
        setScenariosError(null);

        try {
          const scenarioRes = (await apiGet(
            `/client-portal/buildings/${buildingId}/population/scenarios`,
          )) as PopulationScenarioList;

          scenariosRef.current = scenarioRes.scenarios || [];
          setScenarios(scenariosRef.current);

          setSelectedScenarioId((current) => {
            if (
              current &&
              scenarioRes.scenarios.some((scenario) => scenario.id === current)
            ) {
              return current;
            }

            const firstOperational = scenarioRes.scenarios.find(
              (scenario) => scenario.operational,
            );

            return firstOperational?.id ?? null;
          });
        } catch (error: any) {
          setScenarios([]);
          scenariosRef.current = [];

          setScenariosError(
            typeof error?.message === "string"
              ? error.message
              : "Les scénarios RUE n’ont pas pu être chargés.",
          );
        } finally {
          setScenariosLoading(false);
        }

        setConfiguration(configurationRes);

        if (
          statusRes.populationEnabled &&
          statusRes.programStatus === "ACTIVE"
        ) {
          await Promise.all([
            loadActiveIncidents(),
            loadIncidentHistory(),
            loadActiveOperationalEvent(),
            loadLegacyActiveAlerts(),
            loadPopulationRegistry(),
          ]);
        } else {
          setIncidents([]);
          setIncidentHistory([]);
          setSelectedIncidentId(null);
          setIncidentAlerts([]);
          setIncidentsError(null);
          setIncidentHistoryError(null);
          setIncidentAlertsError(null);
          setActiveEvent(null);
          setLegacyActiveAlerts([]);
          setPopulationRegistry([]);
        }

        const program = configurationRes.program;

        if (program) {
          setConfigurationForm({
            publicSlug: program.publicSlug || "",
            nameFR: program.nameFR || "",
            nameEN: program.nameEN || "",
            descriptionFR: program.descriptionFR || "",
            descriptionEN: program.descriptionEN || "",
            publicPhone: program.publicPhone || "",
            publicEmail: program.publicEmail || "",
            websiteUrl: program.websiteUrl || "",
            registrationEnabled: program.registrationEnabled,
            smsEnabled: program.smsEnabled,
            emailEnabled: program.emailEnabled,
            privacyTextFR: program.privacyTextFR || "",
            privacyTextEN: program.privacyTextEN || "",
            consentTextFR: program.consentTextFR || "",
            consentTextEN: program.consentTextEN || "",
            consentVersion: program.consentVersion || "",
          });
        } else {
          setConfigurationForm(EMPTY_CONFIGURATION_FORM);
        }
      } else {
        setConfiguration(null);
        setConfigurationForm(EMPTY_CONFIGURATION_FORM);
        setScenarios([]);
        scenariosRef.current = [];
        setSelectedScenarioId(null);
        setPreview(null);
        setIncidents([]);
        setIncidentHistory([]);
        setSelectedIncidentId(null);
        setIncidentAlerts([]);
        setIncidentsError(null);
        setIncidentHistoryError(null);
        setIncidentAlertsError(null);
        setActiveEvent(null);
        setLegacyActiveAlerts([]);
        setPopulationRegistry([]);
      }
    } catch {
      setStatus(null);
      setConfiguration(null);
    } finally {
      setLoading(false);
    }
  };

  const loadScenarioPreview = async (scenarioId: string) => {
    if (!status?.populationEnabled || status.programStatus !== "ACTIVE") {
      setPreview(null);
      setPreviewError(
        "Le programme doit être actif pour calculer la population ciblée.",
      );
      return;
    }

    setSelectedScenarioId(scenarioId);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);

    try {
      const result = (await apiGet(
        `/client-portal/buildings/${buildingId}/population/scenarios/${scenarioId}/preview`,
      )) as PopulationPreview;

      setPreview(result);
    } catch (error: any) {
      setPreviewError(
        typeof error?.message === "string"
          ? error.message
          : "Le calcul de la population ciblée n’a pas pu être effectué.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const openAlertComposer = (previewOverride?: PopulationPreview) => {
    if (!selectedScenario || !(previewOverride ?? preview)) {
      return;
    }

    setAlertForm({
      type: "EMERGENCY",
      titleFR: `Alerte – ${selectedScenario.nameFR}`,
      titleEN: selectedScenario.nameEN
        ? `Alert – ${selectedScenario.nameEN}`
        : "",
      messageFR: "",
      messageEN: "",
      instructionFR: selectedScenario.publicInstructionFR || "",
      instructionEN: selectedScenario.publicInstructionEN || "",
    });

    setAlertStep(1);
    setAlertError(null);
    setCreatedAlert(null);
    setFreezeConfirmationOpen(false);
    setFreezeResult(null);
    setSendConfirmationOpen(false);
    setAlertComposerOpen(true);
  };

  const prepareInitialFromCockpit = async () => {
    if (!selectedScenario || activeEvent) return;
    if (preview) {
      openAlertComposer();
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = (await apiGet(
        `/client-portal/buildings/${buildingId}/population/scenarios/${selectedScenario.id}/preview`,
      )) as PopulationPreview;
      setPreview(result);
      openAlertComposer(result);
    } catch (error: any) {
      setPreviewError(
        typeof error?.message === "string"
          ? error.message
          : "Le calcul de la population ciblée a échoué.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!alertComposerOpen) {
      return;
    }

    alertComposerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [alertComposerOpen]);

  const updateAlertField = <K extends keyof PopulationAlertDraftForm>(
    field: K,
    value: PopulationAlertDraftForm[K],
  ) => {
    setAlertForm((current) => ({
      ...current,
      [field]: value,
    }));

    setAlertError(null);
  };

  const createIncidentFollowUpDraft = async (type: "UPDATE" | "ALL_CLEAR") => {
    if (!activeEvent) {
      setAlertError("Aucun événement Population actif n’est disponible.");
      return;
    }

    const sourceAlerts = activeEvent.alerts
      .filter(
        (alert) =>
          alert.status !== "DRAFT" &&
          alert.status !== "READY" &&
          alert.status !== "CANCELLED" &&
          alert.type !== "ALL_CLEAR",
      )
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;

        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bTime - aTime;
      });

    const sourceAlert = sourceAlerts[0];

    if (!sourceAlert) {
      setAlertError(
        "Une communication déjà diffusée est requise avant de créer un suivi.",
      );
      return;
    }

    if (
      type === "ALL_CLEAR" &&
      activeEvent.alerts.some(
        (alert) => alert.type === "ALL_CLEAR" && alert.status !== "CANCELLED",
      )
    ) {
      setAlertError("Une fin d’alerte existe déjà pour cet incident.");
      return;
    }

    const nextForm: PopulationAlertDraftForm = {
      type,
      titleFR:
        type === "UPDATE" ? "Mise à jour de la situation" : "Fin d’alerte",
      titleEN: type === "UPDATE" ? "Situation update" : "All clear",
      messageFR: "",
      messageEN: "",
      instructionFR: "",
      instructionEN: "",
    };

    setAlertForm(nextForm);
    setAlertError(null);
    setFollowUpCreating(true);

    try {
      setSelectedScenarioId(activeEvent.emergencyScenarioId);
      const currentPreview = (await apiGet(
        `/client-portal/buildings/${buildingId}/population/scenarios/${activeEvent.emergencyScenarioId}/preview`,
      )) as PopulationPreview;
      setPreview(currentPreview);

      const route =
        type === "UPDATE"
          ? `/client-portal/buildings/${buildingId}/population/operational-events/${activeEvent.id}/updates/draft`
          : `/client-portal/buildings/${buildingId}/population/operational-events/${activeEvent.id}/all-clear/draft`;

      const result = (await apiPost(route, {
        sourceAlertId: sourceAlert.id,
        titleFR: nextForm.titleFR,
        titleEN: nextForm.titleEN || undefined,
        messageFR:
          type === "UPDATE"
            ? "Mise à jour de la situation en cours."
            : "La situation ne nécessite plus le maintien de l’alerte à la population.",
        messageEN:
          type === "UPDATE"
            ? "Update regarding the ongoing situation."
            : "The situation no longer requires the public alert to remain in effect.",
        instructionFR: undefined,
        instructionEN: undefined,
      })) as CreatedPopulationAlert;

      setAlertForm({
        ...nextForm,
        messageFR: result.messageFR || "",
        messageEN: result.messageEN || "",
        instructionFR: result.instructionFR || "",
        instructionEN: result.instructionEN || "",
      });

      setCreatedAlert(result);
      setAlertStep(6);
      setAlertComposerOpen(true);
      setCommunicationsOpen(false);

      await loadActiveOperationalEvent();
    } catch (error: any) {
      setAlertError(
        typeof error?.message === "string"
          ? error.message
          : type === "UPDATE"
            ? "Le brouillon de mise à jour n’a pas pu être créé."
            : "Le brouillon de fin d’alerte n’a pas pu être créé.",
      );
    } finally {
      setFollowUpCreating(false);
    }
  };

  const createPopulationAlertDraft = async () => {
    if (!selectedScenario || !preview) {
      setAlertError(
        "Le scénario et le calcul de population doivent être confirmés.",
      );
      return;
    }

    const titleFR = alertForm.titleFR.trim();
    const messageFR = alertForm.messageFR.trim();

    if (!titleFR || !messageFR) {
      setAlertError("Le titre et le message français sont requis.");
      return;
    }

    setAlertCreating(true);
    setAlertError(null);

    try {
      const result = (await apiPost(
        `/client-portal/buildings/${buildingId}/population/alerts/draft`,
        {
          scenarioId: selectedScenario.id,
          incidentEventId:
            alertForm.type === "EMERGENCY" && selectedIncidentId
              ? selectedIncidentId
              : undefined,
          type: alertForm.type,
          titleFR,
          titleEN: alertForm.titleEN.trim() || undefined,
          messageFR,
          messageEN: alertForm.messageEN.trim() || undefined,
          instructionFR: alertForm.instructionFR.trim() || undefined,
          instructionEN: alertForm.instructionEN.trim() || undefined,
        },
      )) as CreatedPopulationAlert;

      setCreatedAlert(result);
      setAlertStep(6);
    } catch (error: any) {
      setAlertError(
        typeof error?.message === "string"
          ? error.message
          : "Le brouillon d’alerte n’a pas pu être créé.",
      );
    } finally {
      setAlertCreating(false);
    }
  };

  const savePopulationAlertDraft = async () => {
    if (!createdAlert || createdAlert.status !== "DRAFT") {
      return;
    }

    const titleFR = alertForm.titleFR.trim();
    const messageFR = alertForm.messageFR.trim();

    if (!titleFR || !messageFR) {
      setAlertError("Le titre et le message français sont requis.");
      return;
    }

    setAlertWorkflowLoading(true);
    setAlertError(null);

    try {
      const result = (await apiPut(
        `/client-portal/buildings/${buildingId}/population/alerts/${createdAlert.id}/draft`,
        {
          type: alertForm.type,
          titleFR,
          titleEN: alertForm.titleEN.trim(),
          messageFR,
          messageEN: alertForm.messageEN.trim(),
          instructionFR: alertForm.instructionFR.trim(),
          instructionEN: alertForm.instructionEN.trim(),
        },
      )) as CreatedPopulationAlert;

      setCreatedAlert(result);
    } catch (error: any) {
      setAlertError(
        typeof error?.message === "string"
          ? error.message
          : "Le brouillon n’a pas pu être enregistré.",
      );
    } finally {
      setAlertWorkflowLoading(false);
    }
  };

  const markPopulationAlertReady = async () => {
    if (!createdAlert || createdAlert.status !== "DRAFT") {
      return;
    }

    setAlertWorkflowLoading(true);
    setAlertError(null);

    try {
      /*
       * READY est volontairement une opération serveur distincte.
       * Le backend recalcule le ciblage à cet instant avant
       * d'autoriser le changement d'état.
       */
      const result = (await apiPost(
        `/client-portal/buildings/${buildingId}/population/alerts/${createdAlert.id}/ready`,
        {},
      )) as CreatedPopulationAlert;

      setCreatedAlert(result);
    } catch (error: any) {
      setAlertError(
        typeof error?.message === "string"
          ? error.message
          : "L’alerte n’a pas pu passer à READY.",
      );
    } finally {
      setAlertWorkflowLoading(false);
    }
  };

  const approvePopulationAlert = async () => {
    if (
      !createdAlert ||
      createdAlert.status !== "READY" ||
      createdAlert.approvedAt
    ) {
      return;
    }

    setAlertWorkflowLoading(true);
    setAlertError(null);

    try {
      const result = (await apiPost(
        `/client-portal/buildings/${buildingId}/population/alerts/${createdAlert.id}/approve`,
        {},
      )) as CreatedPopulationAlert;

      setCreatedAlert(result);
    } catch (error: any) {
      setAlertError(
        typeof error?.message === "string"
          ? error.message
          : "L’approbation de l’alerte a échoué.",
      );
    } finally {
      setAlertWorkflowLoading(false);
    }
  };

  const freezePopulationAlertRecipients = async () => {
    if (
      !createdAlert ||
      createdAlert.status !== "READY" ||
      !createdAlert.approvedAt
    ) {
      return;
    }

    setAlertWorkflowLoading(true);
    setAlertError(null);

    try {
      const result = (await apiPost(
        `/client-portal/buildings/${buildingId}/population/alerts/${createdAlert.id}/freeze-recipients`,
        {},
      )) as PopulationFreezeResult;

      setFreezeResult(result);
      setFreezeConfirmationOpen(false);

      setCreatedAlert((current) =>
        current
          ? {
              ...current,
              recipientsFrozenAt: result.recipientsFrozenAt,
              deliveryModeSnapshot: result.deliveryMode,
              deliveryCounts: { QUEUED: result.targeting.deliveryCount },
            }
          : current,
      );
      if (result.deliveryMode === "LIVE") {
        await loadLivePreflight(result.alertId);
      }
    } catch (error: any) {
      setAlertError(
        typeof error?.message === "string"
          ? error.message
          : "Les destinataires n’ont pas pu être figés.",
      );
    } finally {
      setAlertWorkflowLoading(false);
    }
  };

  const sendPopulationAlert = async () => {
    if (
      !createdAlert ||
      createdAlert.status !== "READY" ||
      !createdAlert.approvedAt ||
      !createdAlert.recipientsFrozenAt ||
      !freezeResult ||
      freezeResult.targeting.deliveryCount === 0
    ) {
      return;
    }

    setAlertWorkflowLoading(true);
    setAlertError(null);

    try {
      if (freezeResult.deliveryMode === "LIVE") {
        const preflight = await loadLivePreflight(createdAlert.id);
        if (!preflight.ready) {
          throw new Error(
            "Le preflight LIVE a changé. Vérifiez le roster avant de diffuser.",
          );
        }
      }
      const result = (await apiPost(
        `/client-portal/buildings/${buildingId}/population/alerts/${createdAlert.id}/send`,
        {},
      )) as CreatedPopulationAlert;

      setCreatedAlert(result);
      setSendConfirmationOpen(false);

      if (result.operationalEventId) {
        await loadActiveOperationalEvent();
      }

      if (result.incidentEventId) {
        await loadIncidentAlertHistory(result.incidentEventId);
        setSelectedIncidentId(result.incidentEventId);
        setCommunicationsOpen(true);
      }
    } catch (error: any) {
      setAlertError(
        typeof error?.message === "string"
          ? error.message
          : "La diffusion de l’alerte n’a pas pu être déclenchée.",
      );
    } finally {
      setAlertWorkflowLoading(false);
    }
  };

  const closeOperationalEvent = async () => {
    if (!activeEvent) return;
    setActionLoading("close-event");
    setEventError(null);
    try {
      const result = (await apiPost(
        `/client-portal/buildings/${buildingId}/population/operational-events/${activeEvent.id}/close`,
        {
          confirmIncompleteDelivery: confirmIncompleteClose || undefined,
          closeReason: closeEventReason.trim() || undefined,
        },
      )) as PopulationOperationalEvent;
      setLastClosedEvent(result);
      setActiveEvent(null);
      setCloseEventOpen(false);
      setCloseEventReason("");
      setConfirmIncompleteClose(false);
    } catch (error: any) {
      setEventError(
        typeof error?.message === "string"
          ? error.message
          : "L’événement n’a pas pu être clos.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const endLegacyCommunication = async (alertId: string) => {
    const confirmed = window.confirm(
      "Cette action marque uniquement cette communication comme terminée. Aucune communication de fin d’alerte ne sera envoyée.",
    );
    if (!confirmed) return;
    setLegacyEndingId(alertId);
    setEventError(null);
    try {
      await apiPost(
        `/client-portal/buildings/${buildingId}/population/alerts/${alertId}/end`,
        {},
      );
      await loadLegacyActiveAlerts();
      await loadPopulationRegistry();
      if (selectedIncidentId) {
        await loadIncidentAlertHistory(selectedIncidentId);
      }
    } catch (error: any) {
      setEventError(
        typeof error?.message === "string"
          ? error.message
          : "La communication historique n’a pas pu être terminée.",
      );
    } finally {
      setLegacyEndingId(null);
    }
  };

  const updateConfigurationField = <
    K extends keyof PopulationConfigurationForm,
  >(
    field: K,
    value: PopulationConfigurationForm[K],
  ) => {
    setConfigurationForm((current) => ({
      ...current,
      [field]: value,
    }));

    setConfigurationMessage(null);
    setConfigurationError(null);
  };

  const saveConfiguration = async () => {
    setConfigurationSaving(true);
    setConfigurationMessage(null);
    setConfigurationError(null);
    setActionError(null);
    setMissingRequirements([]);

    try {
      await apiPut(
        `/client-portal/buildings/${buildingId}/population/configuration`,
        configurationForm,
      );

      await fetchStatus();

      setConfigurationMessage("Configuration enregistrée avec succès.");
    } catch (error: any) {
      const payload = error?.data || error?.response?.data;

      const requirements =
        payload?.missingRequirements ||
        payload?.message?.missingRequirements ||
        [];

      if (Array.isArray(requirements)) {
        setMissingRequirements(requirements);
      }

      const message =
        typeof payload?.message === "string"
          ? payload.message
          : typeof error?.message === "string"
            ? error.message
            : "La configuration n’a pas pu être enregistrée.";

      setConfigurationError(message);
    } finally {
      setConfigurationSaving(false);
    }
  };

  const runLifecycleAction = async (
    action: "ready" | "activate" | "suspend",
  ) => {
    setActionLoading(action);
    setActionError(null);
    setMissingRequirements([]);

    try {
      await apiPost(
        `/client-portal/buildings/${buildingId}/population/${action}`,
        {},
      );

      await fetchStatus();
    } catch (error: any) {
      const payload = error?.data || error?.response?.data;

      const requirements =
        payload?.missingRequirements ||
        payload?.message?.missingRequirements ||
        [];

      if (Array.isArray(requirements)) {
        setMissingRequirements(requirements);
      }

      const message =
        typeof payload?.message === "string"
          ? payload.message
          : typeof error?.message === "string"
            ? error.message
            : "L’opération n’a pas pu être complétée.";

      setActionError(message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <PortalLayout>
        <div
          style={{
            minHeight: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p
            className="animate-pulse"
            style={{
              margin: 0,
              color: "#ADB5BD",
              fontSize: 14,
            }}
          >
            Chargement de Sentinelle Population...
          </p>
        </div>
      </PortalLayout>
    );
  }

  if (!status?.eligible) {
    return (
      <PortalLayout>
        <button
          type="button"
          onClick={() => router.push(`/sentinelle/${buildingId}`)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 20,
            padding: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#ADB5BD",
            fontSize: 13,
          }}
        >
          <ArrowLeft size={14} />
          Retour à Sentinelle
        </button>

        <div
          style={{
            maxWidth: 680,
            padding: 32,
            backgroundColor: "#FFFFFF",
            border: "1px solid #E9ECEF",
            borderRadius: 14,
          }}
        >
          <ShieldCheck size={34} color="#ADB5BD" style={{ marginBottom: 16 }} />

          <h1
            style={{
              margin: "0 0 8px",
              color: "#2C3E50",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            Sentinelle Population
          </h1>

          <p
            style={{
              margin: "0 0 16px",
              color: "#6C757D",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Ce module n&apos;est pas disponible pour ce site.
          </p>

          {status?.rueStatus && (
            <span
              style={{
                display: "inline-block",
                padding: "5px 10px",
                borderRadius: 20,
                backgroundColor: "#F1F3F5",
                color: "#6C757D",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              RUE / E2 · {RUE_LABELS[status.rueStatus] || status.rueStatus}
            </span>
          )}
        </div>
      </PortalLayout>
    );
  }

  const programStatus = STATUS_LABELS[status.programStatus];

  const isConfigured = configuration?.configured === true;
  const program = configuration?.program ?? null;

  const isActive =
    status.populationEnabled && status.programStatus === "ACTIVE";
  const canPrepare =
    status.populationPermissions?.includes("POPULATION_PREPARE") ?? false;

  const canMarkReady = isConfigured && status.programStatus === "CONFIGURING";

  const canActivate =
    isConfigured &&
    (status.programStatus === "READY" || status.programStatus === "SUSPENDED");

  const canSuspend = isConfigured && status.programStatus === "ACTIVE";

  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
  const resumableCommunication = activeEvent
    ? [...activeEvent.alerts]
        .reverse()
        .find((alert) => ["DRAFT", "READY"].includes(alert.status)) ?? null
    : null;
  const resumeAction = getPopulationResumeAction(
    activeEvent,
    resumableCommunication,
  );
  const canResume = Boolean(
    resumeAction &&
      status.populationPermissions?.includes(resumeAction.permission),
  );

  return (
    <PortalLayout>
      <div className={`${styles.page} ${inter.className}`}>
        {/* Header */}
        <header className={styles.header} style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => router.push(`/sentinelle/${buildingId}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: 0,
              marginBottom: 10,
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#ADB5BD",
              fontSize: 13,
            }}
          >
            <ArrowLeft size={14} />
            Retour à Sentinelle
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 5,
                }}
              >
                <RadioTower size={17} color="#167D6A" />

                <p
                  style={{
                    margin: 0,
                    color: "#167D6A",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  CORO Sentinelle Population
                </p>

                <span
                  style={{
                    padding: "3px 7px",
                    borderRadius: 20,
                    backgroundColor: "#FDEDEC",
                    color: "#C0392B",
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                  }}
                >
                  RUE / E2
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  color: "#2C3E50",
                  fontSize: "clamp(22px, 5vw, 30px)",
                  fontWeight: 900,
                }}
              >
                Centre de communication d&apos;urgence
              </h1>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#6C757D",
                  fontSize: 13,
                }}
              >
                De la zone d&apos;impact à la preuve de diffusion.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 11px",
                borderRadius: 20,
                backgroundColor: isActive ? "#E8F5F1" : "#FEF9E7",
                color: isActive ? "#167D6A" : "#B9770E",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <CircleDot size={12} />
              {programStatus}
            </div>
          </div>
        </header>

        {/* Bandeau de commandement */}
        <section
          className={styles.situation}
          style={{
            position: "relative",
            overflow: "hidden",
            marginBottom: 18,
            padding: "26px 28px",
            borderRadius: 16,
            background:
              "linear-gradient(115deg, #20363A 0%, #244C4B 58%, #167D6A 100%)",
            color: "#FFFFFF",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 260,
              height: 260,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.08)",
              right: -70,
              top: -120,
            }}
          />

          <div
            style={{
              position: "relative",
              maxWidth: 720,
            }}
          >
            <p
              style={{
                margin: "0 0 7px",
                color: "#A9D8CF",
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Situation opérationnelle
            </p>

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 21,
                fontWeight: 800,
              }}
            >
              {isActive
                ? "Système prêt pour une communication d’urgence"
                : "Programme Population non actif"}
            </h2>

            <p
              style={{
                margin: 0,
                maxWidth: 620,
                color: "#D5E5E2",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {isActive
                ? "Les scénarios, zones d’impact et paramètres de communication du site peuvent être utilisés pour préparer une alerte."
                : "La configuration doit être complétée et le programme activé avant toute diffusion à la population."}
            </p>
          </div>
        </section>

        {/* État système */}
        <section
          className={styles.statusGrid}
          style={{
            marginBottom: 18,
          }}
        >
          <StatusCard
            icon={<Building2 size={18} />}
            label="Assujettissement"
            value={RUE_LABELS[status.rueStatus] || status.rueStatus || "—"}
            detail="Profil environnemental du site"
          />

          <StatusCard
            icon={<RadioTower size={18} />}
            label="Programme"
            value={programStatus}
            detail={
              status.populationEnabled
                ? "Sentinelle Population autorisé"
                : "Activation requise"
            }
          />

          <StatusCard
            icon={<Users size={18} />}
            label="Population ciblée"
            value={
              preview
                ? preview.population.uniqueTargetCount.toLocaleString("fr-CA")
                : "—"
            }
            detail={
              preview
                ? `${preview.population.uniqueSmsTargetCount} SMS · ${preview.population.uniqueEmailTargetCount} courriels`
                : "Calculée selon la zone d’impact"
            }
          />

          <StatusCard
            icon={<MessageSquareText size={18} />}
            label="Communication"
            value={activeEvent ? "Événement en cours" : "Aucun événement"}
            detail={
              activeEvent?.latestCommunication
                ? formatPopulationCommunicationType(
                    activeEvent.latestCommunication.type,
                    activeEvent.latestCommunication.cycleSequence,
                  )
                : "SMS · Courriel"
            }
          />
        </section>

        {isActive && (
          <PopulationUnifiedRegistry
            entries={populationRegistry}
            loading={populationRegistryLoading}
            error={populationRegistryError}
            onRefresh={() => void loadPopulationRegistry()}
          />
        )}

        {isActive && (
          <EventCockpit
            event={activeEvent}
            closedEvent={lastClosedEvent}
            loading={eventLoading}
            refreshing={eventRefreshing}
            error={eventError}
            mode={status.deliveryMode}
            canPrepare={canPrepare}
            followUpCreating={followUpCreating}
            closeOpen={closeEventOpen}
            closeReason={closeEventReason}
            confirmIncomplete={confirmIncompleteClose}
            closeLoading={actionLoading === "close-event"}
            onPrepareInitial={() => void prepareInitialFromCockpit()}
            onCreateUpdate={() => createIncidentFollowUpDraft("UPDATE")}
            onCreateAllClear={() => createIncidentFollowUpDraft("ALL_CLEAR")}
            onRefresh={() => void loadActiveOperationalEvent(true)}
            onOpenClose={() => setCloseEventOpen(true)}
            onCancelClose={() => setCloseEventOpen(false)}
            onCloseReasonChange={setCloseEventReason}
            onConfirmIncompleteChange={setConfirmIncompleteClose}
            onConfirmClose={() => void closeOperationalEvent()}
          />
        )}

        {legacyActiveAlerts.length > 0 && (
          <section aria-label="Communications historiques actives">
            {legacyActiveAlerts.map((alert) => (
              <LegacyCommunicationNotice
                key={alert.id}
                alert={alert}
                canPrepare={canPrepare}
                loading={legacyEndingId === alert.id}
                onEnd={() => void endLegacyCommunication(alert.id)}
              />
            ))}
          </section>
        )}

        {/* Scénarios RUE */}
        <section
          className={styles.scenarios}
          style={{
            marginBottom: 18,
            padding: "18px 20px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E9ECEF",
            borderRadius: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 15,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  color: "#167D6A",
                  fontSize: 9,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Planification RUE
              </p>

              <h2
                style={{
                  margin: "0 0 4px",
                  color: "#2C3E50",
                  fontSize: 15,
                  fontWeight: 900,
                }}
              >
                Scénarios d’urgence
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#ADB5BD",
                  fontSize: 10,
                  lineHeight: 1.5,
                }}
              >
                Sélectionnez le scénario correspondant à la situation observée.
              </p>
            </div>

            <span
              style={{
                padding: "5px 9px",
                borderRadius: 20,
                backgroundColor: "#F1F3F5",
                color: "#6C757D",
                fontSize: 9,
                fontWeight: 800,
              }}
            >
              {scenarios.length} scénario{scenarios.length > 1 ? "s" : ""}
            </span>
          </div>

          {scenariosLoading ? (
            <p
              className="animate-pulse"
              style={{
                margin: 0,
                color: "#ADB5BD",
                fontSize: 11,
              }}
            >
              Chargement des scénarios RUE...
            </p>
          ) : scenariosError ? (
            <div
              style={{
                padding: 12,
                borderRadius: 9,
                backgroundColor: "#FDEDEC",
                color: "#922B21",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {scenariosError}
            </div>
          ) : scenarios.length === 0 ? (
            <div
              style={{
                padding: 14,
                borderRadius: 9,
                backgroundColor: "#FEF9E7",
                border: "1px solid #F7DC6F",
              }}
            >
              <p
                style={{
                  margin: "0 0 4px",
                  color: "#7D6608",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                Aucun scénario RUE disponible
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#9A7D0A",
                  fontSize: 10,
                  lineHeight: 1.5,
                }}
              >
                Un scénario actif doit être défini dans le profil d’urgence
                environnementale du site.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(250px, 100%), 1fr))",
                gap: 10,
              }}
            >
              {scenarios.map((scenario) => {
                const selected = scenario.id === selectedScenarioId;

                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      setSelectedScenarioId(scenario.id);
                      setPreview(null);
                      setPreviewError(null);
                      setAlertComposerOpen(false);
                      setAlertStep(1);
                      setAlertError(null);
                      setCreatedAlert(null);
                      setFreezeConfirmationOpen(false);
                      setFreezeResult(null);
                      setSendConfirmationOpen(false);
                    }}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: selected
                        ? "2px solid #167D6A"
                        : "1px solid #E9ECEF",
                      backgroundColor: selected ? "#F3FAF8" : "#FFFFFF",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          color: "#2C3E50",
                          fontSize: 12,
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {scenario.nameFR}
                      </span>

                      <span
                        style={{
                          flexShrink: 0,
                          padding: "3px 6px",
                          borderRadius: 20,
                          backgroundColor: scenario.operational
                            ? "#E8F5F1"
                            : "#FEF9E7",
                          color: scenario.operational ? "#167D6A" : "#B9770E",
                          fontSize: 8,
                          fontWeight: 900,
                        }}
                      >
                        {scenario.operational ? "OPÉRATIONNEL" : "À COMPLÉTER"}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "0 0 7px",
                        color: "#6C757D",
                        fontSize: 10,
                        lineHeight: 1.45,
                      }}
                    >
                      {scenario.eventType ||
                        scenario.description ||
                        "Scénario d’urgence environnementale"}
                    </p>

                    <span
                      style={{
                        color: "#ADB5BD",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      {scenario.impactZones.length} zone
                      {scenario.impactZones.length > 1 ? "s" : ""} d’impact
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Poste de commandement */}
        <section
          className={styles.commandGrid}
          style={{
            marginBottom: 18,
          }}
        >
          {/* Carte */}
          <div
            className={styles.mapCard}
            style={{
              minHeight: 330,
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E9ECEF",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid #E9ECEF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#2C3E50",
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  Zone opérationnelle
                </h2>

                <p
                  style={{
                    margin: "3px 0 0",
                    color: "#ADB5BD",
                    fontSize: 11,
                  }}
                >
                  Zones d&apos;impact et population potentiellement touchée
                </p>

                {selectedScenario && (
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#167D6A",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {selectedScenario.nameFR}
                  </p>
                )}
              </div>

              <Map size={18} color="#167D6A" />
            </div>

            {preview ? (
              <PopulationOperationalMap
                building={preview.building}
                zones={preview.zones}
              />
            ) : (
              <div
                style={{
                  minHeight: 265,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                  background:
                    "radial-gradient(circle at center, #F4F8F7 0%, #EEF3F2 55%, #E8EFED 100%)",
                }}
              >
                <div
                  style={{
                    maxWidth: 330,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      margin: "0 auto 13px",
                      borderRadius: "50%",
                      backgroundColor: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 6px 20px rgba(44,62,80,0.08)",
                    }}
                  >
                    <Map size={23} color="#167D6A" />
                  </div>

                  <p
                    style={{
                      margin: "0 0 5px",
                      color: "#2C3E50",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    Carte opérationnelle
                  </p>

                  <p
                    style={{
                      margin: 0,
                      color: "#6C757D",
                      fontSize: 12,
                      lineHeight: 1.55,
                    }}
                  >
                    Sélectionnez un scénario et calculez la population ciblée
                    pour afficher les zones d&apos;impact sur la carte.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className={styles.controlCenter}
            style={{
              padding: 18,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E9ECEF",
              borderRadius: 14,
            }}
          >
            <p
              style={{
                margin: "0 0 4px",
                color: "#ADB5BD",
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Actions
            </p>

            <h2
              style={{
                margin: "0 0 16px",
                color: "#2C3E50",
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              Centre de contrôle
            </h2>

            {!isConfigured && (
              <div
                style={{
                  marginBottom: 14,
                  padding: 13,
                  borderRadius: 9,
                  backgroundColor: "#FEF9E7",
                  border: "1px solid #F7DC6F",
                }}
              >
                <p
                  style={{
                    margin: "0 0 4px",
                    color: "#7D6608",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Programme à configurer
                </p>

                <p
                  style={{
                    margin: 0,
                    color: "#9A7D0A",
                    fontSize: 10,
                    lineHeight: 1.5,
                  }}
                >
                  Les paramètres publics, les canaux de communication et les
                  textes de consentement doivent être configurés avant la mise
                  en service.
                </p>
              </div>
            )}

            {canMarkReady && (
              <LifecycleButton
                title="Valider la préparation"
                detail="Vérifier la configuration, les scénarios et les zones"
                loading={actionLoading === "ready"}
                disabled={actionLoading !== null}
                onClick={() => runLifecycleAction("ready")}
              />
            )}

            {canActivate && (
              <LifecycleButton
                title={
                  status.programStatus === "SUSPENDED"
                    ? "Réactiver le programme"
                    : "Activer le programme"
                }
                detail="Autoriser Sentinelle Population pour ce site"
                loading={actionLoading === "activate"}
                disabled={actionLoading !== null}
                onClick={() => runLifecycleAction("activate")}
                primary
              />
            )}

            {canSuspend && (
              <LifecycleButton
                title="Suspendre le programme"
                detail="Désactiver temporairement les opérations Population"
                loading={actionLoading === "suspend"}
                disabled={actionLoading !== null}
                onClick={() => runLifecycleAction("suspend")}
                warning
              />
            )}

            {(actionError || missingRequirements.length > 0) && (
              <div
                style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 9,
                  backgroundColor: "#FDEDEC",
                  border: "1px solid #F5B7B1",
                }}
              >
                {actionError && (
                  <p
                    style={{
                      margin: missingRequirements.length ? "0 0 8px" : 0,
                      color: "#922B21",
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1.5,
                    }}
                  >
                    {actionError}
                  </p>
                )}

                {missingRequirements.map((requirement) => (
                  <p
                    key={requirement}
                    style={{
                      margin: "4px 0 0",
                      color: "#922B21",
                      fontSize: 10,
                      lineHeight: 1.45,
                    }}
                  >
                    • {READINESS_LABELS[requirement] || requirement}
                  </p>
                ))}
              </div>
            )}

            <div
              className={`${styles.deliveryModeNotice} ${
                status.deliveryMode === "LIVE" ? styles.deliveryModeLive : ""
              }`}
              role="status"
              aria-live="polite"
            >
              <strong>MODE {status.deliveryMode}</strong>
              <span>
                {status.deliveryMode === "SANDBOX"
                  ? "Simulation — aucune communication externe ne sera transmise."
                  : "Diffusion réelle — les communications admissibles seront transmises aux destinataires."}
              </span>
            </div>

            <ActionButton
              icon={<AlertTriangle size={17} />}
              title={
                resumeAction
                  ? resumeAction.title
                  : activeEvent
                  ? "Événement déjà en cours"
                  : preview
                    ? "Préparer l’alerte"
                    : "Calculer la population ciblée"
              }
              detail={
                resumeAction
                  ? `${resumeAction.detail}${
                      canResume ? " · Continuer" : " · Permission requise"
                    }`
                  : activeEvent
                  ? "Utilisez les actions de mise à jour ou de fin d’alerte ci-dessus."
                  : preview && !canPrepare
                    ? "Permission POPULATION_PREPARE requise"
                    : preview
                      ? `${preview.population.uniqueTargetCount} personne${
                          preview.population.uniqueTargetCount > 1 ? "s" : ""
                        } ciblée${
                          preview.population.uniqueTargetCount > 1 ? "s" : ""
                        }`
                      : selectedScenario
                        ? "Analyser les zones d’impact du scénario"
                        : "Sélectionnez d’abord un scénario RUE"
              }
              primary
              disabled={
                !isActive ||
                (Boolean(resumeAction) && !canResume) ||
                (!resumeAction &&
                  (!selectedScenario ||
                    !selectedScenario.operational ||
                    Boolean(activeEvent) ||
                    previewLoading ||
                    (Boolean(preview) && !canPrepare)))
              }
              onClick={() => {
                if (activeEvent && resumableCommunication && resumeAction) {
                  void resumeOperationalCommunication(
                    activeEvent,
                    resumableCommunication,
                  );
                  return;
                }
                if (!selectedScenario) {
                  return;
                }

                if (!preview) {
                  loadScenarioPreview(selectedScenario.id);
                  return;
                }

                openAlertComposer();
              }}
            />

            <ActionButton
              icon={<MessageSquareText size={17} />}
              title={
                communicationsOpen
                  ? "Fermer les communications"
                  : "Communications"
              }
              detail={
                incidentsLoading
                  ? "Recherche des incidents actifs..."
                  : selectedIncidentId
                    ? `${incidentAlerts.length} communication${
                        incidentAlerts.length > 1 ? "s" : ""
                      } liée${
                        incidentAlerts.length > 1 ? "s" : ""
                      } à l’incident`
                    : "Aucun incident opérationnel actif"
              }
              disabled={!isActive || !selectedIncidentId}
              onClick={() => setCommunicationsOpen((current) => !current)}
            />

            {isActive && incidentsError && (
              <div
                style={{
                  marginBottom: 9,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: "#FDEDEC",
                  color: "#922B21",
                  fontSize: 9,
                  lineHeight: 1.5,
                }}
              >
                {incidentsError}
              </div>
            )}

            {isActive && incidents.length > 0 && (
              <div
                style={{
                  marginBottom: 9,
                  padding: 12,
                  border: "1px solid #D5EDE7",
                  borderRadius: 9,
                  backgroundColor: "#F3FAF8",
                }}
              >
                <p
                  style={{
                    margin: "0 0 7px",
                    color: "#167D6A",
                    fontSize: 8,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Incident opérationnel
                </p>

                {incidents.length === 1 ? (
                  <div>
                    <strong
                      style={{
                        display: "block",
                        marginBottom: 3,
                        color: "#2C3E50",
                        fontSize: 10,
                      }}
                    >
                      {incidents[0].type}
                    </strong>

                    <span
                      style={{
                        color: "#6C757D",
                        fontSize: 9,
                      }}
                    >
                      {incidents[0].status} ·{" "}
                      {new Date(incidents[0].triggeredAt).toLocaleString(
                        "fr-CA",
                      )}
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedIncidentId || ""}
                    onChange={(event) =>
                      selectPopulationIncident(event.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px 9px",
                      border: "1px solid #D5EDE7",
                      borderRadius: 7,
                      backgroundColor: "#FFFFFF",
                      color: "#2C3E50",
                      fontSize: 9,
                    }}
                  >
                    {incidents.map((incident) => (
                      <option key={incident.id} value={incident.id}>
                        {incident.type} · {incident.status}
                      </option>
                    ))}
                  </select>
                )}

                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px solid #D5EDE7",
                    color: "#6C757D",
                    fontSize: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {incidentAlertsLoading
                    ? "Chargement des communications..."
                    : incidentAlertsError
                      ? incidentAlertsError
                      : `${incidentAlerts.length} communication${
                          incidentAlerts.length > 1 ? "s" : ""
                        } Population dans cet incident.`}
                </div>
              </div>
            )}

            <ActionButton
              icon={<Settings size={17} />}
              title={
                configurationOpen ? "Fermer la configuration" : "Configuration"
              }
              detail={
                program
                  ? `${program.smsEnabled ? "SMS" : ""}${
                      program.smsEnabled && program.emailEnabled ? " · " : ""
                    }${program.emailEnabled ? "Courriel" : ""}`
                  : "Programme non configuré"
              }
              onClick={() => {
                setConfigurationOpen((current) => !current);
                setConfigurationMessage(null);
                setConfigurationError(null);
              }}
              disabled={status.programStatus === "ARCHIVED"}
            />
          </div>
        </section>

        {false && isActive && (
          <section
            className={styles.incidentRegistry}
            style={{
              marginBottom: 18,
              padding: 18,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E9ECEF",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 4px",
                    color: "#ADB5BD",
                    fontSize: 8,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Prouver · Audit · REX
                </p>

                <h2
                  style={{
                    margin: "0 0 4px",
                    color: "#2C3E50",
                    fontSize: 15,
                    fontWeight: 900,
                  }}
                >
                  Registre des incidents
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#6C757D",
                    fontSize: 9,
                    lineHeight: 1.5,
                  }}
                >
                  Consultez les dossiers de communication des incidents actifs,
                  résolus ou annulés.
                </p>
              </div>

              <button
                type="button"
                onClick={loadIncidentHistory}
                disabled={incidentHistoryLoading}
                style={{
                  padding: "7px 10px",
                  border: "1px solid #DEE2E6",
                  borderRadius: 8,
                  backgroundColor: "#FFFFFF",
                  color: "#495057",
                  cursor: incidentHistoryLoading ? "not-allowed" : "pointer",
                  opacity: incidentHistoryLoading ? 0.55 : 1,
                  fontSize: 9,
                  fontWeight: 800,
                }}
              >
                {incidentHistoryLoading
                  ? "Actualisation..."
                  : "Actualiser le registre"}
              </button>
            </div>

            {incidentHistoryError ? (
              <div
                style={{
                  padding: 11,
                  borderRadius: 8,
                  backgroundColor: "#FDEDEC",
                  color: "#922B21",
                  fontSize: 9,
                  lineHeight: 1.5,
                }}
              >
                {incidentHistoryError}
              </div>
            ) : incidentHistoryLoading && incidentHistory.length === 0 ? (
              <p
                className="animate-pulse"
                style={{
                  margin: 0,
                  color: "#ADB5BD",
                  fontSize: 10,
                }}
              >
                Chargement du registre...
              </p>
            ) : incidentHistory.length === 0 ? (
              <div
                style={{
                  padding: 13,
                  borderRadius: 9,
                  backgroundColor: "#F8F9FA",
                  color: "#6C757D",
                  fontSize: 9,
                }}
              >
                Aucun incident enregistré pour ce bâtiment.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 7,
                }}
              >
                {incidentHistory.map((incident) => {
                  const operational =
                    incident.status !== "PRE_ALERT" &&
                    incident.status !== "RESOLVED" &&
                    incident.status !== "CANCELLED";

                  const selected = incident.id === selectedIncidentId;

                  return (
                    <button
                      key={incident.id}
                      type="button"
                      onClick={() => openHistoricalIncident(incident.id)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 12,
                        alignItems: "center",
                        border: selected
                          ? "1px solid #167D6A"
                          : "1px solid #E9ECEF",
                        borderRadius: 9,
                        backgroundColor: selected ? "#F3FAF8" : "#FFFFFF",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 3,
                            flexWrap: "wrap",
                          }}
                        >
                          <strong
                            style={{
                              color: "#2C3E50",
                              fontSize: 10,
                            }}
                          >
                            {incident.type}
                          </strong>

                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 20,
                              backgroundColor: operational
                                ? "#E8F5F1"
                                : "#F1F3F5",
                              color: operational ? "#167D6A" : "#6C757D",
                              fontSize: 7,
                              fontWeight: 900,
                            }}
                          >
                            {incident.status}
                          </span>
                        </div>

                        <span
                          style={{
                            color: "#ADB5BD",
                            fontSize: 8,
                          }}
                        >
                          {new Date(incident.triggeredAt).toLocaleString(
                            "fr-CA",
                          )}
                        </span>
                      </div>

                      <span
                        style={{
                          color: selected ? "#167D6A" : "#6C757D",
                          fontSize: 8,
                          fontWeight: 900,
                        }}
                      >
                        {operational ? "Ouvrir" : "Consulter"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div
              style={{
                marginTop: 11,
                paddingTop: 10,
                borderTop: "1px solid #F1F3F5",
                color: "#ADB5BD",
                fontSize: 8,
                lineHeight: 1.5,
              }}
            >
              Les 50 incidents les plus récents du bâtiment sont disponibles
              dans ce registre.
            </div>
          </section>
        )}

        {communicationsOpen && selectedIncidentId && (
          <IncidentCommunicationsPanel
            incident={
              incidents.find(
                (incident) => incident.id === selectedIncidentId,
              ) ??
              incidentHistory.find(
                (incident) => incident.id === selectedIncidentId,
              ) ??
              null
            }
            alerts={incidentAlerts}
            loading={incidentAlertsLoading}
            error={incidentAlertsError}
            followUpCreating={followUpCreating}
            onRefresh={() => loadIncidentAlertHistory(selectedIncidentId)}
            onCreateUpdate={() => createIncidentFollowUpDraft("UPDATE")}
            onCreateAllClear={() => createIncidentFollowUpDraft("ALL_CLEAR")}
          />
        )}

        {(previewLoading || previewError || preview) && (
          <section
            style={{
              marginBottom: 18,
              padding: "20px 22px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E9ECEF",
              borderRadius: 14,
            }}
          >
            <p
              style={{
                margin: "0 0 5px",
                color: "#167D6A",
                fontSize: 9,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Analyse géospatiale
            </p>

            <h2
              style={{
                margin: "0 0 14px",
                color: "#2C3E50",
                fontSize: 15,
                fontWeight: 900,
              }}
            >
              Population potentiellement touchée
            </h2>

            {previewLoading && (
              <p
                className="animate-pulse"
                style={{
                  margin: 0,
                  color: "#ADB5BD",
                  fontSize: 11,
                }}
              >
                Calcul des zones et des destinataires...
              </p>
            )}

            {previewError && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 9,
                  backgroundColor: "#FDEDEC",
                  color: "#922B21",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {previewError}
              </div>
            )}

            {preview && !previewLoading && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(150px, 100%), 1fr))",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <PreviewMetric
                    label="Population ciblée"
                    value={preview.population.uniqueTargetCount}
                  />

                  <PreviewMetric
                    label="SMS"
                    value={preview.population.uniqueSmsTargetCount}
                  />

                  <PreviewMetric
                    label="Courriels"
                    value={preview.population.uniqueEmailTargetCount}
                  />

                  <PreviewMetric
                    label="Sans localisation"
                    value={preview.population.unlocatedSubscriberCount}
                    warning={preview.population.unlocatedSubscriberCount > 0}
                  />
                </div>

                <div
                  style={{
                    marginBottom: 16,
                  }}
                >
                  <PopulationOperationalMap
                    building={preview.building}
                    zones={preview.zones}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {preview.zones.map((zone) => (
                    <div
                      key={zone.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "11px 13px",
                        border: "1px solid #E9ECEF",
                        borderRadius: 9,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: "0 0 3px",
                            color: "#2C3E50",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          Zone {zone.code} · {zone.nameFR}
                        </p>

                        <p
                          style={{
                            margin: 0,
                            color: "#ADB5BD",
                            fontSize: 9,
                          }}
                        >
                          {zone.protectiveAction || "Action à confirmer"}
                        </p>
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            color: "#2C3E50",
                            fontSize: 15,
                          }}
                        >
                          {zone.targetCount.toLocaleString("fr-CA")}
                        </strong>

                        <span
                          style={{
                            color: "#ADB5BD",
                            fontSize: 8,
                          }}
                        >
                          personnes
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p
                  style={{
                    margin: "13px 0 0",
                    color: "#ADB5BD",
                    fontSize: 9,
                    lineHeight: 1.5,
                  }}
                >
                  Les résultats sont agrégés. Aucune identité ni position
                  individuelle de citoyen n’est affichée dans le cockpit.
                </p>
              </>
            )}
          </section>
        )}

        {alertComposerOpen && selectedScenario && preview && (
          <section
            ref={alertComposerRef}
            data-resume-target="population-alert-composer"
            style={{
              marginBottom: 18,
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E9ECEF",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                padding: "20px 22px 16px",
                borderBottom: "1px solid #E9ECEF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 5px",
                      color: "#C0392B",
                      fontSize: 9,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Communication d’urgence
                  </p>

                  <h2
                    style={{
                      margin: "0 0 4px",
                      color: "#2C3E50",
                      fontSize: 17,
                      fontWeight: 900,
                    }}
                  >
                    {alertForm.type === "UPDATE"
                      ? "Mise à jour d’un événement en cours"
                      : alertForm.type === "ALL_CLEAR"
                        ? "Fin d’alerte"
                        : "Préparer une alerte à la population"}
                  </h2>

                  {alertForm.type === "ALL_CLEAR" && (
                    <p style={{ margin: "6px 0 0", color: "#6C757D" }}>
                      Cette communication réelle informe les personnes
                      concernées que la situation ou les mesures de protection
                      prennent fin.
                    </p>
                  )}

                  <p
                    style={{
                      margin: 0,
                      color: "#ADB5BD",
                      fontSize: 10,
                    }}
                  >
                    {selectedScenario.nameFR}
                  </p>
                </div>

                {!createdAlert && (
                  <button
                    type="button"
                    onClick={() => {
                      setAlertComposerOpen(false);
                      setAlertError(null);
                    }}
                    style={{
                      padding: "7px 10px",
                      border: "1px solid #E9ECEF",
                      borderRadius: 8,
                      backgroundColor: "#FFFFFF",
                      color: "#6C757D",
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    Fermer
                  </button>
                )}
              </div>

              <AlertStepIndicator currentStep={alertStep} />
            </div>

            <div style={{ padding: "20px 22px" }}>
              {alertStep === 1 && (
                <AlertSituationStep
                  type={alertForm.type}
                  scenario={selectedScenario}
                  onChange={(value) => updateAlertField("type", value)}
                />
              )}

              {alertStep === 2 && (
                <AlertZoneStep scenario={selectedScenario} preview={preview} />
              )}

              {alertStep === 3 && <AlertPopulationStep preview={preview} />}

              {alertStep === 4 && (
                <AlertMessageStep
                  form={alertForm}
                  onChange={updateAlertField}
                />
              )}

              {alertStep === 5 && (
                <AlertValidationStep
                  form={alertForm}
                  scenario={selectedScenario}
                  preview={preview}
                />
              )}

              {alertStep === 6 && createdAlert && (
                <AlertDraftWorkspace
                  alert={createdAlert}
                  form={alertForm}
                  loading={alertWorkflowLoading}
                  freezeConfirmationOpen={freezeConfirmationOpen}
                  freezeResult={freezeResult}
                  livePreflight={livePreflight}
                  deliverySummary={deliverySummary}
                  sendConfirmationOpen={sendConfirmationOpen}
                  deliveryMode={
                    freezeResult?.deliveryMode ?? status.deliveryMode
                  }
                  permissions={status.populationPermissions}
                  scenarioName={
                    selectedScenario?.nameFR ?? "Scénario non précisé"
                  }
                  onChange={updateAlertField}
                  onSave={savePopulationAlertDraft}
                  onReady={markPopulationAlertReady}
                  onApprove={approvePopulationAlert}
                  onRequestFreeze={() => setFreezeConfirmationOpen(true)}
                  onCancelFreeze={() => setFreezeConfirmationOpen(false)}
                  onConfirmFreeze={freezePopulationAlertRecipients}
                  onRequestSend={() => setSendConfirmationOpen(true)}
                  onCancelSend={() => setSendConfirmationOpen(false)}
                  onConfirmSend={sendPopulationAlert}
                  onClose={() => {
                    setAlertComposerOpen(false);
                    setAlertStep(1);
                    setCreatedAlert(null);
                    setAlertError(null);
                    setFreezeConfirmationOpen(false);
                    setFreezeResult(null);
                    setLivePreflight(null);
                    setDeliverySummary(null);
                    setSendConfirmationOpen(false);
                  }}
                />
              )}

              {alertError && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 9,
                    backgroundColor: "#FDEDEC",
                    color: "#922B21",
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.5,
                  }}
                >
                  {alertError}
                </div>
              )}

              {!createdAlert && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid #E9ECEF",
                  }}
                >
                  <button
                    type="button"
                    disabled={alertStep === 1 || alertCreating}
                    onClick={() =>
                      setAlertStep((current) => Math.max(1, current - 1))
                    }
                    style={{
                      padding: "9px 13px",
                      border: "1px solid #E9ECEF",
                      borderRadius: 8,
                      backgroundColor: "#FFFFFF",
                      color: "#6C757D",
                      cursor:
                        alertStep === 1 || alertCreating
                          ? "not-allowed"
                          : "pointer",
                      opacity: alertStep === 1 || alertCreating ? 0.45 : 1,
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    Précédent
                  </button>

                  {alertStep < 5 ? (
                    <button
                      type="button"
                      disabled={
                        alertCreating ||
                        (alertStep === 4 &&
                          (!alertForm.titleFR.trim() ||
                            !alertForm.messageFR.trim()))
                      }
                      onClick={() =>
                        setAlertStep((current) => Math.min(5, current + 1))
                      }
                      style={{
                        padding: "9px 15px",
                        border: "none",
                        borderRadius: 8,
                        backgroundColor: "#167D6A",
                        color: "#FFFFFF",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 900,
                      }}
                    >
                      Continuer
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={alertCreating}
                      onClick={createPopulationAlertDraft}
                      style={{
                        padding: "9px 15px",
                        border: "none",
                        borderRadius: 8,
                        backgroundColor: "#C0392B",
                        color: "#FFFFFF",
                        cursor: alertCreating ? "not-allowed" : "pointer",
                        opacity: alertCreating ? 0.65 : 1,
                        fontSize: 10,
                        fontWeight: 900,
                      }}
                    >
                      {alertCreating ? "Création..." : "Créer le brouillon"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {configurationOpen && (
          <section
            style={{
              marginBottom: 18,
              padding: "22px 24px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E9ECEF",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 22,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 5px",
                    color: "#167D6A",
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Préparation
                </p>

                <h2
                  style={{
                    margin: "0 0 5px",
                    color: "#2C3E50",
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  Configuration du programme
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#6C757D",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Paramètres publics, canaux de communication et consentement
                  citoyen.
                </p>
              </div>

              <span
                style={{
                  padding: "5px 9px",
                  borderRadius: 20,
                  backgroundColor: "#F1F3F5",
                  color: "#6C757D",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {programStatus}
              </span>
            </div>

            <ConfigurationSection title="Identité publique">
              <ConfigurationField
                label="Identifiant public"
                value={configurationForm.publicSlug}
                placeholder="ex. sobeys-boucherville"
                required
                onChange={(value) =>
                  updateConfigurationField("publicSlug", value)
                }
              />

              <ConfigurationField
                label="Nom du programme"
                value={configurationForm.nameFR}
                placeholder="Sentinelle Population — Boucherville"
                required
                onChange={(value) => updateConfigurationField("nameFR", value)}
              />

              <ConfigurationField
                label="Nom anglais"
                value={configurationForm.nameEN}
                onChange={(value) => updateConfigurationField("nameEN", value)}
              />

              <ConfigurationField
                label="Téléphone public"
                value={configurationForm.publicPhone}
                placeholder="450 000-0000"
                onChange={(value) =>
                  updateConfigurationField("publicPhone", value)
                }
              />

              <ConfigurationField
                label="Courriel public"
                value={configurationForm.publicEmail}
                placeholder="urgence@exemple.ca"
                onChange={(value) =>
                  updateConfigurationField("publicEmail", value)
                }
              />

              <ConfigurationField
                label="Site Web"
                value={configurationForm.websiteUrl}
                placeholder="https://..."
                onChange={(value) =>
                  updateConfigurationField("websiteUrl", value)
                }
              />

              <ConfigurationTextarea
                label="Description française"
                value={configurationForm.descriptionFR}
                onChange={(value) =>
                  updateConfigurationField("descriptionFR", value)
                }
              />

              <ConfigurationTextarea
                label="Description anglaise"
                value={configurationForm.descriptionEN}
                onChange={(value) =>
                  updateConfigurationField("descriptionEN", value)
                }
              />
            </ConfigurationSection>

            <ConfigurationSection title="Diffusion et inscription">
              <ConfigurationToggle
                label="Inscription citoyenne"
                detail="Permettre au public de s’inscrire volontairement au programme."
                checked={configurationForm.registrationEnabled}
                onChange={(value) =>
                  updateConfigurationField("registrationEnabled", value)
                }
              />

              <ConfigurationToggle
                label="Alertes SMS"
                detail="Autoriser la diffusion des communications par message texte."
                checked={configurationForm.smsEnabled}
                onChange={(value) =>
                  updateConfigurationField("smsEnabled", value)
                }
              />

              <ConfigurationToggle
                label="Alertes par courriel"
                detail="Autoriser la diffusion des communications par courriel."
                checked={configurationForm.emailEnabled}
                onChange={(value) =>
                  updateConfigurationField("emailEnabled", value)
                }
              />
            </ConfigurationSection>

            <ConfigurationSection title="Confidentialité et consentement">
              <ConfigurationField
                label="Version du consentement"
                value={configurationForm.consentVersion}
                placeholder="1.0"
                required
                onChange={(value) =>
                  updateConfigurationField("consentVersion", value)
                }
              />

              <ConfigurationTextarea
                label="Confidentialité — français"
                value={configurationForm.privacyTextFR}
                required
                rows={5}
                onChange={(value) =>
                  updateConfigurationField("privacyTextFR", value)
                }
              />

              <ConfigurationTextarea
                label="Consentement — français"
                value={configurationForm.consentTextFR}
                required
                rows={5}
                onChange={(value) =>
                  updateConfigurationField("consentTextFR", value)
                }
              />

              <ConfigurationTextarea
                label="Confidentialité — anglais"
                value={configurationForm.privacyTextEN}
                rows={5}
                onChange={(value) =>
                  updateConfigurationField("privacyTextEN", value)
                }
              />

              <ConfigurationTextarea
                label="Consentement — anglais"
                value={configurationForm.consentTextEN}
                rows={5}
                onChange={(value) =>
                  updateConfigurationField("consentTextEN", value)
                }
              />
            </ConfigurationSection>

            {(configurationError || configurationMessage) && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "11px 13px",
                  borderRadius: 8,
                  backgroundColor: configurationError ? "#FDEDEC" : "#E8F5F1",
                  color: configurationError ? "#922B21" : "#167D6A",
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
              >
                {configurationError || configurationMessage}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 9,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setConfigurationOpen(false)}
                disabled={configurationSaving}
                style={{
                  padding: "10px 15px",
                  border: "1px solid #E9ECEF",
                  borderRadius: 8,
                  backgroundColor: "#FFFFFF",
                  color: "#6C757D",
                  cursor: configurationSaving ? "not-allowed" : "pointer",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                Fermer
              </button>

              <button
                type="button"
                onClick={saveConfiguration}
                disabled={
                  configurationSaving || status.programStatus === "ARCHIVED"
                }
                style={{
                  padding: "10px 17px",
                  border: "none",
                  borderRadius: 8,
                  backgroundColor: "#167D6A",
                  color: "#FFFFFF",
                  cursor:
                    configurationSaving || status.programStatus === "ARCHIVED"
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    configurationSaving || status.programStatus === "ARCHIVED"
                      ? 0.55
                      : 1,
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                {configurationSaving
                  ? "Enregistrement..."
                  : "Enregistrer la configuration"}
              </button>
            </div>
          </section>
        )}

        {/* ChaÃ®ne opÃ©rationnelle */}
        <section
          className={styles.communicationChain}
          style={{
            padding: "18px 20px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E9ECEF",
            borderRadius: 14,
          }}
        >
          <p
            style={{
              margin: "0 0 14px",
              color: "#ADB5BD",
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Chaîne de communication
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {[
              "Situation",
              "Zone",
              "Population",
              "Message",
              "Validation humaine",
              "Diffusion",
              "Preuve",
            ].map((step, index, arr) => (
              <div
                key={step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    padding: "7px 10px",
                    borderRadius: 7,
                    backgroundColor:
                      step === "Validation humaine" ? "#E8F5F1" : "#F8F9FA",
                    color:
                      step === "Validation humaine" ? "#167D6A" : "#6C757D",
                    fontSize: 11,
                    fontWeight: step === "Validation humaine" ? 800 : 600,
                  }}
                >
                  {index + 1}. {step}
                </span>

                {index < arr.length - 1 && (
                  <ChevronRight size={12} color="#CED4DA" />
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid #F1F3F5",
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "#167D6A",
            }}
          >
            <CheckCircle2 size={14} />

            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              La diffusion publique demeure soumise à une validation humaine.
            </p>
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}

function formatPopulationCommunicationType(
  type: PopulationOperationalEventAlert["type"],
  sequence: number | null,
) {
  if (type === "EMERGENCY") return "ALERTE INITIALE";
  if (type === "TEST") return sequence === 1 ? "TEST INITIAL" : "TEST";
  if (type === "UPDATE") return "MISE À JOUR";
  return "FIN D’ALERTE";
}

function formatPopulationCommunicationStatus(
  status: string,
  alert?: PopulationOperationalEventAlert,
) {
  if (status === "READY" && alert) {
    const stage = getPopulationAlertWorkflowStage(alert);
    if (stage === "READY_FOR_APPROVAL") return "À APPROUVER";
    if (stage === "APPROVED_NEEDS_FREEZE") return "APPROUVÉE · ROSTER À FIGER";
    if (stage === "RECIPIENTS_FROZEN") return "DESTINATAIRES FIGÉS";
  }
  const labels: Record<string, string> = {
    DRAFT: "BROUILLON",
    READY: "PRÊTE À DIFFUSER",
    SENDING: "DIFFUSION EN COURS",
    ACTIVE: "DIFFUSÉE",
    ENDED: "TERMINÉE",
    FAILED: "ÉCHEC",
    CANCELLED: "ANNULÉE",
  };
  return labels[status] ?? status;
}

function PopulationUnifiedRegistry({
  entries,
  loading,
  error,
  onRefresh,
}: {
  entries: any[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <section className={styles.incidentRegistry} style={{ marginBottom: 18 }}>
      <div className={styles.registryHeader}>
        <div>
          <p className={styles.registryEyebrow}>PROUVER · AUDIT · REX</p>
          <h2>Historique des événements et communications</h2>
          <p>
            Consultez les événements Population, leurs communications et les
            preuves de diffusion.
          </p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "ACTUALISATION..." : "ACTUALISER"}
        </button>
      </div>
      {error ? (
        <p className={styles.registryError}>{error}</p>
      ) : loading && entries.length === 0 ? (
        <p>Chargement du registre...</p>
      ) : entries.length === 0 ? (
        <p>Aucun événement ou communication historique pour ce bâtiment.</p>
      ) : (
        <div className={styles.registryList}>
          {entries.map(({ kind, item }) => {
            const communications =
              kind === "OPERATIONAL_EVENT" ? item.alerts ?? [] : [item];
            const title =
              kind === "OPERATIONAL_EVENT"
                ? item.emergencyScenario?.nameFR || "Événement Population"
                : item.titleFR;
            return (
              <details key={`${kind}-${item.id}`} className={styles.registryItem}>
                <summary>
                  <span>
                    <strong>{title}</strong>
                    <small>
                      {kind === "OPERATIONAL_EVENT"
                        ? "ÉVÉNEMENT POPULATION"
                        : "COMMUNICATION HISTORIQUE"}{" "}
                      · {item.status}
                    </small>
                  </span>
                  <span>{communications.length} communication(s) · CONSULTER</span>
                </summary>
                <div className={styles.registryDetail}>
                  <p>
                    Début/diffusion :{" "}
                    {new Date(
                      item.startedAt || item.activatedAt || item.createdAt,
                    ).toLocaleString("fr-CA")}
                    {item.endedAt
                      ? ` · Fin : ${new Date(item.endedAt).toLocaleString("fr-CA")}`
                      : ""}
                  </p>
                  {item.incidentEventId && <p>Lié à un incident CORO</p>}
                  {item.closeReason && <p>Motif : {item.closeReason}</p>}
                  {communications.map((communication: any, index: number) => {
                    const counts = communication.deliveryCounts ?? communication;
                    return (
                      <div key={communication.id} className={styles.registryCommunication}>
                        <strong>
                          #{communication.cycleSequence ?? index + 1} ·{" "}
                          {formatPopulationCommunicationType(
                            communication.type,
                            communication.cycleSequence,
                          )}
                        </strong>
                        <span>
                          {getPopulationDeliveryModeLabel(
                            communication.deliveryModeSnapshot,
                          )}{" "}
                          · Livrées {counts.DELIVERED ?? counts.delivered ?? 0} ·
                          Échecs {counts.FAILED ?? counts.failed ?? 0}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EventCockpit({
  event,
  closedEvent,
  loading,
  refreshing,
  error,
  mode,
  canPrepare,
  followUpCreating,
  closeOpen,
  closeReason,
  confirmIncomplete,
  closeLoading,
  onPrepareInitial,
  onCreateUpdate,
  onCreateAllClear,
  onRefresh,
  onOpenClose,
  onCancelClose,
  onCloseReasonChange,
  onConfirmIncompleteChange,
  onConfirmClose,
}: {
  event: PopulationOperationalEvent | null;
  closedEvent: PopulationOperationalEvent | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  mode: "SANDBOX" | "LIVE";
  canPrepare: boolean;
  followUpCreating: boolean;
  closeOpen: boolean;
  closeReason: string;
  confirmIncomplete: boolean;
  closeLoading: boolean;
  onPrepareInitial: () => void;
  onCreateUpdate: () => void;
  onCreateAllClear: () => void;
  onRefresh: () => void;
  onOpenClose: () => void;
  onCancelClose: () => void;
  onCloseReasonChange: (value: string) => void;
  onConfirmIncompleteChange: (value: boolean) => void;
  onConfirmClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeDialogRef = useRef<HTMLDivElement>(null);
  const closeState = derivePopulationCloseState(event, canPrepare);
  const allClear = closeState.allClear as PopulationOperationalEventAlert | undefined;
  const canFollowUp = Boolean(event && !allClear && canPrepare);
  const initialType = event?.alerts[0]?.type === "TEST" ? "TEST" : "URGENCE";
  const presentation = derivePopulationEventPresentation({
    activeEvent: event,
    lastClosedEvent: closedEvent,
    initialLoading: loading,
  });

  useEffect(() => {
    if (closeOpen) closeDialogRef.current?.focus();
  }, [closeOpen]);

  return (
    <section className={styles.eventCockpit} aria-live="polite">
      <div className={styles.eventHeader}>
        <div>
          <p className={styles.eventEyebrow}>
            {event
              ? "ÉVÉNEMENT EN COURS"
              : closedEvent
                ? "ÉVÉNEMENT TERMINÉ"
                : "AUCUN ÉVÉNEMENT EN COURS"}
          </p>
          <h2>
            {event?.emergencyScenario.nameFR ??
              closedEvent?.emergencyScenario.nameFR ??
              "Centre de contrôle disponible"}
          </h2>
          <p>
            {event
              ? `${initialType} · Début ${new Date(event.startedAt).toLocaleString("fr-CA")} · ${event.communicationCount} communication${event.communicationCount > 1 ? "s" : ""}`
              : closedEvent
                ? `Clos le ${new Date(closedEvent.endedAt!).toLocaleString("fr-CA")}${closedEvent.closeReason ? ` · ${closedEvent.closeReason}` : ""}`
                : "Préparez une alerte initiale pour ouvrir un nouveau cycle de communication."}
          </p>
        </div>
        <div
          className={`${styles.eventMode} ${mode === "LIVE" ? styles.eventModeLive : ""}`}
        >
          <strong>{mode === "LIVE" ? "DIFFUSION RÉELLE" : "SIMULATION"}</strong>
          <span>
            {mode === "LIVE"
              ? "Communications externes actives"
              : "Aucune communication externe"}
          </span>
        </div>
      </div>

      {error && <div className={styles.eventError}>{error}</div>}
      {presentation === "INITIAL_LOADING" ? (
        <p className="animate-pulse">Chargement de l’événement...</p>
      ) : presentation === "EVENT_ACTIVE" && event ? (
        <>
          <div className={styles.eventActions}>
            {!allClear && (
              <button
                className={styles.secondaryEventAction}
                disabled={!canFollowUp || followUpCreating}
                onClick={onCreateUpdate}
              >
                PUBLIER UNE MISE À JOUR
              </button>
            )}
            {!allClear && (
              <button
                className={styles.primaryEventAction}
                disabled={!canFollowUp || followUpCreating}
                onClick={onCreateAllClear}
              >
                PRÉPARER LA FIN D’ALERTE
              </button>
            )}
            {allClear && (
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.primaryEventAction}
                disabled={!closeState.enabled}
                onClick={() =>
                  openPopulationCloseConfirmation(closeState, onOpenClose)
                }
                title={
                  !closeState.permitted
                    ? "Permission POPULATION_PREPARE requise"
                    : !closeState.eligible
                      ? "La diffusion de fin d’alerte doit être terminée avant la clôture"
                      : undefined
                }
              >
                CLORE L’ÉVÉNEMENT
              </button>
            )}
            <button
              className={styles.iconEventAction}
              onClick={onRefresh}
              disabled={loading || refreshing}
              title="Actualiser l’événement"
              aria-label="Actualiser l’événement"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {allClear && (
            <div className={styles.allClearNotice}>
              <strong>
                FIN D’ALERTE{" "}
                {["ACTIVE", "ENDED"].includes(allClear.status)
                  ? "DIFFUSÉE"
                  : "EN PRÉPARATION"}
              </strong>
              <span>
                La communication de fin d’alerte est distincte de la clôture
                interne. L’événement demeure ouvert jusqu’à sa clôture
                explicite.
              </span>
            </div>
          )}

          <div className={styles.timeline}>
            {event.alerts.map((alert) => {
              const counts = alert.deliveryCounts ?? {};
              return (
                <article key={alert.id} className={styles.timelineEntry}>
                  <div className={styles.timelineTitle}>
                    <strong>
                      #{alert.cycleSequence ?? "—"}{" "}
                      {formatPopulationCommunicationType(
                        alert.type,
                        alert.cycleSequence,
                      )}
                    </strong>
                    <span>
                      {new Date(alert.createdAt).toLocaleString("fr-CA")} ·{" "}
                      {formatPopulationCommunicationStatus(alert.status, alert)}
                    </span>
                  </div>
                  <div className={styles.timelineMetrics}>
                    <PreviewMetric
                      label="Ciblés"
                      value={alert.targetedSubscriberCount ?? 0}
                    />
                    <PreviewMetric
                      label="Délivrables"
                      value={alert.deliverableDeliveryCount ?? 0}
                    />
                    <PreviewMetric label="Acceptées" value={counts.SENT ?? 0} />
                    <PreviewMetric
                      label="Livrées"
                      value={counts.DELIVERED ?? 0}
                    />
                    <PreviewMetric
                      label="Échecs"
                      value={counts.FAILED ?? 0}
                      warning={(counts.FAILED ?? 0) > 0}
                    />
                  </div>
                  {alert.type === "ALL_CLEAR" &&
                    alert.targeting?.strategy ===
                      "HISTORICAL_UNION_CURRENT" && (
                      <div className={styles.allClearMetrics}>
                        <PreviewMetric
                          label="Population actuelle"
                          value={
                            alert.targeting.currentZoneSubscriberCount ?? 0
                          }
                        />
                        <PreviewMetric
                          label="Historique événement"
                          value={alert.targeting.historicalSubscriberCount ?? 0}
                        />
                        <PreviewMetric
                          label="Chevauchement"
                          value={alert.targeting.overlapSubscriberCount ?? 0}
                        />
                        <PreviewMetric
                          label="Personnes uniques"
                          value={alert.targeting.uniqueTargetCount ?? 0}
                        />
                        <PreviewMetric
                          label="Supprimées"
                          value={
                            alert.targeting
                              .revalidationSuppressedSubscriberCount ?? 0
                          }
                        />
                        <PreviewMetric
                          label="Délivrables"
                          value={
                            alert.targeting.deliverableSubscriberCount ?? 0
                          }
                        />
                        <p>
                          La fin d’alerte tient compte des personnes
                          précédemment concernées ainsi que de la population
                          actuellement ciblée. Les abonnements et canaux sont
                          revalidés avant diffusion.
                        </p>
                      </div>
                    )}
                </article>
              );
            })}
          </div>

          {closeOpen && (
            <div className={styles.closeOverlay} role="presentation">
              <div
                ref={closeDialogRef}
                className={styles.closePanel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="population-close-title"
                tabIndex={-1}
              >
              <h3 id="population-close-title">Clore l’événement?</h3>
              <p><strong>La FIN D’ALERTE a été diffusée.</strong></p>
              <p>
                Cette action clôture le dossier opérationnel dans CORO. Aucune
                nouvelle communication ne sera envoyée à la population.
              </p>
              <dl className={styles.closeMetrics}>
                <div><dt>Communications</dt><dd>{closeState.summary.communications}</dd></div>
                <div><dt>Livrées</dt><dd>{closeState.summary.delivered}</dd></div>
                <div><dt>Échecs</dt><dd>{closeState.summary.failed}</dd></div>
                <div><dt>Réconciliation</dt><dd>{closeState.summary.reconciliation}</dd></div>
              </dl>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={confirmIncomplete}
                  onChange={(e) => onConfirmIncompleteChange(e.target.checked)}
                />
                Confirmer une diffusion incomplète, le cas échéant
              </label>
              <textarea
                value={closeReason}
                onChange={(e) => onCloseReasonChange(e.target.value)}
                placeholder="Motif requis si la diffusion est incomplète"
                rows={3}
              />
              <div className={styles.eventActions}>
                <button
                  type="button"
                  className={styles.secondaryEventAction}
                  onClick={onCancelClose}
                  disabled={closeLoading}
                >
                  ANNULER
                </button>
                <button
                  type="button"
                  className={styles.primaryEventAction}
                  disabled={
                    closeLoading ||
                    !closeState.enabled ||
                    (confirmIncomplete && !closeReason.trim())
                  }
                  onClick={() =>
                    confirmPopulationEventClose(
                      closeState,
                      closeLoading,
                      onConfirmClose,
                    )
                  }
                >
                  {closeLoading ? "CLÔTURE..." : "CLORE L’ÉVÉNEMENT"}
                </button>
              </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <button
          className={styles.primaryEventAction}
          disabled={!canPrepare}
          onClick={onPrepareInitial}
        >
          PRÉPARER UNE ALERTE
        </button>
      )}
    </section>
  );
}

function LegacyCommunicationNotice({
  alert,
  canPrepare,
  loading,
  onEnd,
}: {
  alert: PopulationLegacyAlert;
  canPrepare: boolean;
  loading: boolean;
  onEnd: () => void;
}) {
  return (
    <section className={styles.legacyNotice} aria-live="polite">
      <div>
        <strong>COMMUNICATION HISTORIQUE ACTIVE</strong>
        <p>
          {alert.titleFR} · Mode :{" "}
          {alert.deliveryModeSnapshot === "LIVE"
            ? "DIFFUSION RÉELLE"
            : "SIMULATION"}
          {" · "}Statut transport :{" "}
          {alert.delivered > 0
            ? "LIVRÉE"
            : alert.sent > 0
              ? "ACCEPTÉE"
              : alert.failed > 0
                ? "ÉCHEC"
                : "ACTIVE"}
        </p>
        <p>
          Cette communication a été créée avant le cycle événementiel actuel.
          Terminer cette communication n’envoie aucun nouveau message.
        </p>
      </div>
      <button
        className={styles.secondaryEventAction}
        disabled={!canPrepare || loading}
        onClick={onEnd}
      >
        {loading ? "TRAITEMENT..." : "TERMINER LA COMMUNICATION"}
      </button>
    </section>
  );
}

function IncidentCommunicationsPanel({
  incident,
  alerts,
  loading,
  error,
  followUpCreating,
  onRefresh,
  onCreateUpdate,
  onCreateAllClear,
}: {
  incident: PopulationIncident | null;
  alerts: PopulationIncidentAlert[];
  loading: boolean;
  error: string | null;
  followUpCreating: boolean;
  onRefresh: () => void;
  onCreateUpdate: () => void;
  onCreateAllClear: () => void;
}) {
  const orderedAlerts = [...alerts].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;

    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    return aTime - bTime;
  });

  const emergencyAlert = orderedAlerts.find(
    (alert) => alert.type === "EMERGENCY",
  );

  const updateCount = orderedAlerts.filter(
    (alert) => alert.type === "UPDATE",
  ).length;

  const allClearAlert = orderedAlerts.find(
    (alert) => alert.type === "ALL_CLEAR" && alert.status !== "CANCELLED",
  );

  const hasDiffusedCommunication = orderedAlerts.some(
    (alert) =>
      alert.status !== "DRAFT" &&
      alert.status !== "READY" &&
      alert.status !== "CANCELLED" &&
      alert.type !== "ALL_CLEAR",
  );

  const incidentOperational =
    Boolean(incident) &&
    incident?.status !== "PRE_ALERT" &&
    incident?.status !== "RESOLVED" &&
    incident?.status !== "CANCELLED";

  const canCreateUpdate =
    incidentOperational &&
    hasDiffusedCommunication &&
    !allClearAlert &&
    !followUpCreating;

  const canCreateAllClear =
    incidentOperational &&
    hasDiffusedCommunication &&
    !allClearAlert &&
    !followUpCreating;

  return (
    <section
      style={{
        marginBottom: 18,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E9ECEF",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          padding: "20px 22px",
          background:
            "linear-gradient(115deg, #20363A 0%, #244C4B 65%, #167D6A 100%)",
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 5px",
                color: "#A9D8CF",
                fontSize: 9,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Dossier de communication
            </p>

            <h2
              style={{
                margin: "0 0 5px",
                fontSize: 17,
                fontWeight: 900,
              }}
            >
              Incident · {incident?.type || "Situation active"}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#D5E5E2",
                fontSize: 10,
                lineHeight: 1.5,
              }}
            >
              {incident
                ? `${incident.status} · Déclenché le ${new Date(
                    incident.triggeredAt,
                  ).toLocaleString("fr-CA")}`
                : "Contexte incident en cours de chargement"}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onCreateUpdate}
              disabled={!canCreateUpdate}
              style={{
                padding: "7px 10px",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 8,
                backgroundColor: canCreateUpdate
                  ? "#2980B9"
                  : "rgba(255,255,255,0.06)",
                color: "#FFFFFF",
                cursor: canCreateUpdate ? "pointer" : "not-allowed",
                opacity: canCreateUpdate ? 1 : 0.45,
                fontSize: 9,
                fontWeight: 900,
              }}
            >
              {followUpCreating ? "Création..." : "Nouvelle mise à jour"}
            </button>

            <button
              type="button"
              onClick={onCreateAllClear}
              disabled={!canCreateAllClear}
              style={{
                padding: "7px 10px",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 8,
                backgroundColor: canCreateAllClear
                  ? "#167D6A"
                  : "rgba(255,255,255,0.06)",
                color: "#FFFFFF",
                cursor: canCreateAllClear ? "pointer" : "not-allowed",
                opacity: canCreateAllClear ? 1 : 0.45,
                fontSize: 9,
                fontWeight: 900,
              }}
            >
              {followUpCreating ? "Création..." : "Fin d’alerte"}
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              style={{
                padding: "7px 10px",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.08)",
                color: "#FFFFFF",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.55 : 1,
                fontSize: 9,
                fontWeight: 800,
              }}
            >
              {loading ? "Actualisation..." : "Actualiser"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(120px, 100%), 1fr))",
            gap: 8,
            marginTop: 16,
          }}
        >
          <IncidentHeaderMetric
            label="Communications"
            value={String(orderedAlerts.length)}
          />

          <IncidentHeaderMetric
            label="Alerte initiale"
            value={emergencyAlert ? "Oui" : "Non"}
          />

          <IncidentHeaderMetric
            label="Mises à jour"
            value={String(updateCount)}
          />

          <IncidentHeaderMetric
            label="Fin d’alerte"
            value={allClearAlert ? "Émise" : "Non émise"}
          />
        </div>
      </div>

      <div style={{ padding: "20px 22px" }}>
        {loading && orderedAlerts.length === 0 ? (
          <p
            className="animate-pulse"
            style={{
              margin: 0,
              color: "#ADB5BD",
              fontSize: 11,
            }}
          >
            Chargement du dossier de communication...
          </p>
        ) : error ? (
          <div
            style={{
              padding: 12,
              borderRadius: 9,
              backgroundColor: "#FDEDEC",
              color: "#922B21",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        ) : orderedAlerts.length === 0 ? (
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              backgroundColor: "#F8F9FA",
              border: "1px solid #E9ECEF",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: 4,
                color: "#2C3E50",
                fontSize: 11,
              }}
            >
              Aucune communication Population
            </strong>

            <p
              style={{
                margin: 0,
                color: "#6C757D",
                fontSize: 10,
                lineHeight: 1.5,
              }}
            >
              Préparez l’alerte initiale pour commencer le dossier de
              communication de cet incident.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  margin: "0 0 11px",
                  color: "#ADB5BD",
                  fontSize: 9,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Chronologie opérationnelle
              </p>

              <div style={{ display: "grid", gap: 10 }}>
                {orderedAlerts.map((alert, index) => (
                  <IncidentCommunicationEntry
                    key={alert.id}
                    alert={alert}
                    index={index}
                    total={orderedAlerts.length}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 9,
                backgroundColor: "#F8F9FA",
                color: "#6C757D",
                fontSize: 9,
                lineHeight: 1.55,
              }}
            >
              Le dossier présente des données de diffusion opérationnelles
              agrégées. Aucune identité ni destination individuelle de citoyen
              n’est affichée.
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function IncidentCommunicationEntry({
  alert,
  index,
  total,
}: {
  alert: PopulationIncidentAlert;
  index: number;
  total: number;
}) {
  const deliveries = alert.deliveries || [];
  const isSandbox = alert.deliveryModeSnapshot === "SANDBOX";

  const delivered = deliveries.filter(
    (delivery) => delivery.status === "DELIVERED",
  ).length;

  const sent = deliveries.filter(
    (delivery) => delivery.status === "SENT",
  ).length;

  const failed = deliveries.filter(
    (delivery) => delivery.status === "FAILED",
  ).length;

  const suppressed = deliveries.filter(
    (delivery) => delivery.status === "SUPPRESSED",
  ).length;

  const pending = deliveries.filter(
    (delivery) => delivery.status === "QUEUED" || delivery.status === "SENDING",
  ).length;

  const sms = deliveries.filter(
    (delivery) => delivery.channel === "SMS",
  ).length;

  const email = deliveries.filter(
    (delivery) => delivery.channel === "EMAIL",
  ).length;

  const typeLabel =
    alert.type === "EMERGENCY"
      ? "ALERTE INITIALE"
      : alert.type === "UPDATE"
        ? "MISE À JOUR"
        : alert.type === "ALL_CLEAR"
          ? "FIN D’ALERTE"
          : alert.type;

  const typeColor =
    alert.type === "EMERGENCY"
      ? "#C0392B"
      : alert.type === "UPDATE"
        ? "#2980B9"
        : alert.type === "ALL_CLEAR"
          ? "#167D6A"
          : "#6C757D";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px minmax(0, 1fr)",
        gap: 10,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: 11,
            height: 11,
            marginTop: 6,
            borderRadius: "50%",
            backgroundColor: typeColor,
            border: "3px solid #FFFFFF",
            boxShadow: `0 0 0 1px ${typeColor}`,
          }}
        />

        {index < total - 1 && (
          <div
            style={{
              position: "absolute",
              top: 17,
              bottom: -16,
              width: 1,
              backgroundColor: "#DEE2E6",
            }}
          />
        )}
      </div>

      <div
        style={{
          padding: 14,
          border: "1px solid #E9ECEF",
          borderRadius: 10,
          backgroundColor: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 5,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  padding: "3px 7px",
                  borderRadius: 20,
                  backgroundColor: `${typeColor}12`,
                  color: typeColor,
                  fontSize: 8,
                  fontWeight: 900,
                }}
              >
                {typeLabel}
              </span>

              <span
                style={{
                  padding: "3px 7px",
                  borderRadius: 20,
                  backgroundColor: "#F1F3F5",
                  color: "#6C757D",
                  fontSize: 8,
                  fontWeight: 900,
                }}
              >
                {alert.status}
              </span>
            </div>

            <h3
              style={{
                margin: "0 0 5px",
                color: "#2C3E50",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {alert.titleFR}
            </h3>

            <p
              style={{
                margin: 0,
                color: "#6C757D",
                fontSize: 9,
                lineHeight: 1.5,
              }}
            >
              {alert.createdAt
                ? new Date(alert.createdAt).toLocaleString("fr-CA")
                : "Horodatage non disponible"}
            </p>

            {alert.deliveryModeSnapshot && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: isSandbox ? "#496A63" : "#922B21",
                  fontWeight: 800,
                }}
              >
                MODE {alert.deliveryModeSnapshot} ·{" "}
                {isSandbox
                  ? "Simulation, aucun transport externe"
                  : "Diffusion réelle"}
              </p>
            )}
          </div>

          <span
            style={{
              color: "#ADB5BD",
              fontSize: 8,
            }}
          >
            {alert.id.slice(0, 8)}
          </span>
        </div>

        <p
          style={{
            margin: "11px 0 0",
            color: "#495057",
            fontSize: 10,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          }}
        >
          {alert.messageFR}
        </p>

        {alert.instructionFR && (
          <div
            style={{
              marginTop: 9,
              padding: 9,
              borderRadius: 8,
              backgroundColor: "#FEF9E7",
              color: "#7D6608",
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {alert.instructionFR}
          </div>
        )}

        {deliveries.length > 0 && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 11,
              borderTop: "1px solid #F1F3F5",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                color: "#ADB5BD",
                fontSize: 8,
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              {isSandbox ? "Preuve de simulation" : "Preuve de diffusion"}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(90px, 100%), 1fr))",
                gap: 7,
              }}
            >
              <IncidentDeliveryMetric label="Total" value={deliveries.length} />

              {!isSandbox && (
                <IncidentDeliveryMetric
                  label="Livrées"
                  value={delivered}
                  success
                />
              )}

              {!isSandbox && (
                <IncidentDeliveryMetric label="Acceptées" value={sent} />
              )}

              <IncidentDeliveryMetric label="En traitement" value={pending} />

              <IncidentDeliveryMetric
                label="Échecs"
                value={failed}
                warning={failed > 0}
              />

              {isSandbox && (
                <IncidentDeliveryMetric
                  label="Supprimées SANDBOX"
                  value={suppressed}
                  success
                />
              )}
            </div>

            <p
              style={{
                margin: "8px 0 0",
                color: "#ADB5BD",
                fontSize: 8,
              }}
            >
              {sms.toLocaleString("fr-CA")} SMS ·{" "}
              {email.toLocaleString("fr-CA")} courriel
              {email > 1 ? "s" : ""}
            </p>
          </div>
        )}

        {deliveries.length === 0 && (
          <div
            style={{
              marginTop: 11,
              padding: 9,
              borderRadius: 8,
              backgroundColor: "#F8F9FA",
              color: "#ADB5BD",
              fontSize: 8,
              lineHeight: 1.5,
            }}
          >
            Aucune donnée de diffusion enregistrée pour cette communication.
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentHeaderMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "9px 10px",
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: 3,
          color: "#A9D8CF",
          fontSize: 7,
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function IncidentDeliveryMetric({
  label,
  value,
  success = false,
  warning = false,
}: {
  label: string;
  value: number;
  success?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        padding: 8,
        borderRadius: 7,
        backgroundColor: warning ? "#FDEDEC" : success ? "#E8F5F1" : "#F8F9FA",
      }}
    >
      <strong
        style={{
          display: "block",
          marginBottom: 2,
          color: warning ? "#C0392B" : success ? "#167D6A" : "#2C3E50",
          fontSize: 13,
        }}
      >
        {value.toLocaleString("fr-CA")}
      </strong>

      <span
        style={{
          color: warning ? "#C0392B" : success ? "#167D6A" : "#ADB5BD",
          fontSize: 7,
          fontWeight: 800,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        padding: "17px 18px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E9ECEF",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 10,
          color: "#167D6A",
        }}
      >
        {icon}

        <span
          style={{
            color: "#ADB5BD",
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
      </div>

      <p
        style={{
          margin: "0 0 3px",
          color: "#2C3E50",
          fontSize: 16,
          fontWeight: 800,
        }}
      >
        {value}
      </p>

      <p
        style={{
          margin: 0,
          color: "#ADB5BD",
          fontSize: 11,
        }}
      >
        {detail}
      </p>
    </div>
  );
}

function AlertStepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    "Situation",
    "Zone",
    "Population",
    "Message",
    "Validation",
    "Contrôle",
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, minmax(70px, 1fr))",
        gap: 5,
        marginTop: 17,
        overflowX: "auto",
      }}
    >
      <p
        style={{
          gridColumn: "1 / -1",
          margin: 0,
          color: "#6C757D",
          fontWeight: 800,
        }}
      >
        Préparation du message · 6 étapes
      </p>
      {steps.map((step, index) => {
        const number = index + 1;
        const active = currentStep === number;
        const completed = currentStep > number;

        return (
          <div key={step}>
            <div
              style={{
                height: 3,
                marginBottom: 6,
                borderRadius: 3,
                backgroundColor: active || completed ? "#167D6A" : "#E9ECEF",
              }}
            />

            <span
              style={{
                color: active ? "#167D6A" : completed ? "#6C757D" : "#ADB5BD",
                fontSize: 8,
                fontWeight: active ? 900 : 700,
              }}
            >
              {number}. {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AlertSituationStep({
  type,
  scenario,
  onChange,
}: {
  type: PopulationAlertDraftForm["type"];
  scenario: PopulationScenario;
  onChange: (value: PopulationAlertDraftForm["type"]) => void;
}) {
  return (
    <div>
      <StepTitle
        eyebrow="01 · Situation"
        title="Qualifier la communication"
        detail="Le scénario provient du profil d’urgence environnementale du site."
      />

      <div
        style={{
          marginBottom: 15,
          padding: 14,
          border: "1px solid #E9ECEF",
          borderRadius: 10,
          backgroundColor: "#F8F9FA",
        }}
      >
        <strong
          style={{
            display: "block",
            marginBottom: 4,
            color: "#2C3E50",
            fontSize: 12,
          }}
        >
          {scenario.nameFR}
        </strong>

        <span
          style={{
            color: "#6C757D",
            fontSize: 10,
            lineHeight: 1.5,
          }}
        >
          {scenario.eventType ||
            scenario.description ||
            "Scénario d’urgence environnementale"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
          gap: 10,
        }}
      >
        <AlertTypeOption
          title="Urgence réelle"
          detail="Communication liée à une situation réelle."
          selected={type === "EMERGENCY"}
          onClick={() => onChange("EMERGENCY")}
          warning
        />

        <AlertTypeOption
          title="Test"
          detail="Exercice ou validation du dispositif."
          selected={type === "TEST"}
          onClick={() => onChange("TEST")}
        />
      </div>
    </div>
  );
}

function AlertTypeOption({
  title,
  detail,
  selected,
  onClick,
  warning = false,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onClick: () => void;
  warning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 14,
        borderRadius: 10,
        border: selected
          ? `2px solid ${warning ? "#C0392B" : "#167D6A"}`
          : "1px solid #E9ECEF",
        backgroundColor: selected
          ? warning
            ? "#FDF2F0"
            : "#F3FAF8"
          : "#FFFFFF",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <strong
        style={{
          display: "block",
          marginBottom: 4,
          color: warning ? "#C0392B" : "#2C3E50",
          fontSize: 11,
        }}
      >
        {title}
      </strong>

      <span
        style={{
          color: "#6C757D",
          fontSize: 9,
          lineHeight: 1.45,
        }}
      >
        {detail}
      </span>
    </button>
  );
}

function AlertZoneStep({
  scenario,
  preview,
}: {
  scenario: PopulationScenario;
  preview: PopulationPreview;
}) {
  return (
    <div>
      <StepTitle
        eyebrow="02 · Zone"
        title="Confirmer le territoire ciblé"
        detail="Les zones sont déterminées par le scénario sélectionné et calculées par CORO."
      />

      <div style={{ display: "grid", gap: 8 }}>
        {preview.zones.map((zone) => (
          <div
            key={zone.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              padding: 13,
              border: "1px solid #E9ECEF",
              borderRadius: 9,
            }}
          >
            <div>
              <strong
                style={{
                  display: "block",
                  marginBottom: 3,
                  color: "#2C3E50",
                  fontSize: 11,
                }}
              >
                Zone {zone.code} · {zone.nameFR}
              </strong>

              <span
                style={{
                  color: "#6C757D",
                  fontSize: 9,
                }}
              >
                {zone.protectiveAction ||
                  scenario.defaultProtectiveAction ||
                  "Mesure de protection à confirmer"}
              </span>
            </div>

            <strong
              style={{
                color: "#167D6A",
                fontSize: 15,
              }}
            >
              {zone.targetCount.toLocaleString("fr-CA")}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertPopulationStep({ preview }: { preview: PopulationPreview }) {
  return (
    <div>
      <StepTitle
        eyebrow="03 · Population"
        title="Vérifier la portée de la communication"
        detail="Les résultats affichés sont agrégés et calculés à partir des zones d’impact."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(150px, 100%), 1fr))",
          gap: 10,
        }}
      >
        <PreviewMetric
          label="Population ciblée"
          value={preview.population.uniqueTargetCount}
        />

        <PreviewMetric
          label="Destinataires SMS"
          value={preview.population.uniqueSmsTargetCount}
        />

        <PreviewMetric
          label="Destinataires courriel"
          value={preview.population.uniqueEmailTargetCount}
        />

        <PreviewMetric
          label="Sans localisation"
          value={preview.population.unlocatedSubscriberCount}
          warning={preview.population.unlocatedSubscriberCount > 0}
        />
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 9,
          backgroundColor: "#F8F9FA",
          color: "#6C757D",
          fontSize: 9,
          lineHeight: 1.55,
        }}
      >
        Le nombre de SMS et de courriels représente les canaux disponibles. Une
        même personne peut disposer des deux canaux.
      </div>
    </div>
  );
}

function AlertMessageStep({
  form,
  onChange,
}: {
  form: PopulationAlertDraftForm;
  onChange: <K extends keyof PopulationAlertDraftForm>(
    field: K,
    value: PopulationAlertDraftForm[K],
  ) => void;
}) {
  return (
    <div>
      <StepTitle
        eyebrow="04 · Message"
        title="Rédiger la communication"
        detail="Le message français est obligatoire. La consigne issue du scénario peut être adaptée avant la création du brouillon."
      />

      <div
        style={{
          display: "grid",
          gap: 13,
        }}
      >
        <ConfigurationField
          label="Titre français"
          value={form.titleFR}
          required
          onChange={(value) => onChange("titleFR", value)}
        />

        <ConfigurationTextarea
          label="Message français"
          value={form.messageFR}
          required
          rows={4}
          onChange={(value) => onChange("messageFR", value)}
        />

        <ConfigurationTextarea
          label="Consigne de protection"
          value={form.instructionFR}
          rows={3}
          onChange={(value) => onChange("instructionFR", value)}
        />

        <div
          style={{
            paddingTop: 13,
            borderTop: "1px solid #E9ECEF",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              color: "#ADB5BD",
              fontSize: 9,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Version anglaise · optionnelle
          </p>

          <div style={{ display: "grid", gap: 13 }}>
            <ConfigurationField
              label="Titre anglais"
              value={form.titleEN}
              onChange={(value) => onChange("titleEN", value)}
            />

            <ConfigurationTextarea
              label="Message anglais"
              value={form.messageEN}
              rows={4}
              onChange={(value) => onChange("messageEN", value)}
            />

            <ConfigurationTextarea
              label="Consigne anglaise"
              value={form.instructionEN}
              rows={3}
              onChange={(value) => onChange("instructionEN", value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertValidationStep({
  form,
  scenario,
  preview,
}: {
  form: PopulationAlertDraftForm;
  scenario: PopulationScenario;
  preview: PopulationPreview;
}) {
  return (
    <div>
      <StepTitle
        eyebrow="05 · Validation humaine"
        title="Confirmer avant création du brouillon"
        detail="Cette action enregistre un brouillon CORO. Elle ne diffuse aucun message."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(min(280px, 100%), 1fr) minmax(min(230px, 100%), 0.7fr)",
          gap: 14,
        }}
      >
        <div
          style={{
            padding: 16,
            border: "1px solid #E9ECEF",
            borderRadius: 11,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 7,
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ADB5BD",
                fontSize: 8,
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              Aperçu citoyen
            </p>

            {form.type === "TEST" && (
              <span
                style={{
                  padding: "3px 7px",
                  borderRadius: 20,
                  backgroundColor: "#FEF9E7",
                  color: "#B9770E",
                  fontSize: 8,
                  fontWeight: 900,
                }}
              >
                TEST
              </span>
            )}
          </div>

          <h3
            style={{
              margin: "0 0 10px",
              color: "#2C3E50",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            {form.titleFR}
          </h3>

          <p
            style={{
              margin: "0 0 12px",
              color: "#495057",
              fontSize: 11,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {form.messageFR}
          </p>

          {form.instructionFR && (
            <div
              style={{
                padding: 11,
                borderRadius: 8,
                backgroundColor: "#FEF9E7",
                color: "#7D6608",
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {form.instructionFR}
            </div>
          )}
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 11,
            backgroundColor: "#F8F9FA",
          }}
        >
          <ValidationRow
            label="Type"
            value={form.type === "TEST" ? "Test" : "Urgence réelle"}
          />

          <ValidationRow label="Scénario" value={scenario.nameFR} />

          <ValidationRow label="Zones" value={String(preview.zones.length)} />

          <ValidationRow
            label="Population"
            value={preview.population.uniqueTargetCount.toLocaleString("fr-CA")}
          />

          <ValidationRow
            label="SMS"
            value={preview.population.uniqueSmsTargetCount.toLocaleString(
              "fr-CA",
            )}
          />

          <ValidationRow
            label="Courriels"
            value={preview.population.uniqueEmailTargetCount.toLocaleString(
              "fr-CA",
            )}
          />

          <div
            style={{
              marginTop: 13,
              padding: 10,
              borderRadius: 8,
              backgroundColor: "#E8F5F1",
              color: "#167D6A",
              fontSize: 9,
              fontWeight: 800,
              lineHeight: 1.5,
            }}
          >
            Création d’un brouillon seulement. Aucune diffusion ne sera
            déclenchée.
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertDraftWorkspace({
  alert,
  form,
  loading,
  freezeConfirmationOpen,
  freezeResult,
  livePreflight,
  deliverySummary,
  sendConfirmationOpen,
  deliveryMode,
  permissions,
  scenarioName,
  onChange,
  onSave,
  onReady,
  onApprove,
  onRequestFreeze,
  onCancelFreeze,
  onConfirmFreeze,
  onRequestSend,
  onCancelSend,
  onConfirmSend,
  onClose,
}: {
  alert: CreatedPopulationAlert;
  form: PopulationAlertDraftForm;
  loading: boolean;
  freezeConfirmationOpen: boolean;
  freezeResult: PopulationFreezeResult | null;
  livePreflight: PopulationLivePreflight | null;
  deliverySummary: PopulationDeliverySummary | null;
  sendConfirmationOpen: boolean;
  deliveryMode: "SANDBOX" | "LIVE";
  permissions: PopulationStatus["populationPermissions"];
  scenarioName: string;
  onChange: <K extends keyof PopulationAlertDraftForm>(
    field: K,
    value: PopulationAlertDraftForm[K],
  ) => void;
  onSave: () => void;
  onReady: () => void;
  onApprove: () => void;
  onRequestFreeze: () => void;
  onCancelFreeze: () => void;
  onConfirmFreeze: () => void;
  onRequestSend: () => void;
  onCancelSend: () => void;
  onConfirmSend: () => void;
  onClose: () => void;
}) {
  const workflowStage = getPopulationAlertWorkflowStage(alert);
  const isDraft = workflowStage === "DRAFT";
  const isReady = alert.status === "READY";
  const isApproved = Boolean(alert.approvedAt);
  const recipientsFrozen = workflowStage === "RECIPIENTS_FROZEN";
  const canPrepare = permissions.includes("POPULATION_PREPARE");
  const canApprove = permissions.includes("POPULATION_APPROVE");
  const canSend = permissions.includes("POPULATION_SEND");
  const liveSendReady =
    deliveryMode !== "LIVE" || livePreflight?.ready === true;

  const diffusionStarted =
    alert.status === "SENDING" ||
    alert.status === "ACTIVE" ||
    alert.status === "FAILED";

  return (
    <div>
      <div
        role="status"
        aria-live="polite"
        style={{
          marginBottom: 16,
          padding: 14,
          border: "1px solid #CBD5E1",
          borderRadius: 8,
          backgroundColor: deliveryMode === "LIVE" ? "#FFF4F2" : "#F4F8FB",
          color: "#2C3E50",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        <strong>MODE {deliveryMode}</strong>
        <div>
          {deliveryMode === "LIVE"
            ? "Diffusion réelle — les communications admissibles seront transmises aux destinataires."
            : "Simulation — aucune communication externe ne sera transmise."}
        </div>
      </div>
      <StepTitle
        eyebrow="06 · Contrôle"
        title={
          alert.status === "ACTIVE"
            ? deliveryMode === "SANDBOX"
              ? "Simulation de diffusion exécutée"
              : "Diffusion déclenchée"
            : alert.status === "SENDING"
              ? "Diffusion en cours"
              : alert.status === "FAILED"
                ? "Diffusion en échec"
                : recipientsFrozen
                  ? "Destinataires figés"
                  : isApproved
                    ? "Alerte approuvée"
                    : isReady
                      ? "Alerte prête pour approbation"
                      : "Brouillon enregistré"
        }
        detail={
          alert.status === "ACTIVE"
            ? deliveryMode === "SANDBOX"
              ? "La simulation est terminée. Aucune communication externe n’a été transmise."
              : "Au moins une communication a été acceptée par le fournisseur ou confirmée livrée. Cela ne signifie pas que toutes les communications ont été livrées."
            : alert.status === "SENDING"
              ? "La diffusion a été déclenchée et des communications sont encore en traitement."
              : alert.status === "FAILED"
                ? "Aucune communication n’a été acceptée ou confirmée livrée et aucun traitement n’est encore en attente."
                : recipientsFrozen
                  ? "Le roster de diffusion est maintenant immuable. Aucun message n’a encore été envoyé."
                  : isApproved
                    ? "L’approbation humaine est enregistrée. Les destinataires doivent maintenant être figés avant toute diffusion."
                    : isReady
                      ? "Le contenu est verrouillé pour cette étape. Une approbation humaine explicite est maintenant requise."
                      : "Le brouillon peut encore être corrigé avant de passer à READY."
        }
      />

      <AlertWorkflowBar
        status={alert.status}
        approved={isApproved}
        recipientsFrozen={recipientsFrozen}
        diffusionStarted={diffusionStarted}
      />

      {isDraft && (
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gap: 13,
          }}
        >
          <ConfigurationField
            label="Titre français"
            value={form.titleFR}
            required
            onChange={(value) => onChange("titleFR", value)}
          />

          <ConfigurationTextarea
            label="Message français"
            value={form.messageFR}
            required
            rows={4}
            onChange={(value) => onChange("messageFR", value)}
          />

          <ConfigurationTextarea
            label="Consigne de protection"
            value={form.instructionFR}
            rows={3}
            onChange={(value) => onChange("instructionFR", value)}
          />

          <div
            style={{
              paddingTop: 13,
              borderTop: "1px solid #E9ECEF",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                color: "#ADB5BD",
                fontSize: 9,
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              Version anglaise · optionnelle
            </p>

            <div style={{ display: "grid", gap: 13 }}>
              <ConfigurationField
                label="Titre anglais"
                value={form.titleEN}
                onChange={(value) => onChange("titleEN", value)}
              />

              <ConfigurationTextarea
                label="Message anglais"
                value={form.messageEN}
                rows={4}
                onChange={(value) => onChange("messageEN", value)}
              />

              <ConfigurationTextarea
                label="Consigne anglaise"
                value={form.instructionEN}
                rows={3}
                onChange={(value) => onChange("instructionEN", value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 9,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <WorkflowButton
              title="Enregistrer les modifications"
              disabled={loading || !canPrepare}
              onClick={onSave}
            />

            <WorkflowButton
              title="Passer à READY"
              disabled={
                loading ||
                !canPrepare ||
                !form.titleFR.trim() ||
                !form.messageFR.trim()
              }
              onClick={onReady}
              primary
            />
          </div>

          <div
            style={{
              padding: 11,
              borderRadius: 9,
              backgroundColor: "#FEF9E7",
              color: "#7D6608",
              fontSize: 9,
              lineHeight: 1.55,
            }}
          >
            <strong>Passer à READY :</strong> recalcule le ciblage et soumet le
            contenu à approbation. Aucune communication n’est transmise.
          </div>
        </div>
      )}

      {isReady && !isApproved && (
        <div
          style={{
            marginTop: 18,
            padding: 18,
            border: "1px solid #E9ECEF",
            borderRadius: 11,
            backgroundColor: "#FFFFFF",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(min(280px, 100%), 1fr) minmax(min(190px, 100%), 0.55fr)",
              gap: 16,
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#ADB5BD",
                  fontSize: 8,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Communication prête
              </p>

              <h3
                style={{
                  margin: "0 0 10px",
                  color: "#2C3E50",
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                {alert.titleFR}
              </h3>

              <p
                style={{
                  margin: "0 0 12px",
                  color: "#495057",
                  fontSize: 11,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {alert.messageFR}
              </p>

              {alert.instructionFR && (
                <div
                  style={{
                    padding: 11,
                    borderRadius: 8,
                    backgroundColor: "#FEF9E7",
                    color: "#7D6608",
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {alert.instructionFR}
                </div>
              )}
            </div>

            {freezeResult &&
              alert.type === "ALL_CLEAR" &&
              freezeResult.targeting.strategy ===
                "HISTORICAL_UNION_CURRENT" && (
                <div className={styles.allClearMetrics}>
                  <FrozenMetric
                    label="Population actuelle"
                    value={
                      freezeResult.targeting.currentZoneSubscriberCount ?? 0
                    }
                  />
                  <FrozenMetric
                    label="Historique événement"
                    value={
                      freezeResult.targeting.historicalSubscriberCount ?? 0
                    }
                  />
                  <FrozenMetric
                    label="Chevauchement"
                    value={freezeResult.targeting.overlapSubscriberCount ?? 0}
                  />
                  <FrozenMetric
                    label="Personnes uniques"
                    value={freezeResult.targeting.uniqueTargetCount ?? 0}
                  />
                  <FrozenMetric
                    label="Supprimées"
                    value={
                      freezeResult.targeting
                        .revalidationSuppressedSubscriberCount ?? 0
                    }
                  />
                  <FrozenMetric
                    label="Délivrables"
                    value={
                      freezeResult.targeting.deliverableSubscriberCount ?? 0
                    }
                  />
                  <p>
                    La fin d’alerte tient compte des personnes précédemment
                    concernées ainsi que de la population actuellement ciblée.
                    Les abonnements et canaux sont revalidés avant diffusion.
                  </p>
                </div>
              )}

            <div
              style={{
                padding: 14,
                borderRadius: 10,
                backgroundColor: "#F8F9FA",
              }}
            >
              <ValidationRow label="Statut" value="READY" />

              <ValidationRow
                label="Type"
                value={alert.type === "TEST" ? "Test" : "Urgence réelle"}
              />

              <ValidationRow label="Référence" value={alert.id.slice(0, 8)} />
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 13,
              borderRadius: 9,
              backgroundColor: "#FDEDEC",
              color: "#922B21",
              fontSize: 10,
              lineHeight: 1.55,
            }}
          >
            <strong>Validation humaine requise.</strong>
            <br />
            <strong>Approuver :</strong> valide le contenu préparé pour la
            prochaine étape. Aucune communication n’est transmise.
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 14,
            }}
          >
            <WorkflowButton
              title={loading ? "Approbation..." : "Approuver l’alerte"}
              disabled={loading || !canApprove}
              onClick={onApprove}
              danger
            />
          </div>
        </div>
      )}

      {isReady && isApproved && !recipientsFrozen && (
        <div
          style={{
            marginTop: 18,
            padding: 20,
            borderRadius: 11,
            border: "1px solid #D5EDE7",
            backgroundColor: "#F3FAF8",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <CheckCircle2 size={24} color="#167D6A" style={{ flexShrink: 0 }} />

            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: "0 0 5px",
                  color: "#167D6A",
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                Approbation enregistrée
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#496A63",
                  fontSize: 10,
                  lineHeight: 1.55,
                }}
              >
                La validation humaine est enregistrée. L’étape suivante consiste
                à matérialiser et figer le roster exact des destinataires.
              </p>

              {alert.approvedAt && (
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#6C757D",
                    fontSize: 9,
                  }}
                >
                  Approbation :{" "}
                  {new Date(alert.approvedAt).toLocaleString("fr-CA")}
                </p>
              )}
            </div>
          </div>

          {!freezeConfirmationOpen ? (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 16,
              }}
            >
              <div data-resume-next-action="freeze-roster">
                <WorkflowButton
                  title="Préparer le roster de diffusion"
                  disabled={loading || !canPrepare}
                  onClick={onRequestFreeze}
                  primary
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                padding: 15,
                border: "1px solid #F5CBA7",
                borderRadius: 10,
                backgroundColor: "#FEF5E7",
              }}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: 6,
                  color: "#935116",
                  fontSize: 11,
                }}
              >
                Figer les destinataires ?
              </strong>

              <p
                style={{
                  margin: "0 0 12px",
                  color: "#7E5109",
                  fontSize: 9,
                  lineHeight: 1.55,
                }}
              >
                <strong>Confirmer et figer :</strong> détermine les abonnés
                compris dans les zones approuvées et rend leurs canaux immuables
                pour cette alerte. Aucune communication n’est transmise.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <WorkflowButton
                  title="Annuler"
                  disabled={loading || !canSend}
                  onClick={onCancelFreeze}
                />

                <WorkflowButton
                  title={loading ? "Préparation..." : "Confirmer et figer"}
                  disabled={loading}
                  onClick={onConfirmFreeze}
                  danger
                />
              </div>
            </div>
          )}
        </div>
      )}

      {recipientsFrozen && freezeResult && (
        <FrozenRecipientsPanel result={freezeResult} />
      )}

      {recipientsFrozen &&
        freezeResult &&
        alert.status === "READY" &&
        freezeResult.targeting.deliveryCount > 0 && (
          <div
            style={{
              marginTop: 18,
              padding: 20,
              border: "1px solid #F5CBA7",
              borderRadius: 11,
              backgroundColor: "#FFFBF5",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <RadioTower size={24} color="#C0392B" style={{ flexShrink: 0 }} />

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 5,
                    flexWrap: "wrap",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: "#2C3E50",
                      fontSize: 14,
                      fontWeight: 900,
                    }}
                  >
                    Diffusion prête
                  </h3>

                  <span
                    style={{
                      padding: "3px 7px",
                      borderRadius: 20,
                      backgroundColor:
                        alert.type === "EMERGENCY"
                          ? "#FDEDEC"
                          : alert.type === "TEST"
                            ? "#FEF9E7"
                            : "#F1F3F5",
                      color:
                        alert.type === "EMERGENCY"
                          ? "#C0392B"
                          : alert.type === "TEST"
                            ? "#B9770E"
                            : "#6C757D",
                      fontSize: 8,
                      fontWeight: 900,
                    }}
                  >
                    {alert.type === "EMERGENCY"
                      ? "URGENCE RÉELLE"
                      : alert.type === "TEST"
                        ? "TEST"
                        : alert.type === "UPDATE"
                          ? "MISE À JOUR"
                          : alert.type === "ALL_CLEAR"
                            ? "FIN D’ALERTE"
                            : "DIFFUSION"}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#6C757D",
                    fontSize: 10,
                    lineHeight: 1.55,
                  }}
                >
                  {deliveryMode === "LIVE"
                    ? "DIFFUSION RÉELLE — La prochaine action transmettra réellement les communications admissibles."
                    : "SIMULATION — La prochaine action exécutera la simulation. Aucune communication externe ne sera transmise."}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(130px, 100%), 1fr))",
                gap: 9,
                marginTop: 15,
              }}
            >
              <FrozenMetric
                label="Abonnés"
                value={freezeResult.targeting.subscriberCount}
              />

              <FrozenMetric
                label="Délivrables"
                value={freezeResult.targeting.deliverableCount}
              />

              <FrozenMetric
                label="SMS"
                value={freezeResult.targeting.deliverableSmsCount}
              />

              <FrozenMetric
                label="Courriels"
                value={freezeResult.targeting.deliverableEmailCount}
              />

              <FrozenMetric
                label="Supprimés / démo"
                value={freezeResult.targeting.suppressedCount}
              />
              {deliveryMode === "LIVE" && livePreflight && (
                <>
                  <FrozenMetric
                    label="Synthétiques"
                    value={livePreflight.synthetic}
                  />
                  <FrozenMetric
                    label="Retry pending"
                    value={livePreflight.retryPending}
                  />
                  <FrozenMetric
                    label="Réconciliation"
                    value={livePreflight.reconciliation}
                  />
                </>
              )}
            </div>

            <div
              style={{
                marginTop: 15,
                padding: 14,
                border: "1px solid #E9ECEF",
                borderRadius: 9,
                backgroundColor: "#FFFFFF",
              }}
            >
              <strong
                style={{
                  display: "block",
                  marginBottom: 7,
                  color: "#2C3E50",
                  fontSize: 11,
                }}
              >
                {alert.titleFR}
              </strong>

              <p
                style={{
                  margin: "0 0 8px",
                  color: "#6C757D",
                  fontSize: 9,
                }}
              >
                Scénario : {scenarioName} · Type : {alert.type} · Mode :{" "}
                {deliveryMode}
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#495057",
                  fontSize: 10,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {alert.messageFR}
              </p>

              {alert.instructionFR && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: "#FEF9E7",
                    color: "#7D6608",
                    fontSize: 9,
                    fontWeight: 800,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {alert.instructionFR}
                </div>
              )}
            </div>

            {!sendConfirmationOpen ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 16,
                }}
              >
                <WorkflowButton
                  title={
                    deliveryMode === "LIVE"
                      ? "Préparer la diffusion"
                      : "Préparer la simulation"
                  }
                  disabled={loading || !canSend || !liveSendReady}
                  onClick={onRequestSend}
                  danger
                />
              </div>
            ) : (
              <div
                style={{
                  marginTop: 16,
                  padding: 15,
                  border: "1px solid #E6B0AA",
                  borderRadius: 10,
                  backgroundColor: "#FDEDEC",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    marginBottom: 6,
                    color: "#922B21",
                    fontSize: 11,
                  }}
                >
                  {deliveryMode === "LIVE"
                    ? "Confirmer la diffusion LIVE ?"
                    : "Confirmer la simulation ?"}
                </strong>

                <p
                  style={{
                    margin: "0 0 12px",
                    color: "#922B21",
                    fontSize: 9,
                    lineHeight: 1.55,
                  }}
                >
                  {deliveryMode === "LIVE" ? (
                    <>
                      <strong>DIFFUSION RÉELLE.</strong> La prochaine action
                      transmettra réellement les communications admissibles.
                    </>
                  ) : (
                    <>
                      Vous êtes sur le point d’exécuter une simulation de
                      diffusion.{" "}
                      <strong>
                        Aucune communication externe ne sera transmise.
                      </strong>
                    </>
                  )}
                  <br />
                  <br />
                  <strong>
                    {freezeResult.targeting.subscriberCount.toLocaleString(
                      "fr-CA",
                    )}
                  </strong>{" "}
                  abonné(s) ciblé(s)
                  <br />
                  <strong>
                    {freezeResult.targeting.deliveryCount.toLocaleString(
                      "fr-CA",
                    )}
                  </strong>{" "}
                  communication(s) matérialisée(s)
                  <br />
                  <strong>
                    {freezeResult.targeting.deliverableCount.toLocaleString(
                      "fr-CA",
                    )}
                  </strong>{" "}
                  délivrable(s)
                  <br />
                  <strong>
                    {freezeResult.targeting.suppressedCount.toLocaleString(
                      "fr-CA",
                    )}
                  </strong>{" "}
                  communication(s) supprimée(s)
                  {deliveryMode === "LIVE" && (
                    <>
                      <br />
                      <strong>{livePreflight?.email ?? 0}</strong> courriel(s)
                      {" · "}
                      <strong>{livePreflight?.sms ?? 0}</strong> SMS
                      <br />
                      <strong>{livePreflight?.retryPending ?? 0}</strong> retry
                      pending {" · "}
                      <strong>{livePreflight?.reconciliation ?? 0}</strong>{" "}
                      réconciliation(s)
                      <br />
                      <br />
                      Cette confirmation déclenche la diffusion réelle. Elle ne
                      pourra pas être annulée pour les communications déjà
                      transmises au fournisseur.
                    </>
                  )}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <WorkflowButton
                    title="Annuler"
                    disabled={loading}
                    onClick={onCancelSend}
                  />

                  <WorkflowButton
                    title={
                      loading
                        ? "Diffusion..."
                        : deliveryMode === "LIVE"
                          ? "DIFFUSER L’ALERTE"
                          : "SIMULER LA DIFFUSION"
                    }
                    disabled={loading || !canSend || !liveSendReady}
                    onClick={onConfirmSend}
                    danger
                  />
                </div>
              </div>
            )}
          </div>
        )}

      {(alert.status === "SENDING" ||
        alert.status === "ACTIVE" ||
        alert.status === "FAILED") && (
        <PopulationDiffusionResult
          alert={alert}
          freezeResult={freezeResult}
          deliverySummary={deliverySummary}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid #E9ECEF",
        }}
      >
        <span
          style={{
            color: "#ADB5BD",
            fontSize: 8,
          }}
        >
          Référence CORO : {alert.id}
        </span>

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{
            padding: "8px 12px",
            border: "1px solid #E9ECEF",
            borderRadius: 8,
            backgroundColor: "#FFFFFF",
            color: "#6C757D",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 9,
            fontWeight: 800,
          }}
        >
          Retour au centre opérationnel
        </button>
      </div>
    </div>
  );
}

function PopulationDiffusionResult({
  alert,
  freezeResult,
  deliverySummary,
}: {
  alert: CreatedPopulationAlert;
  freezeResult: PopulationFreezeResult | null;
  deliverySummary: PopulationDeliverySummary | null;
}) {
  const isActive = alert.status === "ACTIVE";
  const isSending = alert.status === "SENDING";
  const proofSteps = [
    {
      label: "Créée",
      actorType: alert.createdByType,
      actorId: alert.createdById,
      at: alert.createdAt,
    },
    {
      label: "READY",
      actorType: alert.readyByType,
      actorId: alert.readyById,
      at: alert.readyAt,
    },
    {
      label: "Approuvée",
      actorType: alert.approvedByType,
      actorId: alert.approvedById,
      at: alert.approvedAt,
    },
    {
      label: "Roster figé",
      actorType: alert.frozenByType,
      actorId: alert.frozenById,
      at: alert.recipientsFrozenAt,
    },
    {
      label: "Diffusée",
      actorType: alert.sentByType,
      actorId: alert.sentById,
      at: alert.sendingAt,
    },
  ].filter((step) => step.at);
  const isFailed = alert.status === "FAILED";
  const isSandbox = alert.deliveryModeSnapshot === "SANDBOX";
  const sandboxSuppressedCount = freezeResult?.deliveries.filter(
    (delivery) =>
      delivery.status === "SUPPRESSED" &&
      delivery.suppressionReason === "SANDBOX_MODE",
  ).length;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginTop: 18,
        padding: 18,
        borderRadius: 11,
        border: isFailed
          ? "1px solid #F5B7B1"
          : isSending
            ? "1px solid #AED6F1"
            : "1px solid #D5EDE7",
        backgroundColor: isFailed
          ? "#FDEDEC"
          : isSending
            ? "#F4F9FC"
            : "#F3FAF8",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <RadioTower
          size={25}
          color={isFailed ? "#C0392B" : isSending ? "#2980B9" : "#167D6A"}
          style={{ flexShrink: 0 }}
        />

        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: "0 0 5px",
              color: isFailed ? "#922B21" : isSending ? "#1F618D" : "#167D6A",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            {isActive
              ? isSandbox
                ? "Simulation de diffusion exécutée"
                : "Diffusion déclenchée"
              : isSending
                ? "Diffusion en cours"
                : "Diffusion en échec"}
          </h3>

          <p
            style={{
              margin: 0,
              color: "#6C757D",
              fontSize: 10,
              lineHeight: 1.55,
            }}
          >
            {isActive
              ? isSandbox
                ? "Simulation terminée — aucune communication externe n’a été transmise."
                : "Au moins une communication a été acceptée par le fournisseur ou confirmée livrée."
              : isSending
                ? "CORO traite actuellement les communications du roster figé."
                : "Aucune communication n’a été acceptée ou confirmée livrée et aucun traitement n’est encore en attente."}
          </p>

          {isActive && isSandbox && sandboxSuppressedCount !== undefined && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 8,
                backgroundColor: "#FFFFFF",
                color: "#496A63",
                lineHeight: 1.5,
              }}
            >
              {sandboxSuppressedCount.toLocaleString("fr-CA")} communication(s)
              ont été supprimée(s) du transport externe conformément au mode
              SANDBOX.
            </div>
          )}

          {isActive && !isSandbox && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 8,
                backgroundColor: "#FFFFFF",
                color: "#6C757D",
                fontSize: 9,
                lineHeight: 1.5,
              }}
            >
              <strong>Important :</strong> le statut ACTIVE signifie qu’au moins
              une communication possède le statut SENT ou DELIVERED. SENT
              signifie que le fournisseur a accepté la communication; seul
              DELIVERED confirme sa livraison. ACTIVE ne signifie donc pas que
              toutes les communications ont été livrées.
            </div>
          )}

          {!isSandbox && deliverySummary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(115px, 100%), 1fr))",
                gap: 8,
                marginTop: 12,
              }}
            >
              <FrozenMetric
                label="Matérialisées"
                value={deliverySummary.counts.total}
              />
              <FrozenMetric
                label="Supprimées"
                value={deliverySummary.counts.suppressed}
              />
              <FrozenMetric
                label="En attente"
                value={deliverySummary.counts.queued}
              />
              <FrozenMetric
                label="En traitement"
                value={deliverySummary.counts.sending}
              />
              <FrozenMetric
                label="Acceptées fournisseur"
                value={deliverySummary.counts.sent}
              />
              <FrozenMetric
                label="Livrées destinataire"
                value={deliverySummary.counts.delivered}
              />
              <FrozenMetric
                label="Échecs"
                value={deliverySummary.counts.failed}
              />
              <FrozenMetric
                label="Retry pending"
                value={deliverySummary.counts.retryPending}
              />
              <FrozenMetric
                label="Réconciliation"
                value={deliverySummary.counts.reconciliationRequired}
              />
            </div>
          )}

          {proofSteps.length > 0 && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid #DEE2E6",
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  color: "#6C757D",
                  fontSize: 9,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Preuve opérateur
              </p>
              <div style={{ display: "grid", gap: 6 }}>
                {proofSteps.map((step) => (
                  <div
                    key={step.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      color: "#495057",
                      fontSize: 9,
                    }}
                  >
                    <span>
                      <strong>{step.label}</strong>
                      {step.actorId
                        ? ` · ${step.actorType ?? "ACTOR"} ${step.actorId}`
                        : ""}
                    </span>
                    <time dateTime={step.at ?? undefined}>
                      {step.at ? new Date(step.at).toLocaleString("fr-CA") : ""}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          )}

          <span
            style={{
              display: "inline-block",
              marginTop: 10,
              padding: "4px 8px",
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              color: isFailed ? "#C0392B" : isSending ? "#2980B9" : "#167D6A",
              fontSize: 8,
              fontWeight: 900,
            }}
          >
            {alert.status}
          </span>
        </div>
      </div>
    </div>
  );
}

function FrozenRecipientsPanel({ result }: { result: PopulationFreezeResult }) {
  const hasRecipients = result.targeting.deliveryCount > 0;
  const isSandbox = result.deliveryMode === "SANDBOX";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        marginTop: 18,
        overflow: "hidden",
        border: "1px solid #D5EDE7",
        borderRadius: 11,
        backgroundColor: "#FFFFFF",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: 17,
          backgroundColor: "#F3FAF8",
          borderBottom: "1px solid #D5EDE7",
        }}
      >
        <CheckCircle2 size={24} color="#167D6A" style={{ flexShrink: 0 }} />

        <div>
          <h3
            style={{
              margin: "0 0 4px",
              color: "#167D6A",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            Roster de diffusion figé
          </h3>

          <p
            style={{
              margin: 0,
              color: "#496A63",
              fontSize: 10,
              lineHeight: 1.5,
            }}
          >
            Les destinataires et leurs canaux sont maintenant matérialisés pour
            cette communication.
          </p>
        </div>
      </div>

      <div style={{ padding: 17 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(130px, 100%), 1fr))",
            gap: 9,
          }}
        >
          <FrozenMetric
            label="Abonnés ciblés"
            value={result.targeting.subscriberCount}
          />

          <FrozenMetric
            label="Communications"
            value={result.targeting.deliveryCount}
          />

          <FrozenMetric label="SMS" value={result.targeting.smsDeliveryCount} />

          <FrozenMetric
            label="Courriels"
            value={result.targeting.emailDeliveryCount}
          />
        </div>

        <div
          style={{
            marginTop: 13,
            padding: 11,
            borderRadius: 9,
            backgroundColor: hasRecipients ? "#F8F9FA" : "#FDEDEC",
            color: hasRecipients ? "#6C757D" : "#922B21",
            fontSize: 9,
            lineHeight: 1.55,
          }}
        >
          {hasRecipients ? (
            <>
              <strong>Aucune diffusion n’a encore été déclenchée.</strong>
              <br />
              {isSandbox ? (
                <>
                  Les {result.targeting.deliveryCount.toLocaleString("fr-CA")}{" "}
                  communications sont figées en mode simulation. Aucune n’est
                  placée en file de diffusion externe.
                  <br />
                  Communications matérialisées :{" "}
                  {result.targeting.deliveryCount.toLocaleString(
                    "fr-CA",
                  )} · Délivrables :{" "}
                  {result.targeting.deliverableCount.toLocaleString("fr-CA")} ·{" "}
                  Supprimées SANDBOX :{" "}
                  {result.targeting.suppressedCount.toLocaleString("fr-CA")}
                </>
              ) : (
                <>
                  Les {result.targeting.deliveryCount.toLocaleString("fr-CA")}{" "}
                  communications sont matérialisées. Leur état de transport est
                  celui retourné par le backend.
                </>
              )}
            </>
          ) : (
            <>
              <strong>Aucune communication à diffuser.</strong>
              <br />
              Le roster a été figé sans livraison SMS ou courriel.
            </>
          )}
        </div>

        <div
          style={{
            marginTop: 11,
            color: "#ADB5BD",
            fontSize: 8,
          }}
        >
          Roster figé le{" "}
          {new Date(result.recipientsFrozenAt).toLocaleString("fr-CA")}
        </div>
      </div>
    </div>
  );
}

function FrozenMetric({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #E9ECEF",
        borderRadius: 9,
        backgroundColor: "#FFFFFF",
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: 4,
          color: "#ADB5BD",
          fontSize: 8,
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#2C3E50",
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        {value.toLocaleString("fr-CA")}
      </strong>
    </div>
  );
}

function AlertWorkflowBar({
  status,
  approved,
  recipientsFrozen,
  diffusionStarted,
}: {
  status: string;
  approved: boolean;
  recipientsFrozen: boolean;
  diffusionStarted: boolean;
}) {
  const stages = [
    {
      label: "Brouillon",
      active: status === "DRAFT",
      completed: status !== "DRAFT",
    },
    {
      label: "READY",
      active: status === "READY" && !approved,
      completed: approved,
    },
    {
      label: "Approuvée",
      active: approved && !recipientsFrozen,
      completed: recipientsFrozen,
    },
    {
      label: "Destinataires",
      active: recipientsFrozen && !diffusionStarted,
      completed: diffusionStarted,
    },
    {
      label: "Diffusion",
      active: diffusionStarted,
      completed: false,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(90px, 1fr))",
        gap: 5,
        marginTop: 14,
        overflowX: "auto",
      }}
    >
      <p
        style={{
          gridColumn: "1 / -1",
          margin: 0,
          color: "#6C757D",
          fontWeight: 800,
        }}
      >
        Cycle de diffusion · état serveur
      </p>
      {stages.map((stage) => (
        <div key={stage.label}>
          <div
            style={{
              height: 4,
              marginBottom: 6,
              borderRadius: 4,
              backgroundColor:
                stage.active || stage.completed ? "#167D6A" : "#E9ECEF",
            }}
          />

          <span
            style={{
              color: stage.active
                ? "#167D6A"
                : stage.completed
                  ? "#6C757D"
                  : "#ADB5BD",
              fontSize: 8,
              fontWeight: stage.active ? 900 : 700,
            }}
          >
            {stage.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function WorkflowButton({
  title,
  disabled,
  onClick,
  primary = false,
  danger = false,
}: {
  title: string;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  const backgroundColor = danger ? "#C0392B" : primary ? "#167D6A" : "#FFFFFF";

  const color = danger || primary ? "#FFFFFF" : "#495057";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "9px 14px",
        border: danger || primary ? "none" : "1px solid #E9ECEF",
        borderRadius: 8,
        backgroundColor,
        color,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        fontSize: 9,
        fontWeight: 900,
      }}
    >
      {title}
    </button>
  );
}

function StepTitle({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p
        style={{
          margin: "0 0 4px",
          color: "#167D6A",
          fontSize: 9,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {eyebrow}
      </p>

      <h3
        style={{
          margin: "0 0 4px",
          color: "#2C3E50",
          fontSize: 15,
          fontWeight: 900,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#ADB5BD",
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        {detail}
      </p>
    </div>
  );
}

function ValidationRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid #E9ECEF",
      }}
    >
      <span
        style={{
          color: "#ADB5BD",
          fontSize: 9,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#2C3E50",
          fontSize: 9,
          textAlign: "right",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        padding: 13,
        borderRadius: 9,
        backgroundColor: warning ? "#FEF9E7" : "#F8F9FA",
        border: warning ? "1px solid #F7DC6F" : "1px solid #F1F3F5",
      }}
    >
      <strong
        style={{
          display: "block",
          marginBottom: 3,
          color: warning ? "#B9770E" : "#2C3E50",
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        {value.toLocaleString("fr-CA")}
      </strong>

      <span
        style={{
          color: warning ? "#CA8F3D" : "#ADB5BD",
          fontSize: 9,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function ConfigurationSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: 20,
        paddingBottom: 20,
        borderBottom: "1px solid #F1F3F5",
      }}
    >
      <h3
        style={{
          margin: "0 0 13px",
          color: "#2C3E50",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {title}
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
          gap: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ConfigurationField({
  label,
  value,
  onChange,
  placeholder = "",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <span
        style={{
          color: "#6C757D",
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        {label}
        {required && <span style={{ color: "#C0392B" }}> *</span>}
      </span>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          padding: "10px 11px",
          border: "1px solid #DEE2E6",
          borderRadius: 8,
          outline: "none",
          color: "#2C3E50",
          backgroundColor: "#FFFFFF",
          fontSize: 12,
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}

function ConfigurationTextarea({
  label,
  value,
  onChange,
  required = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <span
        style={{
          color: "#6C757D",
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        {label}
        {required && <span style={{ color: "#C0392B" }}> *</span>}
      </span>

      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          padding: "10px 11px",
          resize: "vertical",
          border: "1px solid #DEE2E6",
          borderRadius: 8,
          outline: "none",
          color: "#2C3E50",
          backgroundColor: "#FFFFFF",
          fontFamily: "inherit",
          fontSize: 12,
          lineHeight: 1.5,
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}

function ConfigurationToggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        padding: 13,
        border: "1px solid #E9ECEF",
        borderRadius: 9,
        cursor: "pointer",
      }}
    >
      <span>
        <span
          style={{
            display: "block",
            marginBottom: 3,
            color: "#2C3E50",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {label}
        </span>

        <span
          style={{
            display: "block",
            color: "#ADB5BD",
            fontSize: 9,
            lineHeight: 1.45,
          }}
        >
          {detail}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{
          width: 17,
          height: 17,
          flexShrink: 0,
          accentColor: "#167D6A",
          cursor: "pointer",
        }}
      />
    </label>
  );
}

function LifecycleButton({
  title,
  detail,
  loading,
  disabled,
  onClick,
  primary = false,
  warning = false,
}: {
  title: string;
  detail: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
  warning?: boolean;
}) {
  const backgroundColor = primary ? "#167D6A" : warning ? "#FEF5E7" : "#F8F9FA";

  const borderColor = primary ? "#167D6A" : warning ? "#F5CBA7" : "#E9ECEF";

  const textColor = primary ? "#FFFFFF" : warning ? "#B9770E" : "#2C3E50";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        marginBottom: 9,
        padding: "11px 13px",
        borderRadius: 9,
        border: `1px solid ${borderColor}`,
        backgroundColor,
        color: textColor,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: 2,
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {loading ? "Traitement..." : title}
      </span>

      <span
        style={{
          display: "block",
          color: primary ? "#CDE5DF" : warning ? "#CA8F3D" : "#ADB5BD",
          fontSize: 9,
          lineHeight: 1.45,
        }}
      >
        {detail}
      </span>
    </button>
  );
}

function ActionButton({
  icon,
  title,
  detail,
  primary = false,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={styles.actionButton}
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 11,
        marginBottom: 9,
        padding: "12px 13px",
        borderRadius: 9,
        border: primary ? "none" : "1px solid #E9ECEF",
        backgroundColor: disabled ? "#E9ECEF" : primary ? "#167D6A" : "#FFFFFF",
        color: disabled ? "#6C757D" : primary ? "#FFFFFF" : "#2C3E50",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>

      <span style={{ flex: 1 }}>
        <span
          style={{
            display: "block",
            marginBottom: 2,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {title}
        </span>

        <span
          style={{
            display: "block",
            color: disabled ? "#6C757D" : primary ? "#CDE5DF" : "#ADB5BD",
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          {detail}
        </span>
      </span>

      <ChevronRight
        size={14}
        color={disabled ? "#6C757D" : primary ? "#FFFFFF" : "#ADB5BD"}
      />
    </button>
  );
}
