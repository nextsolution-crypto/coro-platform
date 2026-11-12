"use client";

import styles from "./display.module.css";

export type SupervisedDevice = {
  id: string;
  buildingId: string;
  locationId: string;
  profile: string;
  status: string;
  softwareVersion: string | null;
  lastCommunicationAt: string | null;
  lastVerifiedSyncAt: string | null;
  lastDeclaredVersion: number | null;
  lastHeartbeatAt: string | null;
  lastDeclaredMode: string | null;
  lastCacheHealth: string | null;
  lastRuntimeHealth: string | null;
  lastNetworkStatus: string | null;
  lastHeartbeatErrors: unknown;
};

const HEARTBEAT_FRESHNESS_MS = 2 * 60_000;

function connectivity(device: SupervisedDevice) {
  if (!device.lastHeartbeatAt) return "Jamais connecté";
  return Date.now() - Date.parse(device.lastHeartbeatAt) <=
    HEARTBEAT_FRESHNESS_MS
    ? "En ligne estimé"
    : "Heartbeat périmé";
}

export default function DeviceSupervision({
  devices,
  buildingNames,
}: {
  devices: SupervisedDevice[];
  buildingNames: Record<string, string>;
}) {
  return (
    <section
      className={styles.deviceSupervision}
      aria-labelledby="devices-title"
    >
      <div className={styles.heading}>
        <div>
          <h2 id="devices-title">Supervision des appareils</h2>
          <p>
            Connectivité estimée avec une fraîcheur de deux minutes. Un
            heartbeat ne prouve pas la visibilité physique du plan.
          </p>
        </div>
        <b>{devices.length} appareil(s)</b>
      </div>
      {!devices.length ? (
        <div className={styles.empty}>Aucun appareil enregistré.</div>
      ) : (
        <div className={styles.deviceGrid}>
          {devices.map((device) => (
            <article key={device.id} className={styles.deviceCard}>
              <div className={styles.cardTop}>
                <span>{connectivity(device)}</span>
                <small>{device.status}</small>
              </div>
              <h3>{buildingNames[device.buildingId] ?? "Bâtiment autorisé"}</h3>
              <p>
                {device.profile} ·{" "}
                {device.softwareVersion ?? "Version inconnue"}
              </p>
              <dl>
                <div>
                  <dt>Heartbeat</dt>
                  <dd>
                    {device.lastHeartbeatAt
                      ? new Date(device.lastHeartbeatAt).toLocaleString("fr-CA")
                      : "Aucun"}
                  </dd>
                </div>
                <div>
                  <dt>Synchronisation</dt>
                  <dd>
                    {device.lastVerifiedSyncAt
                      ? new Date(device.lastVerifiedSyncAt).toLocaleString(
                          "fr-CA",
                        )
                      : "Non confirmée"}
                  </dd>
                </div>
                <div>
                  <dt>État déclaré</dt>
                  <dd>
                    {device.lastDeclaredMode ?? "Inconnu"} · cache{" "}
                    {device.lastCacheHealth ?? "inconnu"} · runtime{" "}
                    {device.lastRuntimeHealth ?? "inconnu"}
                  </dd>
                </div>
                <div>
                  <dt>Réseau déclaré</dt>
                  <dd>{device.lastNetworkStatus ?? "Inconnu"}</dd>
                </div>
                <div>
                  <dt>Version activée</dt>
                  <dd>{device.lastDeclaredVersion ?? "Non déclarée"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
