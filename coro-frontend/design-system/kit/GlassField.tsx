'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import './kit.css';

export interface GlassFieldControlProps {
  id: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  className: string;
}

export interface GlassFieldProps {
  label: string;
  hint?: ReactNode;
  /** Message d'erreur : annoncé par les lecteurs d'écran et préfixé « Erreur : » (jamais la couleur seule). */
  error?: ReactNode;
  required?: boolean;
  /** Reçoit les attributs à poser sur le contrôle (input, select, textarea). */
  children: (control: GlassFieldControlProps) => ReactNode;
}

/**
 * Champ de formulaire : étiquette liée au contrôle, aide et erreur reliées par aria-describedby.
 * Le contrôle lui-même est fourni par l'écran (render prop) : aucune logique de formulaire imposée.
 */
export function GlassField({ label, hint, error, required, children }: GlassFieldProps) {
  const uid = useId();
  const id = `${uid}-control`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="cgx-field">
      <label className="cgx-field__label" htmlFor={id}>
        {label}
        {required ? <span className="cgx-field__required" aria-hidden="true"> *</span> : null}
      </label>
      {children({ id, required, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, className: 'cgx-input' })}
      {hint ? <p id={hintId} className="cgx-field__hint">{hint}</p> : null}
      {error ? <p id={errorId} className="cgx-field__error" role="alert">Erreur : {error}</p> : null}
    </div>
  );
}
