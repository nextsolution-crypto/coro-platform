"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { usePlatformAuthority } from "@/hooks/usePlatformAuthority";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

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
    if (
      scope === "GLOBAL" &&
      (!globalAcknowledged ||
        !window.confirm(
          "Confirmer ce droit GLOBAL sur toutes les organisations?",
        ))
    ) {
      if (!globalAcknowledged)
        setFeedback({
          error: true,
          text: "Confirmez la portée globale avant de continuer.",
        });
      return;
    }
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

  async function revoke(grant: Grant) {
    if (busy) return;
    const revokeReason = revocationReasons[grant.id]?.trim() ?? "";
    if (revokeReason.length < 10) {
      setFeedback({
        error: true,
        text: "La justification de révocation doit contenir au moins 10 caractères.",
      });
      return;
    }
    if (!window.confirm(`Révoquer immédiatement ${grant.permission}?`)) return;
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
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-medium text-red-700">
          Administration plateforme
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Permissions plateforme
        </h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Autorité : <strong>{authority.view?.authorityStatus}</strong>. Les
          droits sont accordés uniquement par le Founder et validés par le
          backend.
        </p>
      </header>
      {feedback && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={`rounded border p-3 text-sm ${feedback.error ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}
        >
          {feedback.text}
        </p>
      )}
      <section
        className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6"
        aria-labelledby="grant-title"
      >
        <h2 id="grant-title" className="text-xl font-semibold">
          Accorder une permission
        </h2>
        <form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={createGrant}>
          <label className="text-sm font-medium">
            Employé CORO admissible
            <select
              aria-label="Employé CORO admissible"
              className="mt-1 w-full rounded border p-2"
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
          <label className="text-sm font-medium">
            Permission
            <select
              aria-label="Permission plateforme"
              className="mt-1 w-full rounded border p-2"
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
          <fieldset className="rounded border p-3">
            <legend className="px-1 text-sm font-medium">Portée</legend>
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
            <label className="text-sm font-medium">
              Organisation cliente
              <select
                aria-label="Organisation cliente"
                className="mt-1 w-full rounded border p-2"
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
            <label className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
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
          <label className="text-sm font-medium lg:col-span-2">
            Justification obligatoire
            <textarea
              aria-label="Justification du grant"
              className="mt-1 min-h-24 w-full rounded border p-2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              required
            />
          </label>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={busy || loading}
              className="rounded bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {busy ? "Validation…" : "Accorder après validation"}
            </button>
          </div>
        </form>
      </section>
      <section
        className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6"
        aria-labelledby="existing-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="existing-title" className="text-xl font-semibold">
            Permissions existantes
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy || loading}
            className="rounded border px-3 py-2 text-sm"
          >
            Actualiser
          </button>
        </div>
        {loading ? (
          <p className="mt-4 text-sm" aria-live="polite">
            Chargement des permissions…
          </p>
        ) : grants.length === 0 ? (
          <p className="mt-4 rounded bg-slate-50 p-4 text-sm">
            Aucune permission déléguée.
          </p>
        ) : (
          <div className="mt-4 grid gap-4">
            {grants.map((grant) => (
              <article key={grant.id} className="min-w-0 rounded border p-4">
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
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${grant.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200"}`}
                  >
                    {grant.status}
                  </span>
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
                    <label className="flex-1 text-sm font-medium">
                      Justification de révocation
                      <input
                        aria-label={`Justification de révocation ${grant.permission}`}
                        className="mt-1 w-full rounded border p-2"
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
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void revoke(grant)}
                      className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700"
                    >
                      Révoquer
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
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
