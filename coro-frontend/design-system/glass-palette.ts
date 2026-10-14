/**
 * CORO Liquid Glass — palette de transition (Phase 04).
 *
 * Les écrans existants portent leurs couleurs en #hex inline. Pour les faire passer en
 * Glass sans les réécrire, chaque littéral est enveloppé : p.text('#2C3E50'), p.bg('#FFFFFF'),
 * p.line('#E9ECEF').
 *
 * GARANTIE LEGACY : avec glass === false, ces fonctions renvoient leur argument tel quel.
 * Le rendu Legacy est donc strictement identique à celui d'avant (vérifié par glass-palette.test.cjs).
 * En Glass, le hex est remplacé par un token --cg-* (donc Light/Dark gratuits).
 * Un hex sans correspondance est renvoyé inchangé.
 */

const TEXT: Record<string, string> = {
  '#2C3E50': 'var(--cg-text-primary)',
  '#495057': 'var(--cg-text-secondary)',
  '#6C757D': 'var(--cg-text-secondary)',
  '#ADB5BD': 'var(--cg-text-muted)',
  '#C0392B': 'var(--cg-accent-text)',
  '#27AE60': 'var(--cg-success-fg)',
  '#F39C12': 'var(--cg-warning-fg)',
  '#E67E22': 'var(--cg-warning-fg)',
  '#2980B9': 'var(--cg-info-fg)',
  '#1A5276': 'var(--cg-info-fg)',
  '#8E44AD': 'var(--cg-purple-fg)',
};

const BG: Record<string, string> = {
  '#FFFFFF': 'var(--cg-glass-bg)',
  '#F8F9FA': 'var(--cg-hover-overlay)',
  '#E9ECEF': 'var(--cg-active-overlay)',
  '#FDEDEC': 'var(--cg-danger-bg)',
  '#FEF9E7': 'var(--cg-warning-bg)',
  '#FFFBF0': 'var(--cg-warning-bg)',
  '#EBF5FB': 'var(--cg-info-bg)',
  '#D6EAF8': 'var(--cg-info-bg)',
  '#AED6F1': 'var(--cg-info-border)',
  '#EAFAF1': 'var(--cg-success-bg)',
  '#F4ECF7': 'var(--cg-purple-bg)',
  '#C0392B': 'var(--cg-accent)',
  '#A93226': 'var(--cg-accent-hover)',
};

const LINE: Record<string, string> = {
  '#E9ECEF': 'var(--cg-border-subtle)',
  '#F8F9FA': 'var(--cg-border-subtle)',
  '#DEE2E6': 'var(--cg-border-default)',
  '#CED4DA': 'var(--cg-border-default)',
  '#F1948A': 'var(--cg-danger-border)',
  '#FAD7A0': 'var(--cg-warning-border)',
  '#AED6F1': 'var(--cg-info-border)',
  '#A9DFBF': 'var(--cg-success-border)',
  '#D2B4DE': 'var(--cg-purple-border)',
  '#C0392B': 'var(--cg-accent)',
  '#2980B9': 'var(--cg-info-fg)',
};

export interface GlassPalette {
  readonly glass: boolean;
  /** Couleur de texte (propriété color). */
  text: (hex: string) => string;
  /** Couleur de fond (background / backgroundColor). */
  bg: (hex: string) => string;
  /** Fond d'un panneau flottant (menu, liste déroulante) : quasi opaque en Glass. */
  panel: (hex: string) => string;
  /** Couleur de bordure (border*, outline). */
  line: (hex: string) => string;
}

function key(hex: string): string {
  return hex.toUpperCase();
}

export function createPalette(glass: boolean): GlassPalette {
  if (!glass) {
    const identity = (hex: string) => hex;
    return { glass: false, text: identity, bg: identity, panel: identity, line: identity };
  }
  return {
    glass: true,
    text: (hex) => TEXT[key(hex)] ?? hex,
    bg: (hex) => BG[key(hex)] ?? hex,
    panel: (hex) => (key(hex) === '#FFFFFF' ? 'var(--cg-panel-bg)' : BG[key(hex)] ?? hex),
    line: (hex) => LINE[key(hex)] ?? hex,
  };
}

export const GLASS_PALETTE_MAPS = { TEXT, BG, LINE } as const;
