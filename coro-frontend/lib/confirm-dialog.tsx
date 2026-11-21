'use client';

import { createRoot } from 'react-dom/client';
import { useEffect, useRef } from 'react';

/**
 * Boîte de confirmation de l'application (remplace window.confirm, audit
 * M1-09) : bilingue, accessible (dialog modal, focus, Échap), aux couleurs
 * CORO. Usage : `if (!(await confirmAction({ message }))) return;`
 */
export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmOptions;
  onClose: (accepted: boolean) => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const danger = options.danger ?? true;
  return (
    <div
      onClick={() => onClose(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16,
        backgroundColor: 'rgba(44, 62, 80, 0.45)',
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="coro-confirm-title"
        aria-describedby="coro-confirm-message"
        onClick={(event) => event.stopPropagation()}
        className="rounded-md"
        style={{
          width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF',
          boxShadow: '0 10px 30px rgba(0,0,0,0.18)', padding: 24,
        }}
      >
        <h2 id="coro-confirm-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>
          {options.title ?? 'Confirmer'}
        </h2>
        <p id="coro-confirm-message" style={{ margin: '12px 0 20px', fontSize: 14, color: '#6C757D', lineHeight: 1.5 }}>
          {options.message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="rounded"
            style={{ padding: '8px 14px', fontSize: 14, border: '1px solid #DEE2E6', color: '#6C757D', backgroundColor: '#FFFFFF' }}
          >
            {options.cancelLabel ?? 'Annuler'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className="rounded"
            style={{
              padding: '8px 14px', fontSize: 14, fontWeight: 600, border: 'none', color: '#FFFFFF',
              backgroundColor: danger ? '#C0392B' : '#2C3E50',
            }}
          >
            {options.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const close = (accepted: boolean) => {
      root.unmount();
      host.remove();
      previouslyFocused?.focus?.();
      resolve(accepted);
    };
    root.render(<ConfirmDialog options={options} onClose={close} />);
  });
}
