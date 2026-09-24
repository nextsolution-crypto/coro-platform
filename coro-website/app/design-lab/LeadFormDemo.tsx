'use client';

import { useEffect, useRef, useState } from 'react';
import { LeadForm, leadFormCopy, type LeadField, type LeadFormState } from '@/components/conversion/LeadForm';
import type { Locale } from '@/lib/site/locale';
import styles from './design-lab.module.css';

type Preset = 'default' | 'focus' | 'error' | 'submitting' | 'success' | 'failure';

/**
 * LAB-ONLY controller for the LeadForm states. No network request, no cookie, no storage: the send button validates
 * locally and simulates a short "submitting" state with a timer, then shows the success state.
 */
export function LeadFormDemo({ locale, controls, states, referral }: { locale: Locale; controls: string; states: readonly (readonly [Preset, string])[]; referral: string }) {
  const t = leadFormCopy[locale];
  const [preset, setPreset] = useState<Preset>('default');
  const [nonce, setNonce] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<LeadField, string>>>({});
  const [values, setValues] = useState<Partial<Record<LeadField | 'phone' | 'message', string>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const filled = { firstName: 'Camille', lastName: 'Tremblay', email: 'camille@exemple.ca', organization: 'Organisation d’exemple', phone: '', message: '' };
  const apply = (next: Preset) => {
    if (timer.current) clearTimeout(timer.current);
    setPreset(next); setNonce((n) => n + 1);
    setValues(next === 'submitting' || next === 'failure' ? filled : next === 'error' ? { lastName: filled.lastName } : {});
    if (next === 'error') setErrors({ firstName: t.errors.firstName, email: t.errors.email, organization: t.errors.organization }); else setErrors({});
    if (next === 'focus') requestAnimationFrame(() => document.getElementById('lf-firstName')?.focus());
  };

  const state: LeadFormState = preset === 'focus' ? 'default' : preset;
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    const next: Partial<Record<LeadField, string>> = {};
    setValues({ firstName: String(data.get('firstName') ?? ''), lastName: String(data.get('lastName') ?? ''), email: String(data.get('email') ?? ''), organization: String(data.get('organization') ?? ''), phone: String(data.get('phone') ?? ''), message: String(data.get('message') ?? '') });
    if (!String(data.get('firstName') ?? '').trim()) next.firstName = t.errors.firstName;
    if (!String(data.get('lastName') ?? '').trim()) next.lastName = t.errors.lastName;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get('email') ?? '').trim())) next.email = t.errors.email;
    if (!String(data.get('organization') ?? '').trim()) next.organization = t.errors.organization;
    if (Object.keys(next).length) { setErrors(next); setPreset('error'); return; }
    setErrors({}); setPreset('submitting');
    timer.current = setTimeout(() => setPreset('success'), 1400);
  };

  return (
    <div className={styles.leadDemo}>
      <div role="group" aria-label={controls} className={styles.leadControls}>
        <p className={styles.label}>{controls}</p>
        <div>{states.map(([key, label]) => <button key={key} type="button" aria-pressed={preset === key} onClick={() => apply(key)}>{label}</button>)}</div>
      </div>
      <LeadForm key={`${preset}-${nonce}`} locale={locale} state={state} errors={errors} referral={referral} defaults={values} onSubmit={submit} onReset={() => apply('default')} />
    </div>
  );
}
