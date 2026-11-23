"use client";

/**
 * M8-07 — Fonctions actives par client, comparées à ce que promet le site.
 * Lecture seule. Les données restent dans l'application (jamais dans un
 * journal public).
 */
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

type Offer = { key: string; label: string; siteRoute: string | null; technicallyEnabled: boolean };
type Gap = { offer: string; kind: string; message: string };
type Coverage = {
  generatedAt: string;
  enforcementMode: "OFF" | "AUDIT" | "ENFORCE";
  offers: Offer[];
  clients: Array<{
    id: string;
    name: string;
    offers: Record<string, boolean>;
    buildings: Array<{ id: string; name: string; offers: Record<string, boolean> }>;
  }>;
  gaps: Gap[];
};

const MODE_LABEL: Record<Coverage["enforcementMode"], string> = {
  OFF: "Contrôle désactivé : tout est accessible",
  AUDIT: "Mode observation : rien n’est bloqué, les écarts sont journalisés",
  ENFORCE: "Contrôle strict : seules les fonctions actives sont accessibles",
};

const GAP_LABEL: Record<string, string> = {
  PROMISED_NOT_ACTIVE: "Promis sur le site, actif nulle part",
  ACTIVE_NOT_ON_SITE: "Actif chez un client, absent du site",
  LICENSED_NOT_DEPLOYED: "Vendu, mais désactivé sur le serveur",
};

const cell: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #E9ECEF", fontSize: 13 };

function Mark({ on }: { on: boolean }) {
  return (
    <span
      aria-label={on ? "Actif" : "Inactif"}
      style={{ display: "inline-block", minWidth: 22, textAlign: "center", fontWeight: 700, color: on ? "#1E8449" : "#ADB5BD" }}
    >
      {on ? "✓" : "—"}
    </span>
  );
}

export default function CapabilityCoveragePage() {
  const user = useAuthStore((state) => state.user);
  const organizationId = useMemo(() => {
    if (typeof window !== "undefined") {
      const fromUrl = new URLSearchParams(window.location.search).get("organizationId");
      if (fromUrl) return fromUrl;
    }
    return user?.organizationId ?? "";
  }, [user?.organizationId]);
  const [data, setData] = useState<Coverage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) return;
    setError("");
    api
      .get(`/admin/v1/organizations/${organizationId}/capability-coverage`)
      .then((response) => setData(response.data as Coverage))
      .catch(() => setError("Impossible de charger les fonctions actives. Vérifiez vos droits de super administrateur."));
  }, [organizationId]);

  return (
    <AppLayout>
      <div style={{ padding: 24, maxWidth: 1280 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#ADB5BD", textTransform: "uppercase" }}>
          Administration commerciale
        </p>
        <h1 style={{ margin: "4px 0 6px", fontSize: 24, color: "#2C3E50" }}>Fonctions actives par client</h1>
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "#6C757D" }}>
          Ce qui est réellement actif pour chaque client et chaque bâtiment, comparé à ce que présente getcoro.io.
        </p>

        {error && <div role="alert" style={{ padding: 12, borderRadius: 6, background: "#FDEDEC", color: "#A93226" }}>{error}</div>}
        {!data && !error && <p style={{ color: "#6C757D" }}>Chargement…</p>}

        {data && (
          <>
            <div style={{ padding: 12, borderRadius: 6, background: "#FFFFFF", border: "1px solid #E9ECEF", marginBottom: 16, fontSize: 13, color: "#2C3E50" }}>
              <strong>Contrôle des droits :</strong> {MODE_LABEL[data.enforcementMode]}
            </div>

            <section style={{ background: "#FFFFFF", border: "1px solid #E9ECEF", borderRadius: 6, marginBottom: 16 }}>
              <h2 style={{ margin: 0, padding: "12px 14px", fontSize: 15, color: "#2C3E50", borderBottom: "1px solid #E9ECEF" }}>
                Écarts avec le site ({data.gaps.length})
              </h2>
              {data.gaps.length === 0 ? (
                <p style={{ margin: 0, padding: 14, fontSize: 13, color: "#1E8449" }}>Aucun écart : le site et les droits actifs concordent.</p>
              ) : (
                <ul style={{ margin: 0, padding: "8px 14px 12px 32px", fontSize: 13, color: "#2C3E50" }}>
                  {data.gaps.map((gap) => (
                    <li key={`${gap.offer}-${gap.kind}`} style={{ marginBottom: 6 }}>
                      <strong>{data.offers.find((offer) => offer.key === gap.offer)?.label ?? gap.offer}</strong> —{" "}
                      {GAP_LABEL[gap.kind] ?? gap.kind}. <span style={{ color: "#6C757D" }}>{gap.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section style={{ background: "#FFFFFF", border: "1px solid #E9ECEF", borderRadius: 6, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA", textAlign: "left" }}>
                    <th style={cell}>Client / bâtiment</th>
                    {data.offers.map((offer) => (
                      <th key={offer.key} style={{ ...cell, fontSize: 12 }}>
                        {offer.label}
                        <div style={{ fontWeight: 400, color: "#ADB5BD" }}>
                          {offer.siteRoute ? `site : ${offer.siteRoute}` : "absent du site"}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.clients.length === 0 && (
                    <tr>
                      <td style={cell} colSpan={data.offers.length + 1}>Aucun client actif.</td>
                    </tr>
                  )}
                  {data.clients.map((client) => (
                    <FragmentRows key={client.id} client={client} offers={data.offers} />
                  ))}
                </tbody>
              </table>
            </section>
            <p style={{ fontSize: 12, color: "#ADB5BD", marginTop: 10 }}>
              Généré le {new Date(data.generatedAt).toLocaleString("fr-CA")}. Un droit accordé à l’organisation ou au client s’applique à tous ses bâtiments.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function FragmentRows({ client, offers }: { client: Coverage["clients"][number]; offers: Offer[] }) {
  return (
    <>
      <tr style={{ background: "#FBFCFC" }}>
        <td style={{ ...cell, fontWeight: 700, color: "#2C3E50" }}>{client.name}</td>
        {offers.map((offer) => (
          <td key={offer.key} style={cell}><Mark on={client.offers[offer.key]} /></td>
        ))}
      </tr>
      {client.buildings.map((building) => (
        <tr key={building.id}>
          <td style={{ ...cell, paddingLeft: 26, color: "#6C757D" }}>{building.name}</td>
          {offers.map((offer) => (
            <td key={offer.key} style={cell}><Mark on={building.offers[offer.key]} /></td>
          ))}
        </tr>
      ))}
    </>
  );
}
