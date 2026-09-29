'use client';

import { useEffect, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { localizedHref, type Locale } from '@/lib/site/locale';
import styles from './conversion.module.css';

export type LeadField = 'firstName' | 'lastName' | 'email' | 'organization';
export type LeadFormState = 'default' | 'error' | 'submitting' | 'success' | 'failure';

export const leadFormCopy = {
  fr: {
    demo: 'Démonstration · aucun envoi', required: '* obligatoire', legend: { who: 'Vous', org: 'Organisation', ctx: 'Contexte' },
    firstName: 'Prénom', lastName: 'Nom', email: 'Courriel professionnel', organization: 'Organisation', phone: 'Téléphone', optional: '(optionnel)',
    buildingType: 'Type de bâtiment', buildingTypes: ['Sélectionnez un type', 'Tour à bureaux', 'Bâtiment commercial', 'Site industriel', 'Établissement de santé', 'Institution d’enseignement', 'Autre'],
    message: 'Décrivez votre besoin', help: { email: 'Utilisez l’adresse où vous souhaitez être joint.', message: 'Nombre de bâtiments, contexte, échéance : ce qui nous aide à préparer la démonstration.' },
    referral: 'Référence de recommandation', referralNote: 'En production, cette référence accompagne la demande. Ici, elle est un exemple : rien n’est lu ni envoyé.',
    submit: 'Envoyer la demande', sending: 'Envoi en cours…', sendingStatus: 'Envoi de la demande en cours. Le formulaire est verrouillé jusqu’à la réponse.',
    errorTitle: 'Le formulaire demande votre attention', errorIntro: 'Corrigez les champs suivants pour envoyer la demande :', errorPrefix: 'À corriger :',
    errors: { firstName: 'Entrez votre prénom.', lastName: 'Entrez votre nom.', email: 'Entrez un courriel professionnel valide, par exemple nom@organisation.ca.', organization: 'Entrez le nom de votre organisation.' },
    successTitle: 'Demande prête à être traitée', successText: 'En production, cet écran confirme la réception de la demande et indique la suite. Ici, aucune demande n’a été envoyée.', again: 'Recommencer la démonstration',
    failureTitle: 'La demande n’a pas pu être envoyée', failureText: 'Vos informations sont conservées dans le formulaire. Réessayez, ou écrivez-nous à info@getcoro.io.',
    privacy: 'Vos informations sont utilisées uniquement pour traiter votre demande.', privacyLink: 'Politique de confidentialité',
  },
  en: {
    demo: 'Demonstration · nothing is sent', required: '* required', legend: { who: 'You', org: 'Organization', ctx: 'Context' },
    firstName: 'First name', lastName: 'Last name', email: 'Professional email', organization: 'Organization', phone: 'Phone', optional: '(optional)',
    buildingType: 'Building type', buildingTypes: ['Select a type', 'Office tower', 'Commercial building', 'Industrial site', 'Healthcare facility', 'Educational institution', 'Other'],
    message: 'Describe your needs', help: { email: 'Use the address where you want to be reached.', message: 'Number of buildings, context, timeline: what helps us prepare the demonstration.' },
    referral: 'Referral reference', referralNote: 'In production, this reference travels with the request. Here it is an example: nothing is read or sent.',
    submit: 'Send request', sending: 'Sending…', sendingStatus: 'Sending the request. The form is locked until a response arrives.',
    errorTitle: 'The form needs your attention', errorIntro: 'Fix the following fields to send the request:', errorPrefix: 'To fix:',
    errors: { firstName: 'Enter your first name.', lastName: 'Enter your last name.', email: 'Enter a valid professional email, for example name@organization.ca.', organization: 'Enter your organization name.' },
    successTitle: 'Request ready to be processed', successText: 'In production, this screen confirms the request was received and states what happens next. Here, no request was sent.', again: 'Restart the demonstration',
    failureTitle: 'The request could not be sent', failureText: 'Your information is kept in the form. Try again, or write to us at info@getcoro.io.',
    privacy: 'Your information is used only to process your request.', privacyLink: 'Privacy Policy',
  },
} as const;

const FIELDS = ['firstName', 'lastName', 'email', 'organization'] as const;

/**
 * V2 lead form (LAB-ONLY candidate). It makes NO network request, writes and reads NO cookie and has no `action`: submitting is
 * handled by the parent (`onSubmit`). Referral is a context input only. Production contract to preserve at migration:
 * cookies `coro_referral_code` and `coro_referral_first_touch`, and the existing Formspree destination in app/DemoForm.tsx.
 */
export function LeadForm({ locale, state, errors = {}, referral, defaults, onSubmit, onReset }: {
  locale: Locale; state: LeadFormState; errors?: Partial<Record<LeadField, string>>; referral?: string;
  defaults?: Partial<Record<LeadField | 'phone' | 'message', string>>; onSubmit?: (event: FormEvent<HTMLFormElement>) => void; onReset?: () => void;
}) {
  const t = leadFormCopy[locale];
  const busy = state === 'submitting';
  const summary = useRef<HTMLDivElement>(null);
  // LAB08-009: the error summary takes focus when it appears, so keyboard users land on the list of fields to fix.
  useEffect(() => { if (state === 'error') summary.current?.focus(); }, [state]);
  const invalid = FIELDS.filter((field) => errors[field]);
  const describe = (field: LeadField, help?: boolean) => [errors[field] ? `lf-${field}-error` : '', help ? `lf-${field}-help` : ''].filter(Boolean).join(' ') || undefined;

  if (state === 'success') {
    return (
      <div className={styles.formDone} role="status" lang={locale}>
        <p className={styles.formDemoTag}>{t.demo}</p>
        <p className={styles.formDoneTitle}><span aria-hidden="true">✓</span> {t.successTitle}</p>
        <p>{t.successText}</p>
        {onReset && <button type="button" className={styles.formLink} onClick={onReset}>{t.again}</button>}
      </div>
    );
  }

  const field = (id: LeadField, label: string, props: { type?: string; autoComplete: string; required?: boolean; help?: string }) => (
    <div className={styles.field} data-invalid={errors[id] ? 'true' : undefined}>
      <label htmlFor={`lf-${id}`}>{label}{props.required !== false && <span aria-hidden="true"> *</span>}</label>
      <input id={`lf-${id}`} name={id} type={props.type ?? 'text'} autoComplete={props.autoComplete} required={props.required !== false} aria-required={props.required !== false} aria-invalid={errors[id] ? 'true' : undefined} aria-describedby={describe(id, Boolean(props.help))} defaultValue={defaults?.[id]} disabled={busy} />
      {props.help && <p id={`lf-${id}-help`} className={styles.fieldHelp}>{props.help}</p>}
      {errors[id] && <p id={`lf-${id}-error`} className={styles.fieldError}><span aria-hidden="true">!</span> <span className={styles.srOnly}>{t.errorPrefix} </span>{errors[id]}</p>}
    </div>
  );

  return (
    <form className={styles.form} lang={locale} noValidate aria-busy={busy || undefined} onSubmit={(event) => { event.preventDefault(); onSubmit?.(event); }}>
      <div className={styles.formHead}><p className={styles.formDemoTag}>{t.demo}</p><p className={styles.formRequired}>{t.required}</p></div>

      {state === 'failure' && (
        <div className={styles.formBanner} role="alert" data-kind="failure"><p className={styles.formBannerTitle}><span aria-hidden="true">!</span> {t.failureTitle}</p><p>{t.failureText}</p></div>
      )}
      {state === 'error' && invalid.length > 0 && (
        <div className={styles.formBanner} ref={summary} role="alert" data-kind="error" tabIndex={-1}>
          <p className={styles.formBannerTitle}><span aria-hidden="true">!</span> {t.errorTitle}</p>
          <p>{t.errorIntro}</p>
          <ul>{invalid.map((id) => <li key={id}><a href={`#lf-${id}`}>{t[id]}</a></li>)}</ul>
        </div>
      )}

      <fieldset className={styles.fieldset} disabled={busy}>
        <legend><span aria-hidden="true">01 · </span>{t.legend.who}</legend>
        <div className={styles.fieldRow}>
          {field('firstName', t.firstName, { autoComplete: 'given-name' })}
          {field('lastName', t.lastName, { autoComplete: 'family-name' })}
        </div>
        {field('email', t.email, { type: 'email', autoComplete: 'email', help: t.help.email })}
      </fieldset>

      <fieldset className={styles.fieldset} disabled={busy}>
        <legend><span aria-hidden="true">02 · </span>{t.legend.org}</legend>
        <div className={styles.fieldRow}>
          {field('organization', t.organization, { autoComplete: 'organization' })}
          <div className={styles.field}>
            <label htmlFor="lf-phone">{t.phone} <span className={styles.optional}>{t.optional}</span></label>
            <input id="lf-phone" name="phone" type="tel" autoComplete="tel" defaultValue={defaults?.phone} disabled={busy} />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="lf-buildingType">{t.buildingType} <span className={styles.optional}>{t.optional}</span></label>
          <select id="lf-buildingType" name="buildingType" defaultValue="" disabled={busy}>
            {t.buildingTypes.map((option, index) => <option key={option} value={index === 0 ? '' : option}>{option}</option>)}
          </select>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset} disabled={busy}>
        <legend><span aria-hidden="true">03 · </span>{t.legend.ctx}</legend>
        <div className={styles.field}>
          <label htmlFor="lf-message">{t.message} <span className={styles.optional}>{t.optional}</span></label>
          <textarea id="lf-message" name="message" rows={4} aria-describedby="lf-message-help" defaultValue={defaults?.message} disabled={busy} />
          <p id="lf-message-help" className={styles.fieldHelp}>{t.help.message}</p>
        </div>
      </fieldset>

      {referral && (
        <dl className={styles.referral} data-referral-context>
          <div><dt>{t.referral}</dt><dd>{referral}</dd></div>
          <p>{t.referralNote}</p>
        </dl>
      )}

      <div className={styles.formActions}>
        <button type="submit" className={styles.submit} disabled={busy} aria-disabled={busy}>{busy ? t.sending : t.submit}</button>
        {busy && <p className={styles.formStatus} role="status"><span aria-hidden="true">◐</span> {t.sendingStatus}</p>}
      </div>
      <p className={styles.formPrivacy}>{t.privacy} <Link href={localizedHref('/privacy', locale)}>{t.privacyLink}</Link></p>
    </form>
  );
}
