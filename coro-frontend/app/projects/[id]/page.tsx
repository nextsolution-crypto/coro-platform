'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  PSI: '#C0392B', PMU: '#2980B9', PCA: '#27AE60',
  PGC: '#8E44AD', PRA: '#F39C12', PUE: '#E67E22',
};

export default function ProjectDetailPage() {
  const router    = useRouter();
  const params    = useParams();
  const projectId = params?.id as string;
  const { isAuthenticated, initAuth } = useAuthStore();

  const [project,     setProject]     = useState<Project | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
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
  if (!projectId) return;
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
      alert('Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>
        Chargement...
      </p>
    </div>
  );

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-sm" style={{ color: '#ADB5BD' }}>Projet introuvable</p>
    </div>
  );

  const sc  = statusColors[project.status] || statusColors.DRAFT;
  const dc  = docTypeColors[project.documentType] || '#6C757D';

  const steps = [
    {
      num: 1,
      title: 'Configuration',
      desc: 'Configurer le bâtiment et activer les procédures',
      done: project.progress >= 25,
      enabled: true,
      label: project.progress >= 25 ? 'Modifier la config' : 'Configurer',
      action: () => router.push(`/configurator/${project.id}`),
    },
    {
      num: 2,
      title: 'Génération',
      desc: 'Générer la structure du document automatiquement',
      done: project.progress >= 50,
      enabled: project.progress >= 25,
      label: generating ? 'Génération...' : hasDocument ? 'Régénérer' : 'Générer le document',
      action: handleGenerate,
      loading: generating,
    },
    {
      num: 3,
      title: 'Éditeur',
      desc: 'Éditer et personnaliser le document généré',
      done: false,
      enabled: hasDocument,
      label: hasDocument ? 'Ouvrir l\'éditeur' : 'Disponible après génération',
      action: () => router.push(`/editor/${project.id}`),
    },
  ];

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <button
        onClick={() => router.push('/projects')}
        className="text-sm mb-4 flex items-center gap-1 transition-colors"
        style={{ color: '#6C757D' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#2C3E50')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6C757D')}
      >
        ← Retour aux projets
      </button>

      {/* Header projet */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-white text-sm font-bold px-3 py-1 rounded"
              style={{ backgroundColor: dc }}>
              {project.documentType}
            </span>
            <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
              {project.name}
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                backgroundColor: sc.bg,
                color: sc.text,
                border: `1px solid ${sc.border}`,
              }}>
              {statusLabels[project.status]}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#6C757D' }}>
            <span>{project.client.name}</span>
            <span style={{ color: '#DEE2E6' }}>•</span>
            <span>{project.building.name}</span>
            <span style={{ color: '#DEE2E6' }}>•</span>
            <span>{project.year}</span>
          </div>
        </div>
      </div>

      {/* Progression */}
      <div className="rounded-md p-6 mb-6"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E9ECEF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Progression</h3>
          <span className="font-bold" style={{ color: '#C0392B' }}>
            {project.progress}%
          </span>
        </div>
        <div className="w-full rounded-full h-2" style={{ backgroundColor: '#E9ECEF' }}>
          <div className="h-2 rounded-full transition-all"
            style={{
              width: `${project.progress}%`,
              backgroundColor: project.progress === 100 ? '#27AE60' : '#C0392B',
            }} />
        </div>
      </div>

      {/* 3 Étapes */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {steps.map(step => (
          <div key={step.num} className="rounded-md p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${step.done ? '#A9DFBF' : step.enabled ? '#F1948A' : '#E9ECEF'}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center
                text-sm font-bold"
                style={{
                  backgroundColor: step.done ? '#EAFAF1' : step.enabled ? '#FDEDEC' : '#F8F9FA',
                  color: step.done ? '#27AE60' : step.enabled ? '#C0392B' : '#ADB5BD',
                }}>
                {step.done ? '✓' : step.num}
              </div>
              <h3 className="font-semibold"
                style={{ color: step.enabled ? '#2C3E50' : '#ADB5BD' }}>
                {step.title}
              </h3>
            </div>
            <p className="text-sm mb-4" style={{ color: '#6C757D' }}>
              {step.desc}
            </p>
            <button
              onClick={step.action}
              disabled={!step.enabled || step.loading}
              className="w-full text-sm font-medium py-2 rounded transition-colors"
              style={{
                backgroundColor: step.enabled ? '#C0392B' : '#F8F9FA',
                color: step.enabled ? '#FFFFFF' : '#ADB5BD',
                cursor: step.enabled ? 'pointer' : 'not-allowed',
                border: step.enabled ? 'none' : '1px solid #E9ECEF',
              }}
              onMouseEnter={e => {
                if (step.enabled) e.currentTarget.style.backgroundColor = '#A93226';
              }}
              onMouseLeave={e => {
                if (step.enabled) e.currentTarget.style.backgroundColor = '#C0392B';
              }}
            >
              {step.label}
            </button>
          </div>
        ))}
      </div>

      {/* Infos projet */}
      <div className="rounded-md p-6"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E9ECEF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
        <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>
          Informations du projet
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Client',            value: project.client.name },
            { label: 'Bâtiment',          value: project.building.name },
            { label: 'Adresse',           value: project.building.address },
            { label: 'Type de document',  value: project.documentType },
            { label: 'Année',             value: project.year.toString() },
            { label: 'Responsable',       value: `${project.user.firstName} ${project.user.lastName}` },
          ].map(info => (
            <div key={info.label}>
              <p className="text-xs" style={{ color: '#ADB5BD' }}>{info.label}</p>
              <p className="text-sm mt-1 font-medium" style={{ color: '#2C3E50' }}>
                {info.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}