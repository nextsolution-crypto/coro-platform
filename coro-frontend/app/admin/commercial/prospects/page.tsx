"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Language = "FR" | "EN";
type Prospect = {
  id: string;
  reference: string;
  legalName: string;
  displayName: string;
  preferredLanguage: Language;
  country: string;
  contactName: string | null;
  contactTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: "ACTIVE" | "CONVERTED" | "DISQUALIFIED";
  createdAt: string;
  updatedAt: string;
};
type ProspectProposal = {
  id: string;
  reference: string;
  title: string;
  status: string;
  revisions: Array<{ revisionNumber: number; status: string }>;
};
type ProspectWorkspace = {
  id: string;
  reference: string;
  title: string;
  status: string;
  updatedAt: string;
  conversions: Array<{
    proposal: { id: string; reference: string; status: string };
  }>;
};
type ProspectDetailModel = Prospect & {
  proposals: ProspectProposal[];
  simulationWorkspaces: ProspectWorkspace[];
};
type ProspectForm = {
  reference: string;
  legalName: string;
  displayName: string;
  preferredLanguage: Language;
  country: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
};
const emptyForm: ProspectForm = {
  reference: "",
  legalName: "",
  displayName: "",
  preferredLanguage: "FR",
  country: "CA",
  contactName: "",
  contactTitle: "",
  contactEmail: "",
  contactPhone: "",
};
const statusLabels = {
  ACTIVE: "Actif",
  CONVERTED: "Converti",
  DISQUALIFIED: "Disqualifié",
};
const optional = (value: string) => value.trim() || undefined;

