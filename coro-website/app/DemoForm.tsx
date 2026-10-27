'use client';

import { useId, useState } from 'react';
import type { DiagnosticCommercialSummary } from '@/lib/diagnostic/commercial';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${name}=`;

  const cookie = document.cookie
    .split('; ')
    .find(item => item.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.substring(prefix.length));
}

type DemoFormProps = {
  lang: 'fr' | 'en';
  variant?: 'demo' | 'diagnostic';
  diagnosticSummary?: DiagnosticCommercialSummary;
};

export default function DemoForm({ lang, variant = 'demo', diagnosticSummary }: DemoFormProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    phone: '',
    buildingType: '',
    buildingCount: '',
    requestType: variant === 'diagnostic' ? 'DETAILED_ASSESSMENT' : '',
    message: '',
  });
  const [includeDiagnosticSummary, setIncludeDiagnosticSummary] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const uid = useId();

  const t = {
    fr: {
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Courriel professionnel',
      organization: 'Organisation',
      phone: 'Téléphone (optionnel)',
      buildingType: 'Type de bâtiment',
      buildingTypes: ['Sélectionnez un type', 'Tour à bureaux', 'Bâtiment commercial', 'Site industriel', 'Établissement de santé', 'Institution d\'enseignement', 'Autre'],
      buildingCount: 'Nombre approximatif de bâtiments (optionnel)',
      requestType: 'Type de demande',
      requestTypes: [['DETAILED_ASSESSMENT', 'Évaluation approfondie'], ['DEMO', 'Démonstration CORO']],
      includeSummary: 'Joindre à ma demande un résumé de mon diagnostic.',
      diagnosticPrivacy: 'Cette demande transmet vos coordonnées à Formspree, le service commercial utilisé par CORO. Elle ne vous inscrit pas à des communications marketing.',
      message: 'Décrivez votre besoin (optionnel)',
      submit: 'Envoyer la demande',
      sending: 'Envoi en cours...',
      success: '✅ Merci. Votre demande a bien été transmise. Notre équipe communiquera avec vous pour discuter de vos besoins.',
      error: '❌ Une erreur est survenue. Veuillez réessayer ou écrire à info@getcoro.io',
privacy:
  'Vos informations sont utilisées uniquement pour traiter votre demande.',
privacyLink: 'Politique de confidentialité',
    },
    en: {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Professional email',
      organization: 'Organization',
      phone: 'Phone (optional)',
      buildingType: 'Building type',
      buildingTypes: ['Select a type', 'Office tower', 'Commercial building', 'Industrial site', 'Healthcare facility', 'Educational institution', 'Other'],
      buildingCount: 'Approximate number of buildings (optional)',
      requestType: 'Request type',
      requestTypes: [['DETAILED_ASSESSMENT', 'In-depth assessment'], ['DEMO', 'CORO demonstration']],
      includeSummary: 'Attach a summary of my diagnostic to my request.',
      diagnosticPrivacy: 'This request sends your contact information to Formspree, the commercial service used by CORO. It does not subscribe you to marketing communications.',
      message: 'Describe your needs (optional)',
      submit: 'Send request',
      sending: 'Sending...',
      success: '✅ Thank you. Your request has been submitted. Our team will contact you to discuss your needs.',
      error: '❌ An error occurred. Please try again or email info@getcoro.io',
privacy:
  'Your information is used only to process your request.',
privacyLink: 'Privacy Policy',
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
    const referralCode =
      getCookie('coro_referral_code');

    const referralFirstTouchAt =
      getCookie('coro_referral_first_touch');

    const res = await fetch(
      'https://formspree.io/f/xnpadzyq',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...(variant === 'diagnostic' ? {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            organization: form.organization,
            buildingCount: form.buildingCount,
            requestType: form.requestType,
            message: form.message,
          } : form),
          ...(variant === 'diagnostic' && includeDiagnosticSummary && diagnosticSummary ? diagnosticSummary : {}),

          referralCode:
            referralCode ?? '',

          referralFirstTouchAt:
            referralFirstTouchAt ?? '',

          referralSource:
            referralCode ? 'LINK' : '',

          _subject: variant === 'diagnostic' ? `Diagnostic Express CORO — ${form.organization}` : `Demande de démo CORO — ${form.organization}`,
        }),
      }
    );

    if (res.ok) {
      setStatus('success');

      setForm({
        firstName: '',
        lastName: '',
        email: '',
        organization: '',
        phone: '',
        buildingType: '',
        buildingCount: '',
        requestType: variant === 'diagnostic' ? 'DETAILED_ASSESSMENT' : '',
        message: '',
      });
      setIncludeDiagnosticSummary(false);
    } else {
      setStatus('error');
    }
  } catch {
    setStatus('error');
  }
};

  if (status === 'success') {
    return (
      <div className="coro-demo-form-success" role="status">
        <p style={{ fontSize: 48, marginBottom: 16 }}>🎉</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#27AE60', marginBottom: 8 }}>
          {t.success}
        </p>
      </div>
    );
  }

  return (
    <form className="coro-demo-form-body" onSubmit={handleSubmit}>
      <div className="coro-demo-form-row">
        <div>
          <label htmlFor={`${uid}-0`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
            {t.firstName} *
          </label>
          <input
            id={`${uid}-0`}
            type="text" required value={form.firstName}
            onChange={e => setForm({ ...form, firstName: e.target.value })}
            placeholder="Jean"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C0392B'}
            onBlur={e => e.target.style.borderColor = '#DEE2E6'}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-1`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
            {t.lastName} *
          </label>
          <input
            id={`${uid}-1`}
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
        <label htmlFor={`${uid}-2`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
          {t.email} *
        </label>
        <input
            id={`${uid}-2`}
          type="email" required value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="jean@votrefirme.com"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = '#C0392B'}
          onBlur={e => e.target.style.borderColor = '#DEE2E6'}
        />
      </div>

      <div className="coro-demo-form-row">
        <div style={variant === 'diagnostic' ? { gridColumn: '1 / -1' } : undefined}>
          <label htmlFor={`${uid}-3`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
            {t.organization} *
          </label>
          <input
            id={`${uid}-3`}
            type="text" required value={form.organization}
            onChange={e => setForm({ ...form, organization: e.target.value })}
            placeholder="Sécurité Conseil inc."
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C0392B'}
            onBlur={e => e.target.style.borderColor = '#DEE2E6'}
          />
        </div>
        {variant === 'demo' && <div>
          <label htmlFor={`${uid}-4`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
            {t.phone}
          </label>
          <input
            id={`${uid}-4`}
            type="tel" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="(514) 555-0100"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#C0392B'}
            onBlur={e => e.target.style.borderColor = '#DEE2E6'}
          />
        </div>}
      </div>

      {variant === 'demo' ? <div style={{ marginBottom: 16 }}>
        <label htmlFor={`${uid}-5`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
          {t.buildingType}
        </label>
        <select
            id={`${uid}-5`}
          value={form.buildingType}
          onChange={e => setForm({ ...form, buildingType: e.target.value })}
          style={{ ...inputStyle, color: form.buildingType ? '#2C3E50' : '#ADB5BD' }}>
          {t.buildingTypes.map(bt => (
            <option key={bt} value={bt === t.buildingTypes[0] ? '' : bt}>
              {bt}
            </option>
          ))}
        </select>
      </div> : <div className="coro-demo-form-row">
        <div>
          <label htmlFor={`${uid}-7`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>{t.buildingCount}</label>
          <input id={`${uid}-7`} type="number" min="1" inputMode="numeric" value={form.buildingCount} onChange={e => setForm({ ...form, buildingCount: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label htmlFor={`${uid}-8`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>{t.requestType} *</label>
          <select id={`${uid}-8`} required value={form.requestType} onChange={e => setForm({ ...form, requestType: e.target.value })} style={inputStyle}>
            {t.requestTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>}

      <div style={{ marginBottom: 32 }}>
        <label htmlFor={`${uid}-6`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
          {t.message}
        </label>
        <textarea
            id={`${uid}-6`}
          value={form.message}
          onChange={e => setForm({ ...form, message: e.target.value })}
          placeholder={lang === 'fr' ? 'Ex: Nous avons 3 bâtiments commerciaux à Montréal...' : 'Ex: We have 3 commercial buildings in Montreal...'}
          rows={4}
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={e => e.target.style.borderColor = '#C0392B'}
          onBlur={e => e.target.style.borderColor = '#DEE2E6'}
        />
      </div>

      {variant === 'diagnostic' && diagnosticSummary && <label htmlFor={`${uid}-9`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, color: '#2C3E50', fontSize: 14, lineHeight: 1.5 }}>
        <input id={`${uid}-9`} type="checkbox" checked={includeDiagnosticSummary} onChange={e => setIncludeDiagnosticSummary(e.target.checked)} style={{ marginTop: 3, inlineSize: 18, blockSize: 18 }} />
        <span>{t.includeSummary}</span>
      </label>}

      {variant === 'diagnostic' && <p style={{ fontSize: 13, color: '#6C757D', lineHeight: 1.6, margin: '0 0 16px' }}>{t.diagnosticPrivacy}</p>}

      {status === 'error' && (
        <div role="alert" style={{
          backgroundColor: '#FDEDEC', border: '1px solid #F1948A',
          borderRadius: 8, padding: '12px 16px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 14, color: '#C0392B' }}>{t.error}</p>
        </div>
      )}

      <button
        type="submit"
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

      <p
  style={{
    textAlign: 'center',
    fontSize: 13,
    color: '#6C757D',
    marginTop: 16,
    lineHeight: 1.6,
  }}
>
  🔒 {t.privacy}{' '}
  <a
    href={lang === 'fr' ? '/privacy' : '/privacy?lang=en'}
    style={{
      color: '#495057',
      fontWeight: 600,
      textDecoration: 'underline',
    }}
  >
    {t.privacyLink}
  </a>
</p>
    </form>
  );
}
