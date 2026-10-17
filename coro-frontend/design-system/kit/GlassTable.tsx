import type { ReactNode } from 'react';
import './kit.css';

export interface GlassTableProps {
  /** Nom accessible de la région défilante (obligatoire : la région est focalisable au clavier). */
  label: string;
  /** Légende visible du tableau (optionnelle). */
  caption?: ReactNode;
  dense?: boolean;
  /** Survol de ligne (tableaux dont les lignes sont cliquables). */
  interactive?: boolean;
  stickyHeader?: boolean;
  /** Largeur minimale du tableau en px : en dessous, le conteneur défile horizontalement (le tableau n'est pas écrasé). */
  minWidth?: number;
  /**
   * Le conteneur défilant est-il un arrêt de tabulation ? Défaut : oui (un tableau sans contrôle interne doit rester défilable au clavier).
   * Mettre false quand le tableau contient lui-même des éléments focalisables (boutons, liens) : éviter un arrêt superflu.
   */
  focusable?: boolean;
  /** Si vrai, affiche `emptyMessage` à la place du tableau. */
  isEmpty?: boolean;
  emptyMessage?: ReactNode;
  /** <thead> et <tbody> fournis par l'écran : le composant n'impose aucune structure de données. */
  children: ReactNode;
}

/**
 * Tableau : conteneur à défilement horizontal (région nommée, atteignable au clavier) + <table> stylée.
 * Le contenu reste du HTML sémantique standard (<thead>, <th scope>, <tbody>).
 */
export function GlassTable({ label, caption, dense, interactive, stickyHeader, minWidth, focusable = true, isEmpty, emptyMessage, children }: GlassTableProps) {
  if (isEmpty) {
    return (
      <div className="cgx-table-wrap" role="region" aria-label={label}>
        <p className="cgx-table-empty">{emptyMessage ?? 'Aucune donnée à afficher.'}</p>
      </div>
    );
  }
  return (
    <div className="cgx-table-wrap" role="region" aria-label={label} tabIndex={focusable ? 0 : undefined}>
      <table className="cgx-table" style={minWidth ? { minWidth } : undefined} data-dense={dense ? 'true' : undefined} data-interactive={interactive ? 'true' : undefined} data-sticky={stickyHeader ? 'true' : undefined}>
        {caption ? <caption>{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}
