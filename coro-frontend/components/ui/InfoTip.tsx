'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Infobulle CORO : une icône ⓘ qu'on touche ou qu'on clique (fonctionne au doigt, pas seulement
 * au survol), une ou deux phrases, et un lien vers le chapitre du manuel d'utilisation.
 */
export default function InfoTip({ text, manual, label = 'Plus d’information' }: {
  text: string;
  /** Identifiant du chapitre du manuel (ex. « mandat-services »). */
  manual?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
      <button type="button" aria-label={label} aria-expanded={open} aria-controls={id}
        onClick={event => { event.preventDefault(); event.stopPropagation(); setOpen(value => !value); }}
        style={{
          width: 18, height: 18, marginLeft: 4, borderRadius: '50%', border: '1px solid #ADB5BD',
          color: '#6C757D', backgroundColor: '#FFFFFF', fontSize: 11, lineHeight: '16px', fontWeight: 700,
          textTransform: 'none', letterSpacing: 0, cursor: 'pointer', padding: 0, flexShrink: 0,
        }}>
        i
      </button>
      {open && (
        <span id={id} role="tooltip"
          style={{
            position: 'absolute', top: 24, left: -8, zIndex: 60, width: 260, maxWidth: '80vw',
            padding: '10px 12px', borderRadius: 6, backgroundColor: '#2C3E50', color: '#FFFFFF',
            fontSize: 12, lineHeight: 1.45, fontWeight: 400, textTransform: 'none', letterSpacing: 0,
            boxShadow: '0 6px 20px rgba(0,0,0,0.18)', whiteSpace: 'normal', textAlign: 'left',
          }}>
          {text}
          {manual && (
            <a href={`/manual#${manual}`} onClick={event => event.stopPropagation()}
              style={{ display: 'block', marginTop: 6, color: '#AED6F1', textDecoration: 'underline' }}>
              En savoir plus dans le manuel
            </a>
          )}
        </span>
      )}
    </span>
  );
}
