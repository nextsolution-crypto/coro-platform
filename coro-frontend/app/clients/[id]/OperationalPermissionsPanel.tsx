"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import {
  applyOperationalPermissionPreset,
  CORRECTIVE_ACTION_PERMISSIONS,
  OPERATIONAL_PERMISSION_PRESETS,
  REVIEW_PERMISSIONS,
  type CorrectiveActionPermission,
  type OperationalPermissionPreset,
  type ReviewPermission,
} from "./operationalPermissionPresets";

const INCIDENT_PERMISSIONS = [
  "INCIDENT_READ",
  "INCIDENT_SUPERVISE",
  "INCIDENT_COMMAND",
] as const;
type IncidentPermission = (typeof INCIDENT_PERMISSIONS)[number];
interface ClientUserPermissions {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  buildingIds: string[];
  operationalReviewPermissions: ReviewPermission[];
  correctiveActionPermissions: CorrectiveActionPermission[];
  incidentPermissions: IncidentPermission[];
}
interface IncidentAssignment {
  id: string;
  buildingId: string;
  incidentEventId: string | null;
  operationalRole: string;
  permissions: IncidentPermission[];
  effectivePermissions: IncidentPermission[];
  status: "ACTIVE" | "REVOKED";
  lockVersion: number;
}
interface IncidentBuilding {
  id: string;
  name: string;
  incidents: Array<{ id: string; type: string; status: string }>;
}
interface IncidentAuthorizationResponse {
  user: ClientUserPermissions;
  buildings: IncidentBuilding[];
  assignments: IncidentAssignment[];
  supportedDates: boolean;
}

const reviewLabels: Record<ReviewPermission, string> = {
  REX_CREATE: "Créer un REX",
  REX_EDIT: "Modifier un REX",
  REX_REVIEW: "Réviser les constats et recommandations",
  REX_FINALIZE: "Finaliser un REX",
};
const correctiveLabels: Record<CorrectiveActionPermission, string> = {
  CORRECTIVE_ACTION_CREATE: "Créer une action",
  CORRECTIVE_ACTION_EDIT: "Modifier ou assigner une action",
  CORRECTIVE_ACTION_COMPLETE: "Déclarer une action réalisée",
  CORRECTIVE_ACTION_VERIFY: "Vérifier une réalisation",
  CORRECTIVE_ACTION_CLOSE: "Fermer une action",
  CORRECTIVE_ACTION_REPORT_GENERATE: "Générer un suivi des actions",
};
const incidentLabels: Record<IncidentPermission, string> = {
  INCIDENT_READ: "Consulter les incidents",
  INCIDENT_SUPERVISE: "Superviser les tâches et la chronologie",
  INCIDENT_COMMAND: "Commander le cycle de vie de l’incident",
};
const presetLabels: Record<OperationalPermissionPreset, string> = {
  READ_ONLY: "Lecture seule",
  REX: "REX",
  CORRECTIVE_ACTIONS: "Actions correctives",
  VERIFICATION: "Vérification",
  RESILIENCE_MANAGER: "Responsable résilience",
};

