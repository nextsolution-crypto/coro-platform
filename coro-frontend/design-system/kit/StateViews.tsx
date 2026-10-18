import type { ReactNode } from 'react';
import './kit.css';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Action proposée (bouton ou lien) ; l'écran décide ce qu'elle fait. */
  action?: ReactNode;
}

/** État vide : explique pourquoi il n'y a rien et propose une suite. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="cgx-state" data-kind="empty">
      {icon ? <div className="cgx-state__icon" aria-hidden="true">{icon}</div> : null}
      <p className="cgx-state__title">{title}</p>
      {description ? <p className="cgx-state__text">{description}</p> : null}
      {action ? <div className="cgx-state__action">{action}</div> : null}
    </div>
  );
}

export interface LoadingStateProps {
  /** Texte annoncé aux lecteurs d'écran et affiché (jamais un simple spinner muet). */
  label?: string;
  /** Nombre de lignes d'ossature affichées sous le texte (0 = texte seul). */
  lines?: number;
}

/** Chargement : région « status » polie, occupée ; les lignes d'ossature sont décoratives. */
export function LoadingState({ label = 'Chargement…', lines = 0 }: LoadingStateProps) {
  return (
    <div className="cgx-state" data-kind="loading" role="status" aria-live="polite" aria-busy="true">
      <p className="cgx-state__title">{label}</p>
      {lines > 0 ? (
        <div className="cgx-skeleton" aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => <span key={i} className="cgx-skeleton__line" data-wide={i % 3 === 0 ? 'true' : undefined} />)}
        </div>
      ) : null}
    </div>
  );
}

export interface ErrorStateProps {
  title?: ReactNode;
  message?: ReactNode;
  /** Action de reprise (p. ex. « Réessayer »). */
  action?: ReactNode;
}

/** Erreur : annoncée immédiatement (role="alert"), avec une reprise possible. Ne masque jamais le détail utile à l'utilisateur. */
export function ErrorState({ title = 'Une erreur est survenue', message, action }: ErrorStateProps) {
  return (
    <div className="cgx-state" data-kind="error" role="alert">
      <p className="cgx-state__title">{title}</p>
      {message ? <p className="cgx-state__text">{message}</p> : null}
      {action ? <div className="cgx-state__action">{action}</div> : null}
    </div>
  );
}
