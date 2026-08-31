'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[CORO SW] Enregistré:', reg.scope);

          // Sync en arrière-plan quand connexion revient
          if ('sync' in reg) {
            window.addEventListener('online', () => {
              (reg as any).sync.register('sync-checkins').catch(console.error);
            });
          }
        })
        .catch((err) => {
          console.error('[CORO SW] Erreur:', err);
        });
    }
  }, []);

  return null;
}