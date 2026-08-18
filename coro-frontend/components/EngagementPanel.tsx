'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface EngagementData {
  totalOpens: number;
  totalViews: number;
  totalDownloads: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  totalDurationSeconds: number;
  dominantDevice: string | null;
  daysSinceFirstOpen: number | null;
  status: 'not_opened' | 'opened' | 'viewed' | 'downloaded';
}

export default function EngagementPanel({
  projectId,
}: {
  projectId: string;
}) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEngagement = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await api.get(
          `/client-portal/projects/${projectId}/engagement`
        );

        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchEngagement();
  }, [fetchEngagement]);

  const deviceIcon = (device: string | null) => {
    if (device === 'mobile') return '📱';
    if (device === 'tablet') return '📟';
    return '🖥️';
  };

  const deviceLabel = (device: string | null) => {
    if (device === 'mobile') return 'Mobile';
    if (device === 'tablet') return 'Tablette';
    return 'Ordinateur';
  };

  const statusConfig = {
    not_opened: {
      label: 'Pas encore ouvert',
      color: '#ADB5BD',
      bg: '#F8F9FA',
      border: '#DEE2E6',
      icon: '○',
    },
    opened: {
      label: 'Ouvert',
      color: '#2980B9',
      bg: '#EBF5FB',
      border: '#AED6F1',
      icon: '👁',
    },
    viewed: {
      label: 'Consulté',
      color: '#F39C12',
      bg: '#FEF9E7',
      border: '#FAD7A0',
      icon: '📖',
    },
    downloaded: {
      label: 'Téléchargé',
      color: '#27AE60',
      bg: '#EAFAF1',
      border: '#A9DFBF',
      icon: '✓',
    },
  };

  const sc = data
    ? statusConfig[data.status]
    : statusConfig.not_opened;

  const kpis = data
    ? [
        {
          label: 'Ouvertures',
          value: data.totalOpens,
          color: '#2980B9',
        },
        {
          label: 'Consultations',
          value: data.totalViews,
          color: '#F39C12',
        },
        {
          label: 'Téléchargements',
          value: data.totalDownloads,
          color: '#27AE60',
        },
        {
          label: 'Jours depuis export',
          value: data.daysSinceFirstOpen ?? '—',
          color: '#8E44AD',
        },
      ]
    : [];

  return (
    <section
      className="
        rounded-lg
        p-4
        sm:p-6
        mb-6
        min-w-0
      "
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E9ECEF',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* ═══════════════════════════════════
          EN-TÊTE
      ═══════════════════════════════════ */}

      <div
        className="
          flex
          flex-col
          min-[380px]:flex-row
          min-[380px]:items-center
          min-[380px]:justify-between
          gap-3
          mb-4
        "
      >
        <h3
          className="
            font-semibold
            text-sm
            sm:text-base
            min-w-0
          "
          style={{ color: '#2C3E50' }}
        >
          📊 Engagement client
        </h3>

        <button
          type="button"
          onClick={() => fetchEngagement(true)}
          disabled={refreshing}
          className="
            w-full
            min-[380px]:w-auto
            min-h-[36px]
            text-xs
            px-3
            py-1.5
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
          CHARGEMENT
      ═══════════════════════════════════ */}

      {loading ? (
        <p
          className="text-sm animate-pulse text-center py-6"
          style={{ color: '#ADB5BD' }}
        >
          Chargement...
        </p>
      ) : !data ? (
        <p
          className="text-sm text-center py-6"
          style={{ color: '#ADB5BD' }}
        >
          Données non disponibles
        </p>
      ) : (
        <>

          {/* ═════════════════════════════════
              STATUT GLOBAL
          ═════════════════════════════════ */}

          <div
            className="
              flex
              items-start
              gap-3
              p-3
              sm:p-4
              rounded-md
              mb-4
              min-w-0
            "
            style={{
              backgroundColor: sc.bg,
              border: `1px solid ${sc.border}`,
            }}
          >
            <span
              className="flex-shrink-0 mt-0.5"
              style={{ fontSize: 20 }}
              aria-hidden="true"
            >
              {sc.icon}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-bold"
                style={{ color: sc.color }}
              >
                {sc.label}
              </p>

              {data.firstOpenedAt ? (
                <p
                  className="
                    text-xs
                    mt-0.5
                    leading-relaxed
                    break-words
                  "
                  style={{ color: '#6C757D' }}
                >
                  Premier accès le{' '}
                  {new Date(
                    data.firstOpenedAt
                  ).toLocaleDateString('fr-CA', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : (
                <p
                  className="
                    text-xs
                    mt-0.5
                    leading-relaxed
                  "
                  style={{ color: '#ADB5BD' }}
                >
                  Le client n&apos;a pas encore ouvert le document
                </p>
              )}
            </div>
          </div>


          {/* ═════════════════════════════════
              KPI
          ═════════════════════════════════ */}

          <div
            className="
              grid
              grid-cols-2
              sm:grid-cols-4
              gap-2.5
              sm:gap-3
              mb-4
            "
          >
            {kpis.map(kpi => (
              <div
                key={kpi.label}
                className="
                  rounded-md
                  p-3
                  text-center
                  min-w-0
                "
                style={{
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #E9ECEF',
                }}
              >
                <p
                  className="
                    text-xl
                    sm:text-2xl
                    font-black
                    leading-none
                  "
                  style={{ color: kpi.color }}
                >
                  {kpi.value}
                </p>

                <p
                  className="
                    text-[11px]
                    sm:text-xs
                    mt-1.5
                    leading-tight
                    break-words
                  "
                  style={{ color: '#ADB5BD' }}
                >
                  {kpi.label}
                </p>
              </div>
            ))}
          </div>


          {/* ═════════════════════════════════
              DÉTAILS
          ═════════════════════════════════ */}

          {data.totalOpens > 0 && (
            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                gap-3
              "
            >
              {data.dominantDevice && (
                <div
                  className="
                    rounded-md
                    p-3
                    min-w-0
                  "
                  style={{
                    backgroundColor: '#F8F9FA',
                    border: '1px solid #E9ECEF',
                  }}
                >
                  <p
                    className="text-xs"
                    style={{ color: '#ADB5BD' }}
                  >
                    Appareil principal
                  </p>

                  <p
                    className="
                      text-sm
                      font-semibold
                      mt-1
                      break-words
                    "
                    style={{ color: '#2C3E50' }}
                  >
                    {deviceIcon(data.dominantDevice)}{' '}
                    {deviceLabel(data.dominantDevice)}
                  </p>
                </div>
              )}

              {data.lastOpenedAt && (
                <div
                  className="
                    rounded-md
                    p-3
                    min-w-0
                  "
                  style={{
                    backgroundColor: '#F8F9FA',
                    border: '1px solid #E9ECEF',
                  }}
                >
                  <p
                    className="text-xs"
                    style={{ color: '#ADB5BD' }}
                  >
                    Dernier accès
                  </p>

                  <p
                    className="
                      text-sm
                      font-semibold
                      mt-1
                      break-words
                    "
                    style={{ color: '#2C3E50' }}
                  >
                    {new Date(
                      data.lastOpenedAt
                    ).toLocaleDateString('fr-CA', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}


          {/* ═════════════════════════════════
              RAPPEL
          ═════════════════════════════════ */}

          {data.status === 'not_opened' && (
            <div
              className="
                rounded-md
                p-3
                mt-3
              "
              style={{
                backgroundColor: '#FEF9E7',
                border: '1px solid #FAD7A0',
              }}
            >
              <p
                className="
                  text-xs
                  leading-relaxed
                "
                style={{ color: '#F39C12' }}
              >
                💡 Le client n&apos;a pas encore consulté le document.
                Pensez à lui envoyer un rappel ou à utiliser un magic link.
              </p>
            </div>
          )}

        </>
      )}
    </section>
  );
}