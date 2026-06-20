'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Module2PhoneTable, { PhoneEntry, ExternalEntry } from './Module2PhoneTable';
import api from '@/lib/api';

interface Module2Data {
  section2_1: PhoneEntry[];
  section2_2: PhoneEntry[];
  section2_3: PhoneEntry[];
  section2_4: ExternalEntry[];
  section2_5: ExternalEntry[];
  section2_5Enabled: boolean;
  internalEmergencyNumber: string;
}

interface Module2SectionProps {
  projectId: string;
  initialData: Module2Data;
  availableRoles2_2: string[];
  availableRoles2_3: string[];
  language?: 'fr' | 'en';
  onSave?: (data: Module2Data) => void;
}

function ensureIds<T extends { id?: string }>(entries: T[]): (T & { id: string })[] {
  if (!entries || !Array.isArray(entries)) return [];
  return entries.map(e => ({
    ...e,
    id: e.id || Math.random().toString(36).slice(2, 9),
  }));
}

export default function Module2Section({
  projectId,
  initialData,
  availableRoles2_2,
  availableRoles2_3,
  language = 'fr',
  onSave,
}: Module2SectionProps) {

  const isFr = language === 'fr';
  const [section2_1, setSection2_1] = useState<PhoneEntry[]>([]);
  const [section2_2, setSection2_2] = useState<PhoneEntry[]>([]);
  const [section2_3, setSection2_3] = useState<PhoneEntry[]>([]);
  const [section2_4, setSection2_4] = useState<ExternalEntry[]>([]);
  const [section2_5, setSection2_5] = useState<ExternalEntry[]>([]);
  const [section2_5Enabled, setSection2_5Enabled] = useState(false);
  const [internalEmergencyNumber, setInternalEmergencyNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const isFirstLoad = useRef(true);

  // ============================================================
  // CHARGEMENT — toujours depuis le backend d'abord
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        // Tente de charger depuis le backend (données sauvegardées)
        const res = await api.get(`/projects/${projectId}/module2`);
        const saved = res.data?.module2;

        if (saved && saved.section2_1?.length > 0) {
          // Données sauvegardées trouvées → on les utilise
          setSection2_1(ensureIds(saved.section2_1));
          setSection2_2(ensureIds(saved.section2_2));
          setSection2_3(ensureIds(saved.section2_3));
          setSection2_4(ensureIds(saved.section2_4));
          setSection2_5(ensureIds(saved.section2_5 || []));
          setSection2_5Enabled(saved.section2_5Enabled || false);
          setInternalEmergencyNumber(saved.internalEmergencyNumber || '');
        } else {
          // Pas encore sauvegardé → on utilise initialData (généré)
          setSection2_1(ensureIds(initialData.section2_1));
          setSection2_2(ensureIds(initialData.section2_2));
          setSection2_3(ensureIds(initialData.section2_3));
          setSection2_4(ensureIds(initialData.section2_4));
          setSection2_5(ensureIds(initialData.section2_5 || []));
          setSection2_5Enabled(initialData.section2_5Enabled || false);
          setInternalEmergencyNumber(initialData.internalEmergencyNumber || '');
        }
      } catch {
        // En cas d'erreur API → fallback sur initialData
        setSection2_1(ensureIds(initialData.section2_1));
        setSection2_2(ensureIds(initialData.section2_2));
        setSection2_3(ensureIds(initialData.section2_3));
        setSection2_4(ensureIds(initialData.section2_4));
        setSection2_5(ensureIds(initialData.section2_5 || []));
        setSection2_5Enabled(initialData.section2_5Enabled || false);
        setInternalEmergencyNumber(initialData.internalEmergencyNumber || '');
      } finally {
        setLoadingData(false);
        isFirstLoad.current = false;
      }
    };

    loadData();
  }, [projectId]);

  // ============================================================
  // AUTOSAVE — 2 secondes après chaque modification
  // ============================================================

  const saveData = useCallback(async (data: Module2Data) => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/module2`, data);
      setLastSaved(new Date());
      setIsDirty(false);
      onSave?.(data);
    } catch (err) {
      console.error('Autosave Module 2 échoué :', err);
    } finally {
      setSaving(false);
    }
  }, [projectId, onSave]);

  useEffect(() => {
    if (isFirstLoad.current || !isDirty) return;
    const timer = setTimeout(() => {
      saveData({ section2_1, section2_2, section2_3, section2_4, section2_5, section2_5Enabled, internalEmergencyNumber });
    }, 2000);
    return () => clearTimeout(timer);
  }, [section2_1, section2_2, section2_3, section2_4, section2_5, section2_5Enabled, internalEmergencyNumber, isDirty]);

  const markDirty = () => setIsDirty(true);
  const handle2_1 = (e: any[]) => { setSection2_1(e); markDirty(); };
  const handle2_2 = (e: any[]) => { setSection2_2(e); markDirty(); };
  const handle2_3 = (e: any[]) => { setSection2_3(e); markDirty(); };
  const handle2_4 = (e: any[]) => { setSection2_4(e); markDirty(); };
  const handle2_5 = (e: any[]) => { setSection2_5(e); markDirty(); };
  const toggleSection2_5 = () => { setSection2_5Enabled(prev => !prev); markDirty(); };
  const handleInternalEmergencyChange = (value: string) => { setInternalEmergencyNumber(value); markDirty(); };

  // ============================================================
  // LABELS
  // ============================================================

  const t = isFr ? {
    module:  'LISTE TÉLÉPHONIQUE',
    s211:    'NUMÉROS', s212: 'D\'URGENCE',
    s221:    'RESSOURCES', s222: 'INTERNES',
    s231:    'CONTRACTEURS TECHNIQUES', s232: 'DU BÂTIMENT',
    s241:    'RESSOURCES', s242: 'EXTERNES',
    s251:    'RESSOURCES', s252: 'CORPORATIVES',
    toggleLabel: 'Inclure la section Ressources corporatives',
    internalEmergencyLabel: 'Numéro d\'urgence interne (optionnel)',
    saving:  'Sauvegarde...', saved: 'Sauvegardé', unsaved: 'Non sauvegardé',
    loading: 'Chargement...',
  } : {
    module:  'PHONE DIRECTORY',
    s211:    'EMERGENCY', s212: 'NUMBERS',
    s221:    'INTERNAL', s222: 'RESOURCES',
    s231:    'BUILDING TECHNICAL', s232: 'CONTRACTORS',
    s241:    'EXTERNAL', s242: 'RESOURCES',
    s251:    'CORPORATE', s252: 'RESOURCES',
    toggleLabel: 'Include Corporate Resources section',
    internalEmergencyLabel: 'Internal emergency number (optional)',
    saving:  'Saving...', saved: 'Saved', unsaved: 'Unsaved changes',
    loading: 'Loading...',
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            Module 2
          </p>
          <h1 className="text-3xl font-black text-gray-900 uppercase">{t.module}</h1>
          <div className="h-1 w-16 bg-red-600 mt-2" />
        </div>

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
      </div>

      <Module2PhoneTable
        sectionId="2.1" title={t.s211} titleLine2={t.s212}
        type="phone_table" entries={section2_1}
        useDropdown={false} onChange={handle2_1} language={language}
      />

      <div className="mb-8 mt-4 max-w-md">
        <label className="block text-sm font-medium text-gray-600 mb-1.5">
          {t.internalEmergencyLabel}
        </label>
        <input
          type="text"
          value={internalEmergencyNumber}
          onChange={e => handleInternalEmergencyChange(e.target.value)}
          placeholder={isFr ? 'Ex: 4-1-1 ou poste 2200' : 'Ex: 4-1-1 or ext. 2200'}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm
            focus:outline-none focus:border-red-500"
        />
      </div>

      <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded border border-gray-200 bg-gray-50">
        <input
          type="checkbox"
          id="toggle2_5"
          checked={section2_5Enabled}
          onChange={toggleSection2_5}
          className="w-4 h-4"
        />
        <label htmlFor="toggle2_5" className="text-sm font-medium text-gray-700 cursor-pointer">
          {t.toggleLabel}
        </label>
      </div>

      {section2_5Enabled && (
        <Module2PhoneTable
          sectionId="2.2" title={t.s251} titleLine2={t.s252}
          type="external_table" entries={section2_5}
          useDropdown={false} onChange={handle2_5} language={language}
          columnLabels={isFr ? ['NOM, TITRE', 'CONTACT'] : ['NAME, TITLE', 'CONTACT']}
        />
      )}

      <Module2PhoneTable
        sectionId={section2_5Enabled ? '2.3' : '2.2'} title={t.s221} titleLine2={t.s222}
        type="phone_table" entries={section2_2}
        useDropdown={true} availableRoles={availableRoles2_2}
        onChange={handle2_2} language={language}
        columnLabels={isFr ? ['RÔLE / TITRE', 'TÉLÉPHONE'] : ['ROLE / TITLE', 'PHONE']}
      />
      <Module2PhoneTable
        sectionId={section2_5Enabled ? '2.4' : '2.3'} title={t.s231} titleLine2={t.s232}
        type="phone_table" entries={section2_3}
        useDropdown={true} availableRoles={availableRoles2_3}
        onChange={handle2_3} language={language}
      />
      <Module2PhoneTable
        sectionId={section2_5Enabled ? '2.5' : '2.4'} title={t.s241} titleLine2={t.s242}
        type="external_table" entries={section2_4}
        useDropdown={false} onChange={handle2_4} language={language}
      />
    </div>
  );
}