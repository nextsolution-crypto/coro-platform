'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft, Save } from 'lucide-react';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    title: '', phoneDirect: '', phoneMobile: '', certification: '', province: 'Quebec',
  });

  useEffect(() => { initAuth(); }, []);
  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const res = await api.get('/users/me');
      setForm({
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
        email: res.data.email || '',
        title: res.data.title || '',
        phoneDirect: res.data.phoneDirect || '',
        phoneMobile: res.data.phoneMobile || '',
        certification: res.data.certification || '',
        province: res.data.province || 'Quebec',
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/me', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (passwordForm.newPass.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/users/me/password', { currentPassword: passwordForm.current, newPassword: passwordForm.newPass });
      setPasswordSuccess(true);
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Mot de passe actuel incorrect.');
    } finally { setChangingPassword(false); }
  };

  const inputStyle = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-24"><p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <button onClick={() => router.push('/settings')}
            className="flex items-center gap-2 text-sm mb-3 transition-colors" style={{ color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
            onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
            <ArrowLeft size={16} /> Retour aux paramètres
          </button>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>Mon profil</h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>Vos informations personnelles et professionnelles</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded"
          style={{ backgroundColor: saved ? '#27AE60' : '#C0392B' }}
          onMouseEnter={e => { if (!saved) e.currentTarget.style.backgroundColor = '#A93226'; }}
          onMouseLeave={e => { if (!saved) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
          <Save size={15} />
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Identité */}
        <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Identité</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Prénom</label>
                <input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Nom</label>
                <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Courriel</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
          </div>
        </div>

        {/* Informations professionnelles */}
        <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Informations professionnelles</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Titre / Fonction</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Conseiller en sécurité incendie"
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Téléphone direct</label>
                <input type="text" value={form.phoneDirect} onChange={e => setForm({ ...form, phoneDirect: e.target.value })}
                  placeholder="514-555-1234"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Cellulaire</label>
                <input type="text" value={form.phoneMobile} onChange={e => setForm({ ...form, phoneMobile: e.target.value })}
                  placeholder="514-555-5678"
                  className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Numéro de certification</label>
              <input type="text" value={form.certification} onChange={e => setForm({ ...form, certification: e.target.value })}
                placeholder="Ex: CFAA-12345"
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Province principale</label>
              <select value={form.province} onChange={e => setForm({ ...form, province: e.target.value })}
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                <option value="Quebec">Québec</option>
                <option value="Ontario">Ontario</option>
                <option value="Alberta">Alberta</option>
              </select>
            </div>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div className="rounded-md p-6 lg:col-span-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Changer le mot de passe</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Mot de passe actuel</label>
              <input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Nouveau mot de passe</label>
              <input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>Confirmer</label>
              <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#CED4DA'} />
            </div>
          </div>
          {passwordError && <p className="text-sm mt-2" style={{ color: '#C0392B' }}>{passwordError}</p>}
          {passwordSuccess && <p className="text-sm mt-2" style={{ color: '#27AE60' }}>✓ Mot de passe mis à jour !</p>}
          <button onClick={handleChangePassword} disabled={changingPassword || !passwordForm.current || !passwordForm.newPass}
            className="mt-4 text-sm font-medium px-4 py-2 rounded transition-colors"
            style={{ backgroundColor: '#2C3E50', color: '#FFFFFF' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1A252F'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2C3E50'}>
            {changingPassword ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}