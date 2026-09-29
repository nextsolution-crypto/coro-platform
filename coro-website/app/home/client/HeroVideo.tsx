'use client';

import { useState } from 'react';
import { Play, X } from 'lucide-react';
import type { Locale } from '@/lib/site/locale';
import styles from './hero-video.module.css';

/**
 * Homepage demo-video trigger + modal (MIG-08A-B). Real asset preserved from the legacy `HomePageClient.tsx`
 * (`/videos/Video_home_page_CORO.mp4`, poster `/videos/Video_home_page_CORO_poster.jpg`) — no invented URL.
 * Video only loads/plays on intentional activation; no autoplay on page load.
 */
export function HeroVideo({ label, lang }: { label: string; lang: Locale }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={styles.trigger}>
        <span className={styles.icon}>
          <Play size={13} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
        </span>
        <span className={styles.label}>{label}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'fr' ? 'Vidéo de démonstration CORO' : 'CORO demo video'}
          onClick={() => setOpen(false)}
          className={styles.overlay}
        >
          <div onClick={(e) => e.stopPropagation()} className={styles.panel}>
            <button type="button" onClick={() => setOpen(false)} aria-label={lang === 'fr' ? 'Fermer' : 'Close'} className={styles.close}>
              <X size={20} />
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>
            <div className={styles.videoFrame}>
              <video controls autoPlay playsInline poster="/videos/Video_home_page_CORO_poster.jpg" className={styles.video}>
                <source src="/videos/Video_home_page_CORO.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
