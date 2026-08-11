'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface IncidentCode {
  id: string;
  code: string;
  name: string;
  color: string;
  description?: string;
}

interface Role {
  id: string;
  roleCode: string;
  name: string;
  description?: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'codes' | 'roles' | 'procedures'>('codes');
  const [incidentCodes, setIncidentCodes] = useState<IncidentCode[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProc, setExpandedProc] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [codesRes, rolesRes, proceduresRes] = await Promise.all([
        api.get('/library/incident-codes'),
        api.get('/library/roles'),
        api.get('/library/procedures'),
      ]);
      setIncidentCodes(codesRes.data);
      setRoles(rolesRes.data);
      setProcedures(proceduresRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getActivationLabel = (rule: string) => {
    const map: Record<string, string> = {
      always:         'Toujours actif',
      double_signal:  'Double signal',
      has_gas:        'Gaz naturel',
      has_ammonia:    'Ammoniac',
      has_sprinklers: 'Gicleurs',
      has_elevators:  'Ascenseurs',
      has_hazmat:     'Mat. dangereuses',
      boma_certified: 'BOMA',
      has_pool:       'Piscine',
      has_kitchen:    'Cuisine commerciale',
    };
    return map[rule] || rule;
  };

  const tabs = [
    { key: 'codes',      label: 'Codes incidents', count: incidentCodes.length },
    { key: 'roles',      label: 'Rôles',           count: roles.length },
    { key: 'procedures', label: 'Procédures',       count: procedures.length },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
          Bibliothèque centrale
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
          Codes incidents, rôles et procédures officiels CORO
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-0 mb-6" style={{ borderBottom: '1px solid #DEE2E6' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="flex-1 sm:flex-none min-w-[120px] px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? '#C0392B' : '#6C757D',
              borderBottom: activeTab === tab.key ? '2px solid #C0392B' : '2px solid transparent',
              marginBottom: '-1px',
              backgroundColor: 'transparent',
            }}
          >
            {tab.label}
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: activeTab === tab.key ? '#FDEDEC' : '#F8F9FA',
                color: activeTab === tab.key ? '#C0392B' : '#ADB5BD',
              }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      ) : (
        <>
          {/* ── CODES INCIDENTS ── */}
          {activeTab === 'codes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {incidentCodes.map(code => (
                <div key={code.id}
                  className="flex items-start gap-3 p-3 transition-colors min-w-0"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                    borderLeft: `3px solid ${code.color}`,
                    borderRadius: '4px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div className="w-7 h-7 rounded flex-shrink-0"
                    style={{ backgroundColor: code.color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words" style={{ color: '#2C3E50' }}>
                      {code.name}
                    </p>
                    <p className="text-xs break-words" style={{ color: '#6C757D' }}>
                      {code.description}
                    </p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: '#ADB5BD' }}>
                      {code.code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── RÔLES ── */}
          {activeTab === 'roles' && (
            <div className="grid gap-1.5">
              {roles.map(role => (
                <div key={role.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div className="min-w-0 w-full sm:w-auto">
                    <p className="text-sm font-medium break-words" style={{ color: '#2C3E50' }}>
                      {role.name}
                    </p>
                    {role.description && (
                      <p className="text-xs mt-0.5 break-words" style={{ color: '#6C757D' }}>
                        {role.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-mono px-2 py-1 sm:ml-4 flex-shrink-0 self-start sm:self-auto whitespace-nowrap"
                    style={{
                      backgroundColor: '#F8F9FA',
                      color: '#495057',
                      border: '1px solid #DEE2E6',
                      borderRadius: '3px',
                    }}>
                    {role.roleCode}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── PROCÉDURES ── */}
          {activeTab === 'procedures' && (
            <div className="grid gap-1.5">
              {procedures.map(proc => (
                <div key={proc.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                    borderLeft: `3px solid ${proc.headerColor}`,
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>

                  {/* Ligne principale cliquable */}
                  <div
                    className="flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{ backgroundColor: '#FFFFFF' }}
                    onClick={() => setExpandedProc(expandedProc === proc.id ? null : proc.id)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    <div className="flex items-start gap-3 w-full lg:flex-1 min-w-0">
                      {/* Icône + couleur */}
                      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-sm"
                        style={{ backgroundColor: proc.headerColor }}>
                        {proc.icon || '📋'}
                      </div>

                      {/* Code + titre */}
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold"
                          style={{ color: '#ADB5BD' }}>
                          {proc.code}
                        </span>
                        {proc.phase && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: proc.phase === 'alerte' ? '#FEF9E7' : '#FDEDEC',
                              color: proc.phase === 'alerte' ? '#F39C12' : '#C0392B',
                              border: `1px solid ${proc.phase === 'alerte' ? '#FAD7A0' : '#F1948A'}`,
                            }}>
                            {proc.phase === 'alerte' ? 'Alerte' : 'Alarme'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold break-words"
                        style={{ color: '#2C3E50' }}>
                        {proc.titleFR}
                      </p>
                      </div>
                    </div>

                    {/* Méta */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-shrink-0 w-full lg:w-auto lg:justify-end">
                      <span className="text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>
                        {proc.roleSections?.length || 0} rôle(s)
                      </span>
                      <span className="text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>
                        {proc.totalSteps} étape(s)
                      </span>
                      <span className="text-xs px-2 py-0.5 font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: '#F8F9FA',
                          color: '#495057',
                          border: '1px solid #DEE2E6',
                          borderRadius: '3px',
                        }}>
                        {getActivationLabel(proc.activationRule)}
                      </span>
                      <span className="text-sm font-medium w-4 text-center ml-auto lg:ml-0"
                        style={{ color: '#ADB5BD' }}>
                        {expandedProc === proc.id ? '−' : '+'}
                      </span>
                    </div>
                  </div>

                  {/* Rôles expandés */}
                  {expandedProc === proc.id && (
                    <>
                      <div style={{ borderTop: '1px solid #F0F0F0' }}>
                        {(proc.roleSections || []).map((rs: any, idx: number) => (
                          <div key={idx}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2.5"
                            style={{
                              borderBottom: idx < proc.roleSections.length - 1
                                ? '1px solid #F8F9FA' : 'none',
                              backgroundColor: '#FAFAFA',
                            }}>
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: rs.headerColor }} />
                              <p className="text-xs font-medium break-words" style={{ color: '#495057' }}>
                                {rs.roleLabelFR}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <span className="text-xs font-mono px-1.5 py-0.5 whitespace-nowrap"
                                style={{
                                  backgroundColor: '#F0F0F0',
                                  color: '#6C757D',
                                  borderRadius: '2px',
                                }}>
                                {rs.roleCode}
                              </span>
                              <span className="text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>
                                {rs.stepCount} étape{rs.stepCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-2 flex flex-wrap gap-2"
                        style={{ backgroundColor: '#F8F9FA', borderTop: '1px solid #EFEFEF' }}>
                        {proc.documentTypes.map((dt: string) => (
                          <span key={dt} className="text-xs px-2 py-0.5 font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: '#FDEDEC',
                              color: '#C0392B',
                              border: '1px solid #F1948A',
                              borderRadius: '3px',
                            }}>
                            {dt}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}