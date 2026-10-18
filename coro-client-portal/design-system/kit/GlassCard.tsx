import type { ElementType, ReactNode } from 'react';
import './kit.css';

export interface GlassCardProps {
  /** Élément rendu (section par défaut ; article pour un élément autonome, div pour du pur habillage). */
  as?: 'section' | 'article' | 'div';
  /** Espacement intérieur. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Carte cliquable : léger soulèvement au survol (le comportement reste celui des enfants : lien ou bouton). */
  interactive?: boolean;
  /** Teinte d'état : liseré et fond discrets. Jamais utilisée pour l'urgence (voir StatusBadge « emergency »). */
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  /** Nom accessible de la région (recommandé pour une section). */
  label?: string;
  children: ReactNode;
}

/** Surface de contenu en verre (carte). Sans flou : aucun bloc conteneur piégeant les éléments à position fixe. */
export function GlassCard({ as = 'section', padding = 'md', interactive, tone = 'neutral', label, children }: GlassCardProps) {
  const Tag = as as ElementType;
  return (
    <Tag className="cgx-card" data-padding={padding} data-interactive={interactive ? 'true' : undefined} data-tone={tone} aria-label={as === 'div' ? undefined : label}>
      {children}
    </Tag>
  );
}
