"use client";
import { sessionMarker } from '@/lib/session';

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import api from "@/lib/api";
import AppLayout from "@/components/layout/AppLayout";
import WorkScheduleEditorPanel from "@/components/WorkScheduleEditorPanel";
import InfoTip from '@/components/ui/InfoTip';

interface TeamUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  displayPermissions: string[];
  planningCoordinator?: boolean;
  displayBuildingIds: string[];
  createdAt: string;
}

interface BuildingOption {
  id: string;
  name: string;
  city?: string;
}

const displayPermissionOptions = [
  ["DISPLAY_READ", "Ouvrir CORO Display"],
  ["DISPLAY_DEVICE_MANAGE", "Gérer les écrans et activations"],
  ["DISPLAY_CONTENT_MANAGE", "Gérer les contenus"],
  ["DISPLAY_PLAN_READ", "Consulter les plans"],
  ["DISPLAY_PLAN_CREATE", "Créer une publication"],
  ["DISPLAY_PLAN_REVIEW", "Réviser une publication"],
  ["DISPLAY_PLAN_APPROVE", "Approuver une publication"],
  ["DISPLAY_PLAN_PUBLISH", "Publier une version approuvée"],
  ["DISPLAY_PLAN_REVOKE", "Révoquer une publication"],
  ["DISPLAY_AUDIT_READ", "Consulter le journal Display"],
] as const;

const displayProfessionalProfiles = [
  {
    id: "CREATOR",
    label: "Créateur / Mise à jour",
    description:
      "Créer, mettre à jour, vérifier l’aperçu et soumettre un plan.",
    permissions: [
      "DISPLAY_READ",
      "DISPLAY_PLAN_READ",
      "DISPLAY_CONTENT_MANAGE",
      "DISPLAY_PLAN_CREATE",
    ],
  },
  {
    id: "APPROVER",
    label: "Réviseur / Approbateur",
    description:
      "Examiner, demander une correction, approuver et publier un plan.",
    permissions: [
      "DISPLAY_READ",
      "DISPLAY_PLAN_READ",
      "DISPLAY_PLAN_REVIEW",
      "DISPLAY_PLAN_APPROVE",
      "DISPLAY_PLAN_PUBLISH",
      "DISPLAY_AUDIT_READ",
    ],
  },
] as const;

const displayWorkflowPermissions = new Set<string>(
  displayProfessionalProfiles.flatMap((profile) => [...profile.permissions]),
);

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super-admin",
  ADMIN: "Administrateur",
  OPERATOR: "Conseiller",
};

