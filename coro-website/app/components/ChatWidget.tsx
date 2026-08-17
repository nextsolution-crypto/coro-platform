'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'Qu\'est-ce que CORO ?',
  'Quels types de documents ?',
  'Voir une démo',
  'Tarifs et abonnements',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [showProactive, setShowProactive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bonjour 👋 Je suis Sophie, l\'assistante IA de CORO. Je peux vous aider avec :\n\n• Les types de documents (PMU, PSI, PCA…)\n• La conformité réglementaire au Québec, Ontario et Alberta\n• Les fonctionnalités de la plateforme\n• Planifier une démo\n\nComment puis-je vous aider ?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferred, setTransferred] = useState(false);
  const [visitorEmail, setVisitorEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Détection mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Message proactif après 30 secondes
  useEffect(() => {
    if (hasOpened) return;
    const timer = setTimeout(() => setShowProactive(true), 30000);
    return () => clearTimeout(timer);
  }, [hasOpened]);

  // Scroll vers le bas
  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, open]);

  // Focus sur l'input à l'ouverture
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    setHasOpened(true);
    setShowProactive(false);
  };

  const handleSuggestedQuestion = (q: string) => {
    setInput(q);
    setTimeout(() => sendMessage(q), 100);
  };

  const sendEmailWithHistory = async () => {
    if (!visitorEmail.trim()) return;
    try {
      const history = messages.map(m =>
        `${m.role === 'user' ? '👤 Visiteur' : '🤖 Sophie (CORO IA)'} : ${m.content}`
      ).join('\n\n');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.getcoro.io'}/api/chat/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: visitorEmail, history }),
      });
      setEmailSent(true);
    } catch {
      setEmailSent(true);
    }
  };

  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput || input).trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.getcoro.io'}/api/chat/vitrine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.transferToAgent) setTransferred(true);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue. Contactez-nous à info@getcoro.io.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const showSuggestions = messages.length === 1 && !loading;

  // Dimensions selon mobile
  const widgetW = isMobile ? '100vw' : 360;
  const widgetH = isMobile ? '100dvh' : 520;
  const widgetBottom = isMobile ? 0 : 92;
  const widgetLeft = isMobile ? 0 : 24;
  const widgetBorderRadius = isMobile ? 0 : 16;

  return (
    <>
      {/* Bulle proactive */}
      {showProactive && !open && (
        <div
          onClick={handleOpen}
          style={{
            position: 'fixed',
            bottom: 92,
            left: 24,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            zIndex: 9997,
            cursor: 'pointer',
            maxWidth: 240,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); setShowProactive(false); }}
            style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#ADB5BD', fontSize: 16 }}
          >✕</button>
          <p style={{ margin: 0, fontSize: 13, color: '#2C3E50', lineHeight: 1.5 }}>
            👋 Besoin d'aide pour choisir le bon document de conformité ?
          </p>
        </div>
      )}

      {/* Bulle d'ouverture */}
      <button
        onClick={() => open ? setOpen(false) : handleOpen()}
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
          fontSize: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(192,57,43,0.4)',
          zIndex: 9999,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        aria-label={open ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Fenêtre de chat */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: widgetBottom,
          left: widgetLeft,
          width: widgetW,
          height: widgetH,
          backgroundColor: '#FFFFFF',
          borderRadius: widgetBorderRadius,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9998,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>

          {/* Header */}
          <div style={{ backgroundColor: '#2C3E50', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>S</div>
              <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', backgroundColor: '#27AE60', border: '2px solid #2C3E50' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>Sophie · CORO IA</p>
              <p style={{ margin: 0, color: '#BDC3C7', fontSize: 12 }}>
                {loading ? '⏳ En train d\'écrire...' : '🟢 En ligne · Répond instantanément'}
              </p>
            </div>
            {isMobile && (
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#BDC3C7', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
            )}
          </div>

          {/* Bannière transfert + courriel */}
          {transferred && (
            <div style={{ backgroundColor: '#FEF9E7', borderBottom: '1px solid #FAD7A0', padding: '14px 16px', flexShrink: 0 }}>
              <p style={{ fontSize: 13, color: '#7D6608', margin: '0 0 10px', lineHeight: 1.5 }}>
                💬 Laissez votre courriel et un conseiller vous contactera sous peu.
              </p>
              {!emailSent ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={visitorEmail}
                    onChange={e => setVisitorEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendEmailWithHistory()}
                    placeholder="votre@courriel.com"
                    style={{ flex: 1, border: '1px solid #FAD7A0', borderRadius: 6, padding: '8px 10px', fontSize: 13, outline: 'none', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
                  />
                  <button
                    onClick={sendEmailWithHistory}
                    disabled={!visitorEmail.trim()}
                    style={{ backgroundColor: visitorEmail.trim() ? '#C0392B' : '#DEE2E6', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: visitorEmail.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                  >
                    Envoyer
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#27AE60', margin: 0, fontWeight: 600 }}>✓ Merci ! Un conseiller vous contactera bientôt.</p>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                {m.role === 'assistant' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#FFFFFF', flexShrink: 0 }}>S</div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: m.role === 'user' ? '#C0392B' : '#F1F3F5',
                  color: m.role === 'user' ? '#FFFFFF' : '#2C3E50',
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Indicateur "en train d'écrire" */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#FFFFFF' }}>S</div>
                <div style={{ backgroundColor: '#F1F3F5', borderRadius: '16px 16px 16px 4px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', backgroundColor: '#ADB5BD',
                        animation: 'bounce 1.2s infinite',
                        animationDelay: `${i * 0.2}s`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Questions suggérées */}
            {showSuggestions && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => handleSuggestedQuestion(q)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 20,
                      border: '1px solid #DEE2E6',
                      backgroundColor: '#FFFFFF',
                      color: '#2C3E50',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#C0392B'; e.currentTarget.style.color = '#C0392B'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.color = '#2C3E50'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #E9ECEF', display: 'flex', gap: 8, flexShrink: 0, backgroundColor: '#FFFFFF' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Écrivez un message..."
              disabled={loading}
              style={{
                flex: 1,
                border: '1px solid #E9ECEF',
                borderRadius: 20,
                padding: '9px 16px',
                fontSize: 13,
                outline: 'none',
                color: '#2C3E50',
                backgroundColor: '#F8F9FA',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#E9ECEF'}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 38,
                height: 38,
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
                transition: 'background-color 0.15s',
              }}
            >
              ➤
            </button>
          </div>

          {/* Footer */}
          <p style={{ margin: 0, padding: '6px 14px 10px', fontSize: 11, color: '#ADB5BD', textAlign: 'center', flexShrink: 0, backgroundColor: '#FFFFFF' }}>
            Propulsé par CORO IA · <a href="mailto:info@getcoro.io" style={{ color: '#ADB5BD' }}>info@getcoro.io</a>
          </p>
        </div>
      )}

      {/* Animation CSS pour les points */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </>
  );
}