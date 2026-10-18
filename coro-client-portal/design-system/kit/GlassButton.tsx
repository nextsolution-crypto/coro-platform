import type { ButtonHTMLAttributes } from 'react';
import './kit.css';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 'danger' : action destructive, rouge d'urgence opaque. */
  variant?: 'secondary' | 'primary' | 'danger' | 'ghost';
}

/** Bouton. `type` vaut 'button' par défaut : jamais d'envoi de formulaire involontaire. */
export function GlassButton({ variant = 'secondary', type = 'button', className, ...rest }: GlassButtonProps) {
  return <button type={type} className={className ? `cgx-button ${className}` : 'cgx-button'} data-variant={variant} {...rest} />;
}
