"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, getUser } from "../store/auth";
import PortalLayout from "../components/PortalLayout";
import { belongsToBuilding } from "../buildings/building-projects";
import styles from "./documents.module.css";
import {
  Search,
  FileText,
  CheckCircle,
  Building2,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";

const STATUS_COLORS: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    label: string;
  }
> = {
  DRAFT: {
    bg: "#F8F9FA",
    text: "#6C757D",
    border: "#DEE2E6",
    label: "Brouillon",
  },

  IN_PROGRESS: {
    bg: "#EBF5FB",
    text: "#2980B9",
    border: "#AED6F1",
    label: "En cours",
  },

  REVIEW: {
    bg: "#FEF9E7",
    text: "#F39C12",
    border: "#FAD7A0",
    label: "En révision",
  },

  VALIDATED: {
    bg: "#EAFAF1",
    text: "#27AE60",
    border: "#A9DFBF",
    label: "Validé",
  },

  EXPORTED: {
    bg: "#F4ECF7",
    text: "#8E44AD",
    border: "#D2B4DE",
    label: "Exporté",
  },
  ARCHIVED: {
    bg: "#FDEDEC",
    text: "#C0392B",
    border: "#F1948A",
    label: "Archivé",
  },
};

const DOC_COLORS: Record<string, string> = {
  PMU: "#2980B9",
  PSI: "#C0392B",
  PCA: "#27AE60",
  PGC: "#8E44AD",
  PRA: "#E67E22",
  PUE: "#16A085",
};

