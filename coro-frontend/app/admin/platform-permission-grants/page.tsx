"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { usePlatformAuthority } from "@/hooks/usePlatformAuthority";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  EmptyState,
  GlassButton,
  GlassCard,
  GlassModal,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/design-system/kit";
import styles from "./platform-permission-grants.module.css";

const PERMISSIONS = [
  "COMMERCIAL_CATALOG_MANAGE",
  "COMMERCIAL_CONFIGURATION_MANAGE",
  "COMMERCIAL_CONTENT_MANAGE",
  "COMMERCIAL_LEGAL_ISSUER_MANAGE",
  "COMMERCIAL_WORKSPACE_MANAGE",
  "COMMERCIAL_PROPOSAL_PREPARE",
  "COMMERCIAL_PROPOSAL_ISSUE",
  "COMMERCIAL_CONTRACT_PREPARE",
  "COMMERCIAL_CONTRACT_ACTIVATE",
  "COMMERCIAL_ENTITLEMENT_PROVISION",
  "ORGANIZATION_360_READ",
  "FINANCIAL_RENDEMENT_READ",
  "FINANCIAL_SALE_VALIDATE",
  "FINANCIAL_ADVISOR_COST_MANAGE",
  "EXERCISE_REPORT_REVIEW",
  "EXERCISE_REPORT_APPROVE",
  "EXERCISE_REPORT_PUBLISH",
] as const;
type Scope = "ORGANIZATION" | "GLOBAL";
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
};
type Organization = {
  id: string;
  name: string;
  isInternal: boolean;
  isActive: boolean;
};
type Grant = {
  id: string;
  userId: string;
  permission: string;
  scope: Scope;
  targetOrganizationId: string | null;
  status: "ACTIVE" | "REVOKED";
  effectiveFrom: string;
  grantedByUserId: string;
  grantReason: string;
  revokedAt: string | null;
  revokedByUserId: string | null;
  revocationReason: string | null;
  lockVersion: number;
  createdAt: string;
};
const messageOf = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data
    ?.message ?? "Action impossible. Réessayez ou vérifiez vos droits.";

