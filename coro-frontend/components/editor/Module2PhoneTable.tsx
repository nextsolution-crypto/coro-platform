'use client';

import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface PhoneEntry {
  id: string;
  role: string;
  name: string;
  phone: string;
  isBold?: boolean;
  isFixed?: boolean;
}

export interface ExternalEntry {
  id: string;
  role: string;
  phone: string;
  url?: string;
  isBold?: boolean;
  isFixed?: boolean;
}

interface PhoneTableProps {
  sectionId: string;
  title: string;
  titleLine2: string;
  type: 'phone_table' | 'external_table';
  entries: (PhoneEntry | ExternalEntry)[];
  availableRoles?: string[];
  useDropdown?: boolean;
  onChange: (entries: (PhoneEntry | ExternalEntry)[]) => void;
  language?: 'fr' | 'en';
  columnLabels?: [string, string];
}

// ============================================================
// UTILITAIRE
// ============================================================

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

// ============================================================
// FORMATAGE TÉLÉPHONE — Norme Canada/US
// ============================================================

function formatPhone(raw: string): string {
  // Garde uniquement les chiffres
  const digits = raw.replace(/\D/g, '');

  // Numéro court type 9-1-1, 8-1-1, etc. → on laisse tel quel
  if (raw.match(/^\d[-]\d[-]\d$/)) return raw;

  // 11 chiffres commençant par 1 → 1 (XXX) XXX-XXXX
  if (digits.length === 11 && digits[0] === '1') {
    return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }

  // 10 chiffres → (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // 7 chiffres → XXX-XXXX
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
  }

  // Sinon → retourne tel quel (ex: numéros internationaux, extensions)
  return raw;
}