export default function TeamUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth, logout } = useAuthStore();

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [planningUserId, setPlanningUserId] = useState("");
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [displayUser, setDisplayUser] = useState<TeamUser | null>(null);
  const [displayPermissions, setDisplayPermissions] = useState<string[]>([]);
  const [displayBuildingIds, setDisplayBuildingIds] = useState<string[]>([]);
  const [displayReason, setDisplayReason] = useState("");
  const [savingDisplay, setSavingDisplay] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "OPERATOR",
  });

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) setShowModal(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showModal, creating]);

  async function fetchData() {
    setLoading(true);
    setLoadError("");
    try {
      const [usersRes, orgRes, buildingsRes] = await Promise.all([
        api.get("/users/organization"),
        api.get("/organizations/me/info"),
        api.get("/buildings"),
      ]);
      setUsers(usersRes.data);
      setBuildings(buildingsRes.data);

      const limits: Record<string, number | null> = {
        ESSAI_GRATUIT: 1,
        STANDARD: null,
        ENTREPRISE: null,
      };
      setMaxUsers(limits[orgRes.data.licenseType] ?? null);
    } catch {
      setLoadError(
        "Impossible de charger les membres. Vérifiez votre connexion puis réessayez.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
        router.push("/dashboard");
        return;
      }
      // Authentication state is the external source that triggers this load.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    } else {
      const token = sessionMarker();
      if (!token) router.push("/login");
    }
  }, [isAuthenticated, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.post("/users/organization", {
        ...form,
        requestId: crypto.randomUUID(),
      });
      setShowModal(false);
      setForm({ firstName: "", lastName: "", email: "", role: "OPERATOR" });
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || "Erreur lors de la création.");
    } finally {
      setCreating(false);
    }
  };

  const openDisplayAuthority = (member: TeamUser) => {
    setDisplayUser(member);
    setDisplayPermissions(member.displayPermissions || []);
    setDisplayBuildingIds(member.displayBuildingIds || []);
    setDisplayReason("");
    setError("");
  };

  const applyDisplayProfessionalProfile = (permissions: readonly string[]) => {
    setDisplayPermissions((current) => [
      ...current.filter(
        (permission) => !displayWorkflowPermissions.has(permission),
      ),
      ...permissions,
    ]);
  };

  const saveDisplayAuthority = async () => {
    if (!displayUser || savingDisplay) return;
    if (displayReason.trim().length < 10) {
      setError(
        "La justification Display doit contenir au moins 10 caractères.",
      );
      return;
    }
    setSavingDisplay(true);
    setError("");
    try {
      await api.put(`/users/organization/${displayUser.id}/display-authority`, {
        displayPermissions,
        displayBuildingIds,
        reason: displayReason.trim(),
      });
      const updatedCurrentUser = displayUser.id === user?.id;
      setDisplayUser(null);
      if (updatedCurrentUser) {
        logout();
        router.push("/login?reason=display-authority-updated");
        return;
      }
      await fetchData();
    } catch (err: unknown) {
      const candidate = err as { response?: { data?: { message?: string } } };
      setError(
        candidate.response?.data?.message ||
          "Impossible de modifier les autorités Display.",
      );
    } finally {
      setSavingDisplay(false);
    }
  };

  const handleResendInvite = async (u: TeamUser) => {
    if (
      !confirm(
        `Créer un nouveau lien d'activation pour ${u.firstName} ${u.lastName} ? L'accès actuel ne sera pas modifié tant que le lien n'est pas utilisé.`,
      )
    )
      return;
    try {
      await api.post(`/users/organization/${u.id}/resend-invite`, {
        requestId: crypto.randomUUID(),
      });
      alert(
        `Invitation enregistrée pour ${u.email}. L'envoi est en attente de traitement.`,
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || "Erreur lors de l'envoi.");
    }
  };

  const handlePlanningCoordinator = async (userId: string, enabled: boolean) => {
    try {
      await api.put(`/users/organization/${userId}/planning-coordinator`, { enabled });
      await fetchData();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : "Impossible de modifier ce droit.";
      window.alert(message);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    let reason: string | undefined;
    if (!isActive) {
      const enteredReason = window.prompt(
        "Indiquez le motif de la désactivation. Ce motif sera conservé dans le journal d’audit.",
      );
      if (enteredReason === null) return;
      reason = enteredReason.trim();
      if (!reason) {
        window.alert("Un motif est requis pour désactiver un membre.");
        return;
      }
    }

    try {
      await api.put(`/users/organization/${userId}/active`, {
        isActive,
        reason,
      });
      await fetchData();
    } catch (err: unknown) {
      console.error(err);
      const message =
        axios.isAxiosError(err) &&
        typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : "Impossible de modifier le statut du membre.";
      window.alert(message);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: "#ADB5BD" }}>
            Chargement...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout>
        <div
          role="alert"
          className="rounded-md p-4"
          style={{ backgroundColor: "#FDEDEC", color: "#922B21" }}
        >
          <p>{loadError}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-3 rounded px-4 py-2 text-white"
            style={{ backgroundColor: "#C0392B" }}
          >
            Réessayer
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="rounded-md bg-white border border-gray-200 p-4 mb-6 space-y-3">
        <label className="block text-sm font-medium">
          Horaire et indisponibilités d’un conseiller
        </label>
        <select
          className="border rounded p-2 w-full sm:w-auto"
          value={planningUserId}
          onChange={(e) => {
            if (
              scheduleDirty &&
              !confirm(
                "Des modifications de l’horaire ne sont pas enregistrées. Changer de conseiller?",
              )
            )
              return;
            setScheduleDirty(false);
            setPlanningUserId(e.target.value);
          }}
        >
          <option value="">Choisir un membre</option>
          {users.map((member) => (
            <option key={member.id} value={member.id}>
              {member.firstName} {member.lastName}
            </option>
          ))}
        </select>
        {planningUserId && (
          <WorkScheduleEditorPanel
            key={planningUserId}
            userId={planningUserId}
            manager
            userName={
              users.find((member) => member.id === planningUserId)
                ? `${users.find((member) => member.id === planningUserId)!.firstName} ${users.find((member) => member.id === planningUserId)!.lastName}`
                : undefined
            }
            onDirtyChange={setScheduleDirty}
          />
        )}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: "#2C3E50" }}>
            Membres de l&apos;équipe
          </h2>
          <p className="text-sm mt-1" style={{ color: "#6C757D" }}>
            {users.length} / {maxUsers === null ? "illimité" : maxUsers} membre
            {users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={maxUsers !== null && users.length >= maxUsers}
          title={
            maxUsers !== null && users.length >= maxUsers
              ? `Limite de ${maxUsers} membre(s) atteinte pour votre licence`
              : ""
          }
          className="w-full sm:w-auto text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#C0392B" }}
          onMouseEnter={(e) => {
            if (!(maxUsers !== null && users.length >= maxUsers))
              e.currentTarget.style.backgroundColor = "#A93226";
          }}
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#C0392B")
          }
        >
          + Ajouter un membre
        </button>
      </div>

      {maxUsers !== null && users.length >= maxUsers && (
        <div
          className="rounded-md p-4 mb-6 flex items-start gap-3"
          style={{ backgroundColor: "#FEF9E7", border: "1px solid #FAD7A0" }}
        >
          <span style={{ color: "#F39C12", fontSize: "18px" }}>⚠</span>
          <p className="text-sm" style={{ color: "#7D6608" }}>
            Vous avez atteint la limite de membres pour votre licence actuelle.
            Contactez CORO pour mettre à niveau votre abonnement.
          </p>
        </div>
      )}

      {/* MOBILE — cartes */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <div
            key={u.id}
            className="rounded-md p-4"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E9ECEF" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p
                  className="font-semibold text-sm break-words"
                  style={{ color: "#2C3E50" }}
                >
                  {u.firstName} {u.lastName}
                  {u.id === user?.id && (
                    <span
                      className="ml-2 text-xs font-normal"
                      style={{ color: "#ADB5BD" }}
                    >
                      (vous)
                    </span>
                  )}
                </p>
                <p
                  className="text-xs mt-1 break-all"
                  style={{ color: "#6C757D" }}
                >
                  {u.email}
                </p>
              </div>

              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0"
                style={
                  u.isActive
                    ? {
                        backgroundColor: "#EAFAF1",
                        color: "#27AE60",
                        border: "1px solid #A9DFBF",
                      }
                    : {
                        backgroundColor: "#FDEDEC",
                        color: "#C0392B",
                        border: "1px solid #F1948A",
                      }
                }
              >
                {u.isActive ? "Actif" : "Désactivé"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p
                  className="text-[11px] uppercase tracking-wide"
                  style={{ color: "#ADB5BD" }}
                >
                  Rôle
                </p>
                <p
                  className="text-xs font-medium mt-0.5"
                  style={{ color: "#495057" }}
                >
                  {roleLabels[u.role] || u.role}
                  {u.role === "OPERATOR" && (
                    <label className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: "#495057" }}
                      title="Planifier et affecter les activités de tous les projets de l'organisation">
                      <input type="checkbox" checked={u.planningCoordinator === true}
                        onChange={(e) => handlePlanningCoordinator(u.id, e.target.checked)} />
                      Coordination planification
                      <InfoTip text="Planifie et affecte les activités de toute l’équipe sans être administrateur, gère l’équipe des clients et voit tous les projets, même en visibilité Restreinte." manual="equipe-utilisateurs" />
                    </label>
                  )}
                </p>
              </div>

              {u.id !== user?.id && (
                <button
                  onClick={() => handleToggleActive(u.id, !u.isActive)}
                  className="text-xs font-medium px-3 py-2 rounded transition-colors whitespace-nowrap"
                  style={{
                    border: `1px solid ${u.isActive ? "#DEE2E6" : "#A9DFBF"}`,
                    color: u.isActive ? "#6C757D" : "#27AE60",
                  }}
                >
                  {u.isActive ? "Désactiver" : "Réactiver"}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => openDisplayAuthority(u)}
              className="mt-3 min-h-11 w-full rounded border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-800"
            >
              Accès CORO Display
            </button>
          </div>
        ))}
      </div>

      {/* TABLETTE + DESKTOP — tableau */}
      <div
        className="hidden md:block rounded-md overflow-x-auto"
        style={{ border: "1px solid #E9ECEF" }}
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr style={{ backgroundColor: "#F8F9FA" }}>
              {["Nom", "Courriel", "Rôle", "Statut", ""].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                  style={{
                    color: "#6C757D",
                    borderBottom: "1px solid #E9ECEF",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr
                key={u.id}
                style={{
                  backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8F9FA",
                }}
              >
                <td
                  className="px-4 py-3 whitespace-nowrap"
                  style={{ color: "#2C3E50", fontWeight: 600 }}
                >
                  {u.firstName} {u.lastName}
                  {u.id === user?.id && (
                    <span className="ml-2 text-xs" style={{ color: "#ADB5BD" }}>
                      (vous)
                    </span>
                  )}
                </td>

                <td className="px-4 py-3" style={{ color: "#495057" }}>
                  {u.email}
                </td>

                <td
                  className="px-4 py-3 whitespace-nowrap"
                  style={{ color: "#6C757D" }}
                >
                  {roleLabels[u.role] || u.role}
                  {u.role === "OPERATOR" && (
                    <label className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: "#495057" }}
                      title="Planifier et affecter les activités de tous les projets de l'organisation">
                      <input type="checkbox" checked={u.planningCoordinator === true}
                        onChange={(e) => handlePlanningCoordinator(u.id, e.target.checked)} />
                      Coordination planification
                      <InfoTip text="Planifie et affecte les activités de toute l’équipe sans être administrateur, gère l’équipe des clients et voit tous les projets, même en visibilité Restreinte." manual="equipe-utilisateurs" />
                    </label>
                  )}
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-flex"
                    style={
                      u.isActive
                        ? {
                            backgroundColor: "#EAFAF1",
                            color: "#27AE60",
                            border: "1px solid #A9DFBF",
                          }
                        : {
                            backgroundColor: "#FDEDEC",
                            color: "#C0392B",
                            border: "1px solid #F1948A",
                          }
                    }
                  >
                    {u.isActive ? "Actif" : "Désactivé"}
                  </span>
                </td>

                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => openDisplayAuthority(u)}
                    className="mr-2 text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                    style={{ border: "1px solid #B8C4FF", color: "#3446A8" }}
                  >
                    Accès CORO Display
                  </button>
                  {u.id !== user?.id && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResendInvite(u)}
                        className="text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                        style={{
                          border: "1px solid #AED6F1",
                          color: "#2980B9",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#EBF5FB")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                        title="Renvoyer l'invitation par courriel"
                      >
                        ✉️ Renvoyer
                      </button>
                      <button
                        onClick={() => handleToggleActive(u.id, !u.isActive)}
                        className="text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                        style={{
                          border: `1px solid ${u.isActive ? "#DEE2E6" : "#A9DFBF"}`,
                          color: u.isActive ? "#6C757D" : "#27AE60",
                        }}
                      >
                        {u.isActive ? "Désactiver" : "Réactiver"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
            className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-md p-5 sm:p-8"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <h3
              id="add-member-title"
              className="font-semibold text-lg mb-6"
              style={{ color: "#2C3E50" }}
            >
              Ajouter un membre
            </h3>

            {error && (
              <div
                className="rounded p-3 mb-4 text-sm"
                style={{
                  backgroundColor: "#FDEDEC",
                  color: "#C0392B",
                  border: "1px solid #F1948A",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "#495057" }}
                  >
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: "1px solid #CED4DA", color: "#2C3E50" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "#495057" }}
                  >
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: "1px solid #CED4DA", color: "#2C3E50" }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "#495057" }}
                >
                  Courriel *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: "1px solid #CED4DA", color: "#2C3E50" }}
                />
              </div>

              <p
                className="rounded p-3 text-sm"
                style={{ backgroundColor: "#EBF5FB", color: "#1B4F72" }}
              >
                Une invitation sécurisée sera enregistrée. Le membre choisira
                lui-même son mot de passe depuis un lien temporaire.
              </p>

              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "#495057" }}
                >
                  Rôle
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: "1px solid #CED4DA", color: "#2C3E50" }}
                >
                  <option value="OPERATOR">Conseiller</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                  style={{ border: "1px solid #DEE2E6", color: "#6C757D" }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50"
                  style={{ backgroundColor: "#C0392B" }}
                >
                  {creating ? "Création..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {displayUser && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="display-authority-title"
            className="w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-md p-5 sm:p-8 bg-white"
          >
            <h3
              id="display-authority-title"
              className="font-semibold text-xl text-slate-800"
            >
              Autorites Display - {displayUser.firstName} {displayUser.lastName}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              L’accès exige au minimum <strong>Ouvrir CORO Display</strong> et
              une affectation explicite à un bâtiment. Les droits d’urgence ne
              sont pas délégables ici.
            </p>
            {displayUser.id === user?.id && (
              <p
                className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900"
                role="status"
              >
                La modification de vos propres autorités fermera votre session.
                Reconnectez-vous pour charger les nouveaux droits.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            <fieldset className="mt-5">
              <legend className="font-semibold text-slate-800">
                Profil professionnel Display
              </legend>
              <p className="mt-1 text-sm text-slate-600">
                Deux niveaux seulement. Une affectation au bâtiment demeure
                obligatoire et le créateur ne peut jamais approuver sa propre
                soumission.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {displayProfessionalProfiles.map((profile) => {
                  const selected = profile.permissions.every((permission) =>
                    displayPermissions.includes(permission),
                  );
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        applyDisplayProfessionalProfile(profile.permissions)
                      }
                      className={`min-h-24 rounded border p-4 text-left ${
                        selected
                          ? "border-blue-700 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <strong className="block text-slate-900">
                        {profile.label}
                      </strong>
                      <span className="mt-1 block text-sm text-slate-600">
                        {profile.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="mt-5">
              <legend className="font-semibold text-slate-800">
                Permissions effectives (avancé)
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {displayPermissionOptions.map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-11 items-center gap-3 rounded border border-slate-200 p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={displayPermissions.includes(value)}
                      onChange={(event) => {
                        setDisplayPermissions((current) =>
                          event.target.checked
                            ? Array.from(new Set([...current, value]))
                            : current.filter(
                                (permission) => permission !== value,
                              ),
                        );
                      }}
                    />
                    {label}{" "}
                    <code className="ml-auto text-[10px] text-slate-500">
                      {value}
                    </code>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-5">
              <legend className="font-semibold text-slate-800">
                Batiments autorises
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {buildings.map((building) => (
                  <label
                    key={building.id}
                    className="flex min-h-11 items-center gap-3 rounded border border-slate-200 p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={displayBuildingIds.includes(building.id)}
                      onChange={(event) => {
                        setDisplayBuildingIds((current) =>
                          event.target.checked
                            ? Array.from(new Set([...current, building.id]))
                            : current.filter((id) => id !== building.id),
                        );
                      }}
                    />
                    <span>
                      {building.name}
                      {building.city ? ` - ${building.city}` : ""}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="mt-5 block text-sm font-medium text-slate-800">
              Justification auditee
              <textarea
                className="mt-2 min-h-24 w-full rounded border border-slate-300 p-3"
                minLength={10}
                value={displayReason}
                onChange={(event) => setDisplayReason(event.target.value)}
                placeholder="Ex. Pilote Display Tour Premont - gestionnaire autorise"
              />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={savingDisplay}
                onClick={() => setDisplayUser(null)}
                className="min-h-11 rounded border border-slate-300 px-4 py-2 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={savingDisplay}
                onClick={() => void saveDisplayAuthority()}
                className="min-h-11 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingDisplay
                  ? "Validation serveur..."
                  : "Enregistrer les autorités Display"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
