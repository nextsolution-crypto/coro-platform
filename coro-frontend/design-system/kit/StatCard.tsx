import type { ReactNode } from 'react';
import './kit.css';

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Pictogramme décoratif (masqué aux lecteurs d'écran : le libellé porte le sens). */
  icon?: ReactNode;
  /** Précision sous la valeur (période, unité, tendance en texte). */
  helper?: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

/** Indicateur chiffré : libellé, valeur, aide. Le ton n'est jamais le seul porteur du sens (le texte reste présent). */
export function StatCard({ label, value, icon, helper, tone = 'neutral' }: StatCardProps) {
  return (
    <div className="cgx-stat" data-tone={tone} role="group">
      <div className="cgx-stat__top">
        <span className="cgx-stat__label">{label}</span>
        {icon ? <span className="cgx-stat__icon" aria-hidden="true">{icon}</span> : null}
      </div>
      <div className="cgx-stat__value">{value}</div>
      {helper ? <div className="cgx-stat__helper">{helper}</div> : null}
    </div>
  );
}
