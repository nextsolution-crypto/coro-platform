'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { isBetaEnabled } from '../../design-system/theme/theme-store';
import type { ThemePreference } from '../../design-system/theme/theme-core';

/**
 * Choix d'apparence du portail client : Classique (défaut) | Liquid Glass, puis Clair / Sombre / Système.
 *
 * N'apparaît QUE dans un build de préproduction (jeton NEXT_PUBLIC_GLASS_BETA exact) : le portail livré aux clients ne montre aucun choix
 * et reste strictement Classique. Le choix est mémorisé sur l'appareil uniquement (aucune donnée envoyée au serveur).
 */
export default function AppearanceSection() {
  const { uiPreference, preference, setUi, setPreference } = useTheme();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { setEnabled(isBetaEnabled()); }, []);
  if (!enabled) return null;

  const option = (selected: boolean) => ({
    backgroundColor: selected ? '#EBF5FB' : '#F8F9FA',
    border: `1px solid ${selected ? '#2980B9' : '#DEE2E6'}`,
  });
  const label = { display: 'block', margin: '0 0 6px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: '#6C757D' };
  const choice = { flex: 1, minWidth: 0, minHeight: 48, padding: 12, borderRadius: 4, textAlign: 'left' as const, cursor: 'pointer' };

  return (
    <section data-testid="appearance-section" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', borderRadius: 6, padding: 'clamp(16px, 3vw, 24px)', marginBottom: 16 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#2C3E50' }}>Apparence</h2>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6C757D' }}>
        Aperçu du nouveau design Liquid Glass. Le mode Classique reste le mode par défaut ; ce choix est mémorisé sur cet appareil uniquement.
      </p>

      <p id="portal-appearance-ui" style={label}>Interface</p>
      <div role="radiogroup" aria-labelledby="portal-appearance-ui" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        {([
          { value: 'legacy', title: 'Classique', desc: 'Interface actuelle, inchangée' },
          { value: 'glass', title: 'Liquid Glass (aperçu)', desc: 'Nouveau design du portail' },
        ] as const).map((opt) => (
          <button key={opt.value} type="button" role="radio" aria-checked={uiPreference === opt.value} onClick={() => setUi(opt.value)}
            style={{ ...choice, ...option(uiPreference === opt.value) }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: uiPreference === opt.value ? '#2980B9' : '#2C3E50' }}>{opt.title}</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#6C757D' }}>{opt.desc}</span>
          </button>
        ))}
      </div>

      <p id="portal-appearance-theme" style={label}>Thème (Liquid Glass)</p>
      <div role="radiogroup" aria-labelledby="portal-appearance-theme" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {([
          { value: 'LIGHT', title: 'Clair' },
          { value: 'DARK', title: 'Sombre' },
          { value: 'SYSTEM', title: 'Système' },
        ] as { value: ThemePreference; title: string }[]).map((opt) => (
          <button key={opt.value} type="button" role="radio" aria-checked={preference === opt.value} disabled={uiPreference !== 'glass'}
            onClick={() => setPreference(opt.value)}
            style={{ ...choice, ...option(preference === opt.value), opacity: uiPreference !== 'glass' ? 0.5 : 1, cursor: uiPreference !== 'glass' ? 'not-allowed' : 'pointer' }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: preference === opt.value ? '#2980B9' : '#2C3E50' }}>{opt.title}</span>
          </button>
        ))}
      </div>
      {uiPreference !== 'glass' && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6C757D' }}>Le choix du thème s’active avec l’interface Liquid Glass.</p>
      )}
    </section>
  );
}