export default function OperationalPermissionsPanel({
  clientId,
  endpointBase,
}: {
  clientId: string;
  endpointBase?: string;
}) {
  const [users, setUsers] = useState<ClientUserPermissions[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [review, setReview] = useState<ReviewPermission[]>([]);
  const [corrective, setCorrective] = useState<CorrectiveActionPermission[]>(
    [],
  );
  const [incidentData, setIncidentData] =
    useState<IncidentAuthorizationResponse | null>(null);
  const [incidentPermissions, setIncidentPermissions] = useState<
    IncidentPermission[]
  >([]);
  const [permissionReason, setPermissionReason] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [incidentEventId, setIncidentEventId] = useState("");
  const [operationalRole, setOperationalRole] = useState("Lecteur Incident");
  const [grantPermissions, setGrantPermissions] = useState<
    IncidentPermission[]
  >(["INCIDENT_READ"]);
  const [grantReason, setGrantReason] = useState("");
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [incidentSaving, setIncidentSaving] = useState(false);
  const basePath = endpointBase ?? `/clients/${clientId}`;
  const selectedBuilding = useMemo(
    () =>
      incidentData?.buildings.find((building) => building.id === buildingId),
    [incidentData, buildingId],
  );

  useEffect(() => {
    api
      .get(`${basePath}/client-users`)
      .then(({ data }) => {
        setUsers(data);
        if (data[0]) setSelectedId(data[0].id);
      })
      .catch(() => toast("Impossible de charger les comptes client.", "error"))
      .finally(() => setLoading(false));
  }, [basePath]);
  useEffect(() => {
    const selected = users.find((item) => item.id === selectedId);
    if (selected) {
      setReview([...selected.operationalReviewPermissions]);
      setCorrective([...selected.correctiveActionPermissions]);
    }
  }, [selectedId, users]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setIncidentLoading(true);
    api
      .get(`${basePath}/client-users/${selectedId}/incident-authorizations`)
      .then(({ data }) => {
        if (!active) return;
        setIncidentData(data);
        setIncidentPermissions([...data.user.incidentPermissions]);
        setBuildingId(data.buildings[0]?.id ?? "");
        setIncidentEventId("");
        setPermissionReason("");
      })
      .catch(() => {
        if (active)
          toast("Impossible de charger les autorisations Incident.", "error");
      })
      .finally(() => {
        if (active) setIncidentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [basePath, selectedId]);

  const toggle = <T extends string>(
    value: T,
    current: T[],
    setCurrent: (next: T[]) => void,
  ) =>
    setCurrent(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  const applyPreset = (preset: OperationalPermissionPreset) => {
    const next = applyOperationalPermissionPreset(preset);
    setReview(next.review);
    setCorrective(next.corrective);
  };
  const reloadIncident = async () => {
    const { data } = await api.get(
      `${basePath}/client-users/${selectedId}/incident-authorizations`,
    );
    setIncidentData(data);
    setIncidentPermissions([...data.user.incidentPermissions]);
    setUsers((current) =>
      current.map((item) =>
        item.id === selectedId
          ? { ...item, incidentPermissions: data.user.incidentPermissions }
          : item,
      ),
    );
  };
  const save = async () => {
    if (!selectedId) return;
    const targetId = selectedId;
    setSaving(true);
    try {
      const requested = {
        operationalReviewPermissions: [...review],
        correctiveActionPermissions: [...corrective],
      };
      await api.put(
        `${basePath}/client-users/${targetId}/operational-permissions`,
        requested,
      );
      const { data } = await api.get(
        `${basePath}/client-users/${targetId}/operational-permissions`,
      );
      if (
        data.id !== targetId ||
        requested.operationalReviewPermissions.some(
          (permission) =>
            !data.operationalReviewPermissions.includes(permission),
        ) ||
        requested.correctiveActionPermissions.some(
          (permission) =>
            !data.correctiveActionPermissions.includes(permission),
        ) ||
        data.operationalReviewPermissions.length !==
          requested.operationalReviewPermissions.length ||
        data.correctiveActionPermissions.length !==
          requested.correctiveActionPermissions.length
      )
        throw new Error(
          "La relecture du serveur ne confirme pas les permissions demandées.",
        );
      setUsers((current) =>
        current.map((item) =>
          item.id === targetId ? { ...item, ...data } : item,
        ),
      );
      toast("Permissions opérationnelles mises à jour.");
    } catch (error: unknown) {
      showError(error, "La mise à jour a échoué.");
    } finally {
      setSaving(false);
    }
  };
  const saveIncidentPermissions = async () => {
    if (!incidentData || !permissionReason.trim())
      return toast("Un motif est obligatoire.", "error");
    setIncidentSaving(true);
    try {
      await api.put(
        `${basePath}/client-users/${selectedId}/incident-permissions`,
        {
          permissions: incidentPermissions,
          expectedPermissions: incidentData.user.incidentPermissions,
          reason: permissionReason,
        },
      );
      await reloadIncident();
      setPermissionReason("");
      toast("Permissions Incident mises à jour.");
    } catch (error: unknown) {
      showError(error, "La mise à jour Incident a échoué.");
    } finally {
      setIncidentSaving(false);
    }
  };
  const grantIncidentAuthority = async () => {
    if (
      !buildingId ||
      !operationalRole.trim() ||
      !grantReason.trim() ||
      grantPermissions.length === 0
    )
      return toast(
        "Bâtiment, rôle, permissions et motif sont obligatoires.",
        "error",
      );
    setIncidentSaving(true);
    try {
      const key = `incident_${crypto.randomUUID().replaceAll("-", "")}`;
      await api.post(
        `${basePath}/client-users/${selectedId}/incident-authorizations`,
        {
          buildingId,
          incidentEventId: incidentEventId || undefined,
          operationalRole,
          permissions: grantPermissions,
          reason: grantReason,
        },
        { headers: { "Idempotency-Key": key } },
      );
      await reloadIncident();
      setGrantReason("");
      toast("Autorité Incident attribuée.");
    } catch (error: unknown) {
      showError(error, "L’attribution a échoué.");
    } finally {
      setIncidentSaving(false);
    }
  };
  const revokeIncidentAuthority = async (assignment: IncidentAssignment) => {
    const reason = revokeReasons[assignment.id]?.trim();
    if (!reason)
      return toast("Un motif de révocation est obligatoire.", "error");
    if (
      !window.confirm(
        "Révoquer cette affectation Incident? L’accès sera retiré dès la prochaine requête.",
      )
    )
      return;
    setIncidentSaving(true);
    try {
      await api.put(
        `${basePath}/client-users/${selectedId}/incident-authorizations/${assignment.id}/revoke`,
        { reason, lockVersion: assignment.lockVersion },
      );
      await reloadIncident();
      setRevokeReasons((current) => ({ ...current, [assignment.id]: "" }));
      toast("Affectation Incident révoquée.");
    } catch (error: unknown) {
      showError(error, "La révocation a échoué.");
    } finally {
      setIncidentSaving(false);
    }
  };

  return (
    <section
      className="rounded-md p-4 sm:p-6"
      style={{ background: "#FFFFFF", border: "1px solid #E9ECEF" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={19} color="#C0392B" />
        <h3 className="font-semibold" style={{ color: "#2C3E50" }}>
          Permissions opérationnelles
        </h3>
      </div>
      <p className="text-xs mb-5" style={{ color: "#6C757D" }}>
        Les permissions sont individuelles. Elles s&apos;ajoutent aux accès
        client et bâtiments existants.
      </p>
      {loading ? (
        <p className="text-sm">Chargement...</p>
      ) : users.length === 0 ? (
        <p className="text-sm" style={{ color: "#6C757D" }}>
          Aucun compte client.
        </p>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Compte client
            </label>
            <select
              className="w-full rounded px-3 py-2 text-sm min-h-11"
              style={{ border: "1px solid #CED4DA" }}
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName} · {item.email}
                  {!item.isActive ? " · Inactif" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Préréglages</p>
            <div className="flex flex-wrap gap-2">
              {(
                Object.keys(
                  OPERATIONAL_PERMISSION_PRESETS,
                ) as OperationalPermissionPreset[]
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded px-3 py-2 text-xs font-semibold min-h-11"
                  style={{
                    border: "1px solid #CED4DA",
                    background: "#F8F9FA",
                    color: "#2C3E50",
                  }}
                >
                  {presetLabels[preset]}
                </button>
              ))}
            </div>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold mb-2">
              Retour d&apos;expérience
            </legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {REVIEW_PERMISSIONS.map((permission) => (
                <PermissionCheckbox
                  key={permission}
                  label={reviewLabels[permission]}
                  checked={review.includes(permission)}
                  onChange={() => toggle(permission, review, setReview)}
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold mb-2">
              Actions correctives
            </legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {CORRECTIVE_ACTION_PERMISSIONS.map((permission) => (
                <PermissionCheckbox
                  key={permission}
                  label={correctiveLabels[permission]}
                  checked={corrective.includes(permission)}
                  control={
                    permission === "CORRECTIVE_ACTION_VERIFY" ||
                    permission === "CORRECTIVE_ACTION_CLOSE"
                  }
                  onChange={() => toggle(permission, corrective, setCorrective)}
                />
              ))}
            </div>
          </fieldset>
          <p
            className="rounded p-3 text-xs"
            style={{
              background: "#FFF8E1",
              color: "#6D5200",
              border: "1px solid #F1D98A",
            }}
          >
            Vérifier et fermer sont des permissions de contrôle. CORO interdit
            l&apos;auto-vérification par le responsable de l&apos;action ou
            l&apos;acteur ayant déclaré sa réalisation.
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 min-h-11"
            style={{ background: "#C0392B" }}
          >
            {saving ? "Enregistrement..." : "Enregistrer les permissions"}
          </button>
          <section
            className="rounded-md p-4 sm:p-5 space-y-5"
            style={{ border: "1px solid #D8E2EA", background: "#F8FAFC" }}
            aria-labelledby="incident-authority-title"
          >
            <div>
              <h4
                id="incident-authority-title"
                className="font-semibold"
                style={{ color: "#2C3E50" }}
              >
                Autorisations Incident
              </h4>
              <p className="text-xs mt-1" style={{ color: "#5F6B76" }}>
                L’accès exige les deux niveaux : une permission individuelle et
                une affectation active au bâtiment ou à l’incident. La
                permission COMMAND ne permet jamais de déléguer.
              </p>
            </div>
            {incidentLoading || !incidentData ? (
              <p className="text-sm">
                Chargement des autorisations Incident...
              </p>
            ) : (
              <>
                {!incidentData.user.isActive && (
                  <p
                    role="alert"
                    className="rounded p-3 text-sm"
                    style={{ color: "#842029", background: "#F8D7DA" }}
                  >
                    Ce compte est inactif. Aucune autorisation ne sera
                    effective.
                  </p>
                )}
                <fieldset>
                  <legend className="text-sm font-semibold mb-2">
                    Permissions individuelles
                  </legend>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {INCIDENT_PERMISSIONS.map((permission) => (
                      <PermissionCheckbox
                        key={permission}
                        label={incidentLabels[permission]}
                        checked={incidentPermissions.includes(permission)}
                        control={permission !== "INCIDENT_READ"}
                        onChange={() =>
                          toggle(
                            permission,
                            incidentPermissions,
                            setIncidentPermissions,
                          )
                        }
                      />
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm font-medium">
                  Motif de modification
                  <input
                    value={permissionReason}
                    onChange={(event) =>
                      setPermissionReason(event.target.value)
                    }
                    maxLength={500}
                    className="mt-1 w-full rounded px-3 py-2 min-h-11"
                    style={{
                      border: "1px solid #CED4DA",
                      background: "#FFFFFF",
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveIncidentPermissions()}
                  disabled={incidentSaving || !incidentData.user.isActive}
                  className="rounded px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 min-h-11"
                  style={{ background: "#2C3E50" }}
                >
                  Enregistrer les permissions Incident
                </button>
                <div
                  className="rounded-md p-4 space-y-3"
                  style={{ border: "1px solid #CED4DA", background: "#FFFFFF" }}
                >
                  <h5 className="font-semibold text-sm">
                    Nouvelle affectation
                  </h5>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="text-sm font-medium">
                      Bâtiment
                      <select
                        value={buildingId}
                        onChange={(event) => {
                          setBuildingId(event.target.value);
                          setIncidentEventId("");
                        }}
                        className="mt-1 w-full rounded px-3 py-2 min-h-11"
                        style={{ border: "1px solid #CED4DA" }}
                      >
                        <option value="">Sélectionner</option>
                        {incidentData.buildings.map((building) => (
                          <option key={building.id} value={building.id}>
                            {building.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Portée
                      <select
                        value={incidentEventId}
                        onChange={(event) =>
                          setIncidentEventId(event.target.value)
                        }
                        className="mt-1 w-full rounded px-3 py-2 min-h-11"
                        style={{ border: "1px solid #CED4DA" }}
                      >
                        <option value="">Tout le bâtiment</option>
                        {selectedBuilding?.incidents.map((incident) => (
                          <option key={incident.id} value={incident.id}>
                            {incident.type} · {incident.status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Rôle opérationnel
                      <input
                        value={operationalRole}
                        onChange={(event) =>
                          setOperationalRole(event.target.value)
                        }
                        maxLength={120}
                        className="mt-1 w-full rounded px-3 py-2 min-h-11"
                        style={{ border: "1px solid #CED4DA" }}
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Motif d’attribution
                      <input
                        value={grantReason}
                        onChange={(event) => setGrantReason(event.target.value)}
                        maxLength={500}
                        className="mt-1 w-full rounded px-3 py-2 min-h-11"
                        style={{ border: "1px solid #CED4DA" }}
                      />
                    </label>
                  </div>
                  <fieldset>
                    <legend className="text-sm font-medium mb-2">
                      Permissions de l’affectation
                    </legend>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {INCIDENT_PERMISSIONS.map((permission) => (
                        <PermissionCheckbox
                          key={permission}
                          label={incidentLabels[permission]}
                          checked={grantPermissions.includes(permission)}
                          onChange={() =>
                            toggle(
                              permission,
                              grantPermissions,
                              setGrantPermissions,
                            )
                          }
                        />
                      ))}
                    </div>
                  </fieldset>
                  <button
                    type="button"
                    onClick={() => void grantIncidentAuthority()}
                    disabled={incidentSaving || !incidentData.user.isActive}
                    className="rounded px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 min-h-11"
                    style={{ background: "#C0392B" }}
                  >
                    Attribuer l’autorité
                  </button>
                </div>
                <div>
                  <h5 className="font-semibold text-sm mb-2">
                    Affectations et accès effectif
                  </h5>
                  {incidentData.assignments.length === 0 ? (
                    <p className="text-sm" style={{ color: "#6C757D" }}>
                      Aucune affectation Incident.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {incidentData.assignments.map((assignment) => (
                        <article
                          key={assignment.id}
                          className="rounded-md p-3"
                          style={{
                            border: "1px solid #CED4DA",
                            background: "#FFFFFF",
                          }}
                        >
                          <p className="text-sm font-semibold">
                            {incidentData.buildings.find(
                              (building) =>
                                building.id === assignment.buildingId,
                            )?.name ?? "Bâtiment indisponible"}{" "}
                            ·{" "}
                            {assignment.incidentEventId
                              ? "Incident ciblé"
                              : "Portée bâtiment"}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{ color: "#5F6B76" }}
                          >
                            {assignment.operationalRole} ·{" "}
                            {assignment.status === "ACTIVE"
                              ? "Active"
                              : "Révoquée"}
                          </p>
                          <p className="text-xs mt-1">
                            <strong>Attribuées :</strong>{" "}
                            {assignment.permissions
                              .map((permission) => incidentLabels[permission])
                              .join(", ")}
                          </p>
                          <p className="text-xs mt-1">
                            <strong>Effectives :</strong>{" "}
                            {assignment.effectivePermissions.length
                              ? assignment.effectivePermissions
                                  .map(
                                    (permission) => incidentLabels[permission],
                                  )
                                  .join(", ")
                              : "Aucune"}
                          </p>
                          {assignment.status === "ACTIVE" && (
                            <div className="mt-3 flex flex-col sm:flex-row gap-2">
                              <label
                                className="sr-only"
                                htmlFor={`revoke-${assignment.id}`}
                              >
                                Motif de révocation
                              </label>
                              <input
                                id={`revoke-${assignment.id}`}
                                placeholder="Motif de révocation"
                                value={revokeReasons[assignment.id] ?? ""}
                                onChange={(event) =>
                                  setRevokeReasons((current) => ({
                                    ...current,
                                    [assignment.id]: event.target.value,
                                  }))
                                }
                                maxLength={500}
                                className="flex-1 rounded px-3 py-2 min-h-11"
                                style={{ border: "1px solid #CED4DA" }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void revokeIncidentAuthority(assignment)
                                }
                                disabled={incidentSaving}
                                className="rounded px-4 py-2 text-sm font-semibold min-h-11"
                                style={{
                                  color: "#842029",
                                  border: "1px solid #DC3545",
                                  background: "#FFFFFF",
                                }}
                              >
                                Révoquer
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                {!incidentData.supportedDates && (
                  <p className="text-xs" style={{ color: "#6C757D" }}>
                    Les dates d’effet et d’expiration ne sont pas supportées par
                    le modèle actuel. Les affectations prennent effet
                    immédiatement et restent actives jusqu’à révocation.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function PermissionCheckbox({
  label,
  checked,
  onChange,
  control = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  control?: boolean;
}) {
  return (
    <label
      className="flex items-start gap-2 rounded p-3 text-sm min-h-11"
      style={{
        border: `1px solid ${control ? "#E6C75A" : "#E9ECEF"}`,
        background: control ? "#FFFCED" : "#FFFFFF",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5"
      />
      <span>
        {label}
        {control && (
          <small
            className="block mt-1 font-semibold"
            style={{ color: "#806600" }}
          >
            Permission sensible
          </small>
        )}
      </span>
    </label>
  );
}
function showError(error: unknown, fallback: string) {
  const response = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message =
    response.response?.data?.message ?? response.message ?? fallback;
  toast(Array.isArray(message) ? message[0] : message, "error");
}
