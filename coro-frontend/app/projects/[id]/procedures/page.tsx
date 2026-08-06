'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface CustomProcedure {
  id: string;
  code: string;
  titleFR: string;
  titleEN: string;
  objective?: string;
  color: string;
  status: string;
  isPublished: boolean;
  rolesDetected: string[];
  content: any;
  createdAt: string;
}

interface MissingRole {
  code: string;
  labelFR: string;
  labelEN: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  DRAFT:    { label: 'Brouillon', bg: '#F8F9FA', color: '#6C757D', border: '#DEE2E6' },
  ACTIVE:   { label: 'Active',    bg: '#EAFAF1', color: '#27AE60', border: '#A9DFBF' },
  ARCHIVED: { label: 'Archivée', bg: '#FDEDEC', color: '#C0392B', border: '#F1948A' },
};

export default function CustomProceduresPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const { isAuthenticated } = useAuthStore();

  const [procedures, setProcedures]       = useState<CustomProcedure[]>([]);
  const [library, setLibrary]             = useState<CustomProcedure[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState<'procedures' | 'generate' | 'library'>('procedures');

  // ── Génération ──
  const [sourceText, setSourceText]       = useState('');
  const [generating, setGenerating]       = useState(false);
  const [generated, setGenerated]         = useState<CustomProcedure | null>(null);
  const [missingRoles, setMissingRoles]   = useState<MissingRole[]>([]);
  const [generateError, setGenerateError] = useState('');

  // ── Éditeur ──
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [editForm, setEditForm]           = useState<any>(null);
  const [saving, setSaving]               = useState(false);

  // ── Aperçu ──
  const [previewId, setPreviewId]         = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [procRes, libRes] = await Promise.all([
        api.get(`/custom-procedures/project/${projectId}`),
        api.get('/custom-procedures/library'),
      ]);
      setProcedures(procRes.data || []);
      setLibrary(libRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!sourceText.trim()) return;
    setGenerating(true);
    setGenerateError('');
    setGenerated(null);
    setMissingRoles([]);
    try {
      const res = await api.post('/custom-procedures/generate', {
        text: sourceText,
        projectId,
      });
      setGenerated(res.data.procedure);
      setMissingRoles(res.data.missingRoles || []);
      await fetchData();
      setActiveTab('procedures');
    } catch (err: any) {
      setGenerateError('Erreur lors de la génération. Vérifiez que le texte est suffisamment détaillé.');
    } finally {
      setGenerating(false);
    }
  };

  const handleEdit = (proc: CustomProcedure) => {
    setEditingId(proc.id);
    setEditForm({
      titleFR: proc.titleFR,
      titleEN: proc.titleEN,
      objective: proc.objective || '',
      color: proc.color,
      status: proc.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await api.put(`/custom-procedures/${editingId}`, editForm);
      setEditingId(null);
      await fetchData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleClone = async (id: string) => {
    try {
      await api.post(`/custom-procedures/${id}/clone`, { projectId });
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Publier cette procédure la rendra disponible pour tous vos projets. Continuer ?')) return;
    try {
      await api.post(`/custom-procedures/${id}/publish`);
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer la procédure "${title}" ?`)) return;
    try {
      await api.delete(`/custom-procedures/${id}`);
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCloneFromLibrary = async (id: string) => {
    try {
      await api.post(`/custom-procedures/${id}/clone`, { projectId });
      await fetchData();
      setActiveTab('procedures');
    } catch (err) { console.error(err); }
  };

  const ProcedureCard = ({ proc }: { proc: CustomProcedure }) => {
    const sc = STATUS_CONFIG[proc.status] || STATUS_CONFIG.DRAFT;
    const isEditing = editingId === proc.id;
    const isPreviewing = previewId === proc.id;
    const content = proc.content as any;

    return (
      <div className="rounded-md overflow-hidden"
        style={{ backgroundColor: '#FFFFFF', border: `1px solid ${proc.color}22`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderLeft: `4px solid ${proc.color}`, backgroundColor: `${proc.color}08` }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs font-black px-2 py-1 rounded text-white flex-shrink-0"
              style={{ backgroundColor: proc.color }}>
              {proc.code}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: '#2C3E50' }}>{proc.titleFR}</p>
              <p className="text-xs truncate" style={{ color: '#ADB5BD' }}>{proc.titleEN}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              {sc.label}
            </span>
            {proc.isPublished && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#EBF5FB', color: '#2980B9', border: '1px solid #AED6F1' }}>
                📚 Bibliothèque
              </span>
            )}
          </div>
        </div>

        {/* Rôles détectés */}
        {proc.rolesDetected.length > 0 && (
          <div className="px-5 py-2 flex items-center gap-2 flex-wrap"
            style={{ borderBottom: '1px solid #F8F9FA' }}>
            <span className="text-xs" style={{ color: '#ADB5BD' }}>Rôles :</span>
            {proc.rolesDetected.map(r => (
              <span key={r} className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Objectif */}
        {proc.objective && !isEditing && (
          <div className="px-5 py-3">
            <p className="text-xs" style={{ color: '#6C757D' }}>{proc.objective}</p>
          </div>
        )}

        {/* Formulaire d'édition */}
        {isEditing && editForm && (
          <div className="px-5 py-4 space-y-3" style={{ backgroundColor: '#F8F9FA', borderTop: '1px solid #E9ECEF' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#495057' }}>Titre FR</label>
                <input type="text" value={editForm.titleFR}
                  onChange={e => setEditForm({ ...editForm, titleFR: e.target.value })}
                  className="w-full rounded px-3 py-2 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#495057' }}>Titre EN</label>
                <input type="text" value={editForm.titleEN}
                  onChange={e => setEditForm({ ...editForm, titleEN: e.target.value })}
                  className="w-full rounded px-3 py-2 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#495057' }}>Objectif</label>
              <textarea value={editForm.objective}
                onChange={e => setEditForm({ ...editForm, objective: e.target.value })}
                rows={2} className="w-full rounded px-3 py-2 text-sm focus:outline-none resize-none"
                style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#495057' }}>Couleur</label>
                <div className="flex gap-2">
                  {['#C0392B', '#E67E22', '#8E44AD', '#2980B9', '#27AE60', '#2C3E50'].map(c => (
                    <button key={c} onClick={() => setEditForm({ ...editForm, color: c })}
                      className="w-7 h-7 rounded-full transition-transform"
                      style={{
                        backgroundColor: c,
                        transform: editForm.color === c ? 'scale(1.3)' : 'scale(1)',
                        border: editForm.color === c ? '2px solid #2C3E50' : '2px solid transparent',
                      }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#495057' }}>Statut</label>
                <select value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded px-3 py-2 text-sm focus:outline-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }}>
                  <option value="DRAFT">Brouillon</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archivée</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingId(null)}
                className="flex-1 py-2 rounded text-sm font-medium"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                Annuler
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 py-2 rounded text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        )}

        {/* Aperçu du contenu */}
        {isPreviewing && content && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid #E9ECEF', backgroundColor: '#FAFAFA' }}>
            {(content.roleSections || []).map((section: any, idx: number) => (
              <div key={idx} className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wide mb-2"
                  style={{ color: proc.color }}>
                  {section.roleName || section.roleCode}
                </p>
                <ul className="space-y-1">
                  {(section.actions || []).map((action: string, aIdx: number) => (
                    <li key={aIdx} className="flex items-start gap-2 text-xs" style={{ color: '#495057' }}>
                      <span className="flex-shrink-0 font-bold mt-0.5" style={{ color: proc.color }}>{aIdx + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {(content.importantBoxes || []).map((box: any, idx: number) => (
              <div key={idx} className="rounded p-3 mt-2"
                style={{
                  backgroundColor: box.type === 'IMPORTANT' ? '#FDEDEC' : '#EBF5FB',
                  border: `1px solid ${box.type === 'IMPORTANT' ? '#F1948A' : '#AED6F1'}`,
                }}>
                <p className="text-xs font-bold mb-1"
                  style={{ color: box.type === 'IMPORTANT' ? '#C0392B' : '#2980B9' }}>
                  {box.type}
                </p>
                <p className="text-xs" style={{ color: '#495057' }}>{box.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-2 px-5 py-3"
            style={{ borderTop: '1px solid #F8F9FA', backgroundColor: '#FAFAFA' }}>
            <button onClick={() => setPreviewId(isPreviewing ? null : proc.id)}
              className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              {isPreviewing ? '▲ Masquer' : '▼ Aperçu'}
            </button>
            <button onClick={() => handleEdit(proc)}
              className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
              style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              ✏️ Modifier
            </button>
            <button onClick={() => handleClone(proc.id)}
              className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              ⧉ Cloner
            </button>
            {!proc.isPublished && (
              <button onClick={() => handlePublish(proc.id)}
                className="text-xs font-medium px-3 py-1.5 rounded transition-colors"
                style={{ border: '1px solid #A9DFBF', color: '#27AE60' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAFAF1'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                📚 Publier
              </button>
            )}
            <button onClick={() => handleDelete(proc.id, proc.titleFR)}
              className="text-xs font-medium px-3 py-1.5 rounded transition-colors ml-auto"
              style={{ border: '1px solid #F1948A', color: '#C0392B' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              🗑
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <button onClick={() => router.push(`/projects/${projectId}`)}
        className="text-sm mb-4 flex items-center gap-1 transition-colors"
        style={{ color: '#6C757D' }}
        onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
        onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
        ← Retour au projet
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Procédures personnalisées
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            Créez, gérez et réutilisez vos procédures d'urgence avec l'aide de l'IA
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid #E9ECEF' }}>
        {[
          { key: 'procedures', label: `📋 Mes procédures (${procedures.length})` },
          { key: 'generate',   label: '✨ Générer avec l\'IA' },
          { key: 'library',    label: `📚 Bibliothèque (${library.length})` },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? '#C0392B' : '#6C757D',
              borderBottom: activeTab === tab.key ? '2px solid #C0392B' : '2px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ONGLET : Mes procédures ── */}
      {activeTab === 'procedures' && (
        <div>
          {/* Bannière procédure générée */}
          {generated && (
            <div className="rounded-md p-4 mb-6 flex items-center gap-3"
              style={{ backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF' }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#27AE60' }}>
                  Procédure "{generated.titleFR}" générée avec succès !
                </p>
                {missingRoles.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: '#F39C12' }}>
                    ⚠ {missingRoles.length} rôle{missingRoles.length > 1 ? 's' : ''} détecté{missingRoles.length > 1 ? 's' : ''} absent{missingRoles.length > 1 ? 's' : ''} de l'organigramme :
                    {missingRoles.map((r: any) => ` ${r.labelFR}`).join(',')}
                  </p>
                )}
              </div>
              <button onClick={() => setGenerated(null)} style={{ color: '#ADB5BD' }}>✕</button>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-center py-12 animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
          ) : procedures.length === 0 ? (
            <div className="rounded-md p-12 text-center"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-4xl mb-4">📋</p>
              <p className="font-semibold mb-2" style={{ color: '#2C3E50' }}>
                Aucune procédure personnalisée
              </p>
              <p className="text-sm mb-6" style={{ color: '#ADB5BD' }}>
                Générez votre première procédure avec l'IA ou importez depuis la bibliothèque.
              </p>
              <button onClick={() => setActiveTab('generate')}
                className="text-white text-sm font-medium px-6 py-2.5 rounded"
                style={{ backgroundColor: '#C0392B' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
                ✨ Générer avec l'IA
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {procedures.map(proc => (
                <ProcedureCard key={proc.id} proc={proc} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET : Générer avec l'IA ── */}
      {activeTab === 'generate' && (
        <div className="max-w-3xl">
          <div className="rounded-md p-6 mb-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>
              ✨ Générateur de procédure IA
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6C757D' }}>
              Collez votre texte (rédigé par vous, généré par une IA externe, ou copié d'un document existant).
              CORO va le structurer automatiquement selon notre standard documentaire.
            </p>

            <div className="rounded-md p-3 mb-4"
              style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#2980B9' }}>💡 Comment ça fonctionne</p>
              <ul className="text-xs space-y-1" style={{ color: '#2980B9' }}>
                <li>• L'IA détecte les rôles (CU, EPI, AS...) et structure les actions par rôle</li>
                <li>• Le résultat suit exactement le même format que nos 43 procédures standard</li>
                <li>• Les rôles absents de votre organigramme sont signalés automatiquement</li>
                <li>• Vous pouvez modifier, cloner et publier dans votre bibliothèque</li>
              </ul>
            </div>

            <label className="block text-sm font-medium mb-2" style={{ color: '#495057' }}>
              Texte de la procédure *
            </label>
            <textarea
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              placeholder="Ex: En cas de déversement de matières dangereuses, le coordonnateur d'urgence doit immédiatement alerter les services d'urgence et évacuer la zone. L'équipier de première intervention doit sécuriser le périmètre et empêcher tout accès non autorisé. Le responsable mécanique doit couper l'alimentation du secteur et identifier la source du déversement..."
              rows={12}
              className="w-full rounded px-4 py-3 text-sm focus:outline-none resize-none font-mono"
              style={{ border: '1px solid #CED4DA', color: '#2C3E50', lineHeight: '1.6' }}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'}
            />
            <p className="text-xs mt-1 mb-4" style={{ color: '#ADB5BD' }}>
              {sourceText.length} caractères — minimum recommandé : 200 caractères
            </p>

            {generateError && (
              <div className="rounded p-3 mb-4"
                style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                <p className="text-sm" style={{ color: '#C0392B' }}>{generateError}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || sourceText.trim().length < 50}
              className="w-full text-white font-medium py-3 rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#C0392B' }}
              onMouseEnter={e => { if (!generating) e.currentTarget.style.backgroundColor = '#A93226'; }}
              onMouseLeave={e => { if (!generating) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
              {generating ? (
                <>
                  <span className="animate-pulse">⏳</span>
                  Analyse et structuration en cours...
                </>
              ) : (
                <>✨ Structurer avec CORO IA</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── ONGLET : Bibliothèque ── */}
      {activeTab === 'library' && (
        <div>
          {library.length === 0 ? (
            <div className="rounded-md p-12 text-center"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
              <p className="text-4xl mb-4">📚</p>
              <p className="font-semibold mb-2" style={{ color: '#2C3E50' }}>
                Bibliothèque vide
              </p>
              <p className="text-sm" style={{ color: '#ADB5BD' }}>
                Publiez une procédure depuis "Mes procédures" pour la rendre disponible pour tous vos projets.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {library.map(proc => {
                const sc = STATUS_CONFIG[proc.status] || STATUS_CONFIG.DRAFT;
                return (
                  <div key={proc.id} className="rounded-md p-5 flex items-center justify-between"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs font-black px-2 py-1 rounded text-white flex-shrink-0"
                        style={{ backgroundColor: proc.color }}>
                        {proc.code}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#2C3E50' }}>{proc.titleFR}</p>
                        {proc.objective && (
                          <p className="text-xs truncate mt-0.5" style={{ color: '#6C757D' }}>{proc.objective}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleCloneFromLibrary(proc.id)}
                      className="text-sm font-medium px-4 py-2 rounded flex-shrink-0 ml-4 text-white"
                      style={{ backgroundColor: '#2980B9' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2471A3'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2980B9'}>
                      + Ajouter au projet
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}