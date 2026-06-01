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

  const [procedures, setProcedures]             = useState<Procedure[]>([]);
  const [directives, setDirectives]             = useState<any>(null);
  const [customProcedureIds, setCustomProcedureIds] = useState<string[]>([]);
  const [autoActivatedIds, setAutoActivatedIds] = useState<string[]>([]);
  const [overrides, setOverrides]               = useState<Record<string, string>>({});
  const [comments, setComments]                 = useState<Record<string, string>>({});
  const [showLibrary, setShowLibrary]           = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [lastSaved, setLastSaved]               = useState<Date | null>(null);
  const [isDirty, setIsDirty]                   = useState(false);
  const [loadingData, setLoadingData]           = useState(true);

  // ============================================================
  // CHARGEMENT
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const res = await api.get(`/projects/${projectId}/module4`);
        const saved = res.data?.module4;

        if (saved) {
          setCustomProcedureIds(saved.customProcedureIds || []);
          setOverrides(saved.procedureOverrides?.steps || {});
          setComments(saved.procedureOverrides?.comments || {});
        }

        // Données initiales du générateur
        setProcedures(initialData.procedures || []);
        setDirectives(initialData.directivesGenerales || null);

        // IDs auto-activés = ceux dans initialData
        const autoIds = (initialData.procedures || []).map((p: Procedure) => p.id);
        setAutoActivatedIds(autoIds);

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

  const handleAddProcedure = useCallback((id: string) => {
    setCustomProcedureIds(prev => [...prev, id]);
    setIsDirty(true);
  }, []);

  const handleRemoveProcedure = useCallback((id: string) => {
    setCustomProcedureIds(prev => prev.filter(p => p !== id));
    setIsDirty(true);
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
    module:   'PROCÉDURES DES MEMBRES',
    subtitle: 'DE L\'ÉQUIPE D\'URGENCE',
    library:  'Bibliothèque de procédures',
    saving:   'Sauvegarde...',
    saved:    'Sauvegardé',
    unsaved:  'Non sauvegardé',
    loading:  'Chargement...',
    empty:    'Aucune procédure active',
    emptyHint:'Utilisez la bibliothèque pour ajouter des procédures.',
    directives: 'DIRECTIVES GÉNÉRALES LORS D\'UNE URGENCE',
  } : {
    module:   'EMERGENCY TEAM MEMBER',
    subtitle: 'PROCEDURES',
    library:  'Procedure Library',
    saving:   'Saving...',
    saved:    'Saved',
    unsaved:  'Unsaved changes',
    loading:  'Loading...',
    empty:    'No active procedures',
    emptyHint:'Use the library to add procedures.',
    directives: 'GENERAL DIRECTIVES DURING AN EMERGENCY',
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
          {/* Autosave */}
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg
              bg-orange-500 hover:bg-orange-600 text-white text-sm
              font-medium transition-colors"
          >
            <BookOpen size={15} />
            {t.library}
          </button>
        </div>
      </div>

      {/* Directives générales */}
      {/* Directives générales — supprimées, gérées via P001 dans la liste des procédures */}

      {/* Procédures */}
      {procedures.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t.empty}</p>
          <p className="text-gray-400 text-sm mt-1">{t.emptyHint}</p>
          <button
            onClick={() => setShowLibrary(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg
              bg-orange-500 hover:bg-orange-600 text-white text-sm
              font-medium transition-colors mx-auto"
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
            language={language}
            overrides={overrides}
            comments={comments}
            onOverride={handleOverride}
            onComment={handleComment}
            defaultExpanded={false}
          />
        ))
      )}

      {/* Bibliothèque modal */}
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