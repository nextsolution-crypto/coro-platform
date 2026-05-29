'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

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
  const [roles, setRoles] = useState<Role[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Projets', path: '/projects' },
    { label: 'Clients', path: '/clients' },
    { label: 'Batiments', path: '/buildings' },
    { label: 'Bibliotheque', path: '/library', active: true },
    { label: 'Parametres', path: '/settings' },
  ];

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white cursor-pointer" onClick={() => router.push('/dashboard')}>
          CO<span className="text-orange-500">RO</span>
        </h1>
        <button onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }}
          className="text-gray-400 hover:text-white text-sm">
          Deconnexion
        </button>
      </div>

      <div className="flex">
        <div className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 p-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button key={item.label} onClick={() => router.push(item.path)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                  item.active ? 'bg-orange-500/10 text-orange-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white">Bibliotheque centrale</h2>
            <p className="text-gray-400 mt-1">Codes incidents, roles et procedures officiels CORO</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { key: 'codes', label: `Codes incidents (${incidentCodes.length})` },
              { key: 'roles', label: `Roles (${roles.length})` },
              { key: 'procedures', label: `Procedures (${procedures.length})` },
            ].map((tab) => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12"><p className="text-gray-500">Chargement...</p></div>
          ) : (
            <>
              {/* Codes incidents */}
              {activeTab === 'codes' && (
                <div className="grid grid-cols-2 gap-4">
                  {incidentCodes.map((code) => (
                    <div key={code.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4 hover:border-gray-700 transition-colors">
                      <div className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: code.color, border: '2px solid rgba(255,255,255,0.2)' }}>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{code.name}</h3>
                        <p className="text-gray-400 text-sm">{code.description}</p>
                        <span className="text-gray-600 text-xs font-mono">{code.code}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Roles */}
              {activeTab === 'roles' && (
                <div className="grid gap-3">
                  {roles.map((role) => (
                    <div key={role.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between hover:border-gray-700 transition-colors">
                      <div>
                        <h3 className="text-white font-semibold">{role.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">{role.description}</p>
                      </div>
                      <span className="bg-gray-800 text-gray-300 text-xs font-mono px-3 py-1 rounded">
                        {role.roleCode}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Procedures */}
              {activeTab === 'procedures' && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                  <p className="text-gray-500 mb-2">Aucune procedure pour linstant</p>
                  <p className="text-gray-600 text-sm">Les procedures seront generees avec le configurateur</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}