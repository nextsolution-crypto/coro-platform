import type { ReactNode } from 'react';
import './kit.css';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'emergency';

export interface StatusBadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  title?: string;
}

/**
 * Pastille d'état. Le sens est toujours porté par le texte (jamais par la seule couleur).
 * Ton 'emergency' : fond opaque rouge d'urgence, identique en Light et en Dark.
 */
export function StatusBadge({ tone = 'neutral', children, title }: StatusBadgeProps) {
  return (
    <span className="cgx-badge" data-tone={tone} title={title}>
      {children}
    </span>
  );
}
