"use client";

import { useCallback, useEffect, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import {
  enrollOfflineVault,
  isOfflineVaultReady,
  listOfflineDocuments,
  openOfflineDocument,
  reconcileOfflineDocuments,
} from "./offline-vault";
import styles from "./offline-documents.module.css";

type OfflineItem = Awaited<ReturnType<typeof listOfflineDocuments>>[number];

export default function OfflineDocumentsPage() {
  const [items, setItems] = useState<OfflineItem[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [vaultReady, setVaultReady] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [documents, ready] = await Promise.all([
        listOfflineDocuments(),
        isOfflineVaultReady(),
      ]);
      setItems(documents);
      setVaultReady(ready);
    } catch {
      setItems([]);
      setVaultReady(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enroll = async () => {
    setBusy(true);
    setMessage("");
    try {
      await enrollOfflineVault();
      setVaultReady(true);
      setMessage("Appareil prêt. WebAuthn PRF protège le coffre hors ligne.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Activation refusée");
    } finally {
      setBusy(false);
    }
  };

  const open = async (item: OfflineItem) => {
    setBusy(true);
    setMessage("");
    try {
      const document = await openOfflineDocument(item.id);
      const url = URL.createObjectURL(document.blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ouverture refusée");
    } finally {
      setBusy(false);
    }
  };

  const reconcile = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await reconcileOfflineDocuments();
      setMessage(`${result.purge?.length || 0} document(s) purgé(s).`);
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Réconciliation refusée",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalLayout>
      <main className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>DOCUMENTS D&apos;URGENCE</p>
          <h1>Accès hors ligne</h1>
          <p className={styles.intro}>
            Seuls les documents approuvés et explicitement classifiés non
            sensibles peuvent être conservés. L&apos;accès expire après 24
            heures et exige une vérification locale WebAuthn. Une révocation
            distante ne peut pas être instantanée pendant une coupure complète.
          </p>
        </header>

        <section className={styles.controlPanel} aria-label="Coffre hors ligne">
          <div className={styles.controlCopy}>
            <strong>
              {vaultReady ? "Appareil activé" : "Appareil non activé"}
            </strong>
            <span>
              {vaultReady
                ? "La clé locale est protégée par WebAuthn PRF."
                : "Activez cet appareil avant de préparer un document."}
            </span>
          </div>
          <div className={styles.actions}>
            {!vaultReady && (
              <button
                type="button"
                disabled={busy}
                onClick={enroll}
                className={styles.primaryButton}
              >
                Activer ce navigateur
              </button>
            )}
            <button
              type="button"
              disabled={
                busy ||
                !vaultReady ||
                (typeof navigator !== "undefined" && !navigator.onLine)
              }
              onClick={reconcile}
              className={styles.secondaryButton}
            >
              Réconcilier maintenant
            </button>
          </div>
        </section>

        {message && (
          <p role="status" className={styles.status}>
            {message}
          </p>
        )}

        <section
          className={styles.documentList}
          aria-label="Documents préparés"
        >
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              Aucun document préparé sur cet appareil.
            </div>
          ) : (
            items.map((item) => (
              <article key={item.id} className={styles.documentCard}>
                <strong>Document d&apos;urgence hors ligne</strong>
                <p>
                  Expire le{" "}
                  {new Date(item.lease.payload.expiresAt).toLocaleString(
                    "fr-CA",
                  )}
                </p>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={busy}
                  onClick={() => open(item)}
                >
                  Vérifier et ouvrir hors ligne
                </button>
              </article>
            ))
          )}
        </section>
      </main>
    </PortalLayout>
  );
}
