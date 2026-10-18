import type { ReactNode } from 'react';
import './kit.css';

export interface FilterBarProps {
  /** Nom accessible de la zone de recherche et de filtres. */
  label: string;
  children: ReactNode;
  /** Action « réinitialiser » proposée par l'écran (bouton). */
  reset?: ReactNode;
}

/** Barre de filtres : région « search » qui passe à la ligne sur mobile ; les champs sont fournis par l'écran (GlassField). */
export function FilterBar({ label, children, reset }: FilterBarProps) {
  return (
    <div className="cgx-filter-bar" role="search" aria-label={label}>
      <div className="cgx-filter-bar__fields">{children}</div>
      {reset ? <div className="cgx-filter-bar__reset">{reset}</div> : null}
    </div>
  );
}
