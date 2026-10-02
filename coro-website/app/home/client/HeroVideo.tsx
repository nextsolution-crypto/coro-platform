'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import type { Locale } from '@/lib/site/locale';
import styles from './hero-video.module.css';

/**
 * Homepage demo-video trigger + modal (MIG-08A-B). Embeds the approved CORO presentation video via the
 * privacy-enhanced youtube-nocookie.com domain (video ID fh3PuO23a1Q). Video only loads/plays on intentional
 * activation; no autoplay on page load — autoplay is scoped to the modal, which only opens on click.
 * Rendered through a portal directly under document.body: the trigger button lives deep inside the Hero's
 * photo-mode markup, and a portal guarantees the overlay is a true viewport-level modal regardless of any
 * ancestor stacking/containing-block behavior (observed in production: the overlay was bounded by the Hero
 * instead of covering the full viewport).
 */
const YOUTUBE_VIDEO_ID = 'fh3PuO23a1Q';

export function HeroVideo({ label, lang }: { label: string; lang: Locale }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button, iframe, [href], [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={styles.trigger}>
        <span className={styles.icon}>
          <Play size={13} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
        </span>
        <span className={styles.label}>{label}</span>
      </button>
      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'fr' ? 'Vidéo de démonstration CORO' : 'CORO demo video'}
          onClick={() => setOpen(false)}
          className={styles.overlay}
        >
          <div ref={panelRef} onClick={(e) => e.stopPropagation()} className={styles.panel}>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label={lang === 'fr' ? 'Fermer' : 'Close'} className={styles.close}>
              <X size={20} />
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>
            <div className={styles.videoFrame}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
                title={lang === 'fr' ? 'Vidéo de démonstration CORO' : 'CORO demo video'}
                className={styles.video}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                frameBorder={0}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
