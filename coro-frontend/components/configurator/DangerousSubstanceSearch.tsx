'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

interface Substance {
  id: string;
  unNumber: string;
  nameFR: string;
  nameEN: string;
  casNumber?: string;
  tmdClass: string;
  tmdClassLabel: string;
  packingGroup?: string;
  simdutClass?: string;
  simdutLabel?: string;
  placardCode: string;
}

interface Props {
  onSelect: (substance: Substance) => void;
}

const PLACARD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '1':   { bg: '#FF8C00', text: '#FFFFFF', border: '#FF6600' },
  '1_4': { bg: '#FF8C00', text: '#FFFFFF', border: '#FF6600' },
  '2_1': { bg: '#FF0000', text: '#FFFFFF', border: '#CC0000' },
  '2_2': { bg: '#00AA00', text: '#FFFFFF', border: '#008800' },
  '2_3': { bg: '#FFFFFF', text: '#000000', border: '#CCCCCC' },
  '3':   { bg: '#FF0000', text: '#FFFFFF', border: '#CC0000' },
  '4_1': { bg: '#FF0000', text: '#FFFFFF', border: '#CC0000' },
  '4_2': { bg: '#FF0000', text: '#FFFFFF', border: '#CC0000' },
  '4_3': { bg: '#0000FF', text: '#FFFFFF', border: '#0000CC' },
  '5_1': { bg: '#FFD700', text: '#000000', border: '#CCB000' },
  '5_2': { bg: '#FF0000', text: '#FFFFFF', border: '#CC0000' },
  '6_1': { bg: '#FFFFFF', text: '#000000', border: '#CCCCCC' },
  '8':   { bg: '#000000', text: '#FFFFFF', border: '#333333' },
  '9':   { bg: '#FFFFFF', text: '#000000', border: '#CCCCCC' },
};

function PlacardBadge({ code, tmdClass }: { code: string; tmdClass: string }) {
  const colors = PLACARD_COLORS[code] || { bg: '#6C757D', text: '#FFFFFF', border: '#495057' };
  return (
    <div className="flex-shrink-0 w-12 h-12 rounded flex flex-col items-center justify-center font-black text-sm"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `2px solid ${colors.border}`,
        transform: 'rotate(45deg)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}>
      <span style={{ transform: 'rotate(-45deg)', fontSize: '13px', lineHeight: 1 }}>
        {tmdClass.includes('.') ? tmdClass.split('.')[0] : tmdClass}
      </span>
    </div>
  );
}

export default function DangerousSubstanceSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Substance[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReptoxLink, setShowReptoxLink] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      setShowReptoxLink(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/dangerous-substances/search?q=${encodeURIComponent(query)}`);
        setResults(res.data || []);
        setShowDropdown(true);
        setShowReptoxLink(res.data.length < 3);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (substance: Substance) => {
    onSelect(substance);
    setQuery('');
    setShowDropdown(false);
    setShowReptoxLink(false);
  };

  const reptoxUrl = `https://reptox.cnesst.gouv.qc.ca/Pages/recherche-produit.aspx?s=${encodeURIComponent(query)}`;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#ADB5BD' }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder="Rechercher par nom (Diesel, Propane...) ou numéro UN (1202...)"
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded focus:outline-none"
          style={{ border: '1px solid #C0392B', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs animate-pulse" style={{ color: '#ADB5BD' }}>⏳</span>
        )}
      </div>

      {/* Dropdown résultats */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg z-50 overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>

          {results.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm mb-2" style={{ color: '#6C757D' }}>
                Aucun résultat dans la base CORO.
              </p>
              <a href={reptoxUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded inline-flex items-center gap-1.5"
                style={{ backgroundColor: '#EBF5FB', color: '#2980B9', border: '1px solid #AED6F1' }}>
                🔗 Rechercher sur REPTOX (CNESST) →
              </a>
            </div>
          ) : (
            <>
              {results.map(substance => (
                <div key={substance.id}
                  onClick={() => handleSelect(substance)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid #F8F9FA' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>

                  {/* Placard TMD */}
                  <div className="flex-shrink-0 flex items-center justify-center w-14">
                    <PlacardBadge code={substance.placardCode} tmdClass={substance.tmdClass} />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-black px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                        UN {substance.unNumber}
                      </span>
                      <p className="text-sm font-semibold truncate" style={{ color: '#2C3E50' }}>
                        {substance.nameFR}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs" style={{ color: '#6C757D' }}>
                        TMD Classe {substance.tmdClass} — {substance.tmdClassLabel}
                      </span>
                      {substance.packingGroup && (
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: '#F8F9FA', color: '#495057', border: '1px solid #DEE2E6' }}>
                          GP {substance.packingGroup}
                        </span>
                      )}
                      {substance.simdutClass && (
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: '#EBF5FB', color: '#2980B9', border: '1px solid #AED6F1' }}>
                          SIMDUT {substance.simdutClass}
                        </span>
                      )}
                      {substance.casNumber && (
                        <span className="text-xs" style={{ color: '#ADB5BD' }}>
                          CAS {substance.casNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs flex-shrink-0" style={{ color: '#C0392B' }}>
                    + Ajouter →
                  </span>
                </div>
              ))}

              {/* Lien REPTOX si peu de résultats */}
              {showReptoxLink && (
                <div className="px-4 py-2.5 flex items-center justify-between"
                  style={{ backgroundColor: '#F8F9FA', borderTop: '1px solid #E9ECEF' }}>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>
                    Substance non trouvée dans la base CORO ?
                  </p>
                  <a href={reptoxUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium flex items-center gap-1"
                    style={{ color: '#2980B9' }}>
                    🔗 Consulter REPTOX (CNESST) →
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}