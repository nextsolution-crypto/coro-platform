'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft, Sparkles, Upload, Check, X, Eye, Globe, Building2, Trash2 } from 'lucide-react';

interface CustomProcedure {
  id: string;
  code: string;
  titleFR: string;
  titleEN: string;
  color: string;
  status: string;
  sourceType: string;
  sourceFileName?: string;
  isGlobal: boolean;
  isPublished: boolean;
  rolesDetected: string[];
  createdAt: string;
  content: any;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: 'Brouillon',  color: '#6C757D', bg: '#F8F9FA' },
  ACTIVE:   { label: 'Active',     color: '#27AE60', bg: '#EAFAF1' },
  ARCHIVED: { label: 'Archivée',   color: '#ADB5BD', bg: '#F8F9FA' },
};

const SOURCE_LABELS: Record<string, { label: string; icon: string }> = {
  MANUAL:    { label: 'Manuelle',      icon: '✏️' },
  AI_TEXT:   { label: 'IA — Texte',    icon: '✨' },
  AI_IMPORT: { label: 'IA — Fichier',  icon: '📄' },
};

export default function CustomProceduresAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [procedures, setProcedures] = useState<CustomProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'generate' | 'import'>('list');
  const [generating, setGenerating] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewProc, setPreviewProc] = useState<any>(null);

  // Formulaire texte libre
  const [textForm, setTextForm] = useState({
    text: '',
    projectId: '',
  });

  // Formulaire import fichier
  const [fileForm, setFileForm] = useState({
    fileName: '',
    fileBase64: '',
    mimeType: '',
    projectId: '',
  });

  // Liste des projets pour le sélecteur
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'SUPER_ADMIN') { router.push('/dashboard'); return; }
      fetchData();
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const [procRes, projRes] = await Promise.all([
        api.get('/custom-procedures/library'),
        api.get('/projects'),
      ]);
      setProcedures(procRes.data || []);
      setProjects(projRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!textForm.text.trim()) { setError('Veuillez saisir une description de la procédure.'); return; }
    if (!textForm.projectId) { setError('Veuillez sélectionner un projet de référence.'); return; }
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/custom-procedures/generate', {
        text: textForm.text,
        projectId: textForm.projectId,
      });
      setPreviewProc(res.data.procedure);
      setSuccess(`✅ Procédure ${res.data.procedure.code} générée avec succès — ${res.data.rolesDetected?.length || 0} rôle(s) détecté(s)`);
      await fetchData();
      setTextForm({ text: '', projectId: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Le fichier ne doit pas dépasser 10 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];
      setFileForm(prev => ({
        ...prev,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleImport = async () => {
    if (!fileForm.fileBase64) { setError('Veuillez sélectionner un fichier.'); return; }
    if (!fileForm.projectId) { setError('Veuillez sélectionner un projet de référence.'); return; }
    setImportLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/custom-procedures/import-file', {
        fileBase64: fileForm.fileBase64,
        fileName: fileForm.fileName,
        mimeType: fileForm.mimeType,
        projectId: fileForm.projectId,
      });
      setPreviewProc(res.data.procedure);
      setSuccess(`✅ Procédure ${res.data.procedure.code} importée depuis "${fileForm.fileName}" — ${res.data.rolesDetected?.length || 0} rôle(s) détecté(s)`);
      await fetchData();
      setFileForm({ fileName: '', fileBase64: '', mimeType: '', projectId: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'import.');
    } finally {
      setImportLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/custom-procedures/${id}/publish`);
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette procédure ?')) return;
    try {
      await api.delete(`/custom-procedures/${id}`);
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const inputStyle = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' };

  if (loading) return (
    <AppLayout>
      <div className="text-center py-12">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/admin/procedures')}
            className="flex items-center gap-2 text-sm mb-3 transition-colors"
            style={{ color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
            onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
            <ArrowLeft size={16} /> Bibliothèque standard
          </button>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Procédures personnalisées — IA
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            Générez des procédures depuis un texte libre ou importez un fichier existant (PDF, Word)
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6">
        {[
          { id: 'list', label: `Procédures (${procedures.length})`, icon: '📋' },
          { id: 'generate', label: 'Générer par IA', icon: '✨' },
          { id: 'import', label: 'Importer un fichier', icon: '📄' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setError(''); setSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? '#C0392B' : '#FFFFFF',
              color: activeTab === tab.id ? '#FFFFFF' : '#6C757D',
              border: `1px solid ${activeTab === tab.id ? '#C0392B' : '#E9ECEF'}`,
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 rounded flex items-center gap-2"
          style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
          <X size={14} color="#C0392B" />
          <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded flex items-center gap-2"
          style={{ backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF' }}>
          <Check size={14} color="#27AE60" />
          <p className="text-sm" style={{ color: '#27AE60' }}>{success}</p>
        </div>
      )}

      {/* ── ONGLET LISTE ── */}
      {activeTab === 'list' && (
        <div>
          {procedures.length === 0 ? (
            <div className="text-center py-16 rounded-md" style={{ backgroundColor: '#F8F9FA', border: '1px dashed #DEE2E6' }}>
              <p className="text-4xl mb-4">✨</p>
              <p className="font-medium mb-2" style={{ color: '#2C3E50' }}>Aucune procédure personnalisée</p>
              <p className="text-sm mb-4" style={{ color: '#ADB5BD' }}>
                Utilisez les onglets "Générer par IA" ou "Importer un fichier" pour créer votre première procédure
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setActiveTab('generate')}
                  className="px-4 py-2 rounded text-sm font-medium text-white"
                  style={{ backgroundColor: '#C0392B' }}>
                  ✨ Générer par IA
                </button>
                <button onClick={() => setActiveTab('import')}
                  className="px-4 py-2 rounded text-sm font-medium"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                  📄 Importer un fichier
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {procedures.map(proc => {
                const status = STATUS_LABELS[proc.status] || STATUS_LABELS.DRAFT;
                const source = SOURCE_LABELS[proc.sourceType] || SOURCE_LABELS.MANUAL;
                return (
                  <div key={proc.id} className="rounded-md p-4"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', borderLeft: `4px solid ${proc.color}` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{ backgroundColor: '#F8F9FA', color: '#6C757D', border: '1px solid #E9ECEF' }}>
                            {proc.code}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded font-medium"
                            style={{ backgroundColor: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: '#F8F9FA', color: '#6C757D' }}>
                            {source.icon} {source.label}
                          </span>
                          {proc.isGlobal && (
                            <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                              style={{ backgroundColor: '#EBF5FB', color: '#2980B9' }}>
                              <Globe size={10} /> Globale CORO
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-sm" style={{ color: '#2C3E50' }}>{proc.titleFR}</p>
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>{proc.titleEN}</p>
                        {proc.sourceFileName && (
                          <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                            📄 {proc.sourceFileName}
                          </p>
                        )}
                        {proc.rolesDetected?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {proc.rolesDetected.map(role => (
                              <span key={role} className="text-xs px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: '#F4ECF7', color: '#8E44AD' }}>
                                {role}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {proc.status === 'DRAFT' && (
                          <button onClick={() => handlePublish(proc.id)}
                            className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
                            style={{ backgroundColor: '#EAFAF1', color: '#27AE60', border: '1px solid #A9DFBF' }}
                            title="Activer la procédure">
                            Activer
                          </button>
                        )}
                        <button onClick={() => setPreviewProc(proc.content)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#ADB5BD' }}
                          title="Aperçu"
                          onMouseEnter={e => e.currentTarget.style.color = '#2980B9'}
                          onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleDelete(proc.id)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#ADB5BD' }}
                          title="Supprimer"
                          onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
                          onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET GÉNÉRER ── */}
      {activeTab === 'generate' && (
        <div className="max-w-2xl space-y-5">
          <div className="p-4 rounded" style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#2980B9' }}>✨ Génération par IA</p>
            <p className="text-xs" style={{ color: '#1A5276' }}>
              Décrivez librement votre procédure en français ou en anglais. Claude va la structurer automatiquement au format CORO : titres FR/EN, rôles, étapes impératives, encadrés IMPORTANT/NOTE.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
              Projet de référence <span style={{ color: '#C0392B' }}>*</span>
            </label>
            <p className="text-xs mb-2" style={{ color: '#ADB5BD' }}>
              Permet à l'IA de connaître les rôles actifs dans l'organigramme du projet
            </p>
            <select value={textForm.projectId}
              onChange={e => setTextForm(prev => ({ ...prev, projectId: e.target.value }))}
              className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'}>
              <option value="">Sélectionner un projet...</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.client?.name} ({p.documentType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
              Description de la procédure <span style={{ color: '#C0392B' }}>*</span>
            </label>
            <textarea
              value={textForm.text}
              onChange={e => setTextForm(prev => ({ ...prev, text: e.target.value }))}
              rows={10}
              placeholder={`Exemples de descriptions :

"Procédure en cas de panne électrique prolongée dans un centre de données. L'agent de sécurité doit vérifier les UPS, contacter le responsable mécanique, activer la génératrice..."

"Lors d'une alerte à la bombe : évacuer immédiatement, ne pas toucher les objets suspects, appeler le 9-1-1, alerter le coordonnateur d'urgence..."

"Suite à un déversement de produits chimiques dans l'entrepôt : sécuriser la zone, mettre l'EPI requis, contacter CANUTEC au 1-888-226-8832..."`}
              className="w-full rounded px-4 py-2.5 text-sm focus:outline-none resize-none"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'}
            />
            <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
              {textForm.text.length} caractères — Plus la description est détaillée, meilleure sera la procédure générée
            </p>
          </div>

          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 text-white text-sm font-medium px-6 py-3 rounded transition-colors"
            style={{ backgroundColor: generating ? '#E8A89C' : '#C0392B' }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.backgroundColor = '#A93226'; }}
            onMouseLeave={e => { if (!generating) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
            <Sparkles size={16} />
            {generating ? 'Génération en cours...' : 'Générer la procédure'}
          </button>
        </div>
      )}

      {/* ── ONGLET IMPORT ── */}
      {activeTab === 'import' && (
        <div className="max-w-2xl space-y-5">
          <div className="p-4 rounded" style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#F39C12' }}>📄 Import depuis un fichier</p>
            <p className="text-xs" style={{ color: '#7D6608' }}>
              Téléversez une ancienne procédure en format PDF ou Word (.docx). Claude va extraire le texte et la restructurer automatiquement au format CORO.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
              Projet de référence <span style={{ color: '#C0392B' }}>*</span>
            </label>
            <select value={fileForm.projectId}
              onChange={e => setFileForm(prev => ({ ...prev, projectId: e.target.value }))}
              className="w-full rounded px-4 py-2.5 text-sm focus:outline-none"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'}>
              <option value="">Sélectionner un projet...</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.client?.name} ({p.documentType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
              Fichier de procédure <span style={{ color: '#C0392B' }}>*</span>
            </label>
            <input ref={fileInputRef} type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden" />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded px-4 py-8 text-center cursor-pointer transition-colors"
              style={{ border: '2px dashed #DEE2E6', backgroundColor: fileForm.fileName ? '#EAFAF1' : '#F8F9FA' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#DEE2E6'}>
              {fileForm.fileName ? (
                <div>
                  <p className="text-2xl mb-2">📄</p>
                  <p className="text-sm font-medium" style={{ color: '#27AE60' }}>{fileForm.fileName}</p>
                  <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>Cliquer pour changer le fichier</p>
                </div>
              ) : (
                <div>
                  <Upload size={24} className="mx-auto mb-3" style={{ color: '#ADB5BD' }} />
                  <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>
                    Cliquer pour sélectionner un fichier
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                    PDF ou Word (.docx) — Maximum 10 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <button onClick={handleImport} disabled={importLoading || !fileForm.fileBase64}
            className="flex items-center gap-2 text-white text-sm font-medium px-6 py-3 rounded transition-colors"
            style={{ backgroundColor: importLoading || !fileForm.fileBase64 ? '#E8A89C' : '#C0392B' }}
            onMouseEnter={e => { if (!importLoading && fileForm.fileBase64) e.currentTarget.style.backgroundColor = '#A93226'; }}
            onMouseLeave={e => { if (!importLoading && fileForm.fileBase64) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
            <Upload size={16} />
            {importLoading ? 'Import en cours...' : 'Importer et générer'}
          </button>
        </div>
      )}

      {/* ── MODAL APERÇU ── */}
      {previewProc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl rounded-lg overflow-hidden max-h-[80vh] flex flex-col"
            style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-between p-4"
              style={{ backgroundColor: previewProc.color || previewProc.headerColor || '#2C3E50' }}>
              <div>
                <p className="text-xs font-bold text-white opacity-75">{previewProc.code}</p>
                <p className="font-bold text-white">{previewProc.titleFR}</p>
                <p className="text-xs text-white opacity-75">{previewProc.titleEN}</p>
              </div>
              <button onClick={() => setPreviewProc(null)}
                className="p-1.5 rounded" style={{ color: 'white' }}>
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {previewProc.objective && (
                <p className="text-sm" style={{ color: '#6C757D' }}>{previewProc.objective}</p>
              )}
              {(previewProc.roleSections || []).map((role: any, ri: number) => (
                <div key={ri}>
                  <div className="px-3 py-2 rounded mb-2"
                    style={{ backgroundColor: (role.headerColor || '#F8F9FA') + '20', border: `1px solid ${role.headerColor || '#E9ECEF'}` }}>
                    <p className="text-xs font-bold uppercase" style={{ color: role.headerColor || '#6C757D' }}>
                      {role.roleLabelFR || role.roleName}
                    </p>
                  </div>
                  <ol className="space-y-1 ml-4">
                    {(role.steps || role.actions || []).map((step: any, si: number) => (
                      <li key={si} className="text-sm flex gap-2" style={{ color: '#2C3E50' }}>
                        <span className="font-bold flex-shrink-0" style={{ color: '#ADB5BD' }}>{si + 1}.</span>
                        <span style={{ fontWeight: step.isBold ? 700 : 400, color: step.isRed ? '#C0392B' : '#2C3E50' }}>
                          {step.textFR || step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}