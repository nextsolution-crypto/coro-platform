'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import {
  FileText,
  CheckCircle,
  Clock,
  Eye,
  Calendar,
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

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);
    fetchDashboard();
  }, [router]);

  const fetchDashboard = async () => {
    try {
      const res = await apiGet('/client-portal/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const { stats, projects, upcomingActivities } = data || {};

  const statItems = [
    {
      label: 'Total documents',
      value: stats?.total || 0,
      icon: FileText,
      color: '#2C3E50',
    },
    {
      label: 'Validés',
      value: stats?.validated || 0,
      icon: CheckCircle,
      color: '#27AE60',
    },
    {
      label: 'En cours',
      value: stats?.inProgress || 0,
      icon: Clock,
      color: '#2980B9',
    },
    {
      label: 'En révision',
      value: stats?.review || 0,
      icon: Eye,
      color: '#F39C12',
    },
    {
      label: 'Signés',
      value: stats?.signed || 0,
      icon: CheckCircle,
      color: '#8E44AD',
    },
  ];

  return (
    <PortalLayout>
      {/* ── En-tête ── */}
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
          Tableau de bord
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
          Bonjour, {user.firstName} 👋
        </h1>

        <p
          style={{
            margin: '6px 0 0',
            fontSize: 15,
            lineHeight: 1.5,
            color: '#6C757D',
          }}
        >
          {user.clientName} — Voici l&apos;état de vos documents de
          conformité.
        </p>
      </header>

      {/* ── Statistiques ── */}
      <section
        aria-label="Résumé des documents"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {statItems.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              style={{
                minWidth: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 'clamp(16px, 3vw, 20px)',
                border: '1px solid #E9ECEF',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    minWidth: 0,
                    fontSize: 13,
                    lineHeight: 1.3,
                    color: '#6C757D',
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </p>

                <Icon
                  size={18}
                  color={stat.color}
                  style={{
                    flexShrink: 0,
                  }}
                />
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 'clamp(26px, 7vw, 32px)',
                  lineHeight: 1,
                  fontWeight: 900,
                  color: stat.color,
                }}
              >
                {stat.value}
              </p>
            </div>
          );
        })}
      </section>

      {/* ── Colonnes principales ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
          gap: 20,
        }}
      >
        {/* ── Documents récents ── */}
        <section
          style={{
            minWidth: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E9ECEF',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              minHeight: 60,
              padding: '16px clamp(16px, 4vw, 24px)',
              borderBottom: '1px solid #E9ECEF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: '#2C3E50',
              }}
            >
              Documents récents
            </h2>

            <button
              type="button"
              onClick={() => router.push('/documents')}
              style={{
                minHeight: 40,
                padding: '6px 4px',
                fontSize: 13,
                color: '#C0392B',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Voir tout →
            </button>
          </div>

          <div>
            {!projects || projects.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                }}
              >
                <FileText
                  size={30}
                  color="#DEE2E6"
                  style={{
                    margin: '0 auto 10px',
                  }}
                />

                <p
                  style={{
                    margin: 0,
                    color: '#ADB5BD',
                    fontSize: 14,
                  }}
                >
                  Aucun document pour l&apos;instant.
                </p>
              </div>
            ) : (
              projects.map((p: any, index: number) => {
                const sc =
                  STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT;

                const dc =
                  DOC_COLORS[p.documentType] || '#6C757D';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      router.push(`/documents/${p.id}`)
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      minWidth: 0,
                      padding:
                        '15px clamp(16px, 4vw, 24px)',
                      border: 'none',
                      borderBottom:
                        index < projects.length - 1
                          ? '1px solid #F1F3F5'
                          : 'none',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition:
                        'background-color 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        '#F8F9FA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        '#FFFFFF';
                    }}
                  >
                    {/* Première ligne */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        minWidth: 0,
                        marginBottom: 7,
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 11,
                          fontWeight: 800,
                          color: '#FFFFFF',
                          backgroundColor: dc,
                          padding: '3px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {p.documentType}
                      </span>

                      <span
                        style={{
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#2C3E50',
                        }}
                      >
                        {p.name}
                      </span>
                    </div>

                    {/* Deuxième ligne */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 12,
                          color: '#ADB5BD',
                        }}
                      >
                        {p.building?.name || '—'}
                      </p>

                      <span
                        style={{
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 10,
                          backgroundColor: sc.bg,
                          color: sc.text,
                          border: `1px solid ${sc.border}`,
                        }}
                      >
                        {sc.label}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* ── Activités à venir ── */}
        <section
          style={{
            minWidth: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E9ECEF',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              minHeight: 60,
              padding: '16px clamp(16px, 4vw, 24px)',
              borderBottom: '1px solid #E9ECEF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: '#2C3E50',
              }}
            >
              Activités à venir
            </h2>

            <button
              type="button"
              onClick={() => router.push('/activities')}
              style={{
                minHeight: 40,
                padding: '6px 4px',
                fontSize: 13,
                color: '#C0392B',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Voir tout →
            </button>
          </div>

          <div>
            {!upcomingActivities ||
            upcomingActivities.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: 'center',
                }}
              >
                <Calendar
                  size={32}
                  color="#DEE2E6"
                  style={{
                    margin: '0 auto 12px',
                  }}
                />

                <p
                  style={{
                    margin: 0,
                    color: '#ADB5BD',
                    fontSize: 14,
                  }}
                >
                  Aucune activité planifiée.
                </p>
              </div>
            ) : (
              upcomingActivities.map(
                (a: any, index: number) => (
                  <div
                    key={a.id}
                    style={{
                      minWidth: 0,
                      padding:
                        '15px clamp(16px, 4vw, 24px)',
                      borderBottom:
                        index < upcomingActivities.length - 1
                          ? '1px solid #F1F3F5'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        minWidth: 0,
                      }}
                    >
                      {/* Date */}
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 8,
                          backgroundColor: '#EBF5FB',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 800,
                            color: '#2980B9',
                            lineHeight: 1,
                          }}
                        >
                          {a.scheduledDate
                            ? new Date(
                                a.scheduledDate
                              ).getDate()
                            : '—'}
                        </p>

                        <p
                          style={{
                            margin: '3px 0 0',
                            fontSize: 9,
                            color: '#2980B9',
                            lineHeight: 1,
                            textTransform: 'uppercase',
                          }}
                        >
                          {a.scheduledDate
                            ? new Date(
                                a.scheduledDate
                              ).toLocaleDateString('fr-CA', {
                                month: 'short',
                              })
                            : ''}
                        </p>
                      </div>

                      {/* Détails */}
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#2C3E50',
                          }}
                        >
                          {a.customLabel || a.label}
                        </p>

                        <p
                          style={{
                            margin: '4px 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                            color: '#ADB5BD',
                          }}
                        >
                          {a.project?.building?.name ||
                            a.project?.name ||
                            '—'}
                        </p>
                      </div>

                      {/* Mode */}
                      {a.mode && (
                        <span
                          title={
                            a.mode === 'teams'
                              ? 'En ligne'
                              : 'En personne'
                          }
                          style={{
                            fontSize: 15,
                            color:
                              a.mode === 'teams'
                                ? '#2980B9'
                                : '#27AE60',
                            flexShrink: 0,
                          }}
                        >
                          {a.mode === 'teams' ? '💻' : '📍'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}