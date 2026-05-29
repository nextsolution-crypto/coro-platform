'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';

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
  _count?: { documents: number };
}

interface Client {
  id: string;
  name: string;
}

interface Building {
  id: string;
  name: string;
  clientId: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', documentType: '', year: new Date().getFullYear().toString(),
    clientId: '', buildingId: '',
  });

  const documentTypes = ['PSI', 'PMU', 'PCA', 'PGC', 'PRA', 'PUE'];

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-500/20 text-gray-400',
    IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
    REVIEW: 'bg-yellow-500/20 text-yellow-400',
    VALIDATED: 'bg-green-500/20 text-green-400',
    EXPORTED: 'bg-purple-500/20 text-purple-400',
    ARCHIVED: 'bg-red-500/20 text-red-400',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Brouillon',
    IN_PROGRESS: 'En cours',
    REVIEW: 'En revision',
    VALIDATED: 'Valide',
    EXPORTED: 'Exporte',
    ARCHIVED: 'Archive',
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (form.clientId) {
      setFilteredBuildings(buildings.filter(b => b.clientId === form.clientId));
      setForm(prev => ({ ...prev, buildingId: '' }));
    }
  }, [form.clientId, buildings]);

  const fetchData = async () => {
    try {
      const [projectsRes, clientsRes, buildingsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/clients'),
        api.get('/buildings'),
      ]);
      setProjects(projectsRes.data);
      setClients(clientsRes.data);
      setBuildings(buildingsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/projects', {
        ...form,
        year: parseInt(form.year),
      });
      setShowModal(false);
      setForm({ name: '', documentType: '', year: new Date().getFullYear().toString(), clientId: '', buildingId: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Projets', path: '/projects', active: true },
    { label: 'Clients', path: '/clients' },
    { label: 'Batiments', path: '/buildings' },
    { label: 'Bibliotheque', path: '/library' },
    { label: 'Parametres', path: '/settings' },
  ];

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-white">Projets</h2>
              <p className="text-gray-400 mt-1">{projects.length} projet{projects.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">
              + Nouveau projet
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12"><p className="text-gray-500">Chargement...</p></div>
          ) : projects.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 mb-4">Aucun projet pour linstant</p>
              <button onClick={() => setShowModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg">
                Creer le premier projet
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <div key={project.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                        {project.documentType}
                      </span>
                      <h3 className="text-white font-semibold">{project.name}</h3>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[project.status]}`}>
                      {statusLabels[project.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{project.client.name}</span>
                    <span>—</span>
                    <span>{project.building.name}</span>
                    <span>—</span>
                    <span>{project.year}</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progression</span>
                      <span className="text-xs text-gray-400">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg">
            <h3 className="text-white font-semibold text-lg mb-6">Nouveau projet</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nom du projet *</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required placeholder="Ex: PMU Tour ABC 2026"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type de document *</label>
                <select value={form.documentType}
                  onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500">
                  <option value="">Selectionner un type</option>
                  {documentTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Annee *</label>
                <input type="number" value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"/>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Client *</label>
                <select value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500">
                  <option value="">Selectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Batiment *</label>
                <select value={form.buildingId}
                  onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
                  required
                  disabled={!form.clientId}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 disabled:opacity-50">
                  <option value="">Selectionner un batiment</option>
                  {filteredBuildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-lg">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg">
                  Creer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}