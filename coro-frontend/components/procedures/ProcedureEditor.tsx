'use client';
import { sessionMarker } from '@/lib/session';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { confirmAction } from '@/lib/confirm-dialog';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowLeft, Save, RotateCcw } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface ProcedureStep {
  id: string;
  textFR: string;
  textEN: string;
  isBold?: boolean;
  isRed?: boolean;
  isCommentable?: boolean;
  isList?: boolean;
  subSteps?: ProcedureStep[];
}

interface RoleSection {
  roleCode: string;
  roleLabelFR: string;
  roleLabelEN: string;
  headerColor: string;
  steps: ProcedureStep[];
}

interface ProcedureContent {
  id: string;
  code: string;
  titleFR: string;
  titleEN: string;
  headerColor: string;
  icon?: string;
  phase?: string;
  activationRule: string;
  documentTypes: string[];
  directivesGenerales?: ProcedureStep[];
  roleSections: RoleSection[];
}

function generateId() {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ============================================================
// COMPOSANT ÉTAPE
// ============================================================

function StepEditor({
  step, onUpdate, onDelete, depth = 0,
}: {
  step: ProcedureStep;
  onUpdate: (updated: ProcedureStep) => void;
  onDelete: () => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);

  const addSubStep = () => {
    onUpdate({
      ...step,
      subSteps: [...(step.subSteps || []), { id: generateId(), textFR: '', textEN: '', isList: true }],
    });
  };

  const updateSubStep = (idx: number, updated: ProcedureStep) => {
    const subSteps = [...(step.subSteps || [])];
    subSteps[idx] = updated;
    onUpdate({ ...step, subSteps });
  };

  const deleteSubStep = (idx: number) => {
    onUpdate({ ...step, subSteps: (step.subSteps || []).filter((_, i) => i !== idx) });
  };

  return (
    <div className="rounded mb-2" style={{
      border: '1px solid #E9ECEF',
      marginLeft: depth > 0 ? 'clamp(8px, 2vw, 24px)' : '0',
      backgroundColor: depth > 0 ? '#F8F9FA' : '#FFFFFF',
    }}>
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <button onClick={() => setExpanded(!expanded)} className="flex-shrink-0 mt-1">
            {expanded
              ? <ChevronUp size={14} style={{ color: '#ADB5BD' }} />
              : <ChevronDown size={14} style={{ color: '#ADB5BD' }} />}
          </button>
          <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Texte FR</label>
              <textarea value={step.textFR}
                onChange={e => onUpdate({ ...step, textFR: e.target.value })}
                rows={2}
                className="w-full text-sm rounded px-2 py-1.5 focus:outline-none resize-vertical"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Texte EN</label>
              <textarea value={step.textEN}
                onChange={e => onUpdate({ ...step, textEN: e.target.value })}
                rows={2}
                className="w-full text-sm rounded px-2 py-1.5 focus:outline-none resize-vertical"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
            </div>
          </div>
          <button onClick={onDelete} className="flex-shrink-0 mt-1 p-1 rounded transition-colors"
            style={{ color: '#ADB5BD' }}
            onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
            onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
            <Trash2 size={14} />
          </button>
        </div>

        {expanded && (
          <div className="flex flex-wrap gap-3 ml-0 sm:ml-6">
            {[
              { key: 'isBold', label: 'Gras' },
              { key: 'isRed', label: 'Rouge' },
              { key: 'isCommentable', label: 'Commentable' },
              { key: 'isList', label: 'Liste' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox"
                  checked={!!(step as any)[key]}
                  onChange={e => onUpdate({ ...step, [key]: e.target.checked })}
                  style={{ accentColor: '#C0392B' }} />
                <span className="text-xs" style={{ color: '#495057' }}>{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 ml-0 sm:ml-6">
          {(step.subSteps || []).map((sub, idx) => (
            <StepEditor key={sub.id} step={sub}
              onUpdate={u => updateSubStep(idx, u)}
              onDelete={() => deleteSubStep(idx)}
              depth={depth + 1} />
          ))}
          <button onClick={addSubStep}
            className="text-xs flex items-center gap-1 mt-1 transition-colors"
            style={{ color: '#ADB5BD' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
            onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
            <Plus size={12} /> Ajouter une sous-étape
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT SECTION DE RÔLE
// ============================================================

function RoleSectionEditor({
  section, onUpdate, onDelete,
}: {
  section: RoleSection;
  onUpdate: (updated: RoleSection) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const addStep = () => {
    onUpdate({ ...section, steps: [...section.steps, { id: generateId(), textFR: '', textEN: '' }] });
  };

  const updateStep = (idx: number, updated: ProcedureStep) => {
    const steps = [...section.steps];
    steps[idx] = updated;
    onUpdate({ ...section, steps });
  };

  const deleteStep = (idx: number) => {
    onUpdate({ ...section, steps: section.steps.filter((_, i) => i !== idx) });
  };

  return (
    <div className="rounded-md mb-4" style={{ border: '1px solid #DEE2E6' }}>
      <div className="flex items-start justify-between gap-3 px-3 sm:px-4 py-3 rounded-t-md"
        style={{ backgroundColor: '#F8F9FA', borderLeft: `4px solid ${section.headerColor}` }}>
        <button onClick={() => setExpanded(!expanded)} className="flex items-start gap-2 flex-1 min-w-0 text-left">
          {expanded
            ? <ChevronUp size={14} style={{ color: '#ADB5BD' }} />
            : <ChevronDown size={14} style={{ color: '#ADB5BD' }} />}
          <span className="text-sm font-bold break-words" style={{ color: '#2C3E50' }}>
            {section.roleCode} — {section.roleLabelFR}
          </span>
          <span className="hidden sm:inline text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>({section.steps.length} étapes)</span>
        </button>
        <button onClick={onDelete} className="p-1 rounded transition-colors"
          style={{ color: '#ADB5BD' }}
          onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
          onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}>
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Code rôle</label>
              <input type="text" value={section.roleCode}
                onChange={e => onUpdate({ ...section, roleCode: e.target.value })}
                className="w-full text-sm rounded px-2 py-1.5 focus:outline-none"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Label FR</label>
              <input type="text" value={section.roleLabelFR}
                onChange={e => onUpdate({ ...section, roleLabelFR: e.target.value })}
                className="w-full text-sm rounded px-2 py-1.5 focus:outline-none"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Label EN</label>
              <input type="text" value={section.roleLabelEN}
                onChange={e => onUpdate({ ...section, roleLabelEN: e.target.value })}
                className="w-full text-sm rounded px-2 py-1.5 focus:outline-none"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
            </div>
          </div>

          {section.steps.map((step, idx) => (
            <StepEditor key={step.id} step={step}
              onUpdate={u => updateStep(idx, u)}
              onDelete={() => deleteStep(idx)} />
          ))}

          <button onClick={addStep}
            className="flex items-center gap-1.5 text-sm mt-2 px-3 py-1.5 rounded transition-colors"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#DEE2E6'}>
            <Plus size={13} /> Ajouter une étape
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

interface VariantSummary {
  id: string;
  name: string;
  ownerName?: string | null;
  isMine: boolean;
  sharedWithOrganization: boolean;
}

/**
 * Éditeur d'une procédure.
 * - avec projectId : version du projet (projet > organisation > CORO);
 * - sans projectId : version de l'organisation (administrateur), depuis la Bibliothèque.
 */
export default function ProcedureEditor({ projectId, procedureId }: { projectId?: string; procedureId: string }) {
  const router = useRouter();
  const scope: 'project' | 'organization' = projectId ? 'project' : 'organization';
  const { isAuthenticated, initAuth } = useAuthStore();
  const [overrideLevel, setOverrideLevel] = useState<'project' | 'organization' | null>(null);
  const [restoresTo, setRestoresTo] = useState<'organization' | 'coro' | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [variants, setVariants] = useState<VariantSummary[]>([]);
  const [variantName, setVariantName] = useState('');
  const [namingVariant, setNamingVariant] = useState(false);
  const [variantBusy, setVariantBusy] = useState(false);

  const [content, setContent] = useState<ProcedureContent | null>(null);
  const [isOverridden, setIsOverridden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated && procedureId) fetchData();
    else if (!isAuthenticated) {
      const token = sessionMarker();
      if (!token) router.push('/login');
    }
  }, [isAuthenticated, projectId, procedureId]);

  const fetchData = async () => {
    try {
      // Essayer d'abord ProcedureDefault
      const res = await api.get(`/procedures/${procedureId}`, {
        params: projectId ? { projectId } : {},
      }).catch(() => null);

      if (res?.data?.content) {
        setContent(res.data.content as ProcedureContent);
        setIsOverridden(res.data.isOverridden);
        setOverrideLevel(res.data.overrideLevel ?? null);
        setRestoresTo(res.data.restoresTo ?? null);
        setIsCustom(false);
        if (scope === 'project') loadVariants();
      } else if (scope === 'project') {
        setIsCustom(true);
        // Sinon CustomProcedure IA
        const cr = await api.get(`/custom-procedures/${procedureId}`);
        const c = cr.data?.content;
        if (c) {
          // Adapter le format CustomProcedure → ProcedureContent
          setContent({
            id: cr.data.id,
            code: c.code || cr.data.code,
            titleFR: c.titleFR || cr.data.titleFR,
            titleEN: c.titleEN || cr.data.titleEN,
            headerColor: c.color || cr.data.color || '#2C3E50',
            activationRule: c.activationRule || 'manual',
            documentTypes: [],
            // Le serveur rend toujours le gabarit (étapes, sous-étapes) ; l'ancien format reste lu.
            roleSections: (c.roleSections || []).map((rs: any) => ({
              roleCode: rs.roleCode,
              roleLabelFR: rs.roleLabelFR || rs.roleName || rs.roleCode,
              roleLabelEN: rs.roleLabelEN || rs.roleNameEN || rs.roleName || rs.roleCode,
              headerColor: rs.headerColor || c.color || '#2C3E50',
              steps: Array.isArray(rs.steps)
                ? rs.steps
                : (rs.actions || []).map((action: string, idx: number) => ({
                    id: `step_${idx}`,
                    textFR: action,
                    textEN: (rs.actionsEN && rs.actionsEN[idx]) ? rs.actionsEN[idx] : action,
                  })),
            })),
          } as ProcedureContent);
          setIsOverridden(false);
        }
      }
    } catch (err) { console.error(err); setError('Procédure introuvable.'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);
    setError('');
    try {
      if (scope === 'organization') {
        await api.put(`/procedures/${procedureId}/organization`, { content });
        setOverrideLevel('organization');
        setRestoresTo('coro');
        setIsOverridden(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        return;
      }
      // Procédure de la bibliothèque : version du projet
      const stdRes = isCustom
        ? null
        : await api.put(`/procedures/${procedureId}/project/${projectId}`, { content });

      if (!stdRes) {
        // Sinon CustomProcedure IA — reconstruire le content au format CustomProcedure
        // Même gabarit que la bibliothèque : sous-étapes et mise en évidence conservées.
        const customContent = { ...content, color: content.headerColor };
        await api.put(`/custom-procedures/${procedureId}`, { content: customContent });
      }

      setIsOverridden(true);
      if (!isCustom) {
        setRestoresTo(overrideLevel === 'organization' ? 'organization' : restoresTo || 'coro');
        setOverrideLevel('project');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const restoreTarget = restoresTo === 'organization' ? 'la version de l’organisation' : 'la version CORO';
  const canRestore = scope === 'project' ? overrideLevel === 'project' : overrideLevel === 'organization';

  const handleRestore = async () => {
    const ok = await confirmAction({
      title: `Revenir à ${restoreTarget} ?`,
      message:
        scope === 'project'
          ? `Les modifications faites pour ce projet seront remplacées par ${restoreTarget}.`
          : 'La version de l’organisation sera retirée : tous les projets qui n’ont pas leur propre version reprendront la version CORO.',
      confirmLabel: 'Revenir',
    });
    if (!ok) return;
    setRestoring(true);
    try {
      if (scope === 'project') await api.delete(`/procedures/${procedureId}/project/${projectId}`);
      else await api.delete(`/procedures/${procedureId}/organization`);
      setIsOverridden(false);
      await fetchData();
    } catch (err) { console.error(err); toast('Retour impossible.', 'error'); }
    finally { setRestoring(false); }
  };

  // ── Versions enregistrées (mes versions + celles partagées dans l'organisation) ──
  const loadVariants = async () => {
    try {
      const res = await api.get('/procedures/variants', { params: { procedureId } });
      setVariants(Array.isArray(res.data) ? res.data : []);
    } catch { setVariants([]); }
  };

  const saveAsVariant = async () => {
    if (!content || !variantName.trim()) return;
    setVariantBusy(true);
    try {
      await api.post(`/procedures/${procedureId}/variants`, {
        name: variantName.trim(),
        content,
        sourceProjectId: projectId,
      });
      toast('Version enregistrée dans « Mes versions ».', 'success');
      setVariantName('');
      setNamingVariant(false);
      await loadVariants();
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Enregistrement impossible.', 'error');
    } finally { setVariantBusy(false); }
  };

  const applyVariant = async (variant: VariantSummary) => {
    const ok = await confirmAction({
      title: `Appliquer « ${variant.name} » ?`,
      message: 'Cette version remplacera la procédure de ce projet. Vous pourrez revenir en arrière avec « Revenir à… ».',
      confirmLabel: 'Appliquer',
    });
    if (!ok) return;
    setVariantBusy(true);
    try {
      await api.post(`/procedures/variants/${variant.id}/apply/${projectId}`);
      toast('Version appliquée à ce projet.', 'success');
      await fetchData();
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Application impossible.', 'error');
    } finally { setVariantBusy(false); }
  };

  const addRoleSection = () => {
    if (!content) return;
    setContent({
      ...content,
      roleSections: [...content.roleSections, {
        roleCode: 'NOUVEAU', roleLabelFR: 'Nouveau rôle', roleLabelEN: 'New role',
        headerColor: '#7F8C8D', steps: [],
      }],
    });
  };

  const updateRoleSection = (idx: number, updated: RoleSection) => {
    if (!content) return;
    const roleSections = [...content.roleSections];
    roleSections[idx] = updated;
    setContent({ ...content, roleSections });
  };

  const deleteRoleSection = (idx: number) => {
    if (!content) return;
    setContent({ ...content, roleSections: content.roleSections.filter((_, i) => i !== idx) });
  };

  const addDirective = () => {
    if (!content) return;
    setContent({
      ...content,
      directivesGenerales: [...(content.directivesGenerales || []), { id: generateId(), textFR: '', textEN: '' }],
    });
  };

  const updateDirective = (idx: number, updated: ProcedureStep) => {
    if (!content) return;
    const directives = [...(content.directivesGenerales || [])];
    directives[idx] = updated;
    setContent({ ...content, directivesGenerales: directives });
  };

  const deleteDirective = (idx: number) => {
    if (!content) return;
    setContent({ ...content, directivesGenerales: (content.directivesGenerales || []).filter((_, i) => i !== idx) });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <p className="text-sm" style={{ color: '#C0392B' }}>Procédure introuvable.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>

      {/* Topbar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 sticky top-0 z-40"
        style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #DEE2E6', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="flex items-start gap-3 min-w-0 w-full xl:w-auto">
          <button onClick={() => router.push(scope === 'project' ? `/editor/${projectId}` : '/library')}
            className="p-2 rounded transition-colors"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                style={{ backgroundColor: '#F8F9FA', color: '#6C757D', border: '1px solid #DEE2E6' }}>
                {content.code}
              </span>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: content.headerColor }} />
              {!isCustom && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={
                    overrideLevel === 'project'
                      ? { backgroundColor: '#FEF9E7', color: '#F39C12', border: '1px solid #FAD7A0' }
                      : overrideLevel === 'organization'
                        ? { backgroundColor: '#E7F1FB', color: '#2471A3', border: '1px solid #AED6F1' }
                        : { backgroundColor: '#F8F9FA', color: '#6C757D', border: '1px solid #DEE2E6' }
                  }>
                  {overrideLevel === 'project'
                    ? 'Version de ce projet'
                    : overrideLevel === 'organization'
                      ? 'Version de l’organisation'
                      : 'Version CORO'}
                </span>
              )}
              {scope === 'organization' && (
                <span className="text-xs" style={{ color: '#6C757D' }}>
                  · s’applique à tous les projets de l’organisation qui n’ont pas leur propre version
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold mt-0.5 break-words" style={{ color: '#2C3E50' }}>{content.titleFR}</h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full xl:w-auto">
          {error && <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>}
          {saved && <p className="text-sm" style={{ color: '#27AE60' }}>✓ Sauvegardé</p>}
          {canRestore && (
            <button onClick={handleRestore} disabled={restoring}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors disabled:opacity-50"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#F39C12'; e.currentTarget.style.color = '#F39C12'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.color = '#6C757D'; }}>
              <RotateCcw size={13} />
              {restoring ? 'Retour en cours…' : `Revenir à ${restoreTarget}`}
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#A93226'; }}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
            <Save size={14} />
            {saving ? 'Sauvegarde...' : scope === 'organization' ? 'Enregistrer pour l’organisation' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8">

        {/* Mes versions : enregistrer pour réutiliser, appliquer une version enregistrée ou partagée */}
        {scope === 'project' && !isCustom && (
          <div className="rounded-md p-4 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#2C3E50' }}>Versions enregistrées</p>
                <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>
                  Enregistrez cette version pour la réutiliser dans un autre projet, ou appliquez une version enregistrée par vous ou partagée dans votre organisation.
                </p>
              </div>
              {!namingVariant ? (
                <button
                  type="button"
                  onClick={() => { setNamingVariant(true); setVariantName(`${content.code} — `); }}
                  className="text-sm px-3 py-2 rounded whitespace-nowrap"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
                >
                  Enregistrer cette version…
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveAsVariant(); if (e.key === 'Escape') setNamingVariant(false); }}
                    placeholder="Nom de la version"
                    maxLength={120}
                    className="text-sm px-3 py-2 rounded"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50', minWidth: 240 }}
                  />
                  <button type="button" onClick={saveAsVariant} disabled={variantBusy || !variantName.trim()}
                    className="text-sm px-3 py-2 rounded text-white disabled:opacity-50" style={{ backgroundColor: '#C0392B' }}>
                    Enregistrer
                  </button>
                  <button type="button" onClick={() => setNamingVariant(false)} className="text-xs" style={{ color: '#6C757D' }}>
                    Annuler
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: '#ADB5BD' }}>
              Enregistrez d’abord vos modifications (« Sauvegarder ») si vous voulez qu’elles fassent partie de la version.
            </p>
            {variants.length > 0 && (
              <div className="mt-3 space-y-1">
                {variants.map((variant) => (
                  <div key={variant.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded"
                    style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                    <div className="min-w-0">
                      <span className="text-sm" style={{ color: '#2C3E50' }}>{variant.name}</span>
                      <span className="text-xs ml-2" style={{ color: '#ADB5BD' }}>
                        {variant.isMine ? 'Ma version' : `Partagée par ${variant.ownerName || 'un collègue'}`}
                        {variant.isMine && variant.sharedWithOrganization ? ' · partagée' : ''}
                      </span>
                    </div>
                    <button type="button" onClick={() => applyVariant(variant)} disabled={variantBusy}
                      className="text-xs px-2 py-1 rounded disabled:opacity-50"
                      style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
                      Appliquer à ce projet
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Infos générales */}
        <div className="rounded-md p-4 sm:p-6 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Informations générales</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Titre FR</label>
              <input type="text" value={content.titleFR}
                onChange={e => setContent({ ...content, titleFR: e.target.value })}
                className="w-full text-sm rounded px-3 py-2 focus:outline-none"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Titre EN</label>
              <input type="text" value={content.titleEN}
                onChange={e => setContent({ ...content, titleEN: e.target.value })}
                className="w-full text-sm rounded px-3 py-2 focus:outline-none"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Couleur</label>
              <div className="flex items-center gap-2">
                <input type="color" value={content.headerColor}
                  onChange={e => setContent({ ...content, headerColor: e.target.value })}
                  className="w-10 h-9 rounded cursor-pointer border-0" />
                <input type="text" value={content.headerColor}
                  onChange={e => setContent({ ...content, headerColor: e.target.value })}
                  className="flex-1 text-sm rounded px-3 py-2 focus:outline-none font-mono"
                  style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Icône</label>
              <input type="text" value={content.icon || ''}
                onChange={e => setContent({ ...content, icon: e.target.value })}
                className="w-full text-sm rounded px-3 py-2 focus:outline-none"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 uppercase" style={{ color: '#6C757D' }}>Phase</label>
              <input type="text" value={content.phase || ''}
                onChange={e => setContent({ ...content, phase: e.target.value })}
                className="w-full text-sm rounded px-3 py-2 focus:outline-none"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} />
            </div>
          </div>
        </div>

        {/* Directives générales */}
        <div className="rounded-md p-4 sm:p-6 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Directives générales</h3>
            <button onClick={addDirective}
              className="w-full sm:w-auto justify-center flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#DEE2E6'}>
              <Plus size={13} /> Ajouter
            </button>
          </div>
          {(content.directivesGenerales || []).length === 0 && (
            <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune directive générale.</p>
          )}
          {(content.directivesGenerales || []).map((step, idx) => (
            <StepEditor key={step.id} step={step}
              onUpdate={u => updateDirective(idx, u)}
              onDelete={() => deleteDirective(idx)} />
          ))}
        </div>

        {/* Sections de rôles */}
        <div className="rounded-md p-4 sm:p-6 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="font-semibold" style={{ color: '#2C3E50' }}>
              Sections de rôles ({content.roleSections.length})
            </h3>
            <button onClick={addRoleSection}
              className="w-full sm:w-auto justify-center flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#C0392B'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#DEE2E6'}>
              <Plus size={13} /> Ajouter un rôle
            </button>
          </div>
          {content.roleSections.map((section, idx) => (
            <RoleSectionEditor key={`${section.roleCode}-${idx}`} section={section}
              onUpdate={u => updateRoleSection(idx, u)}
              onDelete={() => deleteRoleSection(idx)} />
          ))}
        </div>

      </div>
    </div>
  );
}