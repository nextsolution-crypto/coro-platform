import type { ReactNode } from 'react';
import './kit.css';

export interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  /** Actions (boutons) alignées à droite, passées à la ligne sur mobile. */
  actions?: ReactNode;
  headingLevel?: 1 | 2;
}

/** En-tête de page : surtitre, titre (h1 par défaut), sous-titre et actions. */
export function PageHeader({ title, eyebrow, subtitle, actions, headingLevel = 1 }: PageHeaderProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <header className="cgx-page-header">
      <div className="cgx-page-header__text">
        {eyebrow ? <p className="cgx-page-header__eyebrow">{eyebrow}</p> : null}
        <Heading className="cgx-page-header__title">{title}</Heading>
        {subtitle ? <p className="cgx-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="cgx-page-header__actions">{actions}</div> : null}
    </header>
  );
}
