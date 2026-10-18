import type { ReactNode } from 'react';
import './kit.css';

export interface GlassPanelProps {
  /** Rôle ARIA de la surface flottante (menu, tiroir, info-bulle riche). 'group' pour un simple regroupement. */
  role?: 'group' | 'menu' | 'dialog' | 'region';
  label: string;
  children: ReactNode;
}

/**
 * Surface FLOTTANTE (menus, tiroirs, panneaux) : quasi opaque pour rester lisible par-dessus le contenu ; jamais translucide.
 * N'ouvre ni ne ferme rien : l'écran gère la position et le focus (utiliser GlassModal pour un dialogue modal).
 */
export function GlassPanel({ role = 'group', label, children }: GlassPanelProps) {
  return (
    <div className="cgx-panel" role={role} aria-label={label}>
      {children}
    </div>
  );
}
