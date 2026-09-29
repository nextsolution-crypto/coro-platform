'use client';

import { useState } from 'react';
import { Play, X } from 'lucide-react';
import type { Locale } from '@/lib/site/locale';
import styles from './hero-video.module.css';

/**
 * Homepage demo-video trigger + modal (MIG-08A-B). Embeds the approved CORO presentation video via the
 * privacy-enhanced youtube-nocookie.com domain (video ID fh3PuO23a1Q). Video only loads/plays on intentional
 * activation; no autoplay on page load — autoplay is scoped to the modal, which only opens on click.
 */
const YOUTUBE_VIDEO_ID = 'fh3PuO23a1Q';

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
        </div>
      )}
    </>
  );
}
