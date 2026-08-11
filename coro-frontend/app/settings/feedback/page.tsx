'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { MessageSquare, CheckCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'BUG', label: '🐛 Signaler un bug', desc: 'Quelque chose ne fonctionne pas comme prévu' },
  { value: 'SUGGESTION', label: '💡 Suggestion', desc: 'Une idée pour améliorer CORO' },
  { value: 'QUESTION', label: '❓ Question', desc: "Besoin d'aide ou d'une clarification" },
  { value: 'AUTRE', label: '💬 Autre', desc: 'Tout autre commentaire' },
];

export default function FeedbackPage() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();

  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      setError('Veuillez choisir une catégorie.');
      return;
    }

    if (!message.trim()) {
      setError('Veuillez écrire un message.');
      return;
    }

    setSending(true);
    setError('');

    try {
      await api.post('/feedback', { category, message });
      setSent(true);
      setCategory('');
      setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <MessageSquare size={22} className="flex-shrink-0 mt-1" style={{ color: '#C0392B' }} />
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
              Nous écrire
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#6C757D' }}>
              Bug, suggestion, question — on veut tout savoir.
            </p>
          </div>
        </div>

        {sent ? (
          <div
            className="rounded-md p-6 sm:p-10 text-center"
            style={{ backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF' }}
          >
            <CheckCircle size={40} className="mx-auto mb-4" style={{ color: '#27AE60' }} />
            <p className="font-semibold text-lg mb-2" style={{ color: '#27AE60' }}>
              Message envoyé — merci !
            </p>
            <p className="text-sm mb-6" style={{ color: '#6C757D' }}>
              On prend en compte chaque retour. On vous revient si nécessaire.
            </p>
            <button
              onClick={() => setSent(false)}
              className="w-full sm:w-auto text-sm font-medium px-4 py-2 rounded transition-colors"
              style={{ border: '1px solid #A9DFBF', color: '#27AE60' }}
            >
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: '#2C3E50' }}>
                Type de message *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setCategory(cat.value);
                      setError('');
                    }}
                    className="text-left rounded-md p-4 transition-all min-w-0"
                    style={{
                      border: `2px solid ${category === cat.value ? '#C0392B' : '#E9ECEF'}`,
                      backgroundColor: category === cat.value ? '#FDEDEC' : '#FFFFFF',
                    }}
                  >
                    <p className="text-sm font-semibold break-words" style={{ color: '#2C3E50' }}>
                      {cat.label}
                    </p>
                    <p className="text-xs mt-1 break-words" style={{ color: '#6C757D' }}>
                      {cat.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#2C3E50' }}>
                Votre message *
              </label>

              <textarea
                value={message}
                onChange={e => {
                  setMessage(e.target.value);
                  setError('');
                }}
                rows={6}
                placeholder="Décrivez votre bug, suggestion ou question en détail..."
                className="w-full min-w-0 rounded-md px-4 py-3 text-sm focus:outline-none resize-vertical"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
              />

              <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                {message.length} caractère{message.length !== 1 ? 's' : ''}
              </p>
            </div>

            {error && (
              <div
                className="rounded p-3 text-sm break-words"
                style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full text-white font-medium py-3 rounded-md text-sm disabled:opacity-50 transition-colors"
              style={{ backgroundColor: '#C0392B' }}
              onMouseEnter={e => { if (!sending) e.currentTarget.style.backgroundColor = '#A93226'; }}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}
            >
              {sending ? 'Envoi en cours...' : 'Envoyer le message'}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}