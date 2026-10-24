"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Building2, FileCheck2, FolderOpen, Shield, ArrowRight } from "lucide-react";
import { apiGet } from "../../store/auth";
import PortalLayout from "../../components/PortalLayout";
import BuildingDocuments from "../../components/building-documents/BuildingDocuments";
import { belongsToBuilding } from "../building-projects";
import styles from "./building-workspace.module.css";

type Building = { id: string; name: string; address?: string; city?: string };
type Project = { id: string; name: string; documentType: string; status: string; buildingId?: string; building?: { id: string } };
const statuses: Record<string, string> = { DRAFT: "Brouillon", IN_PROGRESS: "En cours", REVIEW: "En révision", VALIDATED: "Validé", EXPORTED: "Exporté", ARCHIVED: "Archivé" };
export default function BuildingWorkspacePage() {
  const params = useParams();
  const buildingId = String(params.id);
  const [building, setBuilding] = useState<Building | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [section, setSection] = useState<"conformity" | "documentation">("conformity");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setBuilding(null); setProjects([]);
    Promise.all([apiGet("/client-portal/buildings"), apiGet("/client-portal/projects")])
      .then(([buildings, allProjects]) => {
        if (!active) return;
        const found = (buildings as Building[]).find(b => b.id === buildingId);
        if (!found) throw new Error("Ce bâtiment est introuvable ou inaccessible avec vos permissions.");
        setBuilding(found);
        setProjects((allProjects as Project[]).filter(p => belongsToBuilding(p, buildingId)));
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Impossible de charger le bâtiment."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [buildingId, attempt]);
  return <PortalLayout><div className={styles.page}>
    <Link href="/buildings" className={styles.back}>← Mes bâtiments</Link>
    {loading ? <p role="status">Chargement du bâtiment…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(a => a + 1)}>Réessayer</button></div> : building && <>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}><Building2 size={16} /> FICHE BÂTIMENT</p><h1>{building.name}</h1><p>{[building.address, building.city].filter(Boolean).join(", ")}</p></div>
        <div className={styles.operations}><Link href={`/sentinelle/${buildingId}/resilience`}><Shield size={17} /> Résilience</Link><Link href={`/sentinelle/${buildingId}`}>Sentinelle <ArrowRight size={17} /></Link></div>
      </header>
      <nav className={styles.sections} aria-label="Espaces documentaires du bâtiment">
        <button type="button" aria-pressed={section === "conformity"} aria-controls="building-conformity" onClick={() => setSection("conformity")}><FileCheck2 size={24} /><span><strong>Documents de conformité</strong><small>PMU, PSI, PCA et livrables de votre organisation</small><span>{projects.length} dossier{projects.length > 1 ? "s" : ""} de conformité</span></span></button>
        <button type="button" aria-pressed={section === "documentation"} aria-controls="building-documentation" onClick={() => setSection("documentation")}><FolderOpen size={24} /><span><strong>Documentation du bâtiment</strong><small>Plans techniques, rapports, registres, photos et fichiers de référence</small><span>Consulter les fichiers et ajouter un document selon vos droits</span></span></button>
      </nav>
      <section id="building-conformity" hidden={section !== "conformity"} className={styles.panel} aria-label="Documents de conformité du bâtiment">
        <div className={styles.panelHeader}><div><h2>Documents de conformité</h2><p>Consultez les livrables réalisés par votre organisation et suivez leur état de validation.</p></div><Link href={`/documents?building=${buildingId}`}>Rechercher et filtrer <ArrowRight size={16} /></Link></div>
        {projects.length ? <div className={styles.projects}>{projects.map(p => <Link className={styles.project} key={p.id} href={`/documents/${p.id}`}><FileCheck2 size={22} /><div><span>{p.documentType}</span><h3>{p.name}</h3><p>{statuses[p.status] || p.status}</p></div><ArrowRight size={18} /></Link>)}</div> : <p>Aucun dossier de conformité pour ce bâtiment. Les plans et fichiers de référence se trouvent dans « Documentation du bâtiment ».</p>}
      </section>
      <div id="building-documentation" hidden={section !== "documentation"}><BuildingDocuments key={buildingId} buildingId={buildingId} /></div>
    </>}
  </div></PortalLayout>;
}
