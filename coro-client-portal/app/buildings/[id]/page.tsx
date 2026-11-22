"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Building2, FileCheck2, FolderOpen, Shield, ArrowRight, MonitorUp, ChevronRight, FileText } from "lucide-react";
import { apiGet, getUser } from "../../store/auth";
import PortalLayout from "../../components/PortalLayout";
import BuildingDocuments from "../../components/building-documents/BuildingDocuments";
import { belongsToBuilding } from "../building-projects";
import styles from "./building-workspace.module.css";

type Building = { id: string; name: string; address?: string; city?: string };
type Project = { id: string; name: string; documentType: string; status: string; buildingId?: string; building?: { id: string } };
const statuses: Record<string, string> = { DRAFT: "Brouillon", IN_PROGRESS: "En cours", REVIEW: "En révision", VALIDATED: "Validé", EXPORTED: "Exporté", ARCHIVED: "Archivé" };
const statusTone: Record<string, string> = { DRAFT: "pillNeutral", IN_PROGRESS: "pillBlue", REVIEW: "pillAmber", VALIDATED: "pillGreen", EXPORTED: "pillGreen", ARCHIVED: "pillNeutral" };
export default function BuildingWorkspacePage() {
  const params = useParams();
  const buildingId = String(params.id);
  const canReadDisplay = getUser()?.displayPermissions?.includes("DISPLAY_CLIENT_PLAN_READ") === true;
  const [building, setBuilding] = useState<Building | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [section, setSection] = useState<"conformity" | "documentation">("conformity");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
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
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [buildingId, attempt]);
  return <PortalLayout><div className={styles.page}>
    <Link href="/buildings" className={styles.back}>← Mes bâtiments</Link>
    {loading ? <p role="status" className={styles.state}>Chargement du bâtiment…</p> : error ? <div role="alert" className={styles.state}><p>{error}</p><button type="button" onClick={() => setAttempt(a => a + 1)}>Réessayer</button></div> : building && <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}><Building2 size={14} /> Fiche bâtiment</p>
          <h1>{building.name}</h1>
          <p className={styles.address}>{[building.address, building.city].filter(Boolean).join(", ")}</p>
        </div>
        <div className={styles.operations}>
          {canReadDisplay && <Link href={`/display?buildingId=${encodeURIComponent(buildingId)}`}><MonitorUp size={16} /> CORO Display</Link>}
          <Link href={`/sentinelle/${buildingId}/resilience`}><Shield size={16} /> Résilience</Link>
          <Link href={`/sentinelle/${buildingId}`} className={styles.primary}>Sentinelle <ArrowRight size={16} /></Link>
        </div>
      </header>
      <nav className={styles.sections} aria-label="Espaces documentaires du bâtiment">
        <button type="button" className={styles.sectionCard} aria-pressed={section === "conformity"} aria-controls="building-conformity" onClick={() => setSection("conformity")}>
          <span className={`${styles.iconTile} ${styles.iconRed}`}><FileCheck2 size={21} /></span>
          <span className={styles.sectionBody}>
            <span className={styles.sectionTitle}><strong>Documents de conformité</strong><span className={`${styles.pill} ${styles.pillRed}`}>{projects.length} dossier{projects.length > 1 ? "s" : ""}</span></span>
            <small>PMU, PSI, PCA et livrables préparés par votre conseiller</small>
          </span>
          <ChevronRight size={18} className={styles.chevron} />
        </button>
        <button type="button" className={styles.sectionCard} aria-pressed={section === "documentation"} aria-controls="building-documentation" onClick={() => setSection("documentation")}>
          <span className={`${styles.iconTile} ${styles.iconBlue}`}><FolderOpen size={21} /></span>
          <span className={styles.sectionBody}>
            <span className={styles.sectionTitle}><strong>Documentation du bâtiment</strong><span className={`${styles.pill} ${styles.pillBlue}`}>Fichiers</span></span>
            <small>Plans techniques, rapports, registres, photos et fichiers de référence</small>
          </span>
          <ChevronRight size={18} className={styles.chevron} />
        </button>
      </nav>
      <section id="building-conformity" hidden={section !== "conformity"} className={styles.panel} aria-label="Documents de conformité du bâtiment">
        <div className={styles.panelHeader}>
          <div><h2>Documents de conformité</h2><p>Livrables transmis par votre prestataire et leur état de validation</p></div>
          <Link href={`/documents?building=${buildingId}`}>Rechercher et filtrer <ArrowRight size={14} /></Link>
        </div>
        {projects.length ? <div className={styles.projects}>{projects.map(p => (
          <Link className={styles.project} key={p.id} href={`/documents/${p.id}`}>
            <span className={`${styles.iconTile} ${styles.iconRed}`}><FileText size={19} /></span>
            <div className={styles.projectBody}><span className={styles.projectType}>{p.documentType}</span><h3>{p.name}</h3></div>
            <span className={`${styles.pill} ${styles[statusTone[p.status] || "pillNeutral"]}`}>{statuses[p.status] || p.status}</span>
            <ChevronRight size={18} className={styles.chevron} />
          </Link>
        ))}</div> : <div className={styles.empty}><FileCheck2 size={32} />Aucun dossier de conformité pour ce bâtiment. Les plans et fichiers de référence se trouvent dans « Documentation du bâtiment ».</div>}
      </section>
      <div id="building-documentation" hidden={section !== "documentation"}><BuildingDocuments key={buildingId} buildingId={buildingId} /></div>
    </>}
  </div></PortalLayout>;
}
