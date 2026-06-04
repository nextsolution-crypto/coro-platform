'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Settings } from 'lucide-react';

export interface OrgRole {
  id: string;
  roleCode?: string;
  label: string;
  label_en: string;
  note?: string;
  note_en?: string;
  color: string;
  textColor?: string;
  borderColor?: string;
  level: number;
  column: 'left' | 'right' | 'top' | 'full';
  isActive: boolean;
  isSystem: boolean;
  source: 'system' | 'custom';
  order: number;
}

interface Module3OrgChartProps {
  roles: OrgRole[];
  onChange: (roles: OrgRole[]) => void;
  language?: 'fr' | 'en';
}

const COLORS = [
  { label: 'Rouge',      value: '#C0392B', text: '#FFFFFF' },
  { label: 'Gris',       value: '#BDC3C7', text: '#2C3E50' },
  { label: 'Vert',       value: '#82B366', text: '#FFFFFF' },
  { label: 'Beige',      value: '#FFE6CC', text: '#2C3E50' },
  { label: 'Blanc',      value: '#FFFFFF',  text: '#2C3E50' },
  { label: 'Bleu',       value: '#2980B9', text: '#FFFFFF' },
  { label: 'Noir',       value: '#2C3E50', text: '#FFFFFF' },
  { label: 'Orange',     value: '#E67E22', text: '#FFFFFF' },
  { label: 'Vert foncé', value: '#1E8449', text: '#FFFFFF' },
  { label: 'Violet',     value: '#8E44AD', text: '#FFFFFF' },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

// ============================================================
// ORGBOX
// ============================================================

function OrgBox({
  role, onToggle, onEdit, onDelete, onMoveUp, onMoveDown,
  language, isFirst, isLast,
}: {
  role: OrgRole;
  onToggle: (id: string) => void;
  onEdit: (role: OrgRole) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  language: 'fr' | 'en';
  isFirst: boolean;
  isLast: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const label = language === 'fr' ? role.label : role.label_en;
  const note  = language === 'fr' ? role.note  : role.note_en;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        width: '100%',
        marginBottom: '0px',
      }}
    >
      {/* Boîte colorée */}
      <div style={{
  flex: 1,
  backgroundColor: role.isActive ? role.color : '#374151',
  color: role.isActive ? (role.textColor || '#FFFFFF') : '#6B7280',
  border: role.borderColor
    ? `2px solid ${role.borderColor}`
    : '1px solid rgba(75,85,99,0.3)',
  opacity: role.isActive ? 1 : 0.5,
  borderRadius: '4px',
  padding: '6px 10px',
  textAlign: 'center',
  fontSize: '11px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  lineHeight: '1.3',
  minHeight: '44px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
}}>
        {label}
        {note && (
          <div style={{
            fontSize: '10px',
            fontWeight: 'normal',
            textTransform: 'none',
            opacity: 0.85,
            marginTop: '2px',
          }}>
            {note}
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.15s',
        flexShrink: 0,
      }}>
        <button onClick={() => onToggle(role.id)} title={role.isActive ? 'Désactiver' : 'Activer'}
          style={{ padding: '3px', borderRadius: '3px', background: '#374151', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}>
          {role.isActive ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <button onClick={() => onEdit(role)} title="Modifier"
          style={{ padding: '3px', borderRadius: '3px', background: '#374151', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}>
          <Settings size={11} />
        </button>
        {!isFirst && (
          <button onClick={() => onMoveUp(role.id)} title="Monter"
            style={{ padding: '3px', borderRadius: '3px', background: '#374151', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}>
            <ChevronUp size={11} />
          </button>
        )}
        {!isLast && (
          <button onClick={() => onMoveDown(role.id)} title="Descendre"
            style={{ padding: '3px', borderRadius: '3px', background: '#374151', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}>
            <ChevronDown size={11} />
          </button>
        )}
        {!role.isSystem && (
          <button onClick={() => onDelete(role.id)} title="Supprimer"
            style={{ padding: '3px', borderRadius: '3px', background: '#374151', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MODAL ÉDITION
// ============================================================

function EditRoleModal({
  role, onSave, onClose, language,
}: {
  role: OrgRole;
  onSave: (updated: OrgRole) => void;
  onClose: () => void;
  language: 'fr' | 'en';
}) {
  const [form, setForm] = useState({ ...role });
  const update = (field: string, value: any) =>
    setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-md w-full max-w-lg
        shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="p-5 border-b border-gray-800">
          <h3 className="text-white font-bold">
            {role.isSystem ? 'Modifier le rôle' : 'Rôle personnalisé'}
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Nom FR *</label>
            <input type="text" value={form.label}
              onChange={e => update('label', e.target.value.toUpperCase())}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2
                text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Nom EN *</label>
            <input type="text" value={form.label_en}
              onChange={e => update('label_en', e.target.value.toUpperCase())}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2
                text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Note FR (optionnel)</label>
            <input type="text" value={form.note || ''}
              onChange={e => update('note', e.target.value)}
              placeholder="(sous-titre sous le nom)"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2
                text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Note EN (optionnel)</label>
            <input type="text" value={form.note_en || ''}
              onChange={e => update('note_en', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2
                text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Position</label>
            <select value={form.column} onChange={e => update('column', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2
                text-white text-sm focus:outline-none focus:border-orange-500">
              <option value="top">Haut (pleine largeur)</option>
              <option value="left">Colonne gauche</option>
              <option value="right">Colonne droite</option>
              <option value="full">Pleine largeur (intermédiaire)</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c.value}
                  onClick={() => { update('color', c.value); update('textColor', c.text); }}
                  className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110
                    ${form.color === c.value ? 'border-orange-500 scale-110' : 'border-gray-600'}`}
                  style={{ backgroundColor: c.value }} title={c.label} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">
              Couleur de bordure (optionnel)
            </label>
            <div className="flex gap-2">
              <button onClick={() => update('borderColor', undefined)}
                className={`px-3 py-1 rounded text-xs border
                  ${!form.borderColor ? 'border-orange-500 text-orange-400' : 'border-gray-600 text-gray-400'}`}>
                Aucune
              </button>
              {['#C0392B', '#2C3E50', '#2980B9', '#1E8449'].map(c => (
                <button key={c} onClick={() => update('borderColor', c)}
                  className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110
                    ${form.borderColor === c ? 'border-orange-500' : 'border-gray-600'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-2 block">Aperçu</label>
            <div style={{
              backgroundColor: form.color,
              color: form.textColor || '#FFFFFF',
              border: form.borderColor ? `2px solid ${form.borderColor}` : 'none',
              borderRadius: '4px',
              padding: '8px',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}>
              {form.label || 'NOM DU RÔLE'}
              {form.note && (
                <div style={{ fontWeight: 'normal', textTransform: 'none', fontSize: '10px', opacity: 0.8 }}>
                  {form.note}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-800 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">
            Annuler
          </button>
          <button onClick={() => onSave(form)}
            disabled={!form.label || !form.label_en}
            className="px-4 py-2 rounded bg-orange-500 text-white text-sm font-medium
              hover:bg-orange-600 disabled:opacity-50">
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module3OrgChart({
  roles, onChange, language = 'fr',
}: Module3OrgChartProps) {

  const [editingRole, setEditingRole] = useState<OrgRole | null>(null);
  const [showInactive, setShowInactive] = useState(true);
  const isFr = language === 'fr';

  const topRoles   = roles.filter(r => r.column === 'top').sort((a,b) => a.order - b.order);
  const fullRoles  = roles.filter(r => r.column === 'full').sort((a,b) => a.order - b.order);
  const leftRoles  = roles.filter(r => r.column === 'left').sort((a,b) => a.order - b.order);
  const rightRoles = roles.filter(r => r.column === 'right').sort((a,b) => a.order - b.order);

  const displayLeft  = showInactive ? leftRoles  : leftRoles.filter(r => r.isActive);
  const displayRight = showInactive ? rightRoles : rightRoles.filter(r => r.isActive);
  const displayFull  = showInactive ? fullRoles  : fullRoles.filter(r => r.isActive);

  const handleToggle = useCallback((id: string) => {
    onChange(roles.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  }, [roles, onChange]);

  const handleMoveUp = useCallback((id: string) => {
    const col = roles.find(r => r.id === id)?.column;
    const colRoles = roles.filter(r => r.column === col).sort((a,b) => a.order - b.order);
    const colIdx = colRoles.findIndex(r => r.id === id);
    if (colIdx <= 0) return;
    const prev = colRoles[colIdx - 1];
    const currOrder = roles.find(r => r.id === id)!.order;
    onChange(roles.map(r => {
      if (r.id === id)      return { ...r, order: prev.order };
      if (r.id === prev.id) return { ...r, order: currOrder };
      return r;
    }));
  }, [roles, onChange]);

  const handleMoveDown = useCallback((id: string) => {
    const col = roles.find(r => r.id === id)?.column;
    const colRoles = roles.filter(r => r.column === col).sort((a,b) => a.order - b.order);
    const colIdx = colRoles.findIndex(r => r.id === id);
    if (colIdx >= colRoles.length - 1) return;
    const next = colRoles[colIdx + 1];
    const currOrder = roles.find(r => r.id === id)!.order;
    onChange(roles.map(r => {
      if (r.id === id)      return { ...r, order: next.order };
      if (r.id === next.id) return { ...r, order: currOrder };
      return r;
    }));
  }, [roles, onChange]);

  const handleDelete   = useCallback((id: string) => {
    onChange(roles.filter(r => r.id !== id));
  }, [roles, onChange]);

  const handleEdit     = useCallback((role: OrgRole) => setEditingRole(role), []);

  const handleSaveEdit = useCallback((updated: OrgRole) => {
    onChange(roles.map(r => r.id === updated.id ? updated : r));
    setEditingRole(null);
  }, [roles, onChange]);

  const handleAddRole = useCallback((column: 'left' | 'right' | 'full') => {
    const maxOrder = Math.max(0, ...roles.map(r => r.order)) + 1;
    const newRole: OrgRole = {
      id: `custom_${uid()}`,
      label: 'NOUVEAU RÔLE',
      label_en: 'NEW ROLE',
      color: '#C0392B',
      textColor: '#FFFFFF',
      level: 3,
      column,
      isActive: true,
      isSystem: false,
      source: 'custom',
      order: maxOrder,
    };
    onChange([...roles, newRole]);
    setEditingRole(newRole);
  }, [roles, onChange]);

  const renderRole = (role: OrgRole, colRoles: OrgRole[]) => {
    const sorted = [...colRoles].sort((a,b) => a.order - b.order);
    const idx = sorted.findIndex(r => r.id === role.id);
    return (
      <OrgBox
        key={role.id}
        role={role}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        language={language}
        isFirst={idx === 0}
        isLast={idx === sorted.length - 1}
      />
    );
  };

  const addBtn = (col: 'left' | 'right' | 'full') => (
    <button
      onClick={() => handleAddRole(col)}
      style={{
        width: '100%',
        padding: '4px 0',
        fontSize: '11px',
        borderRadius: '4px',
        border: '1px dashed #9CA3AF',
        background: 'transparent',
        color: '#9CA3AF',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        marginTop: '2px',
      }}
    >
      <Plus size={11} /> Ajouter
    </button>
  );

  return (
    <div>
      {/* En-tête */}
      <div className="mb-4">
        <div className="flex items-start gap-2 mb-1">
          <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center
            text-xs font-bold text-gray-500 mt-1 flex-shrink-0">
            3.1
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {isFr ? 'ORGANIGRAMME DE' : 'ORGANIZATIONAL CHART OF'}
            </p>
            <h2 className="text-2xl font-black text-gray-900 uppercase">
              {isFr ? 'L\'ÉQUIPE D\'URGENCE' : 'THE EMERGENCY TEAM'}
            </h2>
          </div>
        </div>
        <div className="h-0.5 bg-red-600 mt-1 mb-4" />
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border
            transition-colors ${showInactive
              ? 'border-orange-500 text-orange-400 bg-orange-500/10'
              : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}>
          {showInactive ? <Eye size={12} /> : <EyeOff size={12} />}
          {showInactive ? 'Masquer rôles inactifs' : 'Afficher rôles inactifs'}
        </button>
        <span className="text-gray-600 text-xs">|</span>
        <button onClick={() => handleAddRole('left')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border
            border-blue-500 text-blue-400 hover:bg-blue-500/10 transition-colors">
          <Plus size={12} /> Ajouter colonne gauche
        </button>
        <button onClick={() => handleAddRole('right')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border
            border-blue-500 text-blue-400 hover:bg-blue-500/10 transition-colors">
          <Plus size={12} /> Ajouter colonne droite
        </button>
        <button onClick={() => handleAddRole('full')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border
            border-gray-500 text-gray-400 hover:bg-gray-500/10 transition-colors">
          <Plus size={12} /> Ajouter pleine largeur
        </button>
      </div>

      {/* Légende */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Eye size={11} /> Actif</span>
        <span className="flex items-center gap-1"><EyeOff size={11} /> Inactif</span>
        <span className="flex items-center gap-1"><Settings size={11} /> Modifier</span>
        <span className="flex items-center gap-1 text-red-400">
          <Trash2 size={11} /> Supprimer (personnalisés seulement)
        </span>
      </div>

      {/* ORGANIGRAMME — CSS inline pur */}
      <div style={{
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        padding: '10px',
        background: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>

        {/* TOP */}
        <div style={{ marginBottom: '8px' }}>
          {topRoles.map(r => renderRole(r, topRoles))}
        </div>

        {/* FULL */}
        {displayFull.length > 0 && (
          <div style={{
            borderTop: '1px solid #E5E7EB',
            paddingTop: '8px',
            marginBottom: '8px',
          }}>
            {displayFull.map(r => renderRole(r, fullRoles))}
          </div>
        )}

        {/* COLONNES */}
        {(displayLeft.length > 0 || displayRight.length > 0) && (
          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '8px' }}>

            {/* Headers colonnes */}
            {displayRight.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '8px',
              }}>
                <div style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#6B7280',
                  background: '#F3F4F6',
                  borderRadius: '4px',
                  padding: '3px 0',
                }}>
                  {isFr ? 'Responsabilité du gestionnaire' : 'Management responsibility'}
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#6B7280',
                  background: '#F3F4F6',
                  borderRadius: '4px',
                  padding: '3px 0',
                }}>
                  {isFr ? 'Responsabilité du locataire' : 'Tenant responsibility'}
                </div>
              </div>
            )}

            {/* Deux colonnes indépendantes */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>

              {/* Colonne GAUCHE */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0px' }}>
    {displayLeft.map(r => renderRole(r, leftRoles))}
    {addBtn('left')}
  </div>
  {displayRight.length > 0 && (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0px' }}>
      {displayRight.map(r => renderRole(r, rightRoles))}
      {addBtn('right')}
    </div>
  )}
</div>

            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          onSave={handleSaveEdit}
          onClose={() => setEditingRole(null)}
          language={language}
        />
      )}
    </div>
  );
}