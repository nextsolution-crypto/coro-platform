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

interface Procedure {
  id: string;
  name: string;
  status: string;
  documentTypes: string[];
  phase?: string;
  incidentCode?: IncidentCode;
  role?: Role;
}

export default function LibraryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'codes' | 'roles' | 'procedures'>('codes');
  const [incidentCodes, setIncidentCodes] = useState<IncidentCode[]>([]);
  const [roles, setRoles]                 = useState<Role[]>([]);
  const [procedures, setProcedures]       = useState<Procedure[]>([]);
  const [loading, setLoading]             = useState(true);
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

  const tabs = [
    { key: 'codes',      label: 'Codes incidents', count: incidentCodes.length },
    { key: 'roles',      label: 'Rôles',           count: roles.length },
    { key: 'procedures', label: 'Procédures',       count: procedures.length },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
          Bibliothèque centrale
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
          Codes incidents, rôles et procédures officiels CORO
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: '#DEE2E6' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === tab.key ? '#C0392B' : '#6C757D',
              borderBottom: activeTab === tab.key
                ? '2px solid #C0392B'
                : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
            <span
              className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: activeTab === tab.key ? '#FDEDEC' : '#F8F9FA',
                color: activeTab === tab.key ? '#C0392B' : '#ADB5BD',
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>
            Chargement...
          </p>
        </div>
      ) : (
        <>
          {/* Codes incidents */}
          {activeTab === 'codes' && (
            <div className="grid grid-cols-2 gap-3">
              {incidentCodes.map(code => (
                <div
                  key={code.id}
                  className="rounded-xl p-4 flex items-center gap-4 transition-all"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#CED4DA';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = '#E9ECEF';
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: code.color,
                      boxShadow: `0 2px 8px ${code.color}40`,
                    }}
                  />
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: '#2C3E50' }}>
                      {code.name}
                    </h3>
                    {code.description && (
                      <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
                        {code.description}
                      </p>
                    )}
                    <span className="text-xs font-mono mt-1 block" style={{ color: '#ADB5BD' }}>
                      {code.code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rôles */}
          {activeTab === 'roles' && (
            <div className="grid gap-2">
              {roles.map(role => (
                <div
                  key={role.id}
                  className="rounded-xl p-4 flex items-center justify-between transition-all"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#CED4DA';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = '#E9ECEF';
                  }}
                >
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: '#2C3E50' }}>
                      {role.name}
                    </h3>
                    {role.description && (
                      <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
                        {role.description}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-xs font-mono px-2.5 py-1 rounded flex-shrink-0 ml-4"
                    style={{
                      backgroundColor: '#F8F9FA',
                      color: '#495057',
                      border: '1px solid #DEE2E6',
                    }}
                  >
                    {role.roleCode}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Procédures */}
{activeTab === 'procedures' && (
  procedures.length === 0 ? (
    <div className="rounded-xl p-12 text-center"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
      <p className="text-sm" style={{ color: '#ADB5BD' }}>
        Aucune procédure pour l'instant
      </p>
    </div>
  ) : (
    <div className="grid gap-4">
      {(procedures as any[]).map(proc => (
        <div key={proc.id} className="rounded-xl overflow-hidden"
  style={{
    backgroundColor: '#FFFFFF',
    border: '1px solid #E9ECEF',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  }}>

  {/* Header cliquable */}
  <div
    className="px-5 py-3 flex items-center gap-3 cursor-pointer"
    style={{ backgroundColor: proc.headerColor }}
    onClick={() => setExpandedProc(expandedProc === proc.id ? null : proc.id)}
  >
    {proc.icon && <span className="text-lg">{proc.icon}</span>}
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="text-white/70 text-xs font-mono font-bold">
          {proc.code}
        </span>
        {proc.phase && (
          <span className="text-xs px-2 py-0.5 rounded font-medium"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#FFFFFF',
            }}>
            {proc.phase === 'alerte' ? 'Alerte' : 'Alarme'}
          </span>
        )}
      </div>
      <p className="text-white font-bold text-sm uppercase tracking-wide">
        {proc.titleFR}
      </p>
    </div>
    <div className="flex items-center gap-3 text-white/70 text-xs">
      <span>{proc.roleSections?.length || 0} rôle(s)</span>
      <span>•</span>
      <span>{proc.totalSteps} étape(s)</span>
      <span className="px-2 py-0.5 rounded text-xs font-medium"
        style={{
          backgroundColor: 'rgba(255,255,255,0.15)',
          color: '#FFFFFF',
        }}>
        {proc.activationRule === 'always' ? 'Toujours actif' :
         proc.activationRule === 'double_signal' ? 'Double signal' :
         proc.activationRule === 'has_gas' ? 'Gaz naturel' :
         proc.activationRule === 'has_ammonia' ? 'Ammoniac' :
         proc.activationRule === 'has_sprinklers' ? 'Gicleurs' :
         proc.activationRule === 'boma_certified' ? 'BOMA' :
         proc.activationRule}
      </span>
      {/* Bouton expand */}
      <span className="ml-2 text-white font-bold text-base">
        {expandedProc === proc.id ? '−' : '+'}
      </span>
    </div>
  </div>

  {/* Rôles — visible seulement si expanded */}
  {expandedProc === proc.id && (
    <>
      <div className="divide-y" style={{ borderColor: '#F8F9FA' }}>
        {(proc.roleSections || []).map((rs: any, idx: number) => (
          <div key={idx}
            className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: rs.headerColor }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>
                  {rs.roleLabelFR}
                </p>
                <p className="text-xs" style={{ color: '#ADB5BD' }}>
                  {rs.roleLabelEN}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  backgroundColor: '#F8F9FA',
                  color: '#6C757D',
                  border: '1px solid #E9ECEF',
                }}>
                {rs.roleCode}
              </span>
              <span className="text-xs" style={{ color: '#ADB5BD' }}>
                {rs.stepCount} étape{rs.stepCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-2 flex gap-2"
        style={{ backgroundColor: '#F8F9FA', borderTop: '1px solid #E9ECEF' }}>
        {proc.documentTypes.map((dt: string) => (
          <span key={dt} className="text-xs px-2 py-0.5 rounded font-medium"
            style={{
              backgroundColor: '#FDEDEC',
              color: '#C0392B',
              border: '1px solid #F1948A',
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
  )
)}
</>
      )}
    </AppLayout>
  );
}