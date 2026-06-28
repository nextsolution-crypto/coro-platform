'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface Project {
  id: string;
  name: string;
  documentType: string;
  status: string;
  year: number;
  progress: number;
  client: { id: string; name: string };
  building: { id: string; name: string; address: string };
  user: { id: string; firstName: string; lastName: string };
}

interface Client   { id: string; name: string; }
interface Building { id: string; name: string; clientId: string; }

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT:       { bg: '#F8F9FA', text: '#6C757D', border: '#DEE2E6' },
  IN_PROGRESS: { bg: '#EBF5FB', text: '#2980B9', border: '#AED6F1' },
  REVIEW:      { bg: '#FEF9E7', text: '#F39C12', border: '#FAD7A0' },
  VALIDATED:   { bg: '#EAFAF1', text: '#27AE60', border: '#A9DFBF' },
  EXPORTED:    { bg: '#F4ECF7', text: '#8E44AD', border: '#D2B4DE' },
  ARCHIVED:    { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A' },
};

const statusLabels: Record<string, string> = {
  DRAFT:       'Brouillon',
  IN_PROGRESS: 'En cours',
  REVIEW:      'En révision',
  VALIDATED:   'Validé',
  EXPORTED:    'Exporté',
  ARCHIVED:    'Archivé',
};

const docTypeColors: Record<string, string> = {
  PSI: '#C0392B',
  PMU: '#2980B9',
  PCA: '#27AE60',
  PGC: '#8E44AD',
  PRA: '#F39C12',
  PUE: '#E67E22',
};

