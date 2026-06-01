'use client';

import { useState, useEffect } from 'react';
import { Plus, Check, X, BookOpen, Search } from 'lucide-react';
import api from '@/lib/api';

// ============================================================
// TYPES
// ============================================================

interface LibraryProcedure {
  id: string;
  code: string;
  titleFR: string;
  titleEN: string;
  icon?: string;
  headerColor: string;
  activationRule: string;
  documentTypes: string[];
  phase?: string;
  roleCount: number;
}

interface Module4LibraryProps {
  activeProcedureIds: string[];   // Procédures déjà dans le document
  autoActivatedIds: string[];     // Activées automatiquement (non retirables)
  language?: 'fr' | 'en';
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module4Library({
  activeProcedureIds,
  autoActivatedIds,
  language = 'fr',
  onAdd,
  onRemove,
  onClose,
}: Module4LibraryProps) {

  const [procedures, setProcedures] = useState<LibraryProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isFr = language === 'fr';

  const t = isFr ? {
    title:      'Bibliothèque de procédures',
    subtitle:   'Ajoutez ou retirez des procédures de votre document',
    search:     'Rechercher une procédure...',
    active:     'Dans le document',
    inactive:   'Disponible',
    auto:       'Activée automatiquement',
    add:        'Ajouter',
    remove:     'Retirer',
    close:      'Fermer',
    roles:      'rôle(s)',
    loading:    'Chargement...',
    empty:      'Aucune procédure trouvée',
    alerte:     'Alerte',
    alarme:     'Alarme',
    always:     'Toujours actif',
    manual:     'Manuel',
    conditional:'Conditionnel',
  } : {
    title:      'Procedure Library',
    subtitle:   'Add or remove procedures from your document',
    search:     'Search a procedure...',
    active:     'In document',
    inactive:   'Available',
    auto:       'Auto-activated',
    add:        'Add',
    remove:     'Remove',
    close:      'Close',
    roles:      'role(s)',
    loading:    'Loading...',
    empty:      'No procedures found',
    alerte:     'Alert',
    alarme:     'Alarm',
    always:     'Always active',
    manual:     'Manual',
    conditional:'Conditional',
  };

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const res = await api.get('/procedures/library');
        setProcedures(res.data.procedures || []);
      } catch (err) {
        console.error('Erreur chargement bibliothèque:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLibrary();
  }, []);

  const filtered = procedures.filter(p => {
    const title = isFr ? p.titleFR : p.titleEN;
    return title.toLowerCase().includes(search.toLowerCase()) ||
           p.code.toLowerCase().includes(search.toLowerCase());
  });

  const isActive = (id: string) => activeProcedureIds.includes(id);
  const isAuto   = (id: string) => autoActivatedIds.includes(id);

  const getActivationLabel = (rule: string) => {
    switch (rule) {
      case 'always':        return t.always;
      case 'double_signal': return isFr ? 'Double signal' : 'Double signal';
      case 'has_gas':       return isFr ? 'Gaz naturel' : 'Natural gas';
      case 'has_ammonia':   return isFr ? 'Ammoniac' : 'Ammonia';
      case 'has_sprinklers':return isFr ? 'Gicleurs' : 'Sprinklers';
      case 'has_elevators': return isFr ? 'Ascenseurs' : 'Elevators';
      case 'has_hazmat':    return isFr ? 'Mat. dangereuses' : 'Hazmat';
      case 'has_lithium':   return isFr ? 'Batterie lithium' : 'Lithium battery';
      case 'boma_certified':return isFr ? 'Certif. BOMA' : 'BOMA certified';
      case 'manual':        return t.manual;
      default:              return t.conditional;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl
        shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-orange-400" />
            <div>
              <h3 className="text-white font-bold">{t.title}</h3>
              <p className="text-gray-400 text-xs mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Recherche */}
        <div className="px-5 py-3 border-b border-gray-800">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
              text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.search}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg
                pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500
                focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm animate-pulse">
              {t.loading}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {t.empty}
            </div>
          ) : (
            filtered.map(p => {
              const title = isFr ? p.titleFR : p.titleEN;
              const active = isActive(p.id);
              const auto   = isAuto(p.id);

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border
                    transition-colors
                    ${active
                      ? 'border-orange-500/30 bg-orange-500/5'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}
                >
                  {/* Couleur + icône */}
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center
                      flex-shrink-0 text-base"
                    style={{ backgroundColor: p.headerColor }}
                  >
                    {p.icon || '📋'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-500 text-xs font-mono">
                        {p.code}
                      </span>
                      {p.phase && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700
                          text-gray-300">
                          {p.phase === 'alerte' ? t.alerte : t.alarme}
                        </span>
                      )}
                      {auto && (
                        <span className="text-xs px-1.5 py-0.5 rounded
                          bg-green-500/10 text-green-400 border border-green-500/20">
                          {t.auto}
                        </span>
                      )}
                    </div>
                    <p className="text-white text-sm font-medium truncate mt-0.5">
                      {title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-gray-500 text-xs">
                        {p.roleCount} {t.roles}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {getActivationLabel(p.activationRule)}
                      </span>
                    </div>
                  </div>

                  {/* Bouton action */}
                  <div className="flex-shrink-0">
                    {auto ? (
                      <div className="flex items-center gap-1 text-green-400 text-xs">
                        <Check size={14} />
                        <span>{t.active}</span>
                      </div>
                    ) : active ? (
                      <button
                        onClick={() => onRemove(p.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5
                          rounded-lg border border-red-500/30 text-red-400
                          hover:bg-red-500/10 transition-colors"
                      >
                        <X size={12} />
                        {t.remove}
                      </button>
                    ) : (
                      <button
                        onClick={() => onAdd(p.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5
                          rounded-lg border border-orange-500/30 text-orange-400
                          hover:bg-orange-500/10 transition-colors"
                      >
                        <Plus size={12} />
                        {t.add}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-between
          items-center">
          <span className="text-gray-500 text-xs">
            {activeProcedureIds.length} {isFr
              ? 'procédure(s) dans le document'
              : 'procedure(s) in document'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm
              font-medium hover:bg-orange-600 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}