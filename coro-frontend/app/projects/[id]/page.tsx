'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En cours',
  REVIEW: 'En revision',
  VALIDATED: 'Valide',
  EXPORTED: 'Exporte',
  ARCHIVED: 'Archive',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
  REVIEW: 'bg-yellow-500/20 text-yellow-400',
  VALIDATED: 'bg-green-500/20 text-green-400',
  EXPORTED: 'bg-purple-500/20 text-purple-400',
  ARCHIVED: 'bg-red-500/20 text-red-400',
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { isAuthenticated, initAuth } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
    else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [projectRes, docRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/generator/document/${projectId}`).catch(() => ({ data: null })),
      ]);
      setProject(projectRes.data);
      setHasDocument(!!docRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const configStr = localStorage.getItem(`coro_config_${projectId}`);
      const config = configStr ? JSON.parse(configStr) : {};
      await api.post(`/generator/generate/${projectId}`, config);
      setHasDocument(true);
      await fetchData();
      router.push(`/editor/${projectId}`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la generation.');
    } finally {
      setGenerating(false);
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

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Chargement...</p>
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Projet introuvable</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white cursor-pointer" onClick={() => router.push('/dashboard')}>
          CO<span className="text-orange-500">RO</span>
        </h1>
        <button onClick={() => { useAuthStore.getState().logout(); router.push('/login'); }}
          className="text-gray-400 hover:text-white text-sm">Deconnexion</button>
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
          <div className="flex items-start justify-between mb-8">
            <div>
              <button onClick={() => router.push('/projects')}
                className="text-gray-500 hover:text-gray-300 text-sm mb-3 flex items-center gap-1">
                ← Retour aux projets
              </button>
              <div className="flex items-center gap-3">
                <span className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded">
                  {project.documentType}
                </span>
                <h2 className="text-2xl font-semibold text-white">{project.name}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-sm text-gray-400">
                <span>{project.client.name}</span>
                <span>—</span>
                <span>{project.building.name}</span>
                <span>—</span>
                <span>{project.year}</span>
              </div>
            </div>
          </div>

          {/* Progression */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Progression</h3>
              <span className="text-orange-400 font-bold">{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${project.progress}%` }}/>
            </div>
          </div>

          {/* 3 Etapes */}
          <div className="grid grid-cols-3 gap-4 mb-6">

            {/* Etape 1 - Configuration */}
            <div className={`bg-gray-900 border rounded-xl p-6 ${
              project.progress >= 25 ? 'border-green-500/30' : 'border-orange-500/30'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  project.progress >= 25 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {project.progress >= 25 ? '✓' : '1'}
                </div>
                <h3 className="text-white font-semibold">Configuration</h3>
              </div>
              <p className="text-gray-500 text-sm mb-4">Configurer le batiment et activer les procedures</p>
              <button
                onClick={() => router.push(`/configurator/${project.id}`)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                {project.progress >= 25 ? 'Modifier la config' : 'Configurer'}
              </button>
            </div>

            {/* Etape 2 - Generation */}
            <div className={`bg-gray-900 border rounded-xl p-6 ${
              project.progress >= 50 ? 'border-green-500/30' :
              project.progress >= 25 ? 'border-orange-500/30' : 'border-gray-800'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  project.progress >= 50 ? 'bg-green-500/20 text-green-400' :
                  project.progress >= 25 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-500'}`}>
                  {project.progress >= 50 ? '✓' : '2'}
                </div>
                <h3 className={`font-semibold ${project.progress >= 25 ? 'text-white' : 'text-gray-500'}`}>
                  Generation
                </h3>
              </div>
              <p className="text-gray-500 text-sm mb-4">Generer la structure du document automatiquement</p>
              <button
                onClick={handleGenerate}
                disabled={project.progress < 25 || generating}
                className={`w-full text-sm font-medium py-2 rounded-lg transition-colors ${
                  project.progress >= 25
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                {generating ? 'Generation en cours...' :
                  hasDocument ? 'Regenerer le document' : 'Generer le document'}
              </button>
            </div>

            {/* Etape 3 - Editeur */}
            <div className={`bg-gray-900 border rounded-xl p-6 ${
              hasDocument ? 'border-orange-500/30' : 'border-gray-800'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  hasDocument ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-500'}`}>
                  3
                </div>
                <h3 className={`font-semibold ${hasDocument ? 'text-white' : 'text-gray-500'}`}>
                  Editeur
                </h3>
              </div>
              <p className="text-gray-500 text-sm mb-4">Editer et personnaliser le document genere</p>
              <button
                onClick={() => router.push(`/editor/${project.id}`)}
                disabled={!hasDocument}
                className={`w-full text-sm font-medium py-2 rounded-lg transition-colors ${
                  hasDocument
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                {hasDocument ? 'Ouvrir l editeur' : 'Disponible apres generation'}
              </button>
            </div>
          </div>

          {/* Infos projet */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Informations du projet</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Client', value: project.client.name },
                { label: 'Batiment', value: project.building.name },
                { label: 'Adresse', value: project.building.address },
                { label: 'Type de document', value: project.documentType },
                { label: 'Annee', value: project.year.toString() },
                { label: 'Responsable', value: `${project.user.firstName} ${project.user.lastName}` },
              ].map((info) => (
                <div key={info.label}>
                  <p className="text-gray-500 text-xs">{info.label}</p>
                  <p className="text-white text-sm mt-1">{info.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}