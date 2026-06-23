'use client';

import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type ScheduleType = 'semaine' | 'weekend';

export interface QuartDef {
  id: string;     // identifiant stable du quart (ex: nom slugifié)
  label: string;  // nom affiché (ex: "Jour")
}

export interface MemberEntry {
  id: string;
  roleId: string;
  roleLabel: string;
  roleLabel_en: string;
  shift: string;       // référence l'id du QuartDef
  schedule: ScheduleType;
  personneDesignee: string;
  substitut: string;
}

interface Module3MemberTableProps {
  members: MemberEntry[];
  quarts: QuartDef[];   // quarts dynamiques venant du configurateur
  onChange: (members: MemberEntry[]) => void;
  language?: 'fr' | 'en';
}

// ============================================================
// UTILITAIRES
// ============================================================

function uid() { return Math.random().toString(36).slice(2, 9); }

function getUniqueRoles(members: MemberEntry[], lang: 'fr' | 'en') {
  const seen = new Set<string>();
  return members.filter(m => {
    if (seen.has(m.roleId)) return false;
    seen.add(m.roleId);
    return true;
  }).map(m => ({
    roleId: m.roleId,
    label: lang === 'fr' ? m.roleLabel : m.roleLabel_en,
  }));
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module3MemberTable({
  members,
  quarts,
  onChange,
  language = 'fr',
}: Module3MemberTableProps) {

  const isFr = language === 'fr';

  const labels = {
    title1:    isFr ? 'LISTE DES MEMBRES DE' : 'EMERGENCY TEAM',
    title2:    isFr ? 'L\'ÉQUIPE D\'URGENCE' : 'MEMBER LIST',
    role:      isFr ? 'Rôle' : 'Role',
    period:    isFr ? 'Quart' : 'Shift',
    weekdays:  isFr ? 'Semaine' : 'Weekdays',
    weekend:   isFr ? 'Fin de semaine' : 'Weekend',
    designated:isFr ? 'Personne désignée' : 'Designated Person',
    substitute:isFr ? 'Substitut' : 'Substitute',
    addRole:   isFr ? 'Ajouter un rôle' : 'Add a role',
    namePh:    isFr ? 'Nom complet' : 'Full name',
    delete:    isFr ? 'Supprimer ce rôle' : 'Delete this role',
    noQuarts:  isFr
      ? 'Aucun quart de travail configuré. Configurez les quarts dans le configurateur (Description générale → Occupation des lieux).'
      : 'No work shift configured. Configure shifts in the configurator (General description → Building occupancy).',
  };

  // Si aucun quart n'est configuré, on retombe sur un seul quart générique
  const activeQuarts: QuartDef[] = quarts.length > 0 ? quarts : [{ id: 'general', label: isFr ? 'Général' : 'General' }];

  // ── Handlers ──────────────────────────────────────────────

  const updateMember = useCallback((id: string, field: 'personneDesignee' | 'substitut', value: string) => {
    onChange(members.map(m => m.id === id ? { ...m, [field]: value } : m));
  }, [members, onChange]);

  const addRole = useCallback(() => {
    const newRoleId = `custom_role_${uid()}`;
    const newLabel    = isFr ? 'NOUVEAU RÔLE' : 'NEW ROLE';
    const newLabel_en = 'NEW ROLE';

    const newEntries: MemberEntry[] = [];
    const schedules: ScheduleType[] = ['semaine', 'weekend'];

    for (const schedule of schedules) {
      for (const quart of activeQuarts) {
        newEntries.push({
          id: `${newRoleId}_${schedule}_${quart.id}`,
          roleId: newRoleId,
          roleLabel: newLabel,
          roleLabel_en: newLabel_en,
          shift: quart.id,
          schedule,
          personneDesignee: '',
          substitut: '',
        });
      }
    }

    onChange([...members, ...newEntries]);
  }, [members, onChange, activeQuarts, isFr]);

  const deleteRole = useCallback((roleId: string) => {
    onChange(members.filter(m => m.roleId !== roleId));
  }, [members, onChange]);

  const updateRoleLabel = useCallback((roleId: string, newLabel: string) => {
    onChange(members.map(m => {
      if (m.roleId !== roleId) return m;
      return isFr
        ? { ...m, roleLabel: newLabel.toUpperCase() }
        : { ...m, roleLabel_en: newLabel.toUpperCase() };
    }));
  }, [members, onChange, isFr]);

  // ── Structure données pour le rendu ──────────────────────

  const uniqueRoles = getUniqueRoles(members, language);

  const getMember = (roleId: string, schedule: ScheduleType, shift: string) =>
    members.find(m => m.roleId === roleId && m.schedule === schedule && m.shift === shift);

  const ensureMember = (roleId: string, schedule: ScheduleType, shift: string) => {
    const existing = getMember(roleId, schedule, shift);
    if (existing) return existing;

    const roleRef = members.find(m => m.roleId === roleId);
    const newEntry: MemberEntry = {
      id: `${roleId}_${schedule}_${shift}_${uid()}`,
      roleId,
      roleLabel:    roleRef?.roleLabel    || roleId,
      roleLabel_en: roleRef?.roleLabel_en || roleId,
      shift,
      schedule,
      personneDesignee: '',
      substitut: '',
    };
    setTimeout(() => onChange([...members, newEntry]), 0);
    return newEntry;
  };

  // ── Rendu ─────────────────────────────────────────────────

  return (
    <div className="mb-8">

      {/* En-tête section */}
      <div className="mb-4">
        <div className="flex items-start gap-2 mb-1">
          <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center
            text-xs font-bold text-gray-500 mt-1 flex-shrink-0">
            3.2
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider leading-tight">
              {labels.title1}
            </p>
            <h2 className="text-2xl font-black text-gray-900 uppercase leading-tight">
              {labels.title2}
            </h2>
          </div>
        </div>
        <div className="h-0.5 bg-red-600 mt-1 mb-4" />
      </div>

      {quarts.length === 0 && (
        <div className="mb-4 px-4 py-3 rounded border border-amber-300 bg-amber-50 text-xs text-amber-700">
          {labels.noQuarts}
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto rounded border border-gray-300 shadow-sm">
        <table className="w-full border-collapse text-xs bg-white">
          <thead>
            {/* Ligne 1 — headers principaux */}
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-2 text-center font-semibold
                text-gray-700 uppercase w-[120px]" rowSpan={2}>
                {labels.role}
              </th>
              <th className="border border-gray-300 px-2 py-2 text-center font-semibold
                text-gray-700 uppercase w-[60px]" rowSpan={2}>
                {labels.period}
              </th>
              {/* Semaine */}
              <th className="border border-gray-300 px-2 py-2 text-center font-semibold
                text-gray-700 uppercase border-l-2 border-l-blue-400" colSpan={2}>
                {labels.weekdays}
              </th>
              {/* Fin de semaine */}
              <th className="border border-gray-300 px-2 py-2 text-center font-semibold
                text-gray-700 uppercase border-l-2 border-l-red-400" colSpan={2}>
                {labels.weekend}
              </th>
              <th className="border border-gray-300 px-1 py-2 w-[30px]" rowSpan={2} />
            </tr>
            {/* Ligne 2 — sous-headers */}
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1 text-center text-gray-600
                font-medium border-l-2 border-l-blue-400 w-[140px]">
                {labels.designated}
              </th>
              <th className="border border-gray-300 px-2 py-1 text-center text-gray-600
                font-medium w-[140px]">
                {labels.substitute}
              </th>
              <th className="border border-gray-300 px-2 py-1 text-center text-gray-600
                font-medium border-l-2 border-l-red-400 w-[140px]">
                {labels.designated}
              </th>
              <th className="border border-gray-300 px-2 py-1 text-center text-gray-600
                font-medium w-[140px]">
                {labels.substitute}
              </th>
            </tr>
          </thead>

          <tbody>
            {uniqueRoles.map((roleRef, roleIdx) => {
              const isCustomRole = roleRef.roleId.startsWith('custom_role_');
              const isEven = roleIdx % 2 === 0;

              return activeQuarts.map((quart, quartIdx) => {
                const semaineMember  = ensureMember(roleRef.roleId, 'semaine', quart.id);
                const weekendMember  = ensureMember(roleRef.roleId, 'weekend', quart.id);
                const isFirstShift   = quartIdx === 0;

                return (
                  <tr
                    key={`${roleRef.roleId}_${quart.id}`}
                    className={`${isEven ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50
                      transition-colors`}
                  >
                    {/* Colonne Rôle — seulement sur première ligne du rôle */}
                    {isFirstShift && (
                      <td
                        className="border border-gray-300 px-1 py-1 text-center align-middle
                          font-semibold text-gray-700"
                        rowSpan={activeQuarts.length}
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                      >
                        {isCustomRole ? (
                          <input
                            type="text"
                            value={roleRef.label}
                            onChange={e => updateRoleLabel(roleRef.roleId, e.target.value)}
                            className="bg-transparent border-0 outline-none text-center
                              text-xs font-bold text-gray-700 w-full"
                            style={{ writingMode: 'vertical-rl' }}
                          />
                        ) : (
                          <span className="text-xs">{roleRef.label}</span>
                        )}
                      </td>
                    )}

                    {/* Colonne Quart */}
                    <td className="border border-gray-300 px-2 py-1 text-center text-gray-600
                      font-medium whitespace-nowrap">
                      {quart.label}
                    </td>

                    {/* Semaine — Désignée */}
                    <td className="border border-gray-300 px-1 py-1
                      border-l-2 border-l-blue-400">
                      {semaineMember && (
                        <input
                          type="text"
                          value={semaineMember.personneDesignee}
                          onChange={e => updateMember(semaineMember.id, 'personneDesignee', e.target.value)}
                          placeholder={labels.namePh}
                          className="w-full px-1 py-0.5 text-xs bg-transparent border-0
                            outline-none focus:bg-blue-50 rounded text-gray-800"
                        />
                      )}
                    </td>

                    {/* Semaine — Substitut */}
                    <td className="border border-gray-300 px-1 py-1">
                      {semaineMember && (
                        <input
                          type="text"
                          value={semaineMember.substitut}
                          onChange={e => updateMember(semaineMember.id, 'substitut', e.target.value)}
                          placeholder={labels.namePh}
                          className="w-full px-1 py-0.5 text-xs bg-transparent border-0
                            outline-none focus:bg-blue-50 rounded text-gray-800"
                        />
                      )}
                    </td>

                    {/* Weekend — Désignée */}
                    <td className="border border-gray-300 px-1 py-1
                      border-l-2 border-l-red-400">
                      {weekendMember && (
                        <input
                          type="text"
                          value={weekendMember.personneDesignee}
                          onChange={e => updateMember(weekendMember.id, 'personneDesignee', e.target.value)}
                          placeholder={labels.namePh}
                          className="w-full px-1 py-0.5 text-xs bg-transparent border-0
                            outline-none focus:bg-blue-50 rounded text-gray-800"
                        />
                      )}
                    </td>

                    {/* Weekend — Substitut */}
                    <td className="border border-gray-300 px-1 py-1">
                      {weekendMember && (
                        <input
                          type="text"
                          value={weekendMember.substitut}
                          onChange={e => updateMember(weekendMember.id, 'substitut', e.target.value)}
                          placeholder={labels.namePh}
                          className="w-full px-1 py-0.5 text-xs bg-transparent border-0
                            outline-none focus:bg-blue-50 rounded text-gray-800"
                        />
                      )}
                    </td>

                    {/* Bouton supprimer — seulement première ligne + rôle custom */}
                    <td className="border border-gray-300 px-1 py-1 text-center">
                      {isFirstShift && (
                        <button
                          onClick={() => deleteRole(roleRef.roleId)}
                          className={`p-1 rounded transition-colors
                            ${isCustomRole
                              ? 'text-red-400 hover:bg-red-100 hover:text-red-600'
                              : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'}`}
                          title={labels.delete}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* Bouton ajouter rôle */}
      <button
        onClick={addRole}
        className="mt-2 flex items-center gap-1.5 text-sm text-blue-600
          hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded
          transition-colors border border-transparent hover:border-blue-200"
      >
        <Plus size={15} />
        {labels.addRole}
      </button>

    </div>
  );
}
