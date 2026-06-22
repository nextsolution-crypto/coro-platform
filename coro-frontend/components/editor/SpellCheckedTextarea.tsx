'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

interface LTMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: { value: string }[];
}

interface SpellCheckedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'fr' | 'en';
  placeholder?: string;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function SpellCheckedTextarea({
  value,
  onChange,
  language = 'fr',
  placeholder = '',
  rows = 4,
  className = '',
  style = {},
}: SpellCheckedTextareaProps) {
  const [matches, setMatches] = useState<LTMatch[]>([]);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const runCheck = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) {
      setMatches([]);
      return;
    }
    setChecking(true);
    try {
      const res = await api.post('/language-check', { text, language });
      setMatches(res.data?.matches || []);
    } catch (err) {
      console.error('Vérification linguistique échouée :', err);
    } finally {
      setChecking(false);
    }
  }, [language]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runCheck(value), 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, runCheck]);

  const applyReplacement = (match: LTMatch, replacement: string) => {
    const newValue = value.slice(0, match.offset) + replacement + value.slice(match.offset + match.length);
    onChange(newValue);
  };

  const ignoreMatch = (match: LTMatch) => {
    setMatches(prev => prev.filter(m => m !== match));
  };

  return (
    <div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={className}
        style={style}
      />

      {checking && (
        <p style={{ fontSize: '11px', color: '#ADB5BD', marginTop: '4px' }}>
          Vérification en cours...
        </p>
      )}

      {!checking && matches.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {matches.map((m, idx) => {
            const errorText = value.slice(m.offset, m.offset + m.length);
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: '#FDEDEC',
                  border: '1px solid #F1948A',
                  borderRadius: '4px',
                  fontSize: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: '#C0392B', fontWeight: 600 }}>
                  « {errorText} »
                </span>
                <span style={{ color: '#6C757D' }}>
                  {m.shortMessage || m.message}
                </span>
                {m.replacements.slice(0, 3).map((r, i) => (
                  <button
                    key={i}
                    onClick={() => applyReplacement(m, r.value)}
                    style={{
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      backgroundColor: '#27AE60',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    {r.value}
                  </button>
                ))}
                <button
                  onClick={() => ignoreMatch(m)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '12px',
                    color: '#ADB5BD',
                    backgroundColor: 'transparent',
                    border: '1px solid #DEE2E6',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  Ignorer
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}