export default function ProspectsPage() {
  const [items, setItems] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<ProspectDetailModel>();
  const [form, setForm] = useState<ProspectForm>(emptyForm);
  const [mode, setMode] = useState<"LIST" | "CREATE" | "EDIT">("LIST");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load(selectId?: string) {
    const response = await api.get("/admin/v1/commercial/prospects");
    const prospects: Prospect[] = Array.isArray(response.data)
      ? response.data
      : (response.data?.items ?? []);
    setItems(prospects);
    if (selectId) await selectProspect(selectId);
  }
  async function selectProspect(id: string) {
    try {
      const response = await api.get(`/admin/v1/commercial/prospects/${id}`);
      setSelected(response.data as ProspectDetailModel);
    } catch {
      setMessage("Impossible de charger la fiche commerciale du prospect.");
    }
  }
  useEffect(() => {
    // Initial synchronization with the server-owned Prospect index.
    const selectedId = new URLSearchParams(window.location.search).get(
      "selected",
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(selectedId ?? undefined)
      .catch(() => setMessage("Impossible de charger les prospects."))
      .finally(() => setLoading(false));
    // The initial URL selection is intentionally read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr-CA");
    if (!needle) return items;
    return items.filter((prospect) =>
      [prospect.displayName, prospect.legalName, prospect.reference].some(
        (value) => value.toLocaleLowerCase("fr-CA").includes(needle),
      ),
    );
  }, [items, query]);
  function beginCreate() {
    setForm(emptyForm);
    setSelected(undefined);
    setMode("CREATE");
    setMessage("");
  }
  function beginEdit(prospect: Prospect) {
    setForm({
      reference: prospect.reference,
      legalName: prospect.legalName,
      displayName: prospect.displayName,
      preferredLanguage: prospect.preferredLanguage,
      country: prospect.country,
      contactName: prospect.contactName ?? "",
      contactTitle: prospect.contactTitle ?? "",
      contactEmail: prospect.contactEmail ?? "",
      contactPhone: prospect.contactPhone ?? "",
    });
    setMode("EDIT");
    setMessage("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const body = {
      ...(mode === "CREATE" ? { reference: form.reference.trim() } : {}),
      legalName: form.legalName.trim(),
      displayName: form.displayName.trim(),
      preferredLanguage: form.preferredLanguage,
      country: form.country,
      contactName: optional(form.contactName),
      contactTitle: optional(form.contactTitle),
      contactEmail: optional(form.contactEmail),
      contactPhone: optional(form.contactPhone),
    };
    try {
      const response =
        mode === "CREATE"
          ? await api.post("/admin/v1/commercial/prospects", body)
          : await api.patch(
              `/admin/v1/commercial/prospects/${selected!.id}`,
              body,
            );
      await load(response.data.id);
      setMode("LIST");
      setMessage(
        mode === "CREATE"
          ? "Prospect créé avec succès."
          : "Prospect mis à jour.",
      );
    } catch (error) {
      const detail = (
        error as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      setMessage(
        Array.isArray(detail)
          ? detail.join(" ")
          : (detail ?? "Le prospect n’a pas pu être enregistré."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Commercial
            </p>
            <h1 className="text-3xl font-semibold">Prospects</h1>
            <p className="mt-2 text-sm text-slate-600">
              Gérez les prospects commerciaux avant la préparation d’une offre.
              La conversion vers une organisation demeure une étape distincte.
            </p>
          </div>
          <button
            onClick={beginCreate}
            className="rounded bg-slate-900 px-4 py-2 font-medium text-white"
          >
            Nouveau prospect
          </button>
        </header>
        {message && (
          <p className="rounded border bg-white px-4 py-3 text-sm">{message}</p>
        )}
        {mode !== "LIST" && (
          <ProspectEditor
            form={form}
            setForm={setForm}
            editing={mode === "EDIT"}
            busy={busy}
            onSubmit={submit}
            onCancel={() => setMode("LIST")}
          />
        )}
        {mode === "LIST" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <section className="space-y-3">
              <label className="block text-sm font-medium">
                Rechercher
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nom ou référence"
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <div className="rounded-xl border bg-white">
                {filtered.map((prospect) => (
                  <button
                    type="button"
                    className="block w-full border-b p-4 text-left last:border-0 hover:bg-slate-50"
                    key={prospect.id}
                    onClick={() => void selectProspect(prospect.id)}
                  >
                    <span className="font-semibold">
                      {prospect.displayName}
                    </span>
                    <span className="block text-sm text-slate-600">
                      {prospect.legalName} · {prospect.reference}
                    </span>
                    <span className="text-xs text-slate-500">
                      {statusLabels[prospect.status]} ·{" "}
                      {prospect.preferredLanguage}
                    </span>
                  </button>
                ))}
                {!loading && !items.length && (
                  <div className="space-y-3 p-6 text-center">
                    <p className="font-medium">
                      Aucun prospect pour le moment.
                    </p>
                    <p className="text-sm text-slate-600">
                      Créez un prospect pour préparer une configuration
                      commerciale ou une proposition.
                    </p>
                    <button
                      onClick={beginCreate}
                      className="rounded bg-slate-900 px-4 py-2 text-white"
                    >
                      Nouveau prospect
                    </button>
                  </div>
                )}
                {!loading && items.length > 0 && !filtered.length && (
                  <p className="p-4 text-slate-500">Aucun résultat.</p>
                )}
                {loading && <p className="p-4 text-slate-500">Chargement…</p>}
              </div>
            </section>
            {selected ? (
              <ProspectDetail
                prospect={selected}
                onEdit={() => beginEdit(selected)}
              />
            ) : (
              <aside className="rounded-xl border bg-slate-50 p-5 text-sm text-slate-600">
                Sélectionnez un prospect pour consulter sa fiche et préparer une
                offre.
              </aside>
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
}

function ProspectEditor({
  form,
  setForm,
  editing,
  busy,
  onSubmit,
  onCancel,
}: {
  form: ProspectForm;
  setForm: (form: ProspectForm) => void;
  editing: boolean;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  const field = (name: keyof ProspectForm, value: string) =>
    setForm({ ...form, [name]: value });
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border bg-white p-5"
    >
      <div>
        <h2 className="text-xl font-semibold">
          {editing ? "Modifier le prospect" : "Nouveau prospect"}
        </h2>
        <p className="text-sm text-slate-600">
          Les coordonnées sont conservées sans envoyer de communication.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Nom légal"
          required
          value={form.legalName}
          onChange={(v) => field("legalName", v)}
        />
        <Field
          label="Nom d’affichage"
          required
          value={form.displayName}
          onChange={(v) => field("displayName", v)}
        />
        <Field
          label="Référence"
          required
          disabled={editing}
          value={form.reference}
          onChange={(v) => field("reference", v)}
        />
        <label className="text-sm font-medium">
          Relation commerciale
          <select
            className="mt-1 w-full rounded border bg-slate-50 px-3 py-2"
            disabled
            value="DIRECT"
          >
            <option value="DIRECT">Direct</option>
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Confirmée lors de la préparation de l’offre.
          </span>
        </label>
        <label className="text-sm font-medium">
          Pays
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.country}
            onChange={(e) => field("country", e.target.value)}
          >
            <option value="CA">Canada</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Langue
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.preferredLanguage}
            onChange={(e) => field("preferredLanguage", e.target.value)}
          >
            <option value="FR">Français</option>
            <option value="EN">English</option>
          </select>
        </label>
        <Field
          label="Nom du contact"
          value={form.contactName}
          onChange={(v) => field("contactName", v)}
        />
        <Field
          label="Titre du contact"
          value={form.contactTitle}
          onChange={(v) => field("contactTitle", v)}
        />
        <Field
          label="Courriel"
          type="email"
          value={form.contactEmail}
          onChange={(v) => field("contactEmail", v)}
        />
        <Field
          label="Téléphone"
          type="tel"
          value={form.contactPhone}
          onChange={(v) => field("contactPhone", v)}
        />
      </div>
      <div className="flex gap-3">
        <button
          disabled={busy}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-4 py-2"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
function Field({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border px-3 py-2 disabled:bg-slate-100"
      />
    </label>
  );
}
function ProspectDetail({
  prospect,
  onEdit,
}: {
  prospect: ProspectDetailModel;
  onEdit: () => void;
}) {
  const offerUrl = `/admin/commercial/configurator?targetType=PROSPECT&prospectId=${encodeURIComponent(prospect.id)}&audience=DIRECT`;
  return (
    <aside className="space-y-4 rounded-xl border bg-white p-5">
      <div>
        <p className="text-xs font-semibold uppercase text-emerald-700">
          Fiche prospect
        </p>
        <h2 className="text-xl font-semibold">{prospect.displayName}</h2>
        <p className="text-sm text-slate-600">{prospect.legalName}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-slate-500">Référence</dt>
        <dd>{prospect.reference}</dd>
        <dt className="text-slate-500">Statut</dt>
        <dd>{statusLabels[prospect.status]}</dd>
        <dt className="text-slate-500">Relation</dt>
        <dd>Direct pour la prochaine offre</dd>
        <dt className="text-slate-500">Pays</dt>
        <dd>{prospect.country === "CA" ? "Canada" : prospect.country}</dd>
        <dt className="text-slate-500">Langue</dt>
        <dd>{prospect.preferredLanguage === "FR" ? "Français" : "English"}</dd>
        <dt className="text-slate-500">Contact</dt>
        <dd>{prospect.contactName || "—"}</dd>
        <dt className="text-slate-500">Courriel</dt>
        <dd>{prospect.contactEmail || "—"}</dd>
        <dt className="text-slate-500">Téléphone</dt>
        <dd>{prospect.contactPhone || "—"}</dd>
      </dl>
      <section className="space-y-2 border-t pt-4">
        <h3 className="font-semibold">Configurations commerciales</h3>
        {prospect.simulationWorkspaces.length ? (
          <ul className="space-y-2 text-sm">
            {prospect.simulationWorkspaces.map((workspace) => (
              <li key={workspace.id} className="rounded border p-3">
                <div className="font-medium">{workspace.title}</div>
                <div className="text-slate-500">
                  {workspace.reference} · {workspace.status}
                </div>
                <Link
                  className="mt-1 inline-block underline"
                  href={`/admin/commercial/configurator?workspace=${encodeURIComponent(workspace.id)}`}
                >
                  Reprendre la configuration
                </Link>
                {workspace.conversions[0] && (
                  <Link
                    className="ml-3 inline-block underline"
                    href={`/admin/commercial/proposals/${workspace.conversions[0].proposal.id}`}
                  >
                    {workspace.conversions[0].proposal.reference}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            Aucune configuration existante.
          </p>
        )}
      </section>
      <section className="space-y-2 border-t pt-4">
        <h3 className="font-semibold">Propositions</h3>
        {prospect.proposals.length ? (
          <ul className="space-y-2 text-sm">
            {prospect.proposals.map((proposal) => {
              const revision = proposal.revisions[0];
              return (
                <li key={proposal.id} className="rounded border p-3">
                  <Link
                    className="font-medium underline"
                    href={`/admin/commercial/proposals/${proposal.id}`}
                  >
                    {proposal.reference}
                  </Link>
                  <div className="text-slate-500">
                    {revision?.status ?? proposal.status}
                    {revision ? ` · v${revision.revisionNumber}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            Aucune proposition enregistrée pour ce prospect.
          </p>
        )}
      </section>
      <div className="flex flex-wrap gap-3">
        {prospect.status === "ACTIVE" && (
          <button onClick={onEdit} className="rounded border px-4 py-2">
            Modifier
          </button>
        )}
        {prospect.status === "ACTIVE" && (
          <Link
            href={offerUrl}
            className="rounded bg-emerald-700 px-4 py-2 font-medium text-white"
          >
            {prospect.simulationWorkspaces.length
              ? "Créer une nouvelle configuration"
              : "Préparer une offre"}
          </Link>
        )}
      </div>
    </aside>
  );
}
