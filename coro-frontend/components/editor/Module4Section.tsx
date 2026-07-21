'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Module4ProcedureCard, { Procedure } from './Module4ProcedureCard';
import Module4Library from './Module4Library';
import api from '@/lib/api';
import { BookOpen, Plus } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface Module4Data {
  directivesGenerales?: any;
  procedures: Procedure[];
  customProcedureIds?: string[];
  autoActivatedIds?: string[];
}

interface Module4SectionProps {
  projectId: string;
  initialData: Module4Data;
  language?: 'fr' | 'en';
  onSave?: (data: any) => void;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module4Section({
  projectId,
  initialData,
  language = 'fr',
  onSave,
}: Module4SectionProps) {

  const isFr = language === 'fr';
  const isFirstLoad = useRef(true);

  const [procedures, setProcedures]                 = useState<Procedure[]>([]);
  const [directives, setDirectives]                 = useState<any>(null);
  const [customProcedureIds, setCustomProcedureIds] = useState<string[]>([]);
  const [autoActivatedIds, setAutoActivatedIds]     = useState<string[]>([]);
  const [overrides, setOverrides]                   = useState<Record<string, string>>({});
  const [comments, setComments]                     = useState<Record<string, string>>({});
  const [showLibrary, setShowLibrary]               = useState(false);
  const [saving, setSaving]                         = useState(false);
  const [lastSaved, setLastSaved]                   = useState<Date | null>(null);
  const [isDirty, setIsDirty]                       = useState(false);
  const [loadingData, setLoadingData]               = useState(true);

  // ============================================================
  // CHARGEMENT
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [savedRes, activeRes] = await Promise.all([
          api.get(`/projects/${projectId}/module4`),
          api.get(`/procedures/project/${projectId}`),
        ]);

        const saved = savedRes.data?.module4;
        const activeMap: Record<string, boolean> = {};
        (activeRes.data || []).forEach((p: any) => {
          activeMap[p.id] = p.isActive !== false;
        });

        const autoIds = (initialData.procedures || []).map((p: Procedure) => p.id);
        setAutoActivatedIds(autoIds);
        setDirectives(initialData.directivesGenerales || null);

        if (saved) {
          setCustomProcedureIds(saved.customProcedureIds || []);
          setOverrides(saved.procedureOverrides?.steps || {});
          setComments(saved.procedureOverrides?.comments || {});

          const customIds: string[] = saved.customProcedureIds || [];
          let allProcs = [...(initialData.procedures || [])];

          if (customIds.length > 0) {
            const customProcs = await Promise.all(
              customIds
                .filter(id => !autoIds.includes(id))
                .map(async id => {
                  try {
                    const r = await api.get(`/procedures/${id}/full`);
                    return { ...r.data, sectionNumber: '' };
                  } catch { return null; }
                })
            );
            allProcs = [...allProcs, ...customProcs.filter(Boolean)];
          }

          setProcedures(allProcs.map(p => ({
            ...p,
            _isActive: activeMap[p.id] !== undefined ? activeMap[p.id] : true,
          })));
        } else {
          setProcedures((initialData.procedures || []).map(p => ({
            ...p,
            _isActive: activeMap[p.id] !== undefined ? activeMap[p.id] : true,
          })));
        }

      } catch {
        setProcedures(initialData.procedures || []);
        setDirectives(initialData.directivesGenerales || null);
        const autoIds = (initialData.procedures || []).map((p: Procedure) => p.id);
        setAutoActivatedIds(autoIds);
      } finally {
        setLoadingData(false);
        isFirstLoad.current = false;
      }
    };

    loadData();
  }, [projectId]);

  // ============================================================
  // AUTOSAVE
  // ============================================================

  const saveData = useCallback(async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/module4`, {
        customProcedureIds,
        procedureOverrides: {
          steps:    overrides,
          comments: comments,
        },
      });
      setLastSaved(new Date());
      setIsDirty(false);
      onSave?.({ customProcedureIds, overrides, comments });
    } catch (err) {
      console.error('Autosave Module 4 échoué:', err);
    } finally {
      setSaving(false);
    }
  }, [projectId, customProcedureIds, overrides, comments, onSave]);

  useEffect(() => {
    if (isFirstLoad.current || !isDirty) return;
    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [customProcedureIds, overrides, comments, isDirty]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleOverride = useCallback((stepId: string, text: string) => {
    setOverrides(prev => ({ ...prev, [stepId]: text }));
    setIsDirty(true);
  }, []);

  const handleComment = useCallback((stepId: string, comment: string) => {
    setComments(prev => ({ ...prev, [stepId]: comment }));
    setIsDirty(true);
  }, []);

  const handleAddProcedure = useCallback(async (id: string) => {
  setCustomProcedureIds(prev => [...prev, id]);
  setIsDirty(true);

  // Charger la procédure COMPLÈTE avec roleSections
  try {
    const res = await api.get(`/procedures/${id}/full`);
    const proc = res.data;
    if (proc) {
      setProcedures(prev => [...prev, { ...proc, sectionNumber: '' }]);
    }
  } catch (err) {
    console.error('Erreur chargement procédure complète:', err);
  }
}, []);

const handleToggleActive = useCallback(async (id: string, active: boolean) => {
    try {
      await api.put(`/procedures/${id}/project/${projectId}/toggle`, { isActive: active });
      setProcedures(prev => prev.map(p => p.id === id ? { ...p, _isActive: active } : p));
    } catch (err) {
      console.error('Erreur toggle procédure:', err);
    }
  }, [projectId]);

  const handleRemoveProcedure = useCallback((id: string) => {
    setCustomProcedureIds(prev => prev.filter(p => p !== id));
    setIsDirty(true);
    // Retirer de l'affichage seulement si ce n'est pas une procédure auto
    setAutoActivatedIds(autoIds => {
      if (!autoIds.includes(id)) {
        setProcedures(prev => prev.filter(p => p.id !== id));
      }
      return autoIds;
    });
  }, []);

  // Toutes les procédures actives = auto + custom
  const allActiveProcedureIds = [
    ...autoActivatedIds,
    ...customProcedureIds,
  ];

  // ============================================================
  // LABELS
  // ============================================================

  const t = isFr ? {
    module:    'PROCÉDURES DES MEMBRES',
    subtitle:  'DE L\'ÉQUIPE D\'URGENCE',
    library:   'Bibliothèque de procédures',
    saving:    'Sauvegarde...',
    saved:     'Sauvegardé',
    unsaved:   'Non sauvegardé',
    loading:   'Chargement...',
    empty:     'Aucune procédure active',
    emptyHint: 'Utilisez la bibliothèque pour ajouter des procédures.',
  } : {
    module:    'EMERGENCY TEAM MEMBER',
    subtitle:  'PROCEDURES',
    library:   'Procedure Library',
    saving:    'Saving...',
    saved:     'Saved',
    unsaved:   'Unsaved changes',
    loading:   'Loading...',
    empty:     'No active procedures',
    emptyHint: 'Use the library to add procedures.',
  };

  // ============================================================
  // RENDU
  // ============================================================

  if (loadingData) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex items-center justify-center">
        <span className="text-gray-400 text-sm animate-pulse">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            Module 4
          </p>
          <h1 className="text-3xl font-black text-gray-900 uppercase leading-tight">
            {t.module}
          </h1>
          <h2 className="text-xl font-black text-gray-700 uppercase leading-tight">
            {t.subtitle}
          </h2>
          <div className="h-1 w-16 bg-red-600 mt-2" />
        </div>

        <div className="flex items-center gap-4">
          {/* Indicateur autosave */}
          <div className="text-xs">
            {saving && (
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                {t.saving}
              </span>
            )}
            {!saving && lastSaved && !isDirty && (
              <span className="flex items-center gap-1.5 text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                {t.saved} — {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {!saving && isDirty && (
              <span className="flex items-center gap-1.5 text-orange-500">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                {t.unsaved}
              </span>
            )}
          </div>

          {/* Bouton bibliothèque */}
          <button
            onClick={() => setShowLibrary(true)}
            className="flex items-center gap-2 px-4 py-2 rounded text-white
              text-sm font-medium transition-colors"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
          >
            <BookOpen size={15} />
            {t.library}
          </button>
        </div>
      </div>

      {/* Procédures */}
      {procedures.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-md"
          style={{ borderColor: '#DEE2E6' }}>
          <BookOpen size={32} className="mx-auto mb-3" style={{ color: '#ADB5BD' }} />
          <p className="font-medium" style={{ color: '#6C757D' }}>{t.empty}</p>
          <p className="text-sm mt-1" style={{ color: '#ADB5BD' }}>{t.emptyHint}</p>
          <button
            onClick={() => setShowLibrary(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded text-white
              text-sm font-medium transition-colors mx-auto"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
          >
            <Plus size={15} />
            {t.library}
          </button>
        </div>
      ) : (
        procedures.map(procedure => (
          <Module4ProcedureCard
            key={procedure.id}
            procedure={procedure}
            projectId={projectId}
            isActive={(procedure as any)._isActive !== false}
            onToggleActive={handleToggleActive}
            language={language}
            overrides={overrides}
            comments={comments}
            onOverride={handleOverride}
            onComment={handleComment}
            defaultExpanded={false}
          />
        ))
      )}

      {/* Modal bibliothèque */}
      {showLibrary && (
        <Module4Library
          activeProcedureIds={allActiveProcedureIds}
          autoActivatedIds={autoActivatedIds}
          language={language}
          onAdd={handleAddProcedure}
          onRemove={handleRemoveProcedure}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}