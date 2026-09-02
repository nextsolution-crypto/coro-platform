'use client';
import { Toast, ToastType } from '@/hooks/useToast';

interface Props {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const colors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: '#F0FBF4', border: '#27AE60', icon: '#27AE60', text: '#1E8449' },
  error:   { bg: '#FEF0F0', border: '#C0392B', icon: '#C0392B', text: '#A93226' },
  info:    { bg: '#EBF5FB', border: '#2980B9', icon: '#2980B9', text: '#1A5276' },
};

export default function ToastContainer({ toasts, removeToast }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '360px',
      width: '100%',
    }}>
      {toasts.map(toast => {
        const c = colors[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              backgroundColor: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
              animation: 'slideIn 0.2s ease',
            }}
          >
            {/* Icône */}
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: c.border,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '700',
              flexShrink: 0,
              marginTop: '1px',
            }}>
              {icons[toast.type]}
            </div>
            {/* Message */}
            <p style={{
              flex: 1,
              fontSize: '14px',
              color: c.text,
              fontWeight: '500',
              lineHeight: '1.4',
              margin: 0,
            }}>
              {toast.message}
            </p>
            {/* Fermer */}
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: c.icon,
                fontSize: '16px',
                lineHeight: 1,
                padding: '0 2px',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}