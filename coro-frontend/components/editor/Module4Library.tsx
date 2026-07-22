'use client';

import { useState, useEffect } from 'react';
import { Plus, Check, X, BookOpen, Search } from 'lucide-react';
import api from '@/lib/api';

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
  activeProcedureIds: string[];
  autoActivatedIds: string[];
  language?: 'fr' | 'en';
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function Module4Library({
  activeProcedureIds, autoActivatedIds, language = 'fr',
  onAdd, onRemove, onClose,
}: Module4LibraryProps) {

  const [procedures, setProcedures] = useState<LibraryProcedure[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const isFr = language === 'fr';

  const t = {
    title:    isFr ? 'Bibliothèque de procédures' : 'Procedure Library',
    subtitle: isFr ? 'Ajoutez ou retirez des procédures de votre document' : 'Add or remove procedures from your document',
    search:   isFr ? 'Rechercher une procédure...' : 'Search a procedure...',
    auto:     isFr ? 'Activée automatiquement' : 'Auto-activated',
    add:      isFr ? 'Ajouter' : 'Add',
    remove:   isFr ? 'Retirer' : 'Remove',
    close:    isFr ? 'Fermer' : 'Close',
    roles:    isFr ? 'rôle(s)' : 'role(s)',
    loading:  isFr ? 'Chargement...' : 'Loading...',
    empty:    isFr ? 'Aucune procédure trouvée' : 'No procedures found',
    inDoc:    isFr ? 'Dans le document' : 'In document',
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/procedures');
        setProcedures((res.data || []).map((p: any) => ({
          id: p.id,
          code: p.content?.code || p.code,
          titleFR: p.content?.titleFR || '',
          titleEN: p.content?.titleEN || '',
          icon: p.content?.icon,
          headerColor: p.content?.headerColor || '#7F8C8D',
          activationRule: p.content?.activationRule || 'always',
          documentTypes: p.content?.documentTypes || [],
          phase: p.content?.phase,
          roleCount: (p.content?.roleSections || []).length,
        })));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
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
      case 'always':        return isFr ? 'Toujours actif' : 'Always active';
      case 'double_signal': return 'Double signal';
      case 'has_gas':       return isFr ? 'Gaz naturel' : 'Natural gas';
      case 'has_ammonia':   return isFr ? 'Ammoniac' : 'Ammonia';
      case 'has_sprinklers':return isFr ? 'Gicleurs' : 'Sprinklers';
      case 'has_elevators': return isFr ? 'Ascenseurs' : 'Elevators';
      case 'has_hazmat':    return isFr ? 'Mat. dangereuses' : 'Hazmat';
      case 'has_lithium':   return isFr ? 'Batterie lithium' : 'Lithium battery';
      case 'boma_certified':return isFr ? 'Certif. BOMA' : 'BOMA certified';
      case 'manual':        return isFr ? 'Manuel' : 'Manual';
      default:              return isFr ? 'Conditionnel' : 'Conditional';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-2xl rounded-md flex flex-col"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          maxHeight: '85vh',
        }}>

        {/* Header */}
        <div className="p-5 flex items-start justify-between"
          style={{ borderBottom: '1px solid #E9ECEF' }}>
          <div className="flex items-center gap-3">
            <BookOpen size={20} style={{ color: '#C0392B' }} />
            <div>
              <h3 className="font-bold" style={{ color: '#2C3E50' }}>{t.title}</h3>
              <p className="text-xs mt-0.5" style={{ color: '#6C757D' }}>{t.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Recherche */}
        <div className="px-5 py-3" style={{ borderBottom: '1px solid #E9ECEF' }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#ADB5BD' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.search}
              className="w-full rounded pl-9 pr-4 py-2 text-sm focus:outline-none"
              style={{
                border: '1px solid #CED4DA',
                color: '#2C3E50',
                backgroundColor: '#F8F9FA',
              }}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'}
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>{t.loading}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: '#ADB5BD' }}>{t.empty}</p>
            </div>
          ) : (
            filtered.map(p => {
              const title  = isFr ? p.titleFR : p.titleEN;
              const active = isActive(p.id);
              const auto   = isAuto(p.id);

              return (
                <div key={p.id}
                  className="flex items-center gap-3 p-3 rounded-md transition-all"
                  style={{
                    border: `1px solid ${active ? '#F1948A' : '#E9ECEF'}`,
                    backgroundColor: active ? '#FDEDEC' : '#F8F9FA',
                  }}>

                  {/* Icône */}
                  <div className="w-9 h-9 rounded flex items-center justify-center
                    flex-shrink-0 text-base"
                    style={{ backgroundColor: p.headerColor }}>
                    {p.icon || '📋'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold"
                        style={{ color: '#ADB5BD' }}>
                        {p.code}
                      </span>
                      {p.phase && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: p.phase === 'alerte' ? '#FEF9E7' : '#FDEDEC',
                            color: p.phase === 'alerte' ? '#F39C12' : '#C0392B',
                            border: `1px solid ${p.phase === 'alerte' ? '#FAD7A0' : '#F1948A'}`,
                          }}>
                          {p.phase === 'alerte'
                            ? (isFr ? 'Alerte' : 'Alert')
                            : (isFr ? 'Alarme' : 'Alarm')}
                        </span>
                      )}
                      {auto && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: '#EAFAF1',
                            color: '#27AE60',
                            border: '1px solid #A9DFBF',
                          }}>
                          {t.auto}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate mt-0.5"
                      style={{ color: '#2C3E50' }}>
                      {title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs" style={{ color: '#ADB5BD' }}>
                        {p.roleCount} {t.roles}
                      </span>
                      <span className="text-xs" style={{ color: '#CED4DA' }}>•</span>
                      <span className="text-xs" style={{ color: '#ADB5BD' }}>
                        {getActivationLabel(p.activationRule)}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {auto ? (
                      <div className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: '#27AE60' }}>
                        <Check size={14} />
                        <span>{t.inDoc}</span>
                      </div>
                    ) : active ? (
                      <button
                        onClick={() => onRemove(p.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5
                          rounded font-medium transition-colors"
                        style={{
                          border: '1px solid #F1948A',
                          color: '#C0392B',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <X size={12} /> {t.remove}
                      </button>
                    ) : (
                      <button
                        onClick={() => onAdd(p.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5
                          rounded font-medium transition-colors"
                        style={{
                          border: '1px solid #DEE2E6',
                          color: '#6C757D',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#FDEDEC';
                          e.currentTarget.style.borderColor = '#F1948A';
                          e.currentTarget.style.color = '#C0392B';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = '#DEE2E6';
                          e.currentTarget.style.color = '#6C757D';
                        }}
                      >
                        <Plus size={12} /> {t.add}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex justify-between items-center"
          style={{ borderTop: '1px solid #E9ECEF' }}>
          <span className="text-xs" style={{ color: '#ADB5BD' }}>
            {activeProcedureIds.length} {isFr
              ? 'procédure(s) dans le document'
              : 'procedure(s) in document'}
          </span>
          <button
            onClick={onClose}
            className="text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}