'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'next/navigation';

export default function MonRendementPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customTo, setCustomTo] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );

  const getDateRange = () => {
    const now = new Date();

    if (viewMode === 'month') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      };
    }

    if (viewMode === 'year') {
      return {
        from: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
        to: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0],
      };
    }

    return { from: customFrom, to: customTo };
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, customFrom, customTo, user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { from, to } = getDateRange();

      const res = await api.get('/rendement', {
        params: {
          from,
          to,
          userId: user.id,
        },
      });

      const myData = res.data?.conseillers?.[0] || null;
      setData(myData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const VIEW_MODES = [
    { id: 'month', label: 'Ce mois' },
    { id: 'year', label: 'Cette année' },
    { id: 'custom', label: 'Personnalisé' },
  ];

  if (!user) return null;

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: '#ADB5BD' }}
        >
          Mon profil
        </p>

        <h1
          className="text-2xl font-black"
          style={{ color: '#2C3E50' }}
        >
          Mon rendement
        </h1>

        <div
          className="h-1 w-16 mt-2"
          style={{ backgroundColor: '#C0392B' }}
        />
      </div>

      {/* Contrôles période */}
      <div className="flex flex-wrap gap-2 mb-6">
        {VIEW_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id as any)}
            className="flex-1 sm:flex-none min-w-[110px] px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor: viewMode === m.id ? '#2C3E50' : '#F8F9FA',
              color: viewMode === m.id ? '#FFFFFF' : '#6C757D',
              border: `1px solid ${viewMode === m.id ? '#2C3E50' : '#DEE2E6'}`,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Période personnalisée */}
      {viewMode === 'custom' && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 rounded-md"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <div>
            <label
              className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
              style={{ color: '#6C757D' }}
            >
              Du
            </label>

            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded"
              style={{
                border: '1px solid #CED4DA',
                color: '#2C3E50',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
              style={{ color: '#6C757D' }}
            >
              Au
            </label>

            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded"
              style={{
                border: '1px solid #CED4DA',
                color: '#2C3E50',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <p
            className="text-sm animate-pulse"
            style={{ color: '#ADB5BD' }}
          >
            Chargement...
          </p>
        </div>
      ) : !data ? (
        <div
          className="text-center py-12 sm:py-16 rounded-md"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <p className="text-3xl mb-4">⏱</p>

          <p
            className="text-sm"
            style={{ color: '#ADB5BD' }}
          >
            Aucune heure saisie pour cette période
          </p>
        </div>
      ) : (
        <>
          {/* Stats personnelles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {[
              {
                label: 'Heures saisies',
                value: `${data.heuresTotal.toFixed(1)}h`,
                color: '#2980B9',
              },
              {
                label: 'Revenus générés',
                value: data.revenusTotal > 0
                  ? `${data.revenusTotal.toFixed(0)} $`
                  : '—',
                color: '#27AE60',
              },
              {
                label: 'Mandats actifs',
                value: data.mandatsCount,
                color: '#C0392B',
              },
            ].map(stat => (
              <div
                key={stat.label}
                className="rounded-md p-4 sm:p-5"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E9ECEF',
                }}
              >
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: '#6C757D' }}
                >
                  {stat.label}
                </p>

                <p
                  className="text-2xl font-black"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Détail par mandat */}
          <div
            className="rounded-md overflow-hidden"
            style={{ border: '1px solid #E9ECEF' }}
          >
            <div
              className="px-4 sm:px-5 py-3"
              style={{
                backgroundColor: '#F8F9FA',
                borderBottom: '1px solid #E9ECEF',
              }}
            >
              <h2
                className="font-semibold text-sm"
                style={{ color: '#2C3E50' }}
              >
                Détail par mandat
              </h2>
            </div>

            {/* MOBILE — cartes */}
            <div className="md:hidden">
              {data.mandatsList.map((mandat: any, idx: number) => (
                <div
                  key={mandat.projectId}
                  onClick={() => router.push(`/projects/${mandat.projectId}/mandate`)}
                  className="p-4 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderBottom:
                      idx < data.mandatsList.length - 1
                        ? '1px solid #F1F3F5'
                        : 'none',
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.backgroundColor = '#F8F9FA')
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.backgroundColor = '#FFFFFF')
                  }
                >
                  <div className="mb-3">
                    <p
                      className="text-xs mb-1"
                      style={{ color: '#6C757D' }}
                    >
                      {mandat.clientName}
                    </p>

                    <p
                      className="text-sm font-semibold break-words"
                      style={{ color: '#2C3E50' }}
                    >
                      {mandat.projectName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p
                        className="uppercase tracking-wide mb-1"
                        style={{ color: '#ADB5BD' }}
                      >
                        Heures
                      </p>
                      <p
                        className="font-bold"
                        style={{ color: '#2980B9' }}
                      >
                        {mandat.heures.toFixed(1)}h
                      </p>
                    </div>

                    <div>
                      <p
                        className="uppercase tracking-wide mb-1"
                        style={{ color: '#ADB5BD' }}
                      >
                        Montant vendu
                      </p>
                      <p style={{ color: '#2C3E50' }}>
                        {mandat.montantVendu > 0
                          ? `${mandat.montantVendu.toFixed(0)} $`
                          : '—'}
                      </p>
                    </div>

                    <div>
                      <p
                        className="uppercase tracking-wide mb-1"
                        style={{ color: '#ADB5BD' }}
                      >
                        Coût réel
                      </p>
                      <p style={{ color: '#2C3E50' }}>
                        {mandat.coutReel > 0
                          ? `${mandat.coutReel.toFixed(0)} $`
                          : '—'}
                      </p>
                    </div>

                    <div>
                      <p
                        className="uppercase tracking-wide mb-1"
                        style={{ color: '#ADB5BD' }}
                      >
                        Marge
                      </p>
                      <p
                        className="font-bold"
                        style={{
                          color: mandat.marge >= 0 ? '#27AE60' : '#C0392B',
                        }}
                      >
                        {mandat.montantVendu > 0
                          ? `${mandat.marge.toFixed(0)} $ (${mandat.margePct}%)`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <div
                    className="mt-3 pt-3 text-right"
                    style={{ borderTop: '1px solid #F1F3F5' }}
                  >
                    <span
                      className="text-xs font-medium"
                      style={{ color: '#C0392B' }}
                    >
                      Voir le mandat →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* TABLETTE + DESKTOP — tableau */}
            <div className="hidden md:block overflow-x-auto">
              <table
                className="w-full min-w-[820px] text-sm"
                style={{ borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#FAFAFA' }}>
                    {[
                      'Client',
                      'Mandat',
                      'Heures',
                      'Montant vendu',
                      'Coût réel',
                      'Marge',
                    ].map(col => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                        style={{
                          color: '#ADB5BD',
                          borderBottom: '1px solid #E9ECEF',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {data.mandatsList.map((mandat: any, idx: number) => (
                    <tr
                      key={mandat.projectId}
                      onClick={() =>
                        router.push(`/projects/${mandat.projectId}/mandate`)
                      }
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom:
                          idx < data.mandatsList.length - 1
                            ? '1px solid #F8F9FA'
                            : 'none',
                      }}
                      onMouseEnter={e =>
                        (e.currentTarget.style.backgroundColor = '#F8F9FA')
                      }
                      onMouseLeave={e =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: '#6C757D' }}
                      >
                        {mandat.clientName}
                      </td>

                      <td
                        className="px-4 py-3 text-xs font-medium"
                        style={{ color: '#2C3E50' }}
                      >
                        {mandat.projectName}
                      </td>

                      <td
                        className="px-4 py-3 text-xs font-bold whitespace-nowrap"
                        style={{ color: '#2980B9' }}
                      >
                        {mandat.heures.toFixed(1)}h
                      </td>

                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: '#2C3E50' }}
                      >
                        {mandat.montantVendu > 0
                          ? `${mandat.montantVendu.toFixed(0)} $`
                          : '—'}
                      </td>

                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: '#2C3E50' }}
                      >
                        {mandat.coutReel > 0
                          ? `${mandat.coutReel.toFixed(0)} $`
                          : '—'}
                      </td>

                      <td
                        className="px-4 py-3 text-xs font-bold whitespace-nowrap"
                        style={{
                          color: mandat.marge >= 0 ? '#27AE60' : '#C0392B',
                        }}
                      >
                        {mandat.montantVendu > 0
                          ? `${mandat.marge.toFixed(0)} $ (${mandat.margePct}%)`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}