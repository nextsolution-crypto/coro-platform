'use client';

import { useState } from 'react';

export default function DemoForm({ lang }: { lang: 'fr' | 'en' }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    phone: '',
    buildingType: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const t = {
    fr: {
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Courriel professionnel',
      organization: 'Organisation',
      phone: 'Téléphone (optionnel)',
      buildingType: 'Type de bâtiment',
      buildingTypes: ['Sélectionnez un type', 'Tour à bureaux', 'Bâtiment commercial', 'Site industriel', 'Établissement de santé', 'Institution d\'enseignement', 'Autre'],
      message: 'Décrivez votre besoin (optionnel)',
      submit: 'Envoyer la demande',
      sending: 'Envoi en cours...',
      success: '✅ Demande envoyée ! Nous vous contacterons dans les 24 heures.',
      error: '❌ Une erreur est survenue. Veuillez réessayer ou écrire à info@getcoro.io',
    },
    en: {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Professional email',
      organization: 'Organization',
      phone: 'Phone (optional)',
      buildingType: 'Building type',
      buildingTypes: ['Select a type', 'Office tower', 'Commercial building', 'Industrial site', 'Healthcare facility', 'Educational institution', 'Other'],
      message: 'Describe your needs (optional)',
      submit: 'Send request',
      sending: 'Sending...',
      success: '✅ Request sent! We\'ll contact you within 24 hours.',
      error: '❌ An error occurred. Please try again or email info@getcoro.io',
    },
  }[lang];

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 6,
    border: '1px solid #DEE2E6',
    fontSize: 15,
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('https://formspree.io/f/xnpadzyq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          ...form,
          _subject: `Demande de démo CORO — ${form.organization}`,
        }),
      });
      if (res.ok) {
        setStatus('success');
        setForm({ firstName: '', lastName: '', email: '', organization: '', phone: '', buildingType: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div style={{
        backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF',
        borderRadius: 12, padding: 48, textAlign: 'center',
      }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>🎉</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#27AE60', marginBottom: 8 }}>
          {t.success}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF', borderRadius: 16, padding: 48,
      border: '1px solid #E9ECEF', boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
            {t.firstName} *
          </label>
          <input
            type="text" required value={form.firstName}
            onChange={e => setForm({ ...form, firstName: e.target.value })}
            placeholder="Jean"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C0392B'}
            onBlur={e => e.target.style.borderColor = '#DEE2E6'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
            {t.lastName} *
          </label>
          <input
            type="text" required value={form.lastName}
            onChange={e => setForm({ ...form, lastName: e.target.value })}
            placeholder="Tremblay"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C0392B'}
            onBlur={e => e.target.style.borderColor = '#DEE2E6'}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
          {t.email} *
        </label>
        <input
          type="email" required value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="jean@votrefirme.com"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#C0392B'}
          onBlur={e => e.target.style.borderColor = '#DEE2E6'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
            {t.organization} *
          </label>
          <input
            type="text" required value={form.organization}
            onChange={e => setForm({ ...form, organization: e.target.value })}
            placeholder="Sécurité Conseil inc."
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C0392B'}
            onBlur={e => e.target.style.borderColor = '#DEE2E6'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
            {t.phone}
          </label>
          <input
            type="tel" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="(514) 555-0100"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C0392B'}
            onBlur={e => e.target.style.borderColor = '#DEE2E6'}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
          {t.buildingType}
        </label>
        <select
          value={form.buildingType}
          onChange={e => setForm({ ...form, buildingType: e.target.value })}
          style={{ ...inputStyle, color: form.buildingType ? '#2C3E50' : '#ADB5BD' }}>
          {t.buildingTypes.map(bt => (
            <option key={bt} value={bt === t.buildingTypes[0] ? '' : bt}>
              {bt}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
          {t.message}
        </label>
        <textarea
          value={form.message}
          onChange={e => setForm({ ...form, message: e.target.value })}
          placeholder={lang === 'fr' ? 'Ex: Nous avons 3 bâtiments commerciaux à Montréal...' : 'Ex: We have 3 commercial buildings in Montreal...'}
          rows={4}
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={e => e.target.style.borderColor = '#C0392B'}
          onBlur={e => e.target.style.borderColor = '#DEE2E6'}
        />
      </div>

      {status === 'error' && (
        <div style={{
          backgroundColor: '#FDEDEC', border: '1px solid #F1948A',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 14, color: '#C0392B' }}>{t.error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={status === 'sending'}
        style={{
          width: '100%', padding: '16px 32px',
          backgroundColor: status === 'sending' ? '#ADB5BD' : '#C0392B',
          color: '#FFFFFF', border: 'none', borderRadius: 8,
          fontSize: 16, fontWeight: 700, cursor: status === 'sending' ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={e => { if (status !== 'sending') e.currentTarget.style.backgroundColor = '#A93226'; }}
        onMouseLeave={e => { if (status !== 'sending') e.currentTarget.style.backgroundColor = '#C0392B'; }}>
        {status === 'sending' ? t.sending : t.submit}
      </button>

      <p style={{ textAlign: 'center', fontSize: 13, color: '#ADB5BD', marginTop: 16 }}>
        {lang === 'fr' ? '🔒 Vos informations sont confidentielles et ne seront jamais partagées.' : '🔒 Your information is confidential and will never be shared.'}
      </p>
    </div>
  );
}