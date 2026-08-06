'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import ExportModal from '@/components/ExportModal';

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
  submittedById?: string | null;
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
  const { user: authUser, isAuthenticated, initAuth } = useAuthStore();

  const [project,     setProject]     = useState<Project | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [hasDocument, setHasDocument] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [exportingGuide, setExportingGuide] = useState(false);
  const handleExportGuide = async (language: 'fr' | 'en' | 'both') => {
    setExportingGuide(true);
    try {
      const token = localStorage.getItem('coro_token');
      const safeName = (project?.name || 'guide').replace(/[^a-z0-9]/gi, '-');

      if (language === 'both') {
        // Exporter FR et EN séparément
        for (const lang of ['fr', 'en'] as const) {
          const res = await fetch(`http://localhost:3002/api/projects/${projectId}/guide/export`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: lang }),
          });
          if (!res.ok) throw new Error('Erreur export guide');
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${safeName}-Guide-${lang.toUpperCase()}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const res = await fetch(`http://localhost:3002/api/projects/${projectId}/guide/export`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ language }),
        });
        if (!res.ok) throw new Error('Erreur export guide');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}-Guide-${language.toUpperCase()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setShowGuideModal(false);
    } catch (err) { console.error(err); }
    finally { setExportingGuide(false); }
  };
  const [hasPlans, setHasPlans] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [validations, setValidations] = useState<any[]>([]);
  const [qualityScore, setQualityScore] = useState<any>(null);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const [showAudit, setShowAudit] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [showApprovalModal, setShowApprovalModal] = useState<'approve' | 'reject' | 'request-revision' | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

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
      const [projectRes, docRes, plansRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/generator/document/${projectId}`).catch(() => ({ data: null })),
        api.get(`/projects/${projectId}/building-plans`).catch(() => ({ data: [] })),
      ]);
      setProject(projectRes.data);
      setHasDocument(!!docRes.data);
      setHasPlans((plansRes.data || []).length > 0);

      if (docRes.data) {
        try {
          const [valRes, scoreRes] = await Promise.all([
            api.get(`/generator/validate/${projectId}`),
            api.get(`/projects/${projectId}/quality-score`),
          ]);
          setValidations(valRes.data || []);
          setQualityScore(scoreRes.data || null);
        } catch { setValidations([]); }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

const handleChangeStatus = async (newStatus: string) => {
    setStatusChanging(true);
    try {
      await api.put(`/projects/${projectId}`, { status: newStatus });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors du changement de statut.');
    } finally {
      setStatusChanging(false);
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
      setJustGenerated(true);
      setTimeout(() => setJustGenerated(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTemplate(true);
    try {
      await api.post(`/templates/from-project/${projectId}`, {
        name: templateName,
        description: templateDesc,
      });
      setTemplateSaved(true);
      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateDesc('');
      setTimeout(() => setTemplateSaved(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleShowAudit = async () => {
    setShowAudit(true);
    setLoadingAudit(true);
    try {
      const res = await api.get(`/audit/project/${projectId}`);
      setAuditLogs(res.data || []);
    } catch { setAuditLogs([]); }
    finally { setLoadingAudit(false); }
  };

  const handleApproval = async (action: 'submit' | 'approve' | 'reject' | 'request-revision') => {
    setProcessingApproval(true);
    try {
      if (action === 'submit') {
        await api.post(`/projects/${projectId}/submit`);
      } else if (action === 'approve') {
        await api.post(`/projects/${projectId}/approve`, { comment: approvalComment });
      } else if (action === 'reject') {
        await api.post(`/projects/${projectId}/reject`, { comment: approvalComment });
      } else {
        await api.post(`/projects/${projectId}/request-revision`, { comment: approvalComment });
      }
      setShowApprovalModal(null);
      setApprovalComment('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectId}`);
      router.push('/projects');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
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

        {project.status !== 'ARCHIVED' && (
          <div className="flex items-center gap-2 flex-wrap">

            {/* Soumettre pour approbation */}
            {project.status === 'IN_PROGRESS' && hasDocument && (
              <button
                onClick={() => handleApproval('submit')}
                disabled={statusChanging}
                className="text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50"
                style={{ border: '1px solid #A9DFBF', color: '#27AE60' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAFAF1'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ✓ Soumettre pour approbation
              </button>
            )}

            {/* Approuver / Rejeter */}
            {project.status === 'REVIEW' && project.submittedById !== authUser?.id && (
              <>
                <button
                  onClick={() => setShowApprovalModal('approve')}
                  className="text-sm font-medium px-4 py-2 rounded transition-colors text-white"
                  style={{ backgroundColor: '#27AE60' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E8449'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#27AE60'}
                >
                  ✓ Approuver
                </button>
                <button
                  onClick={() => setShowApprovalModal('reject')}
                  className="text-sm font-medium px-4 py-2 rounded transition-colors"
                  style={{ border: '1px solid #F1948A', color: '#C0392B' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  ✕ Rejeter
                </button>
              </>
            )}

            {project.status === 'REVIEW' && project.submittedById === authUser?.id && (
              <span className="text-xs px-3 py-1.5 rounded"
                style={{ backgroundColor: '#FEF9E7', color: '#F39C12', border: '1px solid #FAD7A0' }}>
                ⏳ En attente d'approbation par un collègue
              </span>
            )}

            <button onClick={handleShowAudit}
              className="text-sm font-medium px-4 py-2 rounded transition-colors"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              📋 Journal
            </button>

            <button
              onClick={() => router.push(`/projects/${projectId}/activities`)}
              className="text-sm font-medium px-4 py-2 rounded transition-colors flex items-center gap-2"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              📅 Activités
            </button>

            <button onClick={() => setShowTemplateModal(true)} disabled={!hasDocument}
              className="text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50"
              style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
              onMouseEnter={e => { if (hasDocument) e.currentTarget.style.backgroundColor = '#EBF5FB'; }}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              💾 Modèle
            </button>

            <button
              onClick={() => router.push(`/projects/${projectId}/procedures`)}
              className="text-sm font-medium px-4 py-2 rounded transition-colors flex items-center gap-2"
              style={{ border: '1px solid #D2B4DE', color: '#8E44AD' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F4ECF7'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ✨ Procédures IA
            </button>

            <button
              onClick={() => router.push(`/projects/${projectId}/mandate`)}
              className="text-sm font-medium px-4 py-2 rounded transition-colors flex items-center gap-2"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              💼 Mandat
            </button>

            {project.status !== 'VALIDATED' && (
              <button onClick={() => handleChangeStatus('ARCHIVED')} disabled={statusChanging}
                className="text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                Archiver
              </button>
            )}

            <button onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); }}
              className="text-sm font-medium px-4 py-2 rounded transition-colors"
              style={{ border: '1px solid #F1948A', color: '#C0392B' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              🗑 Supprimer
            </button>
          </div>
        )}
      </div>

{/* Bannière statut approbation */}
      {project.status === 'REVIEW' && (
        <div className="rounded-md p-4 mb-6 flex items-center gap-3"
          style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
          <span style={{ fontSize: '20px' }}>⏳</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F39C12' }}>
              Document en attente d'approbation
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
              L'éditeur est en lecture seule jusqu'à l'approbation ou le rejet.
            </p>
          </div>
        </div>
      )}

      {project.status === 'VALIDATED' && (
        <div className="rounded-md p-4 mb-6 flex items-center justify-between gap-3"
          style={{ backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '20px' }}>✓</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#27AE60' }}>
                Document approuvé et verrouillé
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
                Ce document a été validé officiellement. Il est en lecture seule.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowApprovalModal('request-revision')}
            className="text-xs font-medium px-3 py-1.5 rounded transition-colors flex-shrink-0"
            style={{ border: '1px solid #A9DFBF', color: '#27AE60' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D5F5E3'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✏️ Apporter une mise à jour
          </button>
        </div>
      )}

      {justGenerated && (
        <div className="rounded-md p-4 mb-6 flex items-center gap-3"
          style={{
            backgroundColor: '#EAFAF1',
            border: '1px solid #A9DFBF',
          }}>
          <span style={{ color: '#27AE60', fontSize: '20px' }}>✓</span>
          <p className="text-sm font-medium" style={{ color: '#1E8449' }}>
            Document généré avec succès. Vous pouvez maintenant ouvrir l'éditeur ou tester l'export PDF.
          </p>
        </div>
      )}

      {templateSaved && (
        <div className="rounded-md p-4 mb-6 flex items-center gap-3"
          style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
          <span style={{ color: '#2980B9', fontSize: '20px' }}>✓</span>
          <p className="text-sm font-medium" style={{ color: '#1A5276' }}>
            Modèle enregistré avec succès. Il sera disponible à la création d'un nouveau projet.
          </p>
        </div>
      )}

      {/* Bannière contextuelle guidante */}
      {!justGenerated && !templateSaved &&
        project.status !== 'REVIEW' &&
        project.status !== 'VALIDATED' &&
        project.status !== 'ARCHIVED' && (() => {
          // Étape 1 — Pas encore configuré
          if (project.progress === 0) return (
            <div className="rounded-md p-4 mb-6 flex items-center justify-between gap-3"
              style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '20px' }}>👋</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#2980B9' }}>
                    Première étape — Configurer le bâtiment
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
                    Renseignez les informations du bâtiment pour que CORO génère automatiquement votre document.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/configurator/${project.id}`)}
                className="text-sm font-medium px-4 py-2 rounded flex-shrink-0 text-white"
                style={{ backgroundColor: '#2980B9' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2471A3'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2980B9'}
              >
                Configurer →
              </button>
            </div>
          );
          // Étape 2 — Configuré mais pas de document
          if (project.progress >= 25 && !hasDocument) return (
            <div className="rounded-md p-4 mb-6 flex items-center justify-between gap-3"
              style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '20px' }}>⚡</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#2980B9' }}>
                    Configuration complète — Générez votre document
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
                    CORO va créer automatiquement la structure complète de votre {project.documentType} en quelques secondes.
                  </p>
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="text-sm font-medium px-4 py-2 rounded flex-shrink-0 text-white disabled:opacity-50"
                style={{ backgroundColor: '#2980B9' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2471A3'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2980B9'}
              >
                {generating ? '⏳ Génération...' : 'Générer →'}
              </button>
            </div>
          );
          // Étape 3 — Document généré, score < 60
          if (hasDocument && qualityScore && qualityScore.score < 60) return (
            <div className="rounded-md p-4 mb-6 flex items-center justify-between gap-3"
              style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '20px' }}>📝</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#F39C12' }}>
                    Document généré — Complétez l'éditeur
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
                    Ajoutez les contacts téléphoniques, complétez l'organigramme et téléversez les plans pour atteindre un score de qualité optimal.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/editor/${project.id}`)}
                className="text-sm font-medium px-4 py-2 rounded flex-shrink-0 text-white"
                style={{ backgroundColor: '#F39C12' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D68910'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F39C12'}
              >
                Ouvrir l'éditeur →
              </button>
            </div>
          );
          // Étape 4 — Score ≥ 60, prêt pour approbation
          if (hasDocument && qualityScore && qualityScore.score >= 60 && project.status === 'IN_PROGRESS') return (
            <div className="rounded-md p-4 mb-6 flex items-center justify-between gap-3"
              style={{ backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF' }}>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '20px' }}>🎯</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#27AE60' }}>
                    Document prêt — Soumettez pour approbation
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
                    Score de qualité {qualityScore.score}/100. Faites réviser le document par un collègue avant l'export final.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleApproval('submit')}
                className="text-sm font-medium px-4 py-2 rounded flex-shrink-0 text-white"
                style={{ backgroundColor: '#27AE60' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E8449'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#27AE60'}
              >
                Soumettre →
              </button>
            </div>
          );
          return null;
        })()
      }

      {/* Progression */}
      <div className="rounded-md p-6 mb-6"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E9ECEF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: '#2C3E50' }} title="Avancement des grandes étapes du projet (Configuration → Génération → Éditeur), pas le détail du formulaire de configuration">Progression ⓘ</h3>
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

{/* Score de qualité */}
      {qualityScore && (
        <div className="rounded-md p-6 mb-6"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Score de qualité documentaire</h3>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black"
                style={{
                  color: qualityScore.level === 'EXCELLENT' ? '#27AE60' :
                         qualityScore.level === 'BON' ? '#2980B9' :
                         qualityScore.level === 'A_AMELIORER' ? '#F39C12' : '#C0392B',
                }}>
                {qualityScore.score}
              </span>
              <span className="text-sm" style={{ color: '#ADB5BD' }}>/100</span>
              <span className="text-sm font-bold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: qualityScore.level === 'EXCELLENT' ? '#EAFAF1' :
                                   qualityScore.level === 'BON' ? '#EBF5FB' :
                                   qualityScore.level === 'A_AMELIORER' ? '#FEF9E7' : '#FDEDEC',
                  color: qualityScore.level === 'EXCELLENT' ? '#27AE60' :
                         qualityScore.level === 'BON' ? '#2980B9' :
                         qualityScore.level === 'A_AMELIORER' ? '#F39C12' : '#C0392B',
                }}>
                {qualityScore.level === 'EXCELLENT' ? '⭐ Excellent' :
                 qualityScore.level === 'BON' ? '✓ Bon' :
                 qualityScore.level === 'A_AMELIORER' ? '⚠ À améliorer' : '✗ Incomplet'}
              </span>
            </div>
          </div>

          {/* Barre globale */}
          <div className="w-full rounded-full h-2 mb-5" style={{ backgroundColor: '#E9ECEF' }}>
            <div className="h-2 rounded-full transition-all"
              style={{
                width: `${qualityScore.score}%`,
                backgroundColor: qualityScore.level === 'EXCELLENT' ? '#27AE60' :
                                 qualityScore.level === 'BON' ? '#2980B9' :
                                 qualityScore.level === 'A_AMELIORER' ? '#F39C12' : '#C0392B',
              }} />
          </div>

          {/* Détail des critères */}
          <div className="space-y-2">
            {qualityScore.details?.map((d: any) => (
              <div key={d.label} className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid #F8F9FA' }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: d.ok ? '#27AE60' : d.earned > 0 ? '#F39C12' : '#C0392B', fontSize: '13px' }}>
                    {d.ok ? '✓' : d.earned > 0 ? '◐' : '✗'}
                  </span>
                  <span className="text-sm" style={{ color: d.ok ? '#2C3E50' : '#6C757D' }}>
                    {d.label}
                  </span>
                </div>
                <span className="text-xs font-bold"
                  style={{ color: d.ok ? '#27AE60' : d.earned > 0 ? '#F39C12' : '#ADB5BD' }}>
                  {d.earned}/{d.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export PDF */}
      <div className="rounded-md p-6 mb-6"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E9ECEF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
        <h3 className="font-semibold mb-2" style={{ color: '#2C3E50' }}>
          Export PDF
        </h3>
        <p className="text-sm mb-4" style={{ color: '#6C757D' }}>
          Choisissez les modules à inclure, leur ordre, et la langue du document.
        </p>
        {validations.some(v => v.level === 'CRITIQUE') && (
          <div className="rounded p-3 mb-4 flex items-start gap-2"
            style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
            <span style={{ color: '#C0392B', flexShrink: 0 }}>🔴</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#C0392B' }}>
                Export bloqué — {validations.filter(v => v.level === 'CRITIQUE').length} erreur(s) critique(s)
              </p>
              {validations.filter(v => v.level === 'CRITIQUE').map(v => (
                <p key={v.id} className="text-xs mt-1" style={{ color: '#922B21' }}>
                  • {v.message}
                </p>
              ))}
              <p className="text-xs mt-2" style={{ color: '#6C757D' }}>
                Corrigez ces erreurs dans l'éditeur avant d'exporter.
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowExportModal(true)}
          disabled={!hasDocument || validations.some(v => v.level === 'CRITIQUE')}
          title={validations.some(v => v.level === 'CRITIQUE') ? 'Corrigez les erreurs critiques avant d\'exporter' : ''}
          className="text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: hasDocument && !validations.some(v => v.level === 'CRITIQUE') ? '#C0392B' : '#F8F9FA',
            color: hasDocument && !validations.some(v => v.level === 'CRITIQUE') ? '#FFFFFF' : '#ADB5BD',
          }}
          onMouseEnter={e => { if (hasDocument && !validations.some(v => v.level === 'CRITIQUE')) e.currentTarget.style.backgroundColor = '#A93226'; }}
          onMouseLeave={e => { if (hasDocument && !validations.some(v => v.level === 'CRITIQUE')) e.currentTarget.style.backgroundColor = '#C0392B'; }}
        >
          Exporter le document
        </button>

        <button
          onClick={() => setShowGuideModal(true)}
          disabled={!hasDocument}
          className="ml-3 text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            border: '1px solid #2980B9',
            color: '#2980B9',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={e => { if (hasDocument) e.currentTarget.style.backgroundColor = '#EBF5FB'; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          📋 Exporter Guide locataire
        </button>
      </div>

      {showExportModal && project && (
        <ExportModal
          projectId={project.id}
          projectName={project.name}
          documentType={project.documentType}
          hasPlans={hasPlans}
          onClose={() => setShowExportModal(false)}
        />
      )}

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

{/* Modal approbation/rejet */}
      {showApprovalModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-md p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-2" style={{ color: '#2C3E50' }}>
              {showApprovalModal === 'approve' ? '✓ Approuver le document' :
               showApprovalModal === 'reject' ? '✕ Rejeter le document' :
               '✏️ Apporter une mise à jour'}
            </h3>
            <p className="text-sm mb-6" style={{ color: '#6C757D' }}>
              {showApprovalModal === 'approve'
                ? 'Le document sera verrouillé en lecture seule après approbation.'
                : showApprovalModal === 'reject'
                ? 'Le document retournera en statut "En cours" pour modification.'
                : 'Le document sera déverrouillé pour modification et devra être soumis à nouveau pour approbation.'}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  {showApprovalModal === 'approve' ? 'Commentaire (optionnel)' :
                   showApprovalModal === 'reject' ? 'Motif du rejet *' :
                   'Raison de la mise à jour (optionnel)'}
                </label>
                <textarea
                  value={approvalComment}
                  onChange={e => setApprovalComment(e.target.value)}
                  placeholder={showApprovalModal === 'approve'
                    ? 'Ex: Document conforme aux exigences réglementaires'
                    : 'Ex: Section 2.1 incomplète, manque les numéros d\'urgence'}
                  rows={4}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none resize-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowApprovalModal(null); setApprovalComment(''); }}
                  className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  Annuler
                </button>
                <button
                  onClick={() => handleApproval(showApprovalModal)}
                  disabled={processingApproval || (showApprovalModal === 'reject' && !approvalComment.trim())}
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50"
                  style={{
                    backgroundColor: showApprovalModal === 'approve' ? '#27AE60' :
                                     showApprovalModal === 'request-revision' ? '#2980B9' : '#C0392B'
                  }}>
                  {processingApproval ? 'Traitement...' :
                   showApprovalModal === 'approve' ? '✓ Approuver' :
                   showApprovalModal === 'request-revision' ? '✏️ Déverrouiller pour mise à jour' :
                   '✕ Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-md p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-2" style={{ color: '#2C3E50' }}>
              Enregistrer comme modèle
            </h3>
            <p className="text-sm mb-6" style={{ color: '#6C757D' }}>
              La configuration de ce projet sera sauvegardée comme point de départ pour de nouveaux projets similaires.
            </p>
            <form onSubmit={handleSaveAsTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Nom du modèle *
                </label>
                <input type="text" required value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="Ex: PMU Tour à bureaux standard"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#2980B9'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
                  Description (optionnel)
                </label>
                <textarea value={templateDesc}
                  onChange={e => setTemplateDesc(e.target.value)}
                  placeholder="Ex: Pour les tours à bureaux de plus de 20 étages avec double signal"
                  rows={3}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none resize-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}
                  onFocus={e => e.target.style.borderColor = '#2980B9'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTemplateModal(false)}
                  className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  Annuler
                </button>
                <button type="submit" disabled={savingTemplate}
                  className="flex-1 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50"
                  style={{ backgroundColor: '#2980B9' }}>
                  {savingTemplate ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Panneau journal d'audit */}
      {showAudit && (
        <div className="fixed inset-0 flex items-center justify-end z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAudit(false); }}>
          <div className="h-full w-full max-w-lg flex flex-col"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid #E9ECEF' }}>
              <div>
                <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Journal d'audit</h3>
                <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>
                  Historique de toutes les actions sur ce projet
                </p>
              </div>
              <button onClick={() => setShowAudit(false)}
                className="p-1 rounded" style={{ color: '#6C757D' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                ✕
              </button>
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAudit ? (
                <p className="text-sm text-center py-8 animate-pulse" style={{ color: '#ADB5BD' }}>
                  Chargement...
                </p>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune action enregistrée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map(log => {
                    const actionConfig: Record<string, { icon: string; color: string }> = {
                      GENERATE:         { icon: '⚙', color: '#2980B9' },
                      EDIT_SECTION:     { icon: '✏️', color: '#F39C12' },
                      EXPORT:           { icon: '📄', color: '#27AE60' },
                      STATUS_CHANGE:    { icon: '🔄', color: '#8E44AD' },
                      VERSION_SAVE:     { icon: '💾', color: '#2980B9' },
                      VERSION_RESTORE:  { icon: '↩️', color: '#E67E22' },
                      PROCEDURE_TOGGLE: { icon: '🔧', color: '#6C757D' },
                      PROCEDURE_EDIT:   { icon: '📝', color: '#F39C12' },
                      TEMPLATE_CREATE:  { icon: '📋', color: '#27AE60' },
                    };
                    const cfg = actionConfig[log.action] || { icon: '○', color: '#ADB5BD' };

                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-md"
                        style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                        <span className="text-base flex-shrink-0 mt-0.5">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>
                            {log.description}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
                            {log.user.firstName} {log.user.lastName}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs" style={{ color: '#ADB5BD' }}>
                            {new Date(log.createdAt).toLocaleDateString('fr-CA', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showGuideModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-md p-6"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold text-lg mb-4" style={{ color: '#2C3E50' }}>
              📋 Exporter le Guide du locataire
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6C757D' }}>
              Choisissez la langue du document.
            </p>
            <div className="flex gap-2 mb-6">
              {([
                { value: 'fr', label: 'Français' },
                { value: 'en', label: 'English' },
                { value: 'both', label: 'Les deux' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => !exportingGuide && handleExportGuide(opt.value)}
                  disabled={exportingGuide}
                  className="flex-1 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#F8F9FA',
                    color: '#2980B9',
                    border: '1px solid #AED6F1',
                  }}
                  onMouseEnter={e => { if (!exportingGuide) e.currentTarget.style.backgroundColor = '#EBF5FB'; }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                >
                  {exportingGuide ? '⏳ Génération...' : opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { if (!exportingGuide) setShowGuideModal(false); }}
              disabled={exportingGuide}
              className="w-full py-2.5 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            >
              {exportingGuide ? 'Génération en cours...' : 'Annuler'}
            </button>
          </div>
        </div>
      )}
      {/* Modal suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md rounded-md p-8"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 className="font-semibold text-lg" style={{ color: '#C0392B' }}>
                Supprimer le projet
              </h3>
            </div>
            <p className="text-sm mb-2" style={{ color: '#2C3E50' }}>
              Cette action est <strong>irréversible</strong>. Le projet, son document et toutes ses données associées seront supprimés définitivement.
            </p>
            <p className="text-sm mb-6" style={{ color: '#6C757D' }}>
              Pour confirmer, tapez le nom du projet :
              <span className="font-bold" style={{ color: '#2C3E50' }}> {project.name}</span>
            </p>
            <div className="mb-6">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={project.name}
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
                style={{ border: '1px solid #F1948A', color: '#2C3E50' }}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 font-medium py-2.5 rounded text-sm transition-colors"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== project.name}
                className="flex-1 text-white font-medium py-2.5 rounded text-sm disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {deleting ? 'Suppression...' : '🗑 Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}