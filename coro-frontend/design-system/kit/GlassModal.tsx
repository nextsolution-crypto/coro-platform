'use client';

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GlassButton } from './GlassButton';
import './kit.css';

export interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Boutons d'action ; pour une suppression, utiliser <GlassButton variant="danger">. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** 'danger' : confirmation d'une action destructive (liseré rouge d'urgence opaque). */
  tone?: 'default' | 'danger';
  dismissOnBackdrop?: boolean;
  dismissOnEscape?: boolean;
  /** Élément à focaliser à l'ouverture (défaut : la boîte de dialogue). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeLabel?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Pile des modales ouvertes : seule la dernière réagit au clavier. Compteur de verrouillage du défilement partagé.
const openStack: string[] = [];
let scrollLocks = 0;
let overflowBefore = '';

const noopSubscribe = () => () => {};

/**
 * Boîte de dialogue modale accessible.
 * Rendue dans <body> (portail) : aucun ancêtre transformé ou flouté ne peut piéger sa position fixe.
 * Comportements : role="dialog" + aria-modal, titre/description reliés, focus déplacé dans la boîte,
 * piège de focus (Tab / Maj+Tab), Échap, verrouillage du défilement de <html>, arrière-plan rendu
 * inerte, focus rendu à l'élément d'origine à la fermeture.
 */
export function GlassModal({
  open, onClose, title, description, children, footer, size = 'md', tone = 'default',
  dismissOnBackdrop = true, dismissOnEscape = true, initialFocusRef, closeLabel = 'Fermer',
}: GlassModalProps) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const pressedOnBackdrop = useRef(false);

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open || !isClient) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openStack.push(uid);

    // Défilement de fond verrouillé (<html> est le conteneur de défilement de l'application).
    if (scrollLocks++ === 0) { overflowBefore = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; }

    // Arrière-plan inerte pour les technologies d'assistance et le clavier.
    const inerted: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === portalRef.current?.parentElement) continue;
      if (child === portalRef.current || child.contains(portalRef.current) || ['SCRIPT', 'NEXTJS-PORTAL'].includes(child.tagName)) continue;
      if (!child.hasAttribute('inert')) { child.setAttribute('inert', ''); inerted.push(child); }
    }

    (initialFocusRef?.current ?? dialogRef.current)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== uid) return;
      if (e.key === 'Escape' && dismissOnEscape) { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current; if (!dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) { e.preventDefault(); dialog.focus(); return; }
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : (index === -1 || index === items.length - 1 ? 0 : index + 1);
      e.preventDefault(); items[next].focus();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openStack.splice(openStack.indexOf(uid), 1);
      for (const el of inerted) el.removeAttribute('inert');
      if (--scrollLocks === 0) document.documentElement.style.overflow = overflowBefore;
      if (previouslyFocused && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, [open, isClient, uid, dismissOnEscape, initialFocusRef]);

  if (!open || !isClient) return null;

  return createPortal(
    <div ref={portalRef}>
      <div
        className="cgx-modal-backdrop"
        onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
        onClick={(e) => { if (dismissOnBackdrop && pressedOnBackdrop.current && e.target === e.currentTarget) onClose(); pressedOnBackdrop.current = false; }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className="cgx-modal"
          data-size={size}
          data-tone={tone}
        >
          <div className="cgx-modal__header">
            <h2 id={titleId} className="cgx-modal__title">{title}</h2>
            <GlassButton variant="ghost" className="cgx-modal__close" aria-label={closeLabel} onClick={onClose}><X size={18} aria-hidden="true" /></GlassButton>
          </div>
          {description ? <p id={descId} className="cgx-modal__description">{description}</p> : null}
          <div className="cgx-modal__body">{children}</div>
          {footer ? <div className="cgx-modal__footer">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
