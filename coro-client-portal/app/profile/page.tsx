'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, clearAuth } from '../store/auth';
import PortalLayout from '../components/PortalLayout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export default function ProfilePage() {
  const router = useRouter();
  const user = getUser();

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
  }, []);

  const handleChangePassword = async () => {
    setError('');
    if (passwordForm.newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('coro_client_token');
      const res = await fetch(`${API_URL}/client-auth/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: passwordForm.newPassword }),
      });
      if (!res.ok) throw new Error('Erreur');
      setSaved(true);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erreur lors du changement de mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!user) return null;

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 6,
    border: '1px solid #DEE2E6', fontSize: 15, color: '#2C3E50',
    backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <PortalLayout>
      <div style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Compte
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50' }}>Mon profil</h1>
        </div>

        {/* Infos */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF',
          padding: 32, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', backgroundColor: '#C0392B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontSize: 20, fontWeight: 700,
            }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#2C3E50' }}>
                {user.firstName} {user.lastName}
              </p>
              <p style={{ fontSize: 14, color: '#6C757D' }}>{user.email}</p>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                backgroundColor: '#EBF5FB', color: '#2980B9', marginTop: 4, display: 'inline-block',
              }}>
                {user.role === 'CLIENT_CORPORATE' ? 'Équipe corporative' : 'Gestionnaire'}
              </span>
            </div>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#F8F9FA', borderRadius: 8 }}>
            <p style={{ fontSize: 12, color: '#ADB5BD', marginBottom: 4 }}>Organisation cliente</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#2C3E50' }}>{user.clientName}</p>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF',
          padding: 32, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2C3E50', marginBottom: 20 }}>
            Changer le mot de passe
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Minimum 8 caractères"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#DEE2E6'}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Répéter le nouveau mot de passe"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#DEE2E6'}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#FDEDEC', border: '1px solid #F1948A',
              borderRadius: 6, padding: '10px 14px', marginBottom: 16,
            }}>
              <p style={{ fontSize: 13, color: '#C0392B' }}>{error}</p>
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={saving || !passwordForm.newPassword}
            style={{
              padding: '12px 24px', borderRadius: 6,
              backgroundColor: saved ? '#27AE60' : saving ? '#ADB5BD' : '#C0392B',
              color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
            {saving ? 'Sauvegarde...' : saved ? '✓ Mot de passe modifié' : 'Changer le mot de passe'}
          </button>
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '14px', borderRadius: 8,
            border: '1px solid #F1948A', backgroundColor: 'transparent',
            color: '#C0392B', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          Déconnexion
        </button>
      </div>
    </PortalLayout>
  );
}