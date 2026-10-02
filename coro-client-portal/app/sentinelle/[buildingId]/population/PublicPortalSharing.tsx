"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, QrCode } from "lucide-react";

import {
  buildPublicRegistrationUrl,
  copyPublicPortalUrl,
  createPublicPortalQr,
} from "./publicPortalSharing.mjs";

const configuredPublicBase = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL;

export default function PublicPortalSharing({
  publicSlug,
  registrationEnabled,
}: {
  publicSlug: string;
  registrationEnabled: boolean;
}) {
  const [qr, setQr] = useState<{ payload: string; svg: string } | null>(null);
  const [copyResult, setCopyResult] = useState<{ url: string; status: "copied" | "failed" } | null>(null);
  const runtimeOrigin = typeof window === "undefined" ? undefined : window.location.origin;
  const publicUrl = useMemo(
    () => buildPublicRegistrationUrl(publicSlug, configuredPublicBase, runtimeOrigin),
    [publicSlug, runtimeOrigin],
  );

  useEffect(() => {
    let current = true;
    if (!registrationEnabled || !publicUrl) return () => { current = false; };

    void createPublicPortalQr(publicUrl).then((result) => {
      if (current) setQr(result);
    });
    return () => { current = false; };
  }, [publicUrl, registrationEnabled]);

  const qrSvg = qr?.payload === publicUrl ? qr.svg : "";
  const copyState = copyResult?.url === publicUrl ? copyResult.status : "idle";

  async function copyLink() {
    try {
      await copyPublicPortalUrl(publicUrl);
      setCopyResult({ url: publicUrl, status: "copied" });
    } catch {
      setCopyResult({ url: publicUrl, status: "failed" });
    }
  }

  function downloadQr() {
    if (!qrSvg) return;
    const blobUrl = URL.createObjectURL(new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `sentinelle-population-${publicSlug.trim() || "portail"}.svg`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <section
      aria-label="Portail citoyen / Citizen portal"
      style={{
        gridColumn: "1 / -1",
        marginTop: 6,
        padding: 18,
        border: "1px solid #CFE7E1",
        borderRadius: 12,
        background: "#F5FBF9",
      }}
    >
      <p style={{ margin: "0 0 5px", color: "#167D6A", fontSize: 10, fontWeight: 900, letterSpacing: ".08em" }}>
        PORTAIL CITOYEN · CITIZEN PORTAL
      </p>
      <h3 style={{ margin: "0 0 6px", color: "#2C3E50", fontSize: 16 }}>
        Inscription publique / Public registration
      </h3>

      {!registrationEnabled ? (
        <p data-state="disabled" style={{ margin: 0, color: "#6C757D", lineHeight: 1.55 }}>
          Les inscriptions citoyennes sont actuellement désactivées.<br />
          Citizen registration is currently disabled.
        </p>
      ) : !publicUrl ? (
        <p data-state="missing-slug" style={{ margin: 0, color: "#9A6700", lineHeight: 1.55 }}>
          Définissez l’identifiant public pour générer le lien de partage.<br />
          Set the public identifier to generate the sharing link.
        </p>
      ) : (
        <div data-state="enabled">
          <p style={{ margin: "0 0 12px", color: "#52606D", fontSize: 12, lineHeight: 1.55 }}>
            Partagez ce lien ou ce code QR avec le public pour permettre l’inscription au programme Sentinelle Population.<br />
            Share this link or QR code with the public to register for the Sentinelle Population program.
          </p>
          <output
            aria-label="Adresse publique / Public address"
            style={{ display: "block", overflowWrap: "anywhere", padding: "10px 12px", border: "1px solid #D9E2E8", borderRadius: 8, background: "#FFFFFF", color: "#175C50", fontFamily: "monospace", fontSize: 12 }}
          >
            {publicUrl}
          </output>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={actionStyle}>
              <ExternalLink size={15} /> Ouvrir le portail / Open portal
            </a>
            <button type="button" onClick={() => void copyLink()} style={actionStyle}>
              {copyState === "copied" ? <Check size={15} /> : <Copy size={15} />}
              {copyState === "copied" ? "Lien copié / Link copied" : "Copier le lien / Copy link"}
            </button>
            <button type="button" onClick={downloadQr} disabled={!qrSvg} style={actionStyle}>
              <Download size={15} /> Télécharger le QR / Download QR
            </button>
          </div>
          {copyState === "failed" && (
            <p role="alert" style={{ margin: "8px 0 0", color: "#922B21", fontSize: 11 }}>
              Copie impossible. Sélectionnez le lien manuellement. / Copy failed. Select the link manually.
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
            <div aria-label="QR Code" style={{ width: 176, minHeight: 176, padding: 8, border: "1px solid #D9E2E8", borderRadius: 10, background: "#FFFFFF" }}>
              {qrSvg ? <div dangerouslySetInnerHTML={{ __html: qrSvg }} /> : <QrCode size={64} aria-hidden="true" />}
            </div>
            <p style={{ maxWidth: 330, margin: 0, color: "#6C757D", fontSize: 11, lineHeight: 1.55 }}>
              Le code QR contient exactement l’adresse affichée et peut être imprimé ou partagé numériquement.<br />
              The QR code contains exactly the displayed address and is suitable for print or digital sharing.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

const actionStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 36,
  padding: "8px 11px",
  border: "1px solid #B8D8D0",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#175C50",
  fontSize: 11,
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
} as const;