export default function Module2PhoneTable({
  sectionId,
  title,
  titleLine2,
  type,
  entries,
  availableRoles = [],
  useDropdown = false,
  onChange,
  language = 'fr',
  columnLabels,
}: PhoneTableProps) {

  const isFr = language === 'fr';

  const labels = {
    role:     columnLabels?.[0] || (isFr ? 'RÔLE / ÉQUIPEMENT'   : 'ROLE / EQUIPMENT'),
    name:     isFr ? 'NOM'                 : 'NAME',
    phone:    columnLabels?.[1] || (isFr ? 'TÉLÉPHONE'           : 'PHONE'),
    addRow:   isFr ? 'Ajouter une ligne'   : 'Add a row',
    rolePh:   isFr ? 'Sélectionner...'     : 'Select...',
    namePh:   isFr ? 'Nom complet'         : 'Full name',
    phonePh:  isFr ? 'Numéro de téléphone' : 'Phone number',
    customPh: isFr ? 'Saisir le rôle...'   : 'Enter role...',
    other:    isFr ? 'Autre'               : 'Other',
    delete:   isFr ? 'Supprimer'           : 'Delete',
  };

  // ============================================================
  // HANDLERS — définis une seule fois avec useCallback
  // ============================================================

  const updateEntry = useCallback((id: string, field: string, value: string) => {
    onChange(
      entries.map(e => e.id === id ? { ...e, [field]: value } : e)
    );
  }, [entries, onChange]);

  const addRow = useCallback(() => {
    if (type === 'external_table') {
      onChange([...entries, { id: uid(), role: '', phone: '' } as ExternalEntry]);
    } else {
      onChange([...entries, { id: uid(), role: '', name: '', phone: '' } as PhoneEntry]);
    }
  }, [entries, onChange, type]);

  const deleteRow = useCallback((id: string) => {
    onChange(entries.filter(e => e.id !== id));
  }, [entries, onChange]);

  // ============================================================
  // RENDU TABLEAU PHONE (2.1 / 2.2 / 2.3)
  // ============================================================

  if (type === 'phone_table') {
    return (
      <div className="mb-8">
        <SectionHeader sectionId={sectionId} title={title} titleLine2={titleLine2} />

        <div className="rounded overflow-hidden border border-gray-300 shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide w-[44%]">
                  {labels.role}
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide w-[29%]">
                  {labels.name}
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide w-[22%]">
                  {labels.phone}
                </th>
                <th className="border border-gray-300 px-1 py-2 w-[5%]" />
              </tr>
            </thead>
            <tbody>
              {(entries as PhoneEntry[]).map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={`group transition-colors
                    ${entry.isBold ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    hover:bg-blue-50`}
                >
                  {/* Rôle */}
                  <td className="border border-gray-300 px-1 py-1">
                    {sectionId === '2.1' || !useDropdown ? (
                      <input
                        type="text"
                        value={entry.role}
                        onChange={e => updateEntry(entry.id, 'role', e.target.value)}
                        placeholder={labels.customPh}
                        disabled={entry.isFixed}
                        className={`w-full px-2 py-1 text-sm bg-transparent border-0 outline-none
                          focus:bg-blue-50 rounded transition-colors
                          ${entry.isBold ? 'font-bold' : ''}
                          ${entry.isFixed ? 'text-gray-500 cursor-default' : 'text-gray-800'}`}
                      />
                    ) : (
                      <div>
                        <select
                          value={availableRoles.includes(entry.role) ? entry.role : (entry.role === '' ? '' : labels.other)}
                          onChange={e => {
                            if (e.target.value === labels.other) {
                              updateEntry(entry.id, 'role', '_autre_');
                            } else {
                              updateEntry(entry.id, 'role', e.target.value);
                            }
                          }}
                          disabled={entry.isFixed}
                          className={`w-full px-2 py-1 text-sm bg-transparent border-0 outline-none
                            focus:bg-blue-50 rounded transition-colors cursor-pointer
                            ${entry.isBold ? 'font-bold' : ''}
                            ${entry.isFixed ? 'text-gray-500 cursor-default' : 'text-gray-800'}`}
                        >
                          <option value="">{labels.rolePh}</option>
                          {availableRoles.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        {(entry.role === '_autre_' || (!availableRoles.includes(entry.role) && entry.role !== '')) && (
                          <input
                            type="text"
                            value={entry.role === '_autre_' ? '' : entry.role}
                            onChange={e => updateEntry(entry.id, 'role', e.target.value || '_autre_')}
                            placeholder={labels.customPh}
                            autoFocus
                            className="w-full mt-1 px-2 py-1 text-sm border border-blue-300 bg-blue-50 outline-none rounded text-gray-800"
                          />
                        )}
                      </div>
                    )}
                  </td>

                  {/* Nom */}
                  <td className="border border-gray-300 px-1 py-1">
                    {sectionId === '2.1' && idx < 3 ? (
                      <span className="block text-center font-bold text-red-600 text-lg">
                        9-1-1
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={entry.name}
                        onChange={e => updateEntry(entry.id, 'name', e.target.value)}
                        placeholder={labels.namePh}
                        disabled={entry.isFixed}
                        className={`w-full px-2 py-1 text-sm bg-transparent border-0 outline-none
                          focus:bg-blue-50 rounded transition-colors
                          ${entry.isFixed ? 'text-gray-500' : 'text-gray-800'}`}
                      />
                    )}
                  </td>

                  {/* Téléphone */}
                  <td className="border border-gray-300 px-1 py-1">
                    {sectionId === '2.1' && idx < 3 ? (
                      <span className="block text-center text-gray-400 text-xs italic">—</span>
                    ) : (
                      <input
                        type="text"
                        value={entry.phone}
                        onChange={e => updateEntry(entry.id, 'phone', e.target.value)}
                        onBlur={e => updateEntry(entry.id, 'phone', formatPhone(e.target.value))}
                        placeholder={labels.phonePh}
                        disabled={entry.isFixed}
                        className={`w-full px-2 py-1 text-sm bg-transparent border-0 outline-none
                          focus:bg-blue-50 rounded transition-colors
                          ${entry.isFixed ? 'text-gray-600 font-medium' : 'text-gray-800'}`}
                      />
                    )}
                  </td>

                  {/* Supprimer */}
                  <td className="border border-gray-300 px-1 py-1 text-center">
                    {!entry.isFixed && (
                      <button
                        onClick={() => deleteRow(entry.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity
                          p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                        title={labels.delete}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AddRowButton onClick={addRow} label={labels.addRow} />
      </div>
    );
  }

  // ============================================================
  // RENDU TABLEAU EXTERNE (2.4)
  // ============================================================

  return (
    <div className="mb-8">
      <SectionHeader sectionId={sectionId} title={title} titleLine2={titleLine2} />

      <div className="rounded overflow-hidden border border-gray-300 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide w-[60%]">
                {labels.role}
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide w-[35%]">
                {labels.phone}
              </th>
              <th className="border border-gray-300 px-1 py-2 w-[5%]" />
            </tr>
          </thead>
          <tbody>
            {(entries as ExternalEntry[]).map((entry, idx) => (
              <tr
                key={entry.id}
                className={`group transition-colors
                  ${entry.isBold
                    ? 'bg-red-600 text-white font-bold'
                    : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  hover:bg-blue-50`}
              >
                {/* Rôle */}
                <td className="border border-gray-300 px-1 py-1">
                  {entry.isFixed ? (
                    <span className={`block px-2 py-1 text-sm font-bold
                      ${entry.isBold ? 'text-white' : 'text-gray-700'}`}>
                      {entry.role}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={entry.role}
                      onChange={e => updateEntry(entry.id, 'role', e.target.value)}
                      placeholder={labels.customPh}
                      className={`w-full px-2 py-1 text-sm bg-transparent border-0 outline-none
                        focus:bg-blue-50 rounded transition-colors
                        ${entry.isBold ? 'text-white font-bold' : 'text-blue-600 underline'}`}
                    />
                  )}
                </td>

                {/* Téléphone */}
                <td className="border border-gray-300 px-1 py-1">
                  {entry.isFixed ? (
                    <span className={`block px-2 py-1 text-sm font-bold
                      ${entry.isBold ? 'text-white' : 'text-gray-800'}`}>
                      {entry.phone}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={entry.phone}
                      onChange={e => updateEntry(entry.id, 'phone', e.target.value)}
                      onBlur={e => updateEntry(entry.id, 'phone', formatPhone(e.target.value))}
                      placeholder={labels.phonePh}
                      className={`w-full px-2 py-1 text-sm bg-transparent border-0 outline-none
                        focus:bg-blue-50 rounded transition-colors
                        ${entry.isBold ? 'text-white' : 'text-gray-800'}`}
                    />
                  )}
                </td>

                {/* Supprimer */}
                <td className="border border-gray-300 px-1 py-1 text-center">
                  {!entry.isFixed && (
                    <button
                      onClick={() => deleteRow(entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity
                        p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddRowButton onClick={addRow} label={labels.addRow} />
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANTS EXTERNES — définis hors du composant principal
// pour éviter les re-renders qui cassent le focus
// ============================================================

function SectionHeader({
  sectionId,
  title,
  titleLine2,
}: {
  sectionId: string;
  title: string;
  titleLine2: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-start gap-2 mb-1">
        <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center
          text-xs font-bold text-gray-500 mt-1 flex-shrink-0">
          {sectionId}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider leading-tight">
            {title}
          </p>
          <h2 className="text-2xl font-black text-gray-900 uppercase leading-tight">
            {titleLine2}
          </h2>
        </div>
      </div>
      <div className="h-0.5 bg-red-600 mt-1 mb-4" />
    </div>
  );
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 flex items-center gap-1.5 text-sm text-blue-600
        hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded
        transition-colors border border-transparent hover:border-blue-200"
    >
      <Plus size={15} />
      {label}
    </button>
  );
}