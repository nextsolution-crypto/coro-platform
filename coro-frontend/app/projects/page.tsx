'use client';

import { useState, useEffect, useRef } from 'react';
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
  updatedAt: string;
  client: { id: string; name: string };
  building: { id: string; name: string; address: string };
  user: { id: string; firstName: string; lastName: string };
  lastEditedBy?: { id: string; firstName: string; lastName: string } | null;
  qualityScore?: { score: number; level: string } | null;
}

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
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
  DRAFT: 'Brouillon', IN_PROGRESS: 'En cours', REVIEW: 'En révision',
  VALIDATED: 'Validé', EXPORTED: 'Exporté', ARCHIVED: 'Archivé',
};

const docTypeColors: Record<string, string> = {
  PSI: '#C0392B', PMU: '#2980B9', PCA: '#27AE60',
  PGC: '#8E44AD', PRA: '#F39C12', PUE: '#E67E22',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${days}j`;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [projects, setProjects]               = useState<Project[]>([]);
  const [orgUsers, setOrgUsers]               = useState<OrgUser[]>([]);
  const [clients, setClients]                 = useState<Client[]>([]);
  const [buildings, setBuildings]             = useState<Building[]>([]);
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [activeTab, setActiveTab]             = useState<'actifs' | 'archives'>('actifs');
  const [maxProjects, setMaxProjects]         = useState<number | null>(null);
  const [userFilter, setUserFilter]           = useState<string>('tous');
  const [form, setForm] = useState({
    name: '', documentType: '',
    year: new Date().getFullYear().toString(),
    clientId: '', buildingId: '',
  });

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting]   = useState(false);

  const documentTypes = ['PSI', 'PMU', 'PCA', 'PGC', 'PRA', 'PUE'];
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      // Polling toutes les 30 secondes pour détecter les modifications d'autres utilisateurs
      pollRef.current = setInterval(() => fetchProjectsOnly(), 30000);
    } else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated]);

  useEffect(() => {
    if (form.clientId) {
      setFilteredBuildings(buildings.filter(b => b.clientId === form.clientId));
      setForm(prev => ({ ...prev, buildingId: '' }));
    }
  }, [form.clientId, buildings]);

  const fetchProjectsOnly = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    try {
      const [pr, cl, bl, orgRes, usersRes] = await Promise.all([
        api.get('/projects'),
        api.get('/clients'),
        api.get('/buildings'),
        api.get('/organizations/me/info').catch(() => ({ data: null })),
        api.get('/users/organization').catch(() => ({ data: [] })),
      ]);
      const projectsData = pr.data;
      setProjects(projectsData);
      setClients(cl.data);
      setBuildings(bl.data);
      setOrgUsers(usersRes.data || []);

      // Charger les modèles disponibles
      try {
        const templatesRes = await api.get('/templates');
        setTemplates(templatesRes.data || []);
      } catch { setTemplates([]); }

      if (orgRes.data) {
        const limits: Record<string, number | null> = {
          ESSAI_GRATUIT: 1, STANDARD: null, ENTREPRISE: null,
        };
        setMaxProjects(limits[orgRes.data.licenseType] ?? null);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Filtres combinés
  const visibleProjects = projects.filter(p => {
    const archiveMatch = activeTab === 'archives' ? p.status === 'ARCHIVED' : p.status !== 'ARCHIVED';
    const userMatch =
      userFilter === 'tous' ? true :
      userFilter === 'moi' ? p.user.id === user?.id :
      p.user.id === userFilter;
    return archiveMatch && userMatch;
  });

  const handleReactivate = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/projects/${projectId}`, { status: 'IN_PROGRESS' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => api.delete(`/projects/${id}`)));
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleProjects.map(p => p.id)));
    }
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Projets
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {visibleProjects.length} / {maxProjects === null ? 'illimité' : maxProjects} projet{visibleProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="text-sm font-medium px-4 py-2 rounded transition-colors flex items-center gap-2"
              style={{ border: '1px solid #F1948A', color: '#C0392B', backgroundColor: '#FDEDEC' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1948A22'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
            >
              🗑 Supprimer ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            disabled={maxProjects !== null && projects.filter(p => p.status !== 'ARCHIVED').length >= maxProjects}
            className="text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => { if (!(maxProjects !== null && projects.filter(p => p.status !== 'ARCHIVED').length >= maxProjects)) e.currentTarget.style.backgroundColor = '#A93226'; }}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}
          >
            + Nouveau projet
          </button>
        </div>
      </div>

      {maxProjects !== null && projects.filter(p => p.status !== 'ARCHIVED').length >= maxProjects && (
        <div className="rounded-md p-4 mb-4 flex items-center gap-3"
          style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
          <span style={{ color: '#F39C12', fontSize: '18px' }}>⚠</span>
          <p className="text-sm" style={{ color: '#7D6608' }}>
            Vous avez atteint la limite de projets pour votre licence actuelle. Contactez CORO pour mettre à niveau.
          </p>
        </div>
      )}

      {/* Filtres par utilisateur */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setUserFilter('tous')}
          className="px-3 py-1.5 text-xs rounded-full font-medium transition-colors"
          style={{
            backgroundColor: userFilter === 'tous' ? '#2C3E50' : '#F8F9FA',
            color: userFilter === 'tous' ? '#FFFFFF' : '#6C757D',
            border: `1px solid ${userFilter === 'tous' ? '#2C3E50' : '#DEE2E6'}`,
          }}
        >
          Tous les projets ({projects.filter(p => p.status !== 'ARCHIVED').length})
        </button>
        <button
          onClick={() => setUserFilter('moi')}
          className="px-3 py-1.5 text-xs rounded-full font-medium transition-colors"
          style={{
            backgroundColor: userFilter === 'moi' ? '#C0392B' : '#F8F9FA',
            color: userFilter === 'moi' ? '#FFFFFF' : '#6C757D',
            border: `1px solid ${userFilter === 'moi' ? '#C0392B' : '#DEE2E6'}`,
          }}
        >
          Mes projets ({projects.filter(p => p.user.id === user?.id && p.status !== 'ARCHIVED').length})
        </button>
        {orgUsers.filter(u => u.id !== user?.id).map(u => (
          <button
            key={u.id}
            onClick={() => setUserFilter(u.id)}
            className="px-3 py-1.5 text-xs rounded-full font-medium transition-colors"
            style={{
              backgroundColor: userFilter === u.id ? '#2980B9' : '#F8F9FA',
              color: userFilter === u.id ? '#FFFFFF' : '#6C757D',
              border: `1px solid ${userFilter === u.id ? '#2980B9' : '#DEE2E6'}`,
            }}
          >
            {u.firstName} {u.lastName} ({projects.filter(p => p.user.id === u.id && p.status !== 'ARCHIVED').length})
          </button>
        ))}
      </div>

      {/* Onglets Actifs / Archivés */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid #E9ECEF' }}>
        {([
          { key: 'actifs', label: 'Actifs' },
          { key: 'archives', label: 'Archivés' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? '#C0392B' : '#6C757D',
              borderBottom: activeTab === tab.key ? '2px solid #C0392B' : '2px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Barre de sélection */}
      {visibleProjects.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded transition-colors"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <input
              type="checkbox"
              readOnly
              checked={selectedIds.size === visibleProjects.length && visibleProjects.length > 0}
              style={{ accentColor: '#C0392B', width: '14px', height: '14px' }}
            />
            {selectedIds.size === visibleProjects.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
          {selectedIds.size > 0 && (
            <span className="text-xs" style={{ color: '#6C757D' }}>
              {selectedIds.size} projet{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Liste projets */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div>
          {projects.length === 0 && clients.length === 0 ? (
            /* Guide onboarding — premier démarrage */
            <div className="rounded-md p-8 mb-6"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: '#ADB5BD' }}>
                Par où commencer ?
              </p>
              <h3 className="text-xl font-black mb-6" style={{ color: '#2C3E50' }}>
                3 étapes pour créer votre premier projet
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    num: '①',
                    title: 'Créer un client',
                    desc: 'Ajoutez le nom, courriel et logo de votre client.',
                    color: '#C0392B',
                    bg: '#FDEDEC',
                    border: '#F1948A',
                    action: () => router.push('/clients'),
                    label: '→ Aller aux clients',
                    done: clients.length > 0,
                  },
                  {
                    num: '②',
                    title: 'Ajouter un bâtiment',
                    desc: 'Associez un bâtiment à ce client (adresse, étages, type).',
                    color: '#2980B9',
                    bg: '#EBF5FB',
                    border: '#AED6F1',
                    action: () => router.push('/buildings'),
                    label: '→ Aller aux bâtiments',
                    done: buildings.length > 0,
                  },
                  {
                    num: '③',
                    title: 'Créer un projet',
                    desc: 'Choisissez le type de document, le client et le bâtiment.',
                    color: '#27AE60',
                    bg: '#EAFAF1',
                    border: '#A9DFBF',
                    action: () => setShowModal(true),
                    label: '+ Nouveau projet',
                    done: false,
                  },
                ].map(step => (
                  <div key={step.num} className="rounded-md p-5"
                    style={{ backgroundColor: step.bg, border: `1px solid ${step.border}` }}>
                    <div className="text-3xl mb-3">{step.num}</div>
                    <p className="font-bold text-sm mb-1" style={{ color: step.color }}>{step.title}</p>
                    <p className="text-xs mb-4" style={{ color: '#6C757D' }}>{step.desc}</p>
                    <button onClick={step.action}
                      className="text-xs font-medium px-3 py-1.5 rounded transition-colors text-white"
                      style={{ backgroundColor: step.color }}>
                      {step.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md p-12 text-center"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun projet dans cette vue</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleProjects.map(project => {
            const sc = statusColors[project.status] || statusColors.DRAFT;
            const dc = docTypeColors[project.documentType] || '#6C757D';
            const isMyProject = project.user.id === user?.id;
            const lastEditor = project.lastEditedBy;
            const wasRecentlyEdited = project.updatedAt &&
              Date.now() - new Date(project.updatedAt).getTime() < 5 * 60 * 1000; // 5 min

            return (
              <div key={project.id}
                onClick={() => selectedIds.size > 0 ? toggleSelect(project.id, { stopPropagation: () => {} } as any) : router.push(`/projects/${project.id}`)}
                className="rounded-md p-5 cursor-pointer transition-all flex gap-3"
                style={{
                  backgroundColor: selectedIds.has(project.id) ? '#FDEDEC' : '#FFFFFF',
                  border: `1px solid ${selectedIds.has(project.id) ? '#F1948A' : wasRecentlyEdited && !isMyProject ? '#AED6F1' : '#E9ECEF'}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  if (!selectedIds.has(project.id)) e.currentTarget.style.borderColor = '#CED4DA';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = selectedIds.has(project.id) ? '#F1948A' : wasRecentlyEdited && !isMyProject ? '#AED6F1' : '#E9ECEF';
                }}>
                {/* Checkbox */}
                <div className="flex-shrink-0 pt-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(project.id)}
                    onChange={() => {}}
                    onClick={e => toggleSelect(project.id, e)}
                    style={{ accentColor: '#C0392B', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>
                <div className="flex-1 min-w-0">

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-xs font-bold px-2.5 py-1 rounded"
                      style={{ backgroundColor: dc }}>
                      {project.documentType}
                    </span>
                    <h3 className="font-semibold" style={{ color: '#2C3E50' }}>
                      {project.name}
                    </h3>
                    {!isMyProject && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#EBF5FB', color: '#2980B9', border: '1px solid #AED6F1' }}>
                        {project.user.firstName} {project.user.lastName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                    {statusLabels[project.status]}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm mb-3" style={{ color: '#6C757D' }}>
                  <span>{project.client.name}</span>
                  <span style={{ color: '#DEE2E6' }}>•</span>
                  <span>{project.building.name}</span>
                  <span style={{ color: '#DEE2E6' }}>•</span>
                  <span>{project.year}</span>
                </div>

                {/* Score de qualité */}
                {project.qualityScore ? (
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#ADB5BD' }}>Score qualité</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            project.qualityScore.level === 'EXCELLENT' ? '#EAFAF1' :
                            project.qualityScore.level === 'BON' ? '#EBF5FB' :
                            project.qualityScore.level === 'A_AMELIORER' ? '#FEF9E7' : '#FDEDEC',
                          color:
                            project.qualityScore.level === 'EXCELLENT' ? '#27AE60' :
                            project.qualityScore.level === 'BON' ? '#2980B9' :
                            project.qualityScore.level === 'A_AMELIORER' ? '#F39C12' : '#C0392B',
                        }}>
                        {project.qualityScore.level === 'EXCELLENT' ? '⭐ Excellent' :
                         project.qualityScore.level === 'BON' ? '✓ Bon' :
                         project.qualityScore.level === 'A_AMELIORER' ? '⚠ À améliorer' : '✗ Incomplet'}
                      </span>
                    </div>
                    <span className="text-lg font-black"
                      style={{
                        color:
                          project.qualityScore.level === 'EXCELLENT' ? '#27AE60' :
                          project.qualityScore.level === 'BON' ? '#2980B9' :
                          project.qualityScore.level === 'A_AMELIORER' ? '#F39C12' : '#C0392B',
                      }}>
                      {project.qualityScore.score}/100
                    </span>
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: '#ADB5BD' }}>Progression</span>
                      <span className="text-xs font-medium" style={{ color: '#6C757D' }}>{project.progress}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#E9ECEF' }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${project.progress}%`, backgroundColor: '#C0392B' }} />
                    </div>
                  </div>
                )}

                {/* Dernière modification */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {wasRecentlyEdited && lastEditor && lastEditor.id !== user?.id ? (
                      <span className="flex items-center gap-1.5 text-xs"
                        style={{ color: '#2980B9' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ backgroundColor: '#2980B9' }} />
                        {lastEditor.firstName} {lastEditor.lastName} travaille dans ce projet
                      </span>
                    ) : lastEditor ? (
                      <span className="text-xs" style={{ color: '#ADB5BD' }}>
                        Modifié par {lastEditor.firstName} {lastEditor.lastName} — {timeAgo(project.updatedAt)}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: '#ADB5BD' }}>
                        Créé par {project.user.firstName} {project.user.lastName}
                      </span>
                    )}
                  </div>

                  {activeTab === 'archives' && (
                    <button
                      onClick={e => handleReactivate(project.id, e)}
                      className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
                      style={{ border: '1px solid #DEE2E6', color: '#27AE60' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAFAF1'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      Réactiver
                    </button>
                  )}
                </div>
                </div>
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
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-6" style={{ color: '#2C3E50' }}>
              Nouveau projet
            </h3>
            {clients.length === 0 && (
              <div className="rounded-md p-4 mb-4"
                style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
                <p className="text-sm font-medium mb-1" style={{ color: '#D35400' }}>
                  ⚠️ Aucun client configuré
                </p>
                <p className="text-xs mb-2" style={{ color: '#7D6608' }}>
                  Vous devez d'abord créer un client avant de pouvoir créer un projet.
                </p>
                <button onClick={() => { setShowModal(false); router.push('/clients'); }}
                  className="text-xs font-medium px-3 py-1.5 rounded text-white"
                  style={{ backgroundColor: '#E67E22' }}>
                  → Créer un client maintenant
                </button>
              </div>
            )}
            {clients.length > 0 && buildings.length === 0 && (
              <div className="rounded-md p-4 mb-4"
                style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
                <p className="text-sm font-medium mb-1" style={{ color: '#D35400' }}>
                  ⚠️ Aucun bâtiment configuré
                </p>
                <p className="text-xs mb-2" style={{ color: '#7D6608' }}>
                  Vous devez d'abord ajouter un bâtiment avant de créer un projet.
                </p>
                <button onClick={() => { setShowModal(false); router.push('/buildings'); }}
                  className="text-xs font-medium px-3 py-1.5 rounded text-white"
                  style={{ backgroundColor: '#E67E22' }}>
                  → Ajouter un bâtiment maintenant
                </button>
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Sélecteur de modèle */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    Partir d'un modèle (optionnel)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={async e => {
                      setSelectedTemplate(e.target.value);
                      if (e.target.value) {
                        try {
                          const res = await api.get(`/templates/${e.target.value}`);
                          const t = res.data;
                          setForm(prev => ({
                            ...prev,
                            documentType: t.documentType || prev.documentType,
                          }));
                          // Sauvegarder la config du modèle pour le configurateur
                          if (t.configData?.documentConfig) {
                            localStorage.setItem('coro_template_config', JSON.stringify(t.configData.documentConfig));
                          }
                        } catch { console.error('Erreur chargement modèle'); }
                      } else {
                        localStorage.removeItem('coro_template_config');
                      }
                    }}
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  >
                    <option value="">— Projet vierge —</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.documentType})
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="text-xs mt-1" style={{ color: '#2980B9' }}>
                      ✓ La configuration de ce modèle sera appliquée automatiquement
                    </p>
                  )}
                </div>
              )}
              {[
                { label: 'Nom du projet *', key: 'name', type: 'text', placeholder: 'Ex: PMU Tour ABC 2026' },
                { label: 'Année *', key: 'year', type: 'number', placeholder: '' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                    {field.label}
                  </label>
                  <input type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder} required
                    className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Type de document *
                </label>
                <select value={form.documentType}
                  onChange={e => setForm({ ...form, documentType: e.target.value })} required
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="">Sélectionner un type</option>
                  {documentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Client *</label>
                <select value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })} required
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Bâtiment *</label>
                <select value={form.buildingId}
                  onChange={e => setForm({ ...form, buildingId: e.target.value })} required
                  disabled={!form.clientId}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none disabled:opacity-50"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="">Sélectionner un bâtiment</option>
                  {filteredBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm"
                  style={{ backgroundColor: '#C0392B' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#A93226')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#C0392B')}>
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal suppression multiple */}
      {showBulkDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-md p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 className="font-semibold text-lg" style={{ color: '#C0392B' }}>
                Supprimer {selectedIds.size} projet{selectedIds.size > 1 ? 's' : ''}
              </h3>
            </div>
            <p className="text-sm mb-2" style={{ color: '#2C3E50' }}>
              Cette action est <strong>irréversible</strong>. Les projets suivants et toutes leurs données seront supprimés définitivement :
            </p>
            <div className="rounded-md p-3 mb-6 space-y-1"
              style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
              {visibleProjects.filter(p => selectedIds.has(p.id)).map(p => (
                <p key={p.id} className="text-xs font-medium" style={{ color: '#C0392B' }}>
                  • {p.name} ({p.documentType} — {p.client.name})
                </p>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDelete(false)}
                className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                Annuler
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {bulkDeleting ? 'Suppression...' : `🗑 Supprimer ${selectedIds.size} projet${selectedIds.size > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
