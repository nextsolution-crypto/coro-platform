'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Module3OrgChart, { OrgRole } from './Module3OrgChart';
import Module3MemberTable, { MemberEntry, ShiftType } from './Module3MemberTable';
import api from '@/lib/api';

// ============================================================
// TYPES
// ============================================================

interface Module3Data {
  orgRoles: OrgRole[];
  members: MemberEntry[];
  activeShifts: ShiftType[];
  customRoles?: OrgRole[];
}

interface Module3SectionProps {
  projectId: string;
  initialData: Module3Data;
  language?: 'fr' | 'en';
  onSave?: (data: Module3Data) => void;
}

// ============================================================
// UTILITAIRE IDs
// ============================================================

function ensureIds<T extends { id?: string }>(entries: T[]): (T & { id: string })[] {
  if (!entries || !Array.isArray(entries)) return [];
  return entries.map(e => ({
    ...e,
    id: e.id || Math.random().toString(36).slice(2, 9),
  }));
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module3Section({
  projectId,
  initialData,
  language = 'fr',
  onSave,
}: Module3SectionProps) {

  const isFr = language === 'fr';
  const isFirstLoad = useRef(true);

  const [orgRoles, setOrgRoles]       = useState<OrgRole[]>([]);
  const [members, setMembers]         = useState<MemberEntry[]>([]);
  const [activeShifts, setActiveShifts] = useState<ShiftType[]>(['jour']);
  const [saving, setSaving]           = useState(false);
  const [lastSaved, setLastSaved]     = useState<Date | null>(null);
  const [isDirty, setIsDirty]         = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab]     = useState<'3.1' | '3.2'>('3.1');

  // ============================================================
  // CHARGEMENT — backend d'abord, fallback initialData
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const res = await api.get(`/projects/${projectId}/module3`);
        const saved = res.data?.module3;

        if (saved && saved.orgRoles?.length > 0) {
          setOrgRoles(ensureIds(saved.orgRoles));
          setMembers(ensureIds(saved.members || []));
          setActiveShifts(saved.activeShifts || ['jour']);
        } else {
          setOrgRoles(ensureIds(initialData.orgRoles || []));
          setMembers(ensureIds(initialData.members || []));
          setActiveShifts(initialData.activeShifts || ['jour']);
        }
      } catch {
        setOrgRoles(ensureIds(initialData.orgRoles || []));
        setMembers(ensureIds(initialData.members || []));
        setActiveShifts(initialData.activeShifts || ['jour']);
      } finally {
        setLoadingData(false);
        isFirstLoad.current = false;
      }
    };

    loadData();
  }, [projectId]);

  // ============================================================
  // SYNC orgRoles → members
  // Quand un rôle est activé/désactivé/ajouté dans 3.1,
  // on met à jour automatiquement le tableau 3.2
  // ============================================================

  const syncMembersFromRoles = useCallback((
    roles: OrgRole[],
    currentMembers: MemberEntry[],
    shifts: ShiftType[]
  ): MemberEntry[] => {
    const activeRoles = roles.filter(r =>
      r.isActive && r.id !== 'sys_agent_liaison'
    );
    const schedules: Array<'semaine' | 'weekend'> = ['semaine', 'weekend'];
    const updatedMembers: MemberEntry[] = [];

    for (const role of activeRoles) {
      for (const schedule of schedules) {
        for (const shift of shifts) {
          const entryId = `${role.id}_${schedule}_${shift}`;
          // Garde les données existantes si la ligne existe déjà
          const existing = currentMembers.find(m =>
            m.roleId === role.id &&
            m.schedule === schedule &&
            m.shift === shift
          );
          updatedMembers.push(existing || {
            id: entryId,
            roleId: role.id,
            roleLabel: role.label,
            roleLabel_en: role.label_en,
            shift,
            schedule,
            personneDesignee: '',
            substitut: '',
          });
        }
      }
    }

    return updatedMembers;
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleRolesChange = useCallback((newRoles: OrgRole[]) => {
    setOrgRoles(newRoles);
    // Sync automatique du tableau membres
    const syncedMembers = syncMembersFromRoles(newRoles, members, activeShifts);
    setMembers(syncedMembers);
    setIsDirty(true);
  }, [members, activeShifts, syncMembersFromRoles]);

  const handleMembersChange = useCallback((newMembers: MemberEntry[]) => {
    setMembers(newMembers);
    setIsDirty(true);
  }, []);

  // ============================================================
  // AUTOSAVE — 2 secondes après modification
  // ============================================================

  const saveData = useCallback(async (data: Module3Data) => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/module3`, data);
      setLastSaved(new Date());
      setIsDirty(false);
      onSave?.(data);
    } catch (err) {
      console.error('Autosave Module 3 échoué :', err);
    } finally {
      setSaving(false);
    }
  }, [projectId, onSave]);

  useEffect(() => {
    if (isFirstLoad.current || !isDirty) return;
    const timer = setTimeout(() => {
      saveData({
        orgRoles,
        members,
        activeShifts,
        customRoles: orgRoles.filter(r => r.source === 'custom'),
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [orgRoles, members, isDirty]);

  // ============================================================
  // LABELS
  // ============================================================

  const t = isFr ? {
    module:   'RÔLES ET RESPONSABILITÉS',
    subtitle: 'DE L\'ÉQUIPE D\'URGENCE',
    tab31:    '3.1 Organigramme',
    tab32:    '3.2 Liste des membres',
    saving:   'Sauvegarde...',
    saved:    'Sauvegardé',
    unsaved:  'Non sauvegardé',
    loading:  'Chargement...',
    syncInfo: 'Le tableau 3.2 se met à jour automatiquement selon l\'organigramme 3.1',
  } : {
    module:   'ROLES AND RESPONSIBILITIES',
    subtitle: 'OF THE EMERGENCY TEAM',
    tab31:    '3.1 Org Chart',
    tab32:    '3.2 Member List',
    saving:   'Saving...',
    saved:    'Saved',
    unsaved:  'Unsaved changes',
    loading:  'Loading...',
    syncInfo: 'Table 3.2 updates automatically based on org chart 3.1',
  };

  // ============================================================
  // RENDU
  // ============================================================

  if (loadingData) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 flex items-center justify-center">
        <span className="text-gray-400 text-sm animate-pulse">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {/* En-tête Module 3 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            Module 3
          </p>
          <h1 className="text-3xl font-black text-gray-900 uppercase leading-tight">
            {t.module}
          </h1>
          <h2 className="text-xl font-black text-gray-700 uppercase leading-tight">
            {t.subtitle}
          </h2>
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

      {/* Info sync */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2
        mb-6 text-xs text-blue-400 flex items-center gap-2">
        <span>🔗</span>
        <span>{t.syncInfo}</span>
      </div>

      {/* Tabs 3.1 / 3.2 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('3.1')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${activeTab === '3.1'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t.tab31}
        </button>
        <button
          onClick={() => setActiveTab('3.2')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${activeTab === '3.2'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t.tab32}
        </button>
      </div>

      {/* Contenu onglet actif */}
      {activeTab === '3.1' && (
        <Module3OrgChart
          roles={orgRoles}
          onChange={handleRolesChange}
          language={language}
        />
      )}

      {activeTab === '3.2' && (
        <Module3MemberTable
          members={members}
          activeShifts={activeShifts}
          onChange={handleMembersChange}
          language={language}
        />
      )}

    </div>
  );
}