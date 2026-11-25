"use client";

// Module 4 — rôles nommés par les procédures mais absents de l'organigramme.
// Le conseiller choisit qui reprend leurs tâches (le coordonnateur est proposé).

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "@/lib/toast";

interface RoleChoice {
  code: string;
  labelFR: string;
  labelEN: string;
}

interface UncoveredRole extends RoleChoice {
  procedures: { id: string; code?: string; titleFR?: string; titleEN?: string }[];
  decision?: string;
  proposedTakeover: string;
}

interface CoverageState {
  lockVersion: number;
  activeRoles: RoleChoice[];
  uncovered: UncoveredRole[];
  assignments: Record<string, string>;
  upToDate: boolean;
}

const NONE = "NONE";

export default function Module4RoleCoverage({
  projectId,
  language = "fr",
  onApplied,
}: {
  projectId: string;
  language?: "fr" | "en";
  onApplied?: () => void;
}) {
  const isFr = language === "fr";
  const [state, setState] = useState<CoverageState | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/generator/role-coverage/${projectId}`);
      const data: CoverageState = res.data;
      setState(data);
      const next: Record<string, string> = {};
      data.uncovered.forEach((role) => {
        next[role.code] = role.decision || role.proposedTakeover;
      });
      setChoices(next);
    } catch {
      setState(null);
    }
  }, [projectId]);

  useEffect(() => {
    // Chargement initial depuis le serveur.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (!state) return null;

  const pending = state.uncovered.filter((role) => !role.decision).length;
  const changed = state.uncovered.some(
    (role) => (role.decision || "") !== (choices[role.code] || ""),
  );
  const needsUpdate = !state.upToDate || changed || pending > 0;

  const apply = async () => {
    setSaving(true);
    try {
      const assignments: Record<string, string> = {};
      state.uncovered.forEach((role) => {
        if (choices[role.code]) assignments[role.code] = choices[role.code];
      });
      const res = await api.put(`/generator/role-coverage/${projectId}`, {
        assignments,
        expectedLockVersion: state.lockVersion,
      });
      setState(res.data);
      toast(isFr ? "Procédures mises à jour selon l’organigramme." : "Procedures updated from the org chart.", "success");
      onApplied?.();
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        await load();
        toast(
          isFr
            ? "Le document a changé entre-temps. Vérifiez les choix puis réappliquez."
            : "The document changed meanwhile. Check the choices and apply again.",
          "error",
        );
      } else {
        toast(isFr ? "Mise à jour impossible." : "Update failed.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const label = (role: RoleChoice) => (isFr ? role.labelFR : role.labelEN);
  const title = (p: UncoveredRole["procedures"][number]) =>
    `${p.code ? `${p.code} ` : ""}${(isFr ? p.titleFR : p.titleEN) || ""}`.trim();

  if (state.uncovered.length === 0 && state.upToDate) {
    return (
      <div
        className="mb-4 px-4 py-2 text-xs"
        style={{ backgroundColor: "#E5F4E4", color: "#1E8449", borderRadius: 6 }}
      >
        {isFr
          ? "Tous les rôles nommés dans les procédures figurent dans l’organigramme."
          : "Every role named in the procedures is in the org chart."}
      </div>
    );
  }

  return (
    <div
      className="mb-4 p-4"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #F5CBA7", borderRadius: 6 }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#2C3E50" }}>
            {isFr ? "Rôles des procédures" : "Procedure roles"}
            {pending > 0 && (
              <span
                className="ml-2 px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: "#F9EEDA", color: "#B9770E", borderRadius: 4 }}
              >
                {isFr ? `${pending} à confirmer` : `${pending} to confirm`}
              </span>
            )}
          </p>
          <p className="text-xs mt-1" style={{ color: "#6C757D" }}>
            {state.uncovered.length > 0
              ? isFr
                ? "Ces rôles sont prévus dans des procédures mais ne figurent pas dans l’organigramme. Choisissez qui reprend leurs tâches, ou activez le rôle dans l’organigramme (module 3)."
                : "These roles appear in procedures but not in the org chart. Choose who takes over their tasks, or activate the role in the org chart (module 3)."
              : isFr
                ? "Les procédures ne reflètent pas encore l’organigramme actuel : appliquez pour les mettre à jour."
                : "The procedures do not yet reflect the current org chart: apply to update them."}
          </p>
        </div>
        {needsUpdate && (
          <button
            type="button"
            onClick={apply}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: saving ? "#ADB5BD" : "#C0392B", borderRadius: 4 }}
          >
            {saving
              ? isFr ? "Mise à jour…" : "Updating…"
              : isFr ? "Appliquer aux procédures" : "Apply to procedures"}
          </button>
        )}
      </div>

      {state.uncovered.length > 0 && (
        <div className="mt-3 space-y-2">
          {state.uncovered.map((role) => {
            const names = role.procedures.map(title).filter(Boolean);
            const shown = names.slice(0, 3).join(" · ");
            const more = names.length > 3 ? (isFr ? ` et ${names.length - 3} autre(s)` : ` and ${names.length - 3} more`) : "";
            return (
              <div
                key={role.code}
                className="flex items-center justify-between gap-3 flex-wrap p-3"
                style={{ backgroundColor: "#F8F9FA", border: "1px solid #E9ECEF", borderRadius: 4 }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#2C3E50" }}>
                    {label(role)}
                    {!role.decision && (
                      <span className="ml-2 text-xs" style={{ color: "#B9770E" }}>
                        {isFr ? "· proposition" : "· suggestion"}
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#ADB5BD" }}>
                    {isFr ? "Dans : " : "In: "}
                    {shown}
                    {more}
                  </p>
                </div>
                <label className="text-xs flex items-center gap-2" style={{ color: "#6C757D" }}>
                  {isFr ? "Tâches reprises par" : "Tasks taken over by"}
                  <select
                    value={choices[role.code] || ""}
                    onChange={(e) => setChoices({ ...choices, [role.code]: e.target.value })}
                    className="text-xs px-2 py-1"
                    style={{ border: "1px solid #CED4DA", borderRadius: 4, color: "#2C3E50", backgroundColor: "#FFFFFF" }}
                  >
                    {state.activeRoles.map((active) => (
                      <option key={active.code} value={active.code}>
                        {label(active)}
                      </option>
                    ))}
                    <option value={NONE}>{isFr ? "Personne (tâches retirées)" : "Nobody (tasks removed)"}</option>
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
