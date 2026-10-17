/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Carte de teinte Liquid Glass V2 — source de vérité des correspondances « couleur Legacy → rôle Glass ».
 *
 * La couche de teinte (skin) donne l'identité Glass (clair, sombre, système) à un écran métier SANS réécrire ses composants :
 * les couleurs Legacy posées en ligne (style={{ … }}), les classes Tailwind de couleur et, pour les modules CSS, des replis var()
 * sont ramenés aux jetons --cg-*. Elle est inerte hors des modes `skin` et `canvas` (attribut html[data-cg-mode]).
 *
 * Règles de sécurité visuelle :
 *  - le rouge solide (#C0392B en fond), les verts/ambre/bleus pleins des boutons et pastilles restent identiques ;
 *  - aucun état d'urgence (panique, évacuation, incident) n'est rendu transparent ou atténué : les jetons --cg-emergency-* sont opaques
 *    et ne sont pas touchés ici ;
 *  - les feuilles de document (aperçus, PDF) restent claires : sous [data-cg-paper] aucune règle ne s'applique.
 */

/**
 * Rôles → expression CSS finale. Tous passent par des jetons alias --cg-skin-<type>-<rôle> (définis par la feuille de teinte, donc
 * inexistants hors modes skin/canvas) : les replis var(--cg-skin-…, #hex) des modules CSS restent ainsi identiques au Legacy partout ailleurs.
 */
const alias = (kind, role) => `var(--cg-skin-${kind}-${role})`;
const BG_ROLES = Object.fromEntries(['surface', 'fill1', 'fill2', 'success', 'warning', 'danger', 'info', 'purple', 'navy'].map((r) => [r, alias('bg', r)]));
const TEXT_ROLES = Object.fromEntries(['primary', 'secondary', 'muted', 'accent', 'success', 'warning', 'danger', 'info', 'purple'].map((r) => [r, alias('text', r)]));
const BORDER_ROLES = Object.fromEntries(['subtle', 'default', 'success', 'warning', 'danger', 'info', 'purple'].map((r) => [r, alias('border', r)]));

/** Définition des alias : rôle → jeton Glass sous-jacent (suit le thème Light/Dark). */
const ALIAS_DEFS = {
  'bg-surface': 'var(--cg-glass-bg-strong)',
  'bg-fill1': 'rgba(40, 72, 120, 0.05)',
  'bg-fill2': 'rgba(40, 72, 120, 0.12)',
  'bg-success': 'var(--cg-success-bg)',
  'bg-warning': 'var(--cg-warning-bg)',
  'bg-danger': 'var(--cg-danger-bg)',
  'bg-info': 'var(--cg-info-bg)',
  'bg-purple': 'var(--cg-purple-bg)',
  'bg-navy': '#2C3E50',
  'text-primary': 'var(--cg-text-primary)',
  'text-secondary': 'var(--cg-text-secondary)',
  'text-muted': 'var(--cg-text-muted)',
  'text-accent': 'var(--cg-accent-text)',
  'text-success': 'var(--cg-success-fg)',
  'text-warning': 'var(--cg-warning-fg)',
  'text-danger': 'var(--cg-danger-fg)',
  'text-info': 'var(--cg-info-fg)',
  'text-purple': 'var(--cg-purple-fg)',
  'border-subtle': 'var(--cg-border-subtle)',
  'border-default': 'var(--cg-border-default)',
  'border-success': 'var(--cg-success-border)',
  'border-warning': 'var(--cg-warning-border)',
  'border-danger': 'var(--cg-danger-border)',
  'border-info': 'var(--cg-info-border)',
  'border-purple': 'var(--cg-purple-border)',
};
/** Surcharges Dark des alias qui ne suivent pas déjà un jeton thématisé. */
const ALIAS_DARK = {
  'bg-fill1': 'rgba(255, 255, 255, 0.045)',
  'bg-fill2': 'rgba(255, 255, 255, 0.11)',
  'bg-navy': '#3B516B',
};

/** Couleurs hex Legacy (6 chiffres, majuscules) → rôle. */
const BG_HEX = {
  surface: ['FFFFFF'],
  fill1: ['F8F9FA', 'F1F3F5', 'FAFAFA', 'F0F0F0', 'F5F7F8', 'F7F8FA', 'F3F4F6', 'F9FAFB', 'F8FAFC'],
  fill2: ['E9ECEF', 'DEE2E6', 'CED4DA', 'E2E8F0', 'E5E7EB', 'F1F5F9'],
  success: ['EAFAF1', 'E8F5F1', 'F3FAF8', 'D5EDE7'],
  warning: ['FEF9E7', 'FEF5E7', 'FDF2E9'],
  danger: ['FDEDEC'],
  info: ['EBF5FB', 'D6EAF8'],
  purple: ['F4ECF7'],
  navy: ['2C3E50'],
};

const TEXT_HEX = {
  primary: ['2C3E50', '212529', '1B2A3B', '1A252F', '273D34', '20363A', '1F2937', '111827'],
  secondary: ['495057', '4A5568', '45515C', '374151', '343A40', '4B5563', '245E4C'],
  muted: ['6C757D', 'ADB5BD', '7F8C8D', '95A5A6', '7A8691', '8899AA', '868E96', '9CA3AF', '6B7280'],
  accent: ['C0392B', 'A93226', '922B21', 'CC0000', 'E74C3C'],
  success: ['27AE60', '1E8449', '167D6A', '176B4D', '16A34A'],
  warning: ['F39C12', 'E67E22', 'B9770E', '7D6608', 'D68910'],
  info: ['2980B9', '1A5276', '1D5F93'],
  purple: ['8E44AD', '6C3483'],
};

const BORDER_HEX = {
  subtle: ['E9ECEF', 'F1F3F5', 'DFE7E2'],
  default: ['DEE2E6', 'CED4DA', 'E2E8F0', 'D1D5DB', 'ADB5BD', 'DCE2E5'],
  danger: ['F1948A', 'E8A89C'],
  info: ['AED6F1'],
  success: ['A9DFBF'],
  warning: ['FAD7A0'],
  purple: ['D2B4DE'],
};

/** Couleurs d'accentuation : un élément qui en porte une sur un côté garde ses bordures (liséré d'état). */
const ACCENT_BORDERS = ['C0392B', '27AE60', '2980B9', 'F39C12', '8E44AD', 'E67E22', 'A93226', '1E8449', '922B21'];

/** Classes Tailwind de couleur → rôle (préfixes `bg-`, `text-`, `border-` ajoutés par le générateur). */
const TW_BG = {
  surface: ['white'],
  fill1: ['gray-50', 'slate-50', 'gray-100', 'slate-100', 'neutral-50', 'zinc-50', 'stone-50'],
  fill2: ['gray-200', 'slate-200'],
  success: ['emerald-50', 'green-50', 'emerald-100', 'green-100'],
  warning: ['amber-50', 'yellow-50', 'orange-50', 'amber-100', 'yellow-100', 'orange-100'],
  danger: ['red-50', 'rose-50', 'red-100'],
  info: ['blue-50', 'sky-50', 'blue-100'],
  purple: ['purple-50', 'violet-50'],
  navy: ['slate-900', 'slate-950', 'gray-800', 'gray-900', 'black', 'slate-800'],
};
const TW_TEXT = {
  primary: ['gray-900', 'gray-800', 'slate-900', 'slate-800', 'neutral-900'],
  secondary: ['gray-700', 'gray-600', 'slate-700', 'slate-600', 'neutral-600'],
  muted: ['gray-500', 'gray-400', 'slate-500', 'slate-400', 'neutral-500'],
  accent: [],
  success: ['emerald-600', 'emerald-700', 'emerald-800', 'emerald-900', 'green-600', 'green-700', 'green-800'],
  warning: ['amber-600', 'amber-700', 'amber-800', 'amber-900', 'orange-400', 'orange-500', 'orange-600', 'yellow-700', 'yellow-800'],
  danger: ['red-400', 'red-600', 'red-700', 'red-800', 'red-900', 'rose-700'],
  info: ['blue-600', 'blue-700', 'blue-800', 'sky-700'],
  purple: ['purple-700', 'violet-700'],
};
const TW_BORDER = {
  subtle: ['gray-100', 'slate-100'],
  default: ['gray-200', 'gray-300', 'slate-200', 'slate-300', 'neutral-200', 'neutral-300', 'zinc-200', 'zinc-300'],
  success: ['emerald-200', 'emerald-300', 'green-200', 'green-300'],
  warning: ['amber-200', 'amber-300', 'yellow-200', 'yellow-300'],
  danger: ['red-200', 'red-300', 'rose-200'],
  info: ['blue-200', 'blue-300', 'sky-200'],
  purple: ['purple-200', 'purple-300'],
};

/** Variantes de survol Tailwind (fond) → recouvrement de survol Glass. */
const TW_HOVER_BG = ['gray-50', 'gray-100', 'slate-50', 'slate-100', 'white', 'gray-200', 'slate-200'];

module.exports = {
  BG_ROLES, TEXT_ROLES, BORDER_ROLES, ALIAS_DEFS, ALIAS_DARK,
  BG_HEX, TEXT_HEX, BORDER_HEX, ACCENT_BORDERS,
  TW_BG, TW_TEXT, TW_BORDER, TW_HOVER_BG,
};
