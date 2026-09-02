'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Search, ChevronRight } from 'lucide-react';

interface ProcedureDefault {
  id: string;
  code: string;
  isActive: boolean;
  updatedAt: string;
  content: {
    titleFR: string;
    titleEN: string;
    headerColor: string;
    documentTypes: string[];
  };
}

export default function ProceduresAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [procedures, setProcedures] = useState<ProcedureDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newProc, setNewProc] = useState({
    code: '', titleFR: '', titleEN: '', headerColor: '#7F8C8D', icon: '', activationRule: 'always',
  });

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'SUPER_ADMIN') { router.push('/dashboard'); return; }
      fetchData();
    } else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/procedures');
      setProcedures(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = procedures.filter(p =>
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.content?.titleFR?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const content = {
        id: newProc.code.toLowerCase().replace(/-/g, '_'),
        code: newProc.code.toUpperCase(),
        titleFR: newProc.titleFR,
        titleEN: newProc.titleEN,
        headerColor: newProc.headerColor,
        icon: newProc.icon,
        activationRule: newProc.activationRule,
        documentTypes: ['PMU', 'PSI'],
        roleSections: [],
        directivesGenerales: [],
      };
      const res = await api.post('/procedures/default', { content });
      setShowModal(false);
      setNewProc({ code: '', titleFR: '', titleEN: '', headerColor: '#7F8C8D', icon: '', activationRule: 'always' });
      await fetchData();
      // Rediriger vers l'éditeur de la nouvelle procédure
      router.push(`/admin/procedures/${res.data.id}`);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Bibliothèque de procédures
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {procedures.length} procédures par défaut — modifications appliquées à toutes les organisations
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/procedures/custom')}
            className="w-full sm:w-auto text-sm font-medium px-4 py-2 rounded transition-colors"
            style={{ border: '1px solid #AED6F1', color: '#2980B9', backgroundColor: '#EBF5FB' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#D6EAF8')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#EBF5FB')}
          >
            ✨ Procédures IA
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
          >
            + Nouvelle procédure
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#ADB5BD' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par code ou titre..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded focus:outline-none"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
        />
      </div>

      {/* Liste */}
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid #E9ECEF' }}>
        {filtered.map((proc, idx) => (
          <div
            key={proc.id}
            onClick={() => router.push(`/admin/procedures/${proc.id}`)}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 cursor-pointer transition-colors"
            style={{
              backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA',
              borderBottom: '1px solid #E9ECEF',
              borderLeft: `3px solid ${proc.content?.headerColor || '#DEE2E6'}`,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EBF5FB')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA')}
          >
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
              <span className="text-xs font-bold font-mono w-12 flex-shrink-0" style={{ color: '#6C757D' }}>
                {proc.code}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium break-words" style={{ color: '#2C3E50' }}>
                  {proc.content?.titleFR}
                </p>
                <p className="text-xs mt-0.5 break-words" style={{ color: '#ADB5BD' }}>
                  {proc.content?.titleEN}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <span className="text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>
                {proc.content?.documentTypes?.join(', ')}
              </span>
              <ChevronRight size={14} style={{ color: '#ADB5BD' }} />
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-md p-5 sm:p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Nouvelle procédure
            </h3>
            {createError && (
              <div className="rounded p-3 mb-4 text-sm"
                style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                {createError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Code *</label>
                  <input type="text" required value={newProc.code}
                    onChange={e => setNewProc({ ...newProc, code: e.target.value.toUpperCase() })}
                    placeholder="ex: P029"
                    className="w-full text-sm rounded px-3 py-2 focus:outline-none font-mono"
                    style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Icône</label>
                  <input type="text" value={newProc.icon}
                    onChange={e => setNewProc({ ...newProc, icon: e.target.value })}
                    placeholder="ex: 🔥"
                    className="w-full text-sm rounded px-3 py-2 focus:outline-none"
                    style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Titre FR *</label>
                <input type="text" required value={newProc.titleFR}
                  onChange={e => setNewProc({ ...newProc, titleFR: e.target.value })}
                  placeholder="ex: INCENDIE MAJEUR"
                  className="w-full text-sm rounded px-3 py-2 focus:outline-none"
                  style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Titre EN *</label>
                <input type="text" required value={newProc.titleEN}
                  onChange={e => setNewProc({ ...newProc, titleEN: e.target.value })}
                  placeholder="ex: MAJOR FIRE"
                  className="w-full text-sm rounded px-3 py-2 focus:outline-none"
                  style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Couleur</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newProc.headerColor}
                    onChange={e => setNewProc({ ...newProc, headerColor: e.target.value })}
                    className="w-10 h-9 rounded cursor-pointer border-0" />
                  <input type="text" value={newProc.headerColor}
                    onChange={e => setNewProc({ ...newProc, headerColor: e.target.value })}
                    className="flex-1 text-sm rounded px-3 py-2 focus:outline-none font-mono"
                    style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Règle d'activation</label>
                <select value={newProc.activationRule}
                  onChange={e => setNewProc({ ...newProc, activationRule: e.target.value })}
                  className="w-full text-sm rounded px-3 py-2 focus:outline-none"
                  style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }}>
                  <option value="always">Toujours active</option>
                  <option value="has_gas">Gaz naturel</option>
                  <option value="has_sprinklers">Gicleurs</option>
                  <option value="has_generator">Génératrice</option>
                  <option value="has_elevators">Ascenseurs</option>
                  <option value="has_hazardous_materials">Matières dangereuses</option>
                  <option value="industriel">Bâtiment industriel</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setCreateError(''); }}
                  className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50"
                  style={{ backgroundColor: '#C0392B' }}>
                  {creating ? 'Création...' : 'Créer et éditer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}