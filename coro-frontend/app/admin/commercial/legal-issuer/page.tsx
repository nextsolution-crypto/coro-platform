"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";

type Version = {
  id: string;
  versionNumber: number;
  status: string;
  lockVersion: number;
  legalName: string;
  tradeName: string | null;
  legalForm: string | null;
  country: string | null;
  subdivision: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  officialEmail: string | null;
  officialPhone: string | null;
  website: string | null;
  businessNumber: string | null;
  businessNumberApplicability: string;
  federalTaxNumber: string | null;
  federalTaxApplicability: string;
  provincialTaxNumber: string | null;
  provincialTaxApplicability: string;
  referenceCurrency: string | null;
  representativeName: string | null;
  representativeTitle: string | null;
  representativeEmail: string | null;
  authorizedSignatoryName: string | null;
  authorizedSignatoryTitle: string | null;
  authorizedSignatoryEmail: string | null;
  provenance: string;
  contentHash: string;
};
type Issuer = { id: string; code: string; versions: Version[] };
const applicability = ["UNSPECIFIED", "APPLICABLE", "NOT_APPLICABLE"];

export default function LegalIssuerPage() {
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [selected, setSelected] = useState<Version>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (id?: string) => {
    const { data } = await api.get("/admin/v1/commercial/legal-issuers");
    setIssuers(data);
    const versions = (data as Issuer[]).flatMap((issuer) => issuer.versions);
    setSelected(versions.find((version) => version.id === id) ?? versions[0]);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function action(
    run: () => Promise<{ data: Version }>,
    success: string,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await run();
      await load(data.id);
      setMessage(success);
    } catch (error) {
      setMessage(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Action impossible.",
      );
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof Version, value: string) =>
    setSelected((current) =>
      current ? { ...current, [key]: value || null } : current,
    );
  const input = (label: string, key: keyof Version) => (
    <label className="text-sm">
      {label}
      <input
        className="mt-1 w-full rounded border p-2"
        value={String(selected?.[key] ?? "")}
        disabled={selected?.status !== "DRAFT"}
        onChange={(event) => field(key, event.target.value)}
      />
    </label>
  );
  const selectApplicability = (label: string, key: keyof Version) => (
    <label className="text-sm">
      {label}
      <select
        className="mt-1 w-full rounded border p-2"
        value={String(selected?.[key] ?? "UNSPECIFIED")}
        disabled={selected?.status !== "DRAFT"}
        onChange={(event) => field(key, event.target.value)}
      >
        {applicability.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </label>
  );
  const payload = () =>
    selected && {
      lockVersion: selected.lockVersion,
      legalName: selected.legalName,
      tradeName: selected.tradeName || undefined,
      legalForm: selected.legalForm || undefined,
      country: selected.country || undefined,
      subdivision: selected.subdivision || undefined,
      addressLine1: selected.addressLine1 || undefined,
      addressLine2: selected.addressLine2 || undefined,
      city: selected.city || undefined,
      postalCode: selected.postalCode || undefined,
      officialEmail: selected.officialEmail || undefined,
      officialPhone: selected.officialPhone || undefined,
      website: selected.website || undefined,
      businessNumber: selected.businessNumber || undefined,
      businessNumberApplicability: selected.businessNumberApplicability,
      federalTaxNumber: selected.federalTaxNumber || undefined,
      federalTaxApplicability: selected.federalTaxApplicability,
      provincialTaxNumber: selected.provincialTaxNumber || undefined,
      provincialTaxApplicability: selected.provincialTaxApplicability,
      referenceCurrency: selected.referenceCurrency || undefined,
      representativeName: selected.representativeName || undefined,
      representativeTitle: selected.representativeTitle || undefined,
      representativeEmail: selected.representativeEmail || undefined,
      authorizedSignatoryName: selected.authorizedSignatoryName || undefined,
      authorizedSignatoryTitle: selected.authorizedSignatoryTitle || undefined,
      authorizedSignatoryEmail: selected.authorizedSignatoryEmail || undefined,
      provenance: selected.provenance,
    };
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl space-y-5 p-6">
        <header>
          <p className="text-sm text-emerald-700">Commercial</p>
          <h1 className="text-3xl font-semibold">Émetteur légal</h1>
          <p className="text-sm text-slate-600">
            Autorité administrative versionnée. Le créateur d’une proposition
            n’est jamais l’émetteur légal par défaut.
          </p>
        </header>
        {message && (
          <p role="status" className="rounded border p-3">
            {message}
          </p>
        )}
        {issuers.length === 0 && (
          <button
            className="rounded bg-emerald-700 px-4 py-2 text-white"
            disabled={busy}
            onClick={() =>
              void action(
                () => api.post("/admin/v1/commercial/legal-issuers/coro-draft"),
                "Brouillon CORO préparé.",
              )
            }
          >
            Préparer le brouillon CORO
          </button>
        )}
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <aside className="rounded border bg-white p-4">
            {issuers.map((issuer) => (
              <div key={issuer.id}>
                <b>{issuer.code}</b>
                {issuer.versions.map((version) => (
                  <button
                    className="mt-2 block w-full rounded border p-2 text-left"
                    key={version.id}
                    onClick={() => setSelected(version)}
                  >
                    v{version.versionNumber} · {version.status}
                  </button>
                ))}
              </div>
            ))}
          </aside>
          {selected && (
            <section className="space-y-4 rounded border bg-white p-5">
              <div className="grid gap-3 md:grid-cols-2">
                {input("Nom légal", "legalName")}
                {input("Nom commercial", "tradeName")}
                {input("Forme juridique", "legalForm")}
                {input("Pays ISO", "country")}
                {input("Province/territoire", "subdivision")}
                {input("Adresse", "addressLine1")}
                {input("Complément d’adresse", "addressLine2")}
                {input("Ville", "city")}
                {input("Code postal", "postalCode")}
                {input("Courriel officiel", "officialEmail")}
                {input("Téléphone officiel", "officialPhone")}
                {input("Site Web", "website")}
                {selectApplicability(
                  "Numéro d’entreprise",
                  "businessNumberApplicability",
                )}
                {input("Valeur numéro d’entreprise", "businessNumber")}
                {selectApplicability(
                  "Taxes fédérales",
                  "federalTaxApplicability",
                )}
                {input("Numéro taxes fédérales", "federalTaxNumber")}
                {selectApplicability(
                  "Taxes provinciales",
                  "provincialTaxApplicability",
                )}
                {input("Numéro taxes provinciales", "provincialTaxNumber")}
                {input("Devise", "referenceCurrency")}
                {input("Représentant", "representativeName")}
                {input("Titre du représentant", "representativeTitle")}
                {input("Courriel du représentant", "representativeEmail")}
                {input("Signataire autorisé", "authorizedSignatoryName")}
                {input("Titre du signataire", "authorizedSignatoryTitle")}
                {input("Courriel du signataire", "authorizedSignatoryEmail")}
              </div>
              <p className="text-xs">
                Provenance : {selected.provenance}
                <br />
                <span className="font-mono">
                  SHA-256 : {selected.contentHash}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.status === "DRAFT" && (
                  <>
                    <button
                      className="rounded border px-3 py-2"
                      disabled={busy}
                      onClick={() =>
                        void action(
                          () =>
                            api.patch(
                              `/admin/v1/commercial/legal-issuers/versions/${selected.id}`,
                              payload(),
                            ),
                          "Brouillon enregistré.",
                        )
                      }
                    >
                      Enregistrer
                    </button>
                    <button
                      className="rounded bg-emerald-700 px-3 py-2 text-white"
                      disabled={busy}
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/legal-issuers/versions/${selected.id}/verify`,
                              {
                                lockVersion: selected.lockVersion,
                                reason: "Vérification juridique explicite",
                              },
                            ),
                          "Version vérifiée.",
                        )
                      }
                    >
                      Vérifier explicitement
                    </button>
                  </>
                )}
                {selected.status === "VERIFIED" && (
                  <>
                    <button
                      className="rounded border px-3 py-2"
                      disabled={busy}
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              "/admin/v1/commercial/legal-issuers/CORO/revisions",
                            ),
                          "Nouvelle version préparée.",
                        )
                      }
                    >
                      Préparer une nouvelle version
                    </button>
                    <button
                      className="rounded border px-3 py-2"
                      disabled={busy}
                      onClick={() =>
                        void action(
                          () =>
                            api.post(
                              `/admin/v1/commercial/legal-issuers/versions/${selected.id}/archive`,
                              {
                                lockVersion: selected.lockVersion,
                                reason: "Archivage administratif",
                              },
                            ),
                          "Version archivée.",
                        )
                      }
                    >
                      Archiver
                    </button>
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