export default function ProjectsPage() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();
  const [projects, setProjects]               = useState<Project[]>([]);
  const [clients, setClients]                 = useState<Client[]>([]);
  const [buildings, setBuildings]             = useState<Building[]>([]);
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [activeTab, setActiveTab]             = useState<'actifs' | 'archives'>('actifs');
  const [maxProjects, setMaxProjects]         = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '', documentType: '',
    year: new Date().getFullYear().toString(),
    clientId: '', buildingId: '',
  });

  const documentTypes = ['PSI', 'PMU', 'PCA', 'PGC', 'PRA', 'PUE'];

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
    else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (form.clientId) {
      setFilteredBuildings(buildings.filter(b => b.clientId === form.clientId));
      setForm(prev => ({ ...prev, buildingId: '' }));
    }
  }, [form.clientId, buildings]);

  const fetchData = async () => {
    try {
      const [pr, cl, bl, orgRes] = await Promise.all([
        api.get('/projects'),
        api.get('/clients'),
        api.get('/buildings'),
        api.get('/organizations/me/info').catch(() => ({ data: null })),
      ]);
      setProjects(pr.data);
      setClients(cl.data);
      setBuildings(bl.data);

      if (orgRes.data) {
        const limits: Record<string, number | null> = {
          ESSAI_GRATUIT: 1, STANDARD: null, ENTREPRISE: null,
        };
        setMaxProjects(limits[orgRes.data.licenseType] ?? null);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

const visibleProjects = projects.filter(p =>
    activeTab === 'archives' ? p.status === 'ARCHIVED' : p.status !== 'ARCHIVED'
  );

  const handleReactivate = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/projects/${projectId}`, { status: 'IN_PROGRESS' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/projects', { ...form, year: parseInt(form.year) });
      setShowModal(false);
      setForm({ name: '', documentType: '', year: new Date().getFullYear().toString(), clientId: '', buildingId: '' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Projets
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {visibleProjects.length} / {maxProjects === null ? 'illimité' : maxProjects} projet{visibleProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={maxProjects !== null && projects.filter(p => p.status !== 'ARCHIVED').length >= maxProjects}
          title={maxProjects !== null && projects.filter(p => p.status !== 'ARCHIVED').length >= maxProjects ? `Limite de ${maxProjects} projet(s) atteinte pour votre licence` : ''}
          className="text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => { if (!(maxProjects !== null && projects.filter(p => p.status !== 'ARCHIVED').length >= maxProjects)) e.currentTarget.style.backgroundColor = '#A93226'; }}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
        >
          + Nouveau projet
        </button>
      </div>

      {maxProjects !== null && projects.filter(p => p.status !== 'ARCHIVED').length >= maxProjects && (
        <div className="rounded-md p-4 mb-6 flex items-center gap-3"
          style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
          <span style={{ color: '#F39C12', fontSize: '18px' }}>⚠</span>
          <p className="text-sm" style={{ color: '#7D6608' }}>
            Vous avez atteint la limite de projets pour votre licence actuelle. Contactez CORO pour mettre à niveau votre abonnement.
          </p>
        </div>
      )}

      {/* Onglets Actifs / Archivés */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid #E9ECEF' }}>
        {([
          { key: 'actifs', label: 'Actifs' },
          { key: 'archives', label: 'Archivés' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? '#C0392B' : '#6C757D',
              borderBottom: activeTab === tab.key ? '2px solid #C0392B' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>
            Chargement...
          </p>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="rounded-md p-12 text-center"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-sm mb-4" style={{ color: '#ADB5BD' }}>
            Aucun projet pour l'instant
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-white text-sm font-medium px-4 py-2 rounded"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
          >
            Créer le premier projet
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleProjects.map(project => {
            const sc = statusColors[project.status] || statusColors.DRAFT;
            const dc = docTypeColors[project.documentType] || '#6C757D';
            return (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="rounded-md p-5 cursor-pointer transition-all"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E9ECEF',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#CED4DA';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#E9ECEF';
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-white text-xs font-bold px-2.5 py-1 rounded"
                      style={{ backgroundColor: dc }}
                    >
                      {project.documentType}
                    </span>
                    <h3 className="font-semibold" style={{ color: '#2C3E50' }}>
                      {project.name}
                    </h3>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: sc.bg,
                      color: sc.text,
                      border: `1px solid ${sc.border}`,
                    }}
                  >
                    {statusLabels[project.status]}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm mb-4"
                  style={{ color: '#6C757D' }}>
                  <span>{project.client.name}</span>
                  <span style={{ color: '#DEE2E6' }}>•</span>
                  <span>{project.building.name}</span>
                  <span style={{ color: '#DEE2E6' }}>•</span>
                  <span>{project.year}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: '#ADB5BD' }}>
                      Progression
                    </span>
                    <span className="text-xs font-medium" style={{ color: '#6C757D' }}>
                      {project.progress}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5"
                    style={{ backgroundColor: '#E9ECEF' }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${project.progress}%`,
                        backgroundColor: project.progress === 100 ? '#27AE60' : '#C0392B',
                      }}
                    />
                  </div>
                </div>

                {activeTab === 'archives' && (
                  <button
                    onClick={e => handleReactivate(project.id, e)}
                    className="mt-3 text-xs font-medium px-3 py-1.5 rounded transition-colors"
                    style={{ border: '1px solid #DEE2E6', color: '#27AE60' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAFAF1'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Réactiver
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nouveau projet */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-lg rounded-md p-8"
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Nouveau projet
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: 'Nom du projet *', key: 'name', type: 'text', placeholder: 'Ex: PMU Tour ABC 2026' },
                { label: 'Année *', key: 'year', type: 'number', placeholder: '' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1.5"
                    style={{ color: '#495057' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    required
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{
                      border: '1px solid #CED4DA',
                      color: '#2C3E50',
                      backgroundColor: '#FFFFFF',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'}
                  />
                </div>
              ))}

              {/* Type document */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>
                  Type de document *
                </label>
                <select
                  value={form.documentType}
                  onChange={e => setForm({ ...form, documentType: e.target.value })}
                  required
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                >
                  <option value="">Sélectionner un type</option>
                  {documentTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>
                  Client *
                </label>
                <select
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                  required
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Bâtiment */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: '#495057' }}>
                  Bâtiment *
                </label>
                <select
                  value={form.buildingId}
                  onChange={e => setForm({ ...form, buildingId: e.target.value })}
                  required
                  disabled={!form.clientId}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none
                    disabled:opacity-50"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}
                >
                  <option value="">Sélectionner un bâtiment</option>
                  {filteredBuildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm"
                  style={{ backgroundColor: '#C0392B' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}