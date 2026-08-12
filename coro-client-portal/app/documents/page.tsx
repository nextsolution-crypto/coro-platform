'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import {
  Search,
  FileText,
  CheckCircle,
} from 'lucide-react';

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
    bg: '#F8F9FA',
    text: '#6C757D',
    border: '#DEE2E6',
    label: 'Brouillon',
  },

  IN_PROGRESS: {
    bg: '#EBF5FB',
    text: '#2980B9',
    border: '#AED6F1',
    label: 'En cours',
  },

  REVIEW: {
    bg: '#FEF9E7',
    text: '#F39C12',
    border: '#FAD7A0',
    label: 'En révision',
  },

  VALIDATED: {
    bg: '#EAFAF1',
    text: '#27AE60',
    border: '#A9DFBF',
    label: 'Validé',
  },

  ARCHIVED: {
    bg: '#FDEDEC',
    text: '#C0392B',
    border: '#F1948A',
    label: 'Archivé',
  },
};

const DOC_COLORS: Record<string, string> = {
  PMU: '#2980B9',
  PSI: '#C0392B',
  PCA: '#27AE60',
  PGC: '#8E44AD',
  PRA: '#E67E22',
  PUE: '#16A085',
};

export default function DocumentsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);
    fetchProjects();
  }, [router]);

  const fetchProjects = async () => {
    try {
      const res = await apiGet('/client-portal/projects');
      setProjects(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter((p) => {
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

  if (loading || !user) {
    return (
      <PortalLayout>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            padding: 24,
          }}
        >
          <p
            className="animate-pulse"
            style={{
              margin: 0,
              color: '#ADB5BD',
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
      {/* En-tête */}
      <header
        style={{
          marginBottom: 28,
        }}
      >
        <p
          style={{
            margin: '0 0 4px',
            fontSize: 12,
            fontWeight: 700,
            color: '#ADB5BD',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Documents
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(24px, 5vw, 28px)',
            lineHeight: 1.2,
            fontWeight: 800,
            color: '#2C3E50',
          }}
        >
          Vos documents de conformité
        </h1>
      </header>

      {/* Filtres */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {/* Recherche */}
        <div
          style={{
            position: 'relative',
            minWidth: 0,
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#ADB5BD',
              pointerEvents: 'none',
            }}
          />

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            aria-label="Rechercher un document"
            style={{
              width: '100%',
              minHeight: 46,
              padding: '10px 12px 10px 38px',
              borderRadius: 7,
              border: '1px solid #DEE2E6',
              fontSize: 16,
              color: '#2C3E50',
              backgroundColor: '#FFFFFF',
              outline: 'none',
            }}
          />
        </div>

        {/* Statut */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label="Filtrer par statut"
          style={{
            width: '100%',
            minHeight: 46,
            padding: '10px 12px',
            borderRadius: 7,
            border: '1px solid #DEE2E6',
            fontSize: 16,
            color: '#2C3E50',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        >
          <option value="">Tous les statuts</option>

          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <option
              key={key}
              value={key}
            >
              {val.label}
            </option>
          ))}
        </select>

        {/* Type */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          aria-label="Filtrer par type de document"
          style={{
            width: '100%',
            minHeight: 46,
            padding: '10px 12px',
            borderRadius: 7,
            border: '1px solid #DEE2E6',
            fontSize: 16,
            color: '#2C3E50',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        >
          <option value="">Tous les types</option>

          {['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'].map(
            (type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            )
          )}
        </select>
      </div>

      {/* Liste documents */}
      {filtered.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E9ECEF',
            padding: 'clamp(40px, 10vw, 64px) 20px',
            textAlign: 'center',
          }}
        >
          <FileText
            size={48}
            color="#DEE2E6"
            style={{
              margin: '0 auto 16px',
            }}
          />

          <p
            style={{
              margin: 0,
              color: '#ADB5BD',
              fontSize: 15,
            }}
          >
            Aucun document trouvé.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {filtered.map((p) => {
            const sc =
              STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT;

            const dc =
              DOC_COLORS[p.documentType] || '#6C757D';

            const isSigned =
              Array.isArray(p.signatures) &&
              p.signatures.length > 0;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  router.push(`/documents/${p.id}`)
                }
                style={{
                  width: '100%',
                  minWidth: 0,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E9ECEF',
                  padding: 'clamp(16px, 4vw, 24px)',
                  cursor: 'pointer',
                  transition:
                    'box-shadow 0.15s, transform 0.15s, background-color 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    '0 4px 16px rgba(0,0,0,0.08)';

                  e.currentTarget.style.transform =
                    'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';

                  e.currentTarget.style.transform =
                    'translateY(0)';
                }}
              >
                {/* Badge type */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: dc,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: '#FFFFFF',
                    }}
                  >
                    {p.documentType}
                  </span>
                </div>

                {/* Infos */}
                <div
                  style={{
                    flex: '1 1 220px',
                    minWidth: 0,
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: 15,
                      lineHeight: 1.4,
                      fontWeight: 700,
                      color: '#2C3E50',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {p.name}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      minWidth: 0,
                      fontSize: 13,
                      color: '#ADB5BD',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.building?.name || '—'}
                    {p.year ? ` · ${p.year}` : ''}
                  </p>
                </div>

                {/* Statuts */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    marginLeft: 'auto',
                  }}
                >
                  {isSigned && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        color: '#8E44AD',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <CheckCircle size={14} />
                      Signé
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '5px 10px',
                      borderRadius: 10,
                      backgroundColor: sc.bg,
                      color: sc.text,
                      border: `1px solid ${sc.border}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sc.label}
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 15,
                      color: '#ADB5BD',
                      lineHeight: 1,
                    }}
                  >
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}