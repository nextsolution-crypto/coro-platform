'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface HealthScore {
  id: string;
  name: string;
  licenseType: string;
  score: number;
  level: 'ACTIF' | 'MODERE' | 'A_RISQUE';

  metrics: {
    recentProjects: number;
    totalProjects: number;
    signedProjects: number;
    members: number;
    clients: number;
    buildings: number;
  };

  users: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }[];
}

const levelConfig = {
  ACTIF: {
    label: 'Actif',
    color: '#27AE60',
    bg: '#EAFAF1',
    border: '#A9DFBF',
    icon: '🟢',
  },

  MODERE: {
    label: 'Modéré',
    color: '#F39C12',
    bg: '#FEF9E7',
    border: '#FAD7A0',
    icon: '🟡',
  },

  A_RISQUE: {
    label: 'À risque',
    color: '#C0392B',
    bg: '#FDEDEC',
    border: '#F1948A',
    icon: '🔴',
  },
};

const licenseLabels: Record<string, string> = {
  ESSAI_GRATUIT: 'Essai gratuit',
  STANDARD: 'Standard',
  ENTREPRISE: 'Entreprise',
};

type HealthFilter = 'ALL' | 'ACTIF' | 'MODERE' | 'A_RISQUE';

export default function HealthScorePage() {
  const router = useRouter();

  const {
    user,
    isAuthenticated,
    initAuth,
  } = useAuthStore();

  const [scores, setScores] = useState<HealthScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<HealthFilter>('ALL');

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await api.get(
          '/organizations/admin/health-scores'
        );

        setScores(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    if (user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [
    isAuthenticated,
    user,
    router,
    fetchData,
  ]);

  const filtered =
    filter === 'ALL'
      ? scores
      : scores.filter(score => score.level === filter);

  const atRisk =
    scores.filter(score => score.level === 'A_RISQUE').length;

  const moderate =
    scores.filter(score => score.level === 'MODERE').length;

  const active =
    scores.filter(score => score.level === 'ACTIF').length;

  const globalKpis = [
  {
    ...levelConfig.A_RISQUE,
    value: atRisk,
    filter: 'A_RISQUE' as HealthFilter,
  },

  {
    ...levelConfig.MODERE,
    value: moderate,
    filter: 'MODERE' as HealthFilter,
  },

  {
    ...levelConfig.ACTIF,
    value: active,
    filter: 'ACTIF' as HealthFilter,
  },
];

  const filterLabels: Record<HealthFilter, string> = {
    ALL: 'Toutes',
    A_RISQUE: '🔴 À risque',
    MODERE: '🟡 Modéré',
    ACTIF: '🟢 Actif',
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 sm:py-24">
          <p
            className="text-sm animate-pulse"
            style={{ color: '#ADB5BD' }}
          >
            Chargement...
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>

      {/* ═══════════════════════════════════
          EN-TÊTE
      ═══════════════════════════════════ */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:items-end
          sm:justify-between
          gap-4
          mb-6
          sm:mb-8
        "
      >
        <div className="min-w-0">

          <h2
            className="
              text-xl
              sm:text-2xl
              font-semibold
              break-words
            "
            style={{ color: '#2C3E50' }}
          >
            🏥 Health Score
          </h2>

          <p
            className="
              text-sm
              mt-1
              leading-relaxed
            "
            style={{ color: '#6C757D' }}
          >
            Santé du portefeuille — {scores.length}{' '}
            organisation{scores.length > 1 ? 's' : ''}
          </p>

        </div>

        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="
            w-full
            sm:w-auto
            min-h-[42px]
            text-sm
            px-4
            py-2
            rounded
            transition-colors
            flex-shrink-0
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
          style={{
            border: '1px solid #DEE2E6',
            color: '#6C757D',
            backgroundColor: '#FFFFFF',
          }}
          onMouseEnter={e => {
            if (!refreshing) {
              e.currentTarget.style.backgroundColor = '#F8F9FA';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
        >
          {refreshing ? '↻ Actualisation...' : '↻ Actualiser'}
        </button>

      </div>


      {/* ═══════════════════════════════════
          KPI GLOBAUX
      ═══════════════════════════════════ */}

      <div
        className="
          grid
          grid-cols-1
          min-[380px]:grid-cols-3
          gap-3
          sm:gap-4
          mb-6
          sm:mb-8
        "
      >
        {globalKpis.map(kpi => {

          const selected = filter === kpi.filter;

          return (
            <button
              type="button"
              key={kpi.label}
              onClick={() => setFilter(kpi.filter)}
              aria-pressed={selected}
              className="
                rounded-lg
                p-4
                sm:p-5
                text-left
                cursor-pointer
                transition-all
                min-w-0
              "
              style={{
                backgroundColor: kpi.bg,
                border: `1px solid ${
                  selected ? kpi.color : kpi.border
                }`,
                boxShadow: selected
                  ? `0 0 0 1px ${kpi.color}22`
                  : 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = selected
                  ? `0 0 0 1px ${kpi.color}22`
                  : 'none';
              }}
            >
              <p
                className="
                  text-xs
                  font-medium
                  mb-1
                  break-words
                "
                style={{ color: kpi.color }}
              >
                {kpi.icon} {kpi.label}
              </p>

              <p
                className="
                  text-2xl
                  sm:text-3xl
                  font-black
                  leading-none
                "
                style={{ color: kpi.color }}
              >
                {kpi.value}
              </p>

              <p
                className="text-xs mt-1.5"
                style={{ color: kpi.color }}
              >
                organisation{kpi.value > 1 ? 's' : ''}
              </p>
            </button>
          );
        })}
      </div>


      {/* ═══════════════════════════════════
          FILTRES
      ═══════════════════════════════════ */}

      <div className="mb-6">

        <div
          className="
            flex
            gap-2
            overflow-x-auto
            pb-1
            -mx-1
            px-1
          "
          style={{
            scrollbarWidth: 'thin',
          }}
        >
          {(
            [
              'ALL',
              'A_RISQUE',
              'MODERE',
              'ACTIF',
            ] as const
          ).map(f => (
            <button
              type="button"
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className="
                text-sm
                px-4
                py-2
                min-h-[38px]
                rounded-full
                font-medium
                whitespace-nowrap
                transition-colors
                flex-shrink-0
              "
              style={{
                backgroundColor:
                  filter === f
                    ? '#2C3E50'
                    : '#F8F9FA',

                color:
                  filter === f
                    ? '#FFFFFF'
                    : '#6C757D',

                border: `1px solid ${
                  filter === f
                    ? '#2C3E50'
                    : '#E9ECEF'
                }`,
              }}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

      </div>


      {/* ═══════════════════════════════════
          LISTE ORGANISATIONS
      ═══════════════════════════════════ */}

      <div className="space-y-3 sm:space-y-4">

        {filtered.length === 0 && (
          <div
            className="
              rounded-lg
              px-4
              py-10
              text-center
            "
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
            }}
          >
            <p
              className="text-sm"
              style={{ color: '#ADB5BD' }}
            >
              Aucune organisation dans cette catégorie.
            </p>
          </div>
        )}


        {filtered.map(org => {
          const lc = levelConfig[org.level];

          const admin =
            org.users.find(
              member => member.role === 'ADMIN'
            );

          const metrics = [
            {
              label: 'Projets (30j)',
              value: org.metrics.recentProjects,
              alert:
                org.metrics.recentProjects === 0,
            },

            {
              label: 'Total projets',
              value: org.metrics.totalProjects,
              alert: false,
            },

            {
              label: 'Docs signés',
              value: org.metrics.signedProjects,
              alert: false,
            },

            {
              label: 'Membres',
              value: org.metrics.members,
              alert:
                org.metrics.members <= 1,
            },

            {
              label: 'Clients',
              value: org.metrics.clients,
              alert:
                org.metrics.clients === 0,
            },

            {
              label: 'Bâtiments',
              value: org.metrics.buildings,
              alert:
                org.metrics.buildings === 0,
            },
          ];

          return (
            <section
              key={org.id}
              className="
                rounded-lg
                p-4
                sm:p-5
                min-w-0
              "
              style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${lc.border}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
            >

              {/* ─────────────────────────────
                  ENTÊTE ORGANISATION
              ───────────────────────────── */}

              <div
                className="
                  flex
                  flex-col
                  sm:flex-row
                  sm:items-start
                  sm:justify-between
                  gap-4
                  mb-4
                "
              >

                {/* NOM + BADGES */}

                <div className="min-w-0 flex-1">

                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-2
                      sm:gap-3
                      mb-1.5
                    "
                  >
                    <h3
                      className="
                        font-semibold
                        break-words
                        min-w-0
                      "
                      style={{ color: '#2C3E50' }}
                    >
                      {org.name}
                    </h3>

                    <span
                      className="
                        text-xs
                        px-2
                        py-0.5
                        rounded-full
                        font-medium
                        whitespace-nowrap
                      "
                      style={{
                        backgroundColor: lc.bg,
                        color: lc.color,
                        border: `1px solid ${lc.border}`,
                      }}
                    >
                      {lc.icon} {lc.label}
                    </span>

                    <span
                      className="
                        text-xs
                        px-2
                        py-0.5
                        rounded
                        font-medium
                        whitespace-nowrap
                      "
                      style={{
                        backgroundColor: '#F8F9FA',
                        color: '#6C757D',
                        border: '1px solid #E9ECEF',
                      }}
                    >
                      {licenseLabels[org.licenseType] ??
                        org.licenseType}
                    </span>
                  </div>


                  {/* ADMIN */}

                  {admin && (
                    <p
                      className="
                        text-xs
                        leading-relaxed
                        break-words
                      "
                      style={{ color: '#ADB5BD' }}
                    >
                      Admin : {admin.firstName}{' '}
                      {admin.lastName}
                      <span className="hidden sm:inline">
                        {' '}—{' '}
                      </span>
                      <span className="block sm:inline break-all">
                        {admin.email}
                      </span>
                    </p>
                  )}

                </div>


                {/* SCORE + VOIR */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    sm:justify-end
                    gap-4
                    flex-shrink-0
                    w-full
                    sm:w-auto
                    pt-3
                    sm:pt-0
                    border-t
                    sm:border-t-0
                  "
                  style={{
                    borderColor: '#F1F3F5',
                  }}
                >
                  <div className="text-left sm:text-right">
                    <div className="flex items-baseline gap-1 sm:justify-end">

                      <p
                        className="
                          text-2xl
                          sm:text-3xl
                          font-black
                          leading-none
                        "
                        style={{ color: lc.color }}
                      >
                        {org.score}
                      </p>

                      <p
                        className="text-xs"
                        style={{ color: '#ADB5BD' }}
                      >
                        /100
                      </p>

                    </div>

                    <p
                      className="text-xs mt-1"
                      style={{ color: lc.color }}
                    >
                      {lc.label}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push('/admin/organizations')
                    }
                    className="
                      min-h-[38px]
                      text-xs
                      px-3
                      py-1.5
                      rounded
                      transition-colors
                      flex-shrink-0
                    "
                    style={{
                      border: '1px solid #DEE2E6',
                      color: '#6C757D',
                      backgroundColor: '#FFFFFF',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor =
                        '#F8F9FA';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor =
                        '#FFFFFF';
                    }}
                  >
                    Voir →
                  </button>

                </div>

              </div>


              {/* ─────────────────────────────
                  BARRE SCORE
              ───────────────────────────── */}

              <div
                className="
                  w-full
                  rounded-full
                  h-2
                  mb-4
                  overflow-hidden
                "
                style={{
                  backgroundColor: '#E9ECEF',
                }}
              >
                <div
                  className="
                    h-2
                    rounded-full
                    transition-all
                  "
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(org.score, 100)
                    )}%`,

                    backgroundColor: lc.color,
                  }}
                />
              </div>


              {/* ─────────────────────────────
                  MÉTRIQUES
              ───────────────────────────── */}

              <div
                className="
                  grid
                  grid-cols-2
                  sm:grid-cols-3
                  lg:grid-cols-6
                  gap-2.5
                  sm:gap-3
                "
              >
                {metrics.map(metric => (
                  <div
                    key={metric.label}
                    className="
                      rounded
                      px-2.5
                      sm:px-3
                      py-2.5
                      text-center
                      min-w-0
                    "
                    style={{
                      backgroundColor: metric.alert
                        ? '#FDEDEC'
                        : '#F8F9FA',

                      border: `1px solid ${
                        metric.alert
                          ? '#F1948A'
                          : '#E9ECEF'
                      }`,
                    }}
                  >
                    <p
                      className="
                        text-lg
                        font-bold
                        leading-none
                      "
                      style={{
                        color: metric.alert
                          ? '#C0392B'
                          : '#2C3E50',
                      }}
                    >
                      {metric.value}
                    </p>

                    <p
                      className="
                        text-[11px]
                        sm:text-xs
                        mt-1.5
                        leading-tight
                        break-words
                      "
                      style={{
                        color: metric.alert
                          ? '#C0392B'
                          : '#ADB5BD',
                      }}
                    >
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>


              {/* ─────────────────────────────
                  RISQUE
              ───────────────────────────── */}

              {org.level === 'A_RISQUE' && (
                <div
                  className="
                    mt-3
                    p-3
                    rounded
                  "
                  style={{
                    backgroundColor: '#FDEDEC',
                    border: '1px solid #F1948A',
                  }}
                >
                  <p
                    className="
                      text-xs
                      leading-relaxed
                    "
                    style={{ color: '#C0392B' }}
                  >
                    ⚠️ Cette organisation est peu active.
                    Considérez une prise de contact proactive
                    pour assurer la rétention.
                  </p>
                </div>
              )}

            </section>
          );
        })}

      </div>

    </AppLayout>
  );
}