export default function DocumentsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [buildings, setBuildings] = useState<Array<{id: string; name: string}>>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    setUser(currentUser);
    setBuildingFilter(new URLSearchParams(window.location.search).get("building") || "");
    apiGet("/client-portal/buildings").then(value => setBuildings(value || [])).catch(console.error);
    fetchProjects();
  }, [router]);

  const fetchProjects = async () => {
    try {
      const res = await apiGet("/client-portal/projects");
      setProjects(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scopedProjects = projects.filter(p => belongsToBuilding(p, buildingFilter));
  const filtered = scopedProjects.filter((p) => {
    if (filterStatus && p.status !== filterStatus) {
      return false;
    }

    if (filterType && p.documentType !== filterType) {
      return false;
    }

    if (search) {
      const q = search.toLowerCase();

      const matches =
        p.name?.toLowerCase().includes(q) ||
        p.building?.name?.toLowerCase().includes(q) ||
        p.client?.name?.toLowerCase().includes(q);

      if (!matches) {
        return false;
      }
    }

    return true;
  });

  const signedCount = scopedProjects.filter(
    (project) =>
      Array.isArray(project.signatures) && project.signatures.length > 0,
  ).length;
  const reviewCount = scopedProjects.filter(
    (project) => project.status === "REVIEW",
  ).length;
  const grouped = filtered.reduce<Record<string, any[]>>((groups, project) => {
    const category = project.documentType || "AUTRES";
    (groups[category] ||= []).push(project);
    return groups;
  }, {});
  const workspaceLabel =
    user?.organizationName ||
    user?.clientName ||
    user?.organization?.name ||
    "Votre espace client";

  if (loading || !user) {
    return (
      <PortalLayout>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
            padding: 24,
          }}
        >
          <p
            className="animate-pulse"
            style={{
              margin: 0,
              color: "#ADB5BD",
              fontSize: 14,
            }}
          >
            Chargement...
          </p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className={styles.page}>
        {/* En-tête */}
        <header className={styles.header}>
          <p className={styles.eyebrow}>Conformité</p>

          <h1 className={styles.title}>Vos documents de conformité</h1>
          <p className={styles.context}>
            <Building2 size={16} aria-hidden="true" />
            {workspaceLabel}
          </p>
          <p className={styles.intro}>
            Consultez les documents de vos b&acirc;timents, leur statut et leurs
            versions. La conservation hors ligne est propos&eacute;e uniquement
            pour les versions approuv&eacute;es admissibles.
          </p>
          <div className={styles.securityNote}>
            <ShieldCheck size={20} aria-hidden="true" />
            <span>
              Documents priv&eacute;s &bull; acc&egrave;s selon vos
              b&acirc;timents autoris&eacute;s
            </span>
          </div>
        </header>

        <section className={styles.summary} aria-label="Resume des documents">
          <div>
            <strong>{scopedProjects.length}</strong>
            <span>Dossiers de conformité</span>
          </div>
          <div>
            <strong>{signedCount}</strong>
            <span>Sign&eacute;s</span>
          </div>
          <div>
            <strong>{reviewCount}</strong>
            <span>En r&eacute;vision</span>
          </div>
        </section>

        {/* Filtres */}
        <div className={styles.filters}>
          <div className={styles.filterHeading}>
            <strong>Rechercher et filtrer</strong>
            <span>
              {filtered.length} r&eacute;sultat
              {filtered.length === 1 ? "" : "s"}
            </span>
          </div>
          {/* Recherche */}
          <div className={styles.search}>
            <Search size={16} className={styles.searchIcon} />

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher un document"
              className={styles.control}
            />
          </div>

          <select value={buildingFilter} onChange={e => setBuildingFilter(e.target.value)} aria-label="Filtrer par bâtiment" className={styles.control}>
            <option value="">Tous les bâtiments</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {buildingFilter && <a href={`/buildings/${encodeURIComponent(buildingFilter)}`}>Ouvrir la fiche bâtiment et sa documentation</a>}
          {/* Statut */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filtrer par statut"
            className={styles.control}
          >
            <option value="">Tous les statuts</option>

            {Object.entries(STATUS_COLORS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>

          {/* Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filtrer par type de document"
            className={styles.control}
          >
            <option value="">Tous les types</option>

            {["PMU", "PSI", "PCA", "PGC", "PRA", "PUE"].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Liste documents */}
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={48} color="#DEE2E6" />

            <p>Aucun document trouvé.</p>
            <span>
              {projects.length === 0
                ? "Les documents autoris\u00e9s appara\u00eetront ici lorsqu\u2019ils seront disponibles."
                : "Modifiez votre recherche ou retirez un filtre."}
            </span>
          </div>
        ) : (
          <div className={styles.categories}>
            {Object.entries(grouped).map(([category, categoryProjects]) => (
              <section key={category} className={styles.category}>
                <header className={styles.categoryHeader}>
                  <div>
                    <FolderOpen size={18} aria-hidden="true" />
                    <h2>{category}</h2>
                  </div>
                  <span>
                    {categoryProjects.length} document
                    {categoryProjects.length === 1 ? "" : "s"}
                  </span>
                </header>
                <div className={styles.list}>
                  {categoryProjects.map((p) => {
                    const sc = STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT;

                    const dc = DOC_COLORS[p.documentType] || "#6C757D";

                    const isSigned =
                      Array.isArray(p.signatures) && p.signatures.length > 0;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => router.push(`/documents/${p.id}`)}
                        className={styles.documentCard}
                      >
                        {/* Badge type */}
                        <div
                          className={styles.typeBadge}
                          style={{ backgroundColor: dc }}
                        >
                          <span>{p.documentType}</span>
                        </div>

                        {/* Infos */}
                        <div className={styles.documentInfo}>
                          <p className={styles.documentName}>{p.name}</p>

                          <p className={styles.documentMeta}>
                            {p.building?.name || "—"}
                            {p.year ? ` · ${p.year}` : ""}
                          </p>
                        </div>

                        {/* Statuts */}
                        <div className={styles.statuses}>
                          {isSigned && (
                            <span className={styles.signed}>
                              <CheckCircle size={14} />
                              Signé
                            </span>
                          )}

                          <span
                            className={styles.status}
                            style={{
                              backgroundColor: sc.bg,
                              color: sc.text,
                              borderColor: sc.border,
                            }}
                          >
                            {sc.label}
                          </span>

                          <span aria-hidden="true" className={styles.arrow}>
                            →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