function GrantsAdministration() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const authority = usePlatformAuthority(isAuthenticated);
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string }>();
  const [userId, setUserId] = useState("");
  const [permission, setPermission] = useState<(typeof PERMISSIONS)[number]>(
    PERMISSIONS[0],
  );
  const [scope, setScope] = useState<Scope>("ORGANIZATION");
  const [targetOrganizationId, setTargetOrganizationId] = useState("");
  const [reason, setReason] = useState("");
  const [globalAcknowledged, setGlobalAcknowledged] = useState(false);
  const [revocationReasons, setRevocationReasons] = useState<
    Record<string, string>
  >({});
  const [confirmation, setConfirmation] = useState<
    { kind: "global" } | { kind: "revoke"; grant: Grant } | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [grantResult, userResult, organizationResult] = await Promise.all([
        api.get<Grant[]>("/admin/v1/platform-authority/grants"),
        api.get<User[]>("/users/organization"),
        api.get<Organization[]>("/organizations"),
      ]);
      setGrants(grantResult.data);
      setUsers(
        userResult.data.filter(
          (user) => user.isActive && user.role !== "SUPER_ADMIN",
        ),
      );
      setOrganizations(
        organizationResult.data.filter(
          (organization) => organization.isActive && !organization.isInternal,
        ),
      );
    } catch (error) {
      setFeedback({ error: true, text: messageOf(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authority.loading) return;
    if (!authority.isFounder) {
      router.replace("/dashboard");
      return;
    }
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [authority.isFounder, authority.loading, load, router]);

  const userNames = useMemo(
    () =>
      new Map(
        users.map(
          (user) =>
            [
              user.id,
              `${user.firstName} ${user.lastName} (${user.email})`,
            ] as const,
        ),
      ),
    [users],
  );
  const organizationNames = useMemo(
    () =>
      new Map(
        organizations.map(
          (organization) => [organization.id, organization.name] as const,
        ),
      ),
    [organizations],
  );

  async function persistGrant() {
    if (busy) return;
    setConfirmation(null);
    setBusy(true);
    setFeedback(undefined);
    try {
      await api.post("/admin/v1/platform-authority/grants", {
        userId,
        permission,
        scope,
        ...(scope === "ORGANIZATION" ? { targetOrganizationId } : {}),
        reason: reason.trim(),
      });
      setReason("");
      setGlobalAcknowledged(false);
      await load();
      setFeedback({
        error: false,
        text: "Permission activée après confirmation du serveur.",
      });
    } catch (error) {
      setFeedback({ error: true, text: messageOf(error) });
    } finally {
      setBusy(false);
    }
  }

  async function createGrant(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!userId || reason.trim().length < 10) {
      setFeedback({
        error: true,
        text: "Sélectionnez un employé et fournissez une justification d’au moins 10 caractères.",
      });
      return;
    }
    if (scope === "ORGANIZATION" && !targetOrganizationId) {
      setFeedback({
        error: true,
        text: "Sélectionnez explicitement l’organisation cliente ciblée.",
      });
      return;
    }
    if (scope === "GLOBAL") {
      if (!globalAcknowledged) {
        setFeedback({
          error: true,
          text: "Confirmez la portée globale avant de continuer.",
        });
        return;
      }
      setConfirmation({ kind: "global" });
      return;
    }
    await persistGrant();
  }

  function revoke(grant: Grant) {
    if (busy) return;
    const revokeReason = revocationReasons[grant.id]?.trim() ?? "";
    if (revokeReason.length < 10) {
      setFeedback({
        error: true,
        text: "La justification de révocation doit contenir au moins 10 caractères.",
      });
      return;
    }
    setConfirmation({ kind: "revoke", grant });
  }

  async function persistRevocation(grant: Grant) {
    const revokeReason = revocationReasons[grant.id]?.trim() ?? "";
    setConfirmation(null);
    setBusy(true);
    setFeedback(undefined);
    try {
      await api.post(`/admin/v1/platform-authority/grants/${grant.id}/revoke`, {
        lockVersion: grant.lockVersion,
        reason: revokeReason,
      });
      await load();
      setFeedback({
        error: false,
        text: "Permission révoquée. Le refus est immédiat.",
      });
    } catch (error) {
      setFeedback({ error: true, text: messageOf(error) });
    } finally {
      setBusy(false);
    }
  }

  if (authority.loading || !authority.isFounder)
    return <div className="min-h-48" aria-busy="true" />;
  return (
    <main className={`${styles.root} mx-auto max-w-7xl space-y-6`}>
      <PageHeader
        eyebrow="Administration plateforme"
        title="Permissions plateforme"
        subtitle={
          <>
            Autorité : <strong>{authority.view?.authorityStatus}</strong>. Les
            droits sont accordés uniquement par le Founder et validés par le
            backend.
          </>
        }
      />
      {feedback && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={styles.feedback}
          data-error={feedback.error ? "true" : "false"}
        >
          {feedback.text}
        </p>
      )}
      <GlassCard padding="lg" label="Accorder une permission">
        <h2 id="grant-title" className="text-xl font-semibold">
          Accorder une permission
        </h2>
        <form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={createGrant}>
          <label className="cgx-field">
            <span className="cgx-field__label">Employé CORO admissible</span>
            <select
              aria-label="Employé CORO admissible"
              className="cgx-input"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
            >
              <option value="">Sélectionner…</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} · {user.role} · {user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="cgx-field">
            <span className="cgx-field__label">Permission</span>
            <select
              aria-label="Permission plateforme"
              className="cgx-input"
              value={permission}
              onChange={(event) =>
                setPermission(
                  event.target.value as (typeof PERMISSIONS)[number],
                )
              }
            >
              {PERMISSIONS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <fieldset className={styles.scope}>
            <legend className="cgx-field__label">Portée</legend>
            <div className="flex flex-wrap gap-4">
              {(["ORGANIZATION", "GLOBAL"] as Scope[]).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === value}
                    onChange={() => {
                      setScope(value);
                      setGlobalAcknowledged(false);
                    }}
                  />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>
          {scope === "ORGANIZATION" ? (
            <label className="cgx-field">
              <span className="cgx-field__label">Organisation cliente</span>
              <select
                aria-label="Organisation cliente"
                className="cgx-input"
                value={targetOrganizationId}
                onChange={(event) =>
                  setTargetOrganizationId(event.target.value)
                }
                required
              >
                <option value="">Sélectionner explicitement…</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={styles.globalWarning}>
              <strong className="block">Attention : portée GLOBAL</strong>
              <span className="mt-1 flex items-start gap-2">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={globalAcknowledged}
                  onChange={(event) =>
                    setGlobalAcknowledged(event.target.checked)
                  }
                />
                Je confirme que ce droit doit s’appliquer à toutes les
                organisations.
              </span>
            </label>
          )}
          <label className="cgx-field lg:col-span-2">
            <span className="cgx-field__label">Justification obligatoire</span>
            <textarea
              aria-label="Justification du grant"
              className="cgx-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              required
            />
          </label>
          <div className="lg:col-span-2">
            <GlassButton
              type="submit"
              variant="primary"
              disabled={busy || loading}
            >
              {busy ? "Validation…" : "Accorder après validation"}
            </GlassButton>
          </div>
        </form>
      </GlassCard>
      <GlassCard padding="lg" label="Permissions existantes">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="existing-title" className="text-xl font-semibold">
            Permissions existantes
          </h2>
          <GlassButton
            type="button"
            onClick={() => void load()}
            disabled={busy || loading}
          >
            Actualiser
          </GlassButton>
        </div>
        {loading ? (
          <LoadingState label="Chargement des permissions…" lines={3} />
        ) : grants.length === 0 ? (
          <EmptyState
            title="Aucune permission déléguée"
            description="Les délégations explicites apparaîtront ici après validation du serveur."
          />
        ) : (
          <div className="mt-4 grid gap-4">
            {grants.map((grant) => (
              <GlassCard
                key={grant.id}
                as="article"
                padding="md"
                label={grant.permission}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">
                      {grant.permission}
                    </h3>
                    <p className="break-words text-sm text-slate-600">
                      {userNames.get(grant.userId) ??
                        `Utilisateur ${grant.userId}`}
                    </p>
                  </div>
                  <StatusBadge
                    tone={grant.status === "ACTIVE" ? "success" : "neutral"}
                  >
                    {grant.status}
                  </StatusBadge>
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="font-medium">Portée</dt>
                    <dd>{grant.scope}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Organisation</dt>
                    <dd className="break-words">
                      {grant.scope === "GLOBAL"
                        ? "Toutes les organisations"
                        : (organizationNames.get(
                            grant.targetOrganizationId ?? "",
                          ) ?? grant.targetOrganizationId)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Effectif depuis</dt>
                    <dd>
                      {new Date(grant.effectiveFrom).toLocaleString("fr-CA")}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Accordé par</dt>
                    <dd className="break-all">{grant.grantedByUserId}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium">Justification</dt>
                    <dd>{grant.grantReason}</dd>
                  </div>
                  {grant.revocationReason && (
                    <div className="sm:col-span-2">
                      <dt className="font-medium">Motif de révocation</dt>
                      <dd>{grant.revocationReason}</dd>
                    </div>
                  )}
                </dl>
                {grant.status === "ACTIVE" && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="cgx-field flex-1">
                      <span className="cgx-field__label">
                        Justification de révocation
                      </span>
                      <input
                        aria-label={`Justification de révocation ${grant.permission}`}
                        className="cgx-input"
                        value={revocationReasons[grant.id] ?? ""}
                        onChange={(event) =>
                          setRevocationReasons((current) => ({
                            ...current,
                            [grant.id]: event.target.value,
                          }))
                        }
                        minLength={10}
                      />
                    </label>
                    <GlassButton
                      type="button"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void revoke(grant)}
                    >
                      Révoquer
                    </GlassButton>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </GlassCard>
      <GlassModal
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        title={
          confirmation?.kind === "revoke"
            ? "Confirmer la révocation"
            : "Confirmer la portée GLOBAL"
        }
        description={
          confirmation?.kind === "revoke"
            ? `La permission ${confirmation.grant.permission} sera révoquée immédiatement après validation du serveur.`
            : "Cette permission s’appliquera à toutes les organisations. Le backend demeure l’autorité finale."
        }
        tone={confirmation?.kind === "revoke" ? "danger" : "default"}
        dismissOnBackdrop={!busy}
        dismissOnEscape={!busy}
        footer={
          <>
            <GlassButton
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Annuler
            </GlassButton>
            <GlassButton
              type="button"
              variant={confirmation?.kind === "revoke" ? "danger" : "primary"}
              disabled={busy}
              onClick={() => {
                if (confirmation?.kind === "revoke") {
                  void persistRevocation(confirmation.grant);
                } else if (confirmation?.kind === "global") {
                  void persistGrant();
                }
              }}
            >
              {busy ? "Validation…" : "Confirmer"}
            </GlassButton>
          </>
        }
      />
    </main>
  );
}

export default function PlatformPermissionGrantsPage() {
  return (
    <AppLayout>
      <GrantsAdministration />
    </AppLayout>
  );
}
