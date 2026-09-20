"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, FileCheck2, ShieldAlert } from "lucide-react";
import PortalLayout from "../../../../../components/PortalLayout";
import { ApiError, apiGet, apiPost, getUser } from "../../../../../store/auth";
import type { EvidenceActor, EvidenceCommunication, EvidenceVerification, PopulationEvidenceManifest, PopulationEvidenceRecord } from "../evidenceTypes";
import { communicationLabel, evidenceExceptions, formatEvidenceUtc } from "../evidenceView.mjs";
import styles from "../evidence.module.css";

const number = (value: unknown) => typeof value === "number" ? value : 0;
const actor = (value: EvidenceActor | null | undefined) => value?.displayName ? `${value.displayName}${value.role ? ` · ${value.role}` : ""}` : "Non enregistre";
const shortHash = (value: string) => `${value.slice(0, 12)}...${value.slice(-8)}`;

function Hash({ value }: { value: string }) {
  return <span className={styles.hashValue}><code title={value}>{shortHash(value)}</code><button className={styles.copyButton} type="button" onClick={() => void navigator.clipboard.writeText(value)} title="Copier l'empreinte" aria-label="Copier l'empreinte"><Copy size={16} /></button></span>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function Communication({ item }: { item: EvidenceCommunication }) {
  const timestamps = [
    ["Creee", item.timestamps.createdAt], ["Prete", item.timestamps.readyAt],
    ["Approuvee", item.timestamps.approvedAt], ["Roster fige", item.timestamps.recipientsFrozenAt],
    ["Diffusee", item.timestamps.activatedAt], ["Terminee", item.timestamps.endedAt],
  ].filter((entry) => entry[1]);
  return (
    <details className={styles.details} open={item.cycleSequence === 1}>
      <summary><span>#{item.cycleSequence ?? "-"} · {communicationLabel(item.type, item.cycleSequence)}</span><span>{item.deliveryMode} · {item.status}</span></summary>
      <div className={styles.communicationBody}>
        <div className={styles.subsection}><h3>CONTENU APPROUVE</h3><div className={styles.contentBlock}><strong>{item.content.titleFR}</strong>{"\n"}{item.content.messageFR}{item.content.instructionFR ? `\n\n${item.content.instructionFR}` : ""}{item.content.titleEN || item.content.messageEN ? `\n\nEN\n${item.content.titleEN ?? ""}\n${item.content.messageEN ?? ""}${item.content.instructionEN ? `\n\n${item.content.instructionEN}` : ""}` : ""}</div></div>
        <div className={styles.subsection}><h3>CONTENU MATERIALISE</h3>{item.content.materializedVariants.length === 1 ? <p>Une seule variante materialisee a ete observee.</p> : <p>{item.content.materializedVariants.length} variantes materialisees ont ete observees, sans destination individuelle.</p>}{item.content.materializedVariants.map((variant, index) => <div className={styles.contentBlock} key={`${variant.channel}-${variant.language}-${index}`}><strong>{variant.channel} · {variant.language}</strong>{"\n"}{variant.message}</div>)}</div>
        <div className={styles.subsection}><h3>CHRONOLOGIE ET ACTEURS</h3><table className={styles.table}><tbody>{timestamps.map(([label, value]) => <tr key={label}><th>{label}</th><td>{formatEvidenceUtc(value)}</td></tr>)}<tr><th>Creee par</th><td>{actor(item.actors.createdBy)}</td></tr><tr><th>Approuvee par</th><td>{actor(item.actors.approvedBy)}</td></tr><tr><th>Roster fige par</th><td>{actor(item.actors.frozenBy)}</td></tr><tr><th>Diffusee par</th><td>{actor(item.actors.sentBy)}</td></tr></tbody></table></div>
        <div className={styles.subsection}><h3>CIBLAGE AGREGE</h3><dl className={styles.metrics}>{Object.entries(item.targeting).map(([key, value]) => <Metric key={key} label={key} value={value} />)}</dl></div>
        <div className={styles.subsection}><h3>ZONES</h3><table className={styles.table}><thead><tr><th>Zone</th><th>Distance</th><th>Action</th><th>Cibles</th><th>Geometrie</th><th>Empreinte</th></tr></thead><tbody>{item.zones.map((zone) => <tr key={zone.code}><td>{zone.code} · {zone.nameFR}</td><td>{zone.maxDistanceKm ?? "-"} km</td><td>{zone.protectiveAction ?? "-"}</td><td>{zone.targetedSubscriberCount}</td><td>{zone.geometry.present ? "OUI" : "NON"}</td><td>{zone.geometry.sha256 ? <Hash value={zone.geometry.sha256} /> : "-"}</td></tr>)}</tbody></table></div>
        <div className={styles.subsection}><h3>DIFFUSION</h3><dl className={styles.metrics}>{Object.entries(item.deliverySummary).map(([key, value]) => <Metric key={key} label={key} value={value ?? "-"} />)}</dl><h3>PREUVE FOURNISSEUR AGREGEE</h3><dl className={styles.metrics}>{Object.entries(item.providerSummary.counts).map(([key, value]) => <Metric key={key} label={key} value={value} />)}<Metric label="Premier evenement fournisseur" value={formatEvidenceUtc(item.providerSummary.firstProviderOccurredAt)} /><Metric label="Dernier evenement fournisseur" value={formatEvidenceUtc(item.providerSummary.lastProviderOccurredAt)} /></dl></div>
      </div>
    </details>
  );
}

export default function PopulationEvidencePage() {
  const params = useParams<{ buildingId: string; evidenceId: string }>();
  const router = useRouter();
  const { buildingId, evidenceId } = params;
  const [record, setRecord] = useState<PopulationEvidenceRecord | null>(null);
  const [manifest, setManifest] = useState<PopulationEvidenceManifest | null>(null);
  const [verification, setVerification] = useState<EvidenceVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canGenerate = getUser()?.populationPermissions?.includes("POPULATION_PREPARE") ?? false;

  const load = async () => {
    setError(null);
    try {
      const evidence = (await apiGet(`/client-portal/buildings/${buildingId}/population/evidence/${evidenceId}`)) as PopulationEvidenceRecord;
      setRecord(evidence);
      try { setManifest((await apiGet(`/client-portal/buildings/${buildingId}/population/evidence/${evidenceId}/manifest`)) as PopulationEvidenceManifest); }
      catch (caught) { if (!(caught instanceof ApiError && caught.status === 404)) throw caught; setManifest(null); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Le dossier n'a pas pu etre charge."); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!getUser()) router.replace("/login"); else void load(); }, [buildingId, evidenceId]);

  const generateManifest = async () => {
    if (!window.confirm("GENERER LE MANIFEST D'INTEGRITE ?\n\nLe manifest calcule les empreintes des composants du dossier. Il ne constitue pas une signature numerique independante.")) return;
    setWorking(true); setError(null);
    try { setManifest((await apiPost(`/client-portal/buildings/${buildingId}/population/evidence/${evidenceId}/manifest`, {})) as PopulationEvidenceManifest); }
    catch (caught) { await load(); setError(caught instanceof Error ? caught.message : "Le manifest n'a pas pu etre genere."); }
    finally { setWorking(false); }
  };
  const verify = async () => {
    setWorking(true); setError(null);
    try { setVerification((await apiGet(`/client-portal/buildings/${buildingId}/population/evidence/${evidenceId}/verify`)) as EvidenceVerification); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "La verification n'a pas pu etre effectuee."); }
    finally { setWorking(false); }
  };

  const exceptions = useMemo(() => record ? evidenceExceptions(record.snapshot) : [], [record]);
  if (loading) return <PortalLayout><div className={styles.loadingPage}>Chargement du dossier de preuve...</div></PortalLayout>;
  if (!record) return <PortalLayout><main className={styles.page}><Link className={styles.backLink} href={`/sentinelle/${buildingId}/population`}><ArrowLeft size={18} /> Retour a Sentinelle Population</Link><div className={`${styles.warning} ${styles.critical}`}>{error ?? "Dossier de preuve introuvable."}</div></main></PortalLayout>;
  const s = record.snapshot;
  const integrityLabel = verification?.status === "VERIFIED" ? "VERIFIEE" : verification?.status === "MISMATCH" ? "DIVERGENCE" : verification?.status === "UNAVAILABLE" ? "NON DISPONIBLE" : "A VERIFIER";
  const duration = s.event.endedAt ? Math.max(0, new Date(s.event.endedAt).getTime() - new Date(s.event.startedAt).getTime()) : null;

  return <PortalLayout><main className={styles.page}>
    <Link className={styles.backLink} href={`/sentinelle/${buildingId}/population`}><ArrowLeft size={18} /> Historique Sentinelle Population</Link>
    <header className={styles.documentHeader}><p className={styles.brand}>CORO · SENTINELLE POPULATION</p><h1>Dossier de preuve</h1><dl className={styles.identityGrid}><Metric label="Reference" value={record.reference} /><Metric label="Version" value={record.version} /><Metric label="Statut" value="FINALISE" /><Metric label="Completude" value={s.summary.completionStatus} /><Metric label="Genere le" value={formatEvidenceUtc(record.generatedAt)} /><Metric label="Genere par" value={`Acteur ${record.generatedByType} enregistre dans la piste d'audit`} /><Metric label="Organisation" value={s.organization.name} /><Metric label="Batiment" value={s.building.name} /><Metric label="Programme" value={s.program.publicSlug} /><Metric label="Scenario" value={s.scenario.nameFR} /><Metric label="Debut evenement" value={formatEvidenceUtc(s.event.startedAt)} /><Metric label="Fin evenement" value={formatEvidenceUtc(s.event.endedAt)} /><Metric label="Integrite" value={<span className={styles.status}>{integrityLabel}</span>} /></dl></header>
    {error && <div className={`${styles.warning} ${styles.critical}`} aria-live="assertive">{error}</div>}
    <section className={styles.section}><h2>Synthese executive</h2><p className={styles.sectionLead}>Evenement termine. {s.summary.communicationCount} communications publiques ont ete enregistrees. {number(s.summary.deliveryCount)} communications ont ete materialisees; {number(s.summary.delivered)} ont atteint l'etat DELIVERED. {number(s.summary.failed)} echec. {number(s.summary.outcomeUnknown)} resultat en reconciliation.</p><dl className={styles.metrics}><Metric label="Communications" value={s.summary.communicationCount} /><Metric label="Materialisees" value={s.summary.deliveryCount} /><Metric label="DELIVERED" value={s.summary.delivered} /><Metric label="FAILED" value={s.summary.failed} /></dl></section>
    {exceptions.length > 0 && <section className={styles.section}><div className={`${styles.warning} ${s.summary.completionStatus === "INCOMPLETE" ? styles.critical : ""}`}><h2><AlertTriangle size={20} /> Exceptions / points a examiner</h2><ul>{exceptions.map((item) => <li key={item}>{item}</li>)}</ul></div></section>}
    <section className={styles.section}><h2>Chronologie</h2><div className={styles.timeline}><div className={styles.timelineItem}><strong>Ouverture de l'evenement</strong><span>{formatEvidenceUtc(s.event.startedAt)} · {actor(s.event.startedBy)}</span></div>{s.communications.flatMap((item) => [[`#${item.cycleSequence ?? "-"} ${communicationLabel(item.type, item.cycleSequence)} creee`, item.timestamps.createdAt], [`#${item.cycleSequence ?? "-"} approuvee`, item.timestamps.approvedAt], [`#${item.cycleSequence ?? "-"} roster fige`, item.timestamps.recipientsFrozenAt], [`#${item.cycleSequence ?? "-"} diffusee`, item.timestamps.activatedAt]]).filter((entry) => entry[1]).map(([label, date], index) => <div className={styles.timelineItem} key={`${label}-${index}`}><strong>{label}</strong><span>{formatEvidenceUtc(date)}</span></div>)}<div className={styles.timelineItem}><strong>Cloture de l'evenement</strong><span>{formatEvidenceUtc(s.event.endedAt)} · {actor(s.event.endedBy)}</span></div></div></section>
    <section className={styles.section}><h2>Communications</h2><p className={styles.sectionLead}>Contenu, ciblage et resultats issus exclusivement du snapshot finalise.</p>{[...s.communications].sort((a, b) => (a.cycleSequence ?? 0) - (b.cycleSequence ?? 0)).map((item) => <Communication key={item.id} item={item} />)}</section>
    <section className={styles.section}><h2>Cloture de l'evenement</h2><dl className={styles.identityGrid}><Metric label="Debut" value={formatEvidenceUtc(s.event.startedAt)} /><Metric label="Fin" value={formatEvidenceUtc(s.closure.endedAt)} /><Metric label="Duree" value={duration === null ? "Non calculable" : `${Math.floor(duration / 3600000)} h ${Math.floor((duration % 3600000) / 60000)} min`} /><Metric label="Cloture par" value={actor(s.closure.endedBy)} /><Metric label="Motif" value={s.closure.closeReason ?? "Aucun motif exceptionnel enregistre."} /><Metric label="Completude" value={s.summary.completionStatus} /></dl></section>
    <section className={styles.section} aria-live="polite"><h2>Integrite du dossier</h2><dl className={styles.hashGrid}><Metric label="Evidence schema" value={record.schemaVersion} /><Metric label="Evidence version" value={record.version} /><Metric label="Snapshot SHA-256" value={<Hash value={record.snapshotSha256} />} />{manifest && <><Metric label="Manifest schema" value={manifest.schemaVersion} /><Metric label="Manifest version" value={manifest.version} /><Metric label="Manifest SHA-256" value={<Hash value={manifest.manifestSha256} />} /><Metric label="Algorithme" value={manifest.manifest.integrity.algorithm} /><Metric label="Canonicalisation" value={manifest.manifest.canonicalization} />{Object.entries(manifest.manifest.components).map(([key, value]) => <Metric key={key} label={key} value={<Hash value={value} />} />)}</>}</dl>
      {!manifest ? <><p>Le snapshot de preuve est fige. Aucun manifest d'integrite n'a encore ete genere.</p><p className={styles.trust}>Le manifest calcule les empreintes des composants du dossier. Il ne constitue pas une signature numerique independante.</p><div className={styles.actions}><button className={`${styles.action} ${styles.actionPrimary}`} type="button" disabled={!canGenerate || working} onClick={() => void generateManifest()}>{working ? "GENERATION..." : "GENERER LE MANIFEST D'INTEGRITE"}</button></div></> : <div className={styles.actions}><button className={`${styles.action} ${styles.actionPrimary}`} type="button" disabled={working} onClick={() => void verify()}>{working ? "VERIFICATION..." : "VERIFIER L'INTEGRITE"}</button></div>}
      {verification && <div className={`${styles.warning} ${verification.status === "MISMATCH" ? styles.critical : ""}`}>{verification.status === "VERIFIED" ? <CheckCircle2 size={20} /> : verification.status === "MISMATCH" ? <ShieldAlert size={20} /> : <FileCheck2 size={20} />}<strong>{verification.status === "VERIFIED" ? " INTEGRITE VERIFIEE" : verification.status === "MISMATCH" ? " DIVERGENCE D'INTEGRITE DETECTEE" : " VERIFICATION NON DISPONIBLE"}</strong>{verification.status === "VERIFIED" && <p>Les donnees du dossier correspondent aux empreintes enregistrees par CORO.</p>}<p>Derniere verification dans cette session : {formatEvidenceUtc(verification.verifiedAt)}</p></div>}
      <p className={styles.trust}>La verification d'integrite confirme que les donnees correspondent aux empreintes enregistrees par CORO.<br /><br />Le dossier et ses empreintes sont actuellement conserves dans la meme infrastructure CORO. Cette verification ne constitue pas une signature numerique independante.</p>
    </section>
  </main></PortalLayout>;
}
