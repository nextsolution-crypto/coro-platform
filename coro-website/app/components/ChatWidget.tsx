'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis l\'assistant CORO. Comment puis-je vous aider ?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferred, setTransferred] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.getcoro.io'}/api/chat/vitrine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

      if (data.transferToAgent) {
        setTransferred(true);
        // Ouvre Crisp et ferme notre widget
        if (typeof window !== 'undefined' && (window as any).$crisp) {
          (window as any).$crisp.push(['do', 'chat:show']);
          (window as any).$crisp.push(['do', 'chat:open']);
          (window as any).$crisp.push(['do', 'message:send', ['text', `Bonjour, je viens du chat IA CORO. Question posée : "${userMessage}"`]]);
          // Ferme notre widget après 1.5 secondes
          setTimeout(() => setOpen(false), 1500);
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue. Contactez-nous à info@getcoro.io.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Bulle d'ouverture */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#C0392B',
          color: '#FFFFFF',
          border: 'none',
          cursor: 'pointer',
          fontSize: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          zIndex: 9999,
          transition: 'transform 0.2s',
        }}
        aria-label="Ouvrir le chat"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Fenêtre de chat */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 92,
          left: 24,
          width: 340,
          maxHeight: 480,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9998,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>

          {/* Header */}
          <div style={{ backgroundColor: '#2C3E50', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#FFFFFF' }}>C</div>
            <div>
              <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>Assistant CORO</p>
              <p style={{ margin: 0, color: '#BDC3C7', fontSize: 12 }}>
                {transferred ? '👤 Transfert à l\'équipe en cours...' : '🟢 En ligne'}
              </p>
            </div>
          </div>

          {/* Bannière transfert */}
          {transferred && (
            <div style={{ backgroundColor: '#FEF9E7', borderBottom: '1px solid #FAD7A0', padding: '10px 14px', fontSize: 13, color: '#7D6608' }}>
              💬 Un membre de notre équipe va vous contacter sous peu à votre courriel ou via Crisp.
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: m.role === 'user' ? '#C0392B' : '#F1F3F5',
                  color: m.role === 'user' ? '#FFFFFF' : '#2C3E50',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ backgroundColor: '#F1F3F5', borderRadius: '16px 16px 16px 4px', padding: '9px 16px', fontSize: 20, color: '#ADB5BD' }}>•••</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #E9ECEF', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Écrivez un message..."
              disabled={loading}
              style={{
                flex: 1,
                border: '1px solid #E9ECEF',
                borderRadius: 20,
                padding: '8px 14px',
                fontSize: 13,
                outline: 'none',
                color: '#2C3E50',
                backgroundColor: '#F8F9FA',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: input.trim() ? '#C0392B' : '#E9ECEF',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                color: '#FFFFFF',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>

          {/* Footer */}
          <p style={{ margin: 0, padding: '6px 14px 10px', fontSize: 11, color: '#ADB5BD', textAlign: 'center' }}>
            Propulsé par CORO IA · <a href="mailto:info@getcoro.io" style={{ color: '#ADB5BD' }}>info@getcoro.io</a>
          </p>
        </div>
      )}
    </>
  );
}