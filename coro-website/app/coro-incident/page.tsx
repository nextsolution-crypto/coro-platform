import type { Metadata } from 'next';
import { CTASection } from '@/components/conversion/CTASection';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
import { MediaFrame } from '@/components/page/MediaFrame';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { V2Shell } from '@/components/site/V2Shell';
import { Button } from '@/components/ui/Button';
import { faqJsonLd } from '@/lib/site/json-ld';
import { localeFromSearchParams, localizedHref, resolveAvailableLocale } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /coro-incident (MIG-03D) — NEW page (no V1 existed). What happens when an event becomes an active incident in CORO.
 * Product truth authority: docs/website-v2/05-migration/MIG-03D-INCIDENT-AUDIT.md. LANGUAGE: FR ONLY (englishAvailable={false}).
 * VERIFIED and used: 15 incident types each linked to a procedure; occupancy and emergency-team snapshots taken at activation; coordinator tasks;
 * email, and SMS only with consent (no voice, no app notification); timestamped journal with manual notes; contained / resolved states; PDF report;
 * REX (4 free-text fields); corrective actions module; exercise mode; simultaneous incidents; an intervention link valid only while the incident is active.
 * NOT published: fire-panel bridge (PARTIAL), 911 or dispatch integration, a "QR Intervention" claim (the QR workflow is not verified),
 * a link validity duration or manual revocation (none exists), internal procedure codes, standards or compliance, retention, timestamps.
 * PROOF: only the intervention sheet (PUBLICATION-BLOCKER: visible address; SANITIZE OR RECAPTURE BEFORE GO-LIVE). No Incident dashboard is fabricated.
 * The hero is a MARKETING ILLUSTRATION (decorative, alt="").
 */
const LOGIN = 'https://client.getcoro.io/login';

const copy = {
  metaTitle: 'Gestion d’incident : activation, chronologie et rapport',
  description: 'CORO Incident relie le déclenchement, la mobilisation de l’équipe d’urgence, le journal horodaté, l’information pour les intervenants et le rapport d’incident.',
  label: 'CORO Incident',
  lines: ['Quand l’incident commence,', 'chaque action compte.'],
  lead: 'Quand un événement devient un incident actif, CORO fige le contexte, mobilise l’équipe, tient la chronologie, donne aux intervenants l’information utile et conserve le rapport.',
  demo: 'Demander une démonstration', access: 'Accéder à CORO Client',
  types: ['Fumée', 'Alerte incendie', 'Alarme incendie', 'Fuite de gaz', 'Menace active', 'Urgence médicale', 'Gaz toxique', 'Colis suspect', 'Coupure de courant', 'Matières dangereuses', 'Alerte à la bombe', 'Batterie au lithium', 'Inondation', 'Vents violents', 'Autre situation'],
  s1: { n: '01', label: 'Un événement devient un incident', title: 'Un type d’incident, une procédure.', text: 'Un utilisateur autorisé déclenche l’incident en choisissant son type. Chacun des 15 types est relié à une procédure : les étapes du coordonnateur sont capturées au déclenchement.' },
  s2: { n: '02', label: 'Le contexte est figé au déclenchement', title: 'Qui est là et qui peut agir, à cet instant.', text: 'Au déclenchement, CORO enregistre la liste des personnes inscrites comme présentes dans le registre Sentinelle et l’équipe d’urgence mobilisable du bâtiment, avec ses rôles. Cette photo reste dans le dossier de l’incident.', sent: 'En savoir plus sur CORO Sentinelle' },
  s3: { n: '03', label: 'Mobiliser et agir', title: 'Chacun reçoit sa tâche.', text: 'Le coordonnateur dispose des étapes de la procédure, à cocher au fil de l’intervention. Les membres de l’équipe mobilisable reçoivent leur tâche et confirment leur prise en charge.',
    items: ['Courriel aux personnes désignées', 'SMS, seulement pour les personnes qui ont donné leur consentement', 'Une liste de tâches par rôle, avec un suivi de l’avancement'] },
  s4: { n: '04', label: 'Chaque action alimente la chronologie', title: 'Une chronologie, du premier signal au retour d’expérience.', lead: 'Chaque étape laisse une trace dans le dossier de l’incident.' },
  steps: [
    ['Activation', 'Un utilisateur autorisé déclenche l’incident; son type et sa procédure liée sont enregistrés.'],
    ['Mobilisation', 'L’équipe d’urgence mobilisable est avisée et reçoit ses tâches.'],
    ['Action', 'Le coordonnateur coche les étapes de la procédure; les membres confirment leur prise en charge.'],
    ['Mise à jour', 'Des notes s’ajoutent au journal, avec l’heure et l’auteur; l’incident peut être marqué comme contenu.'],
    ['Clôture', 'L’incident est résolu, avec ses notes de clôture.'],
    ['Rapport', 'Un rapport PDF reprend l’identification, la chronologie, les occupants au déclenchement, la procédure et le retour d’expérience.'],
    ['Retour d’expérience', 'L’organisation consigne ce qui a fonctionné, ce qu’il faut améliorer et ses recommandations.'],
  ] as const,
  s5: { n: '05', label: 'L’information utile à l’intervention', title: 'Un lien d’intervention sécurisé.', text: 'À chaque incident correspond un lien d’intervention sécurisé, qui ne demande aucun compte. Il donne accès à l’information essentielle sur le bâtiment et sur l’incident. Il n’est valide que tant que l’incident est actif, et les consultations sont comptées.',
    items: ['Peut être envoyé par courriel aux destinataires choisis', 'Cesse de fonctionner quand l’incident n’est plus actif'],
    alt: 'Fiche d’intervention CORO (interface en français) : point de rassemblement, accès, protection incendie, matières dangereuses, coupures d’utilités et personnes nécessitant une assistance.',
    cartouche: ['CORO Incident · Fiche d’intervention', 'Information pour les intervenants', 'Capture d’écran'] as const,
    panLabel: 'Capture d’écran, défilable horizontalement', onScreen: 'Sur cet écran',
    legend: ['Point de rassemblement', 'Accès', 'Protection incendie', 'Matières dangereuses', 'Coupures d’utilités', 'Personnes nécessitant une assistance'] },
  s6: { n: '06', label: 'Clôturer et rapporter', title: 'Le rapport garde la trace de ce qui s’est passé.', text: 'Une fois l’incident résolu, un rapport PDF se génère depuis son dossier. Il reprend l’identification, la chronologie horodatée, les occupants au déclenchement, l’équipe mobilisée, le déroulement de la procédure et le retour d’expérience.' },
  s7: { n: '07', label: 'Apprendre et corriger', title: 'Le rapport dit ce qui s’est passé. Le retour d’expérience dit ce qui change.',
    text: 'Le retour d’expérience est un formulaire du dossier de l’incident. Les actions correctives peuvent ensuite être suivies : responsable, échéance et statut.',
    rex: ['Ce qui a bien fonctionné', 'Points à améliorer', 'Recommandations', 'Actions correctives proposées'], rexLabel: 'Les quatre rubriques du retour d’expérience' },
  extra: [
    { title: 'Mode exercice', text: 'Un exercice se déclenche comme un incident, mais ses messages sont préfixés [EXERCICE] et les occupants ne sont pas avisés. L’équipe d’urgence, elle, l’est.' },
    { title: 'Incidents simultanés', text: 'Plusieurs incidents peuvent être actifs en même temps, chacun avec son propre journal, ses tâches et son rapport.' },
  ],
  eco: 'Cette partie de la plateforme', explore: 'Explorer',
  links: [
    { name: 'Résilience opérationnelle', text: 'Le cadre organisationnel : l’indice de résilience, l’organisation d’urgence et la boucle de retour d’expérience.', href: '/resilience-operationnelle' },
    { name: 'Sentinelle', text: 'Le registre de présence dont la liste est figée au déclenchement.', href: '/sentinelle' },
  ],
  resources: {
    label: 'Ressources', title: 'Approfondir la préparation à l’incident.',
    items: [
      { title: 'Équipe d’urgence : comment savoir qui est réellement disponible dans le bâtiment ?', text: 'Une équipe complète sur papier ne l’est pas toujours au moment d’intervenir.', href: '/blog/equipe-urgence-disponible-batiment' },
      { title: 'Exercice sur table : comment tester un plan d’urgence sans interrompre les opérations ?', text: 'Répéter les décisions et les communications avant qu’un incident réel ne les demande.', href: '/blog/exercice-sur-table-tester-plan-urgence' },
      { title: 'Comment identifier les lacunes dans son organisation des mesures d’urgence ?', text: 'Repérer les écarts, puis suivre les correctifs qui en découlent.', href: '/blog/identifier-lacunes-organisation-mesures-urgence' },
    ],
  },
  faqTitle: 'Questions fréquentes',
  faq: [
    ['Combien de types d’incidents CORO prend-il en charge?', 'Quinze types, de la fumée à l’inondation, plus une catégorie « autre situation ». Chacun est relié à une procédure.'],
    ['Qui est avisé quand un incident est déclenché?', 'L’équipe d’urgence mobilisable reçoit ses tâches par courriel, et par SMS lorsqu’elle a donné son consentement. Les employés inscrits comme présents peuvent être avisés par courriel, sauf en mode exercice.'],
    ['Un exercice avertit-il les occupants?', 'Non. En mode exercice, les messages sont préfixés [EXERCICE] et seuls l’équipe d’urgence et les responsables sont avisés.'],
    ['Peut-on gérer plusieurs incidents en même temps?', 'Oui. Chaque incident a son propre journal, ses tâches et son rapport.'],
    ['Jusqu’à quand le lien d’intervention fonctionne-t-il?', 'Tant que l’incident est actif. Quand il est résolu ou annulé, le lien n’est plus valide.'],
    ['Le rapport garantit-il la conformité réglementaire?', 'Non. Le rapport documente l’incident; les exigences applicables dépendent de votre organisation et demeurent sous sa responsabilité.'],
  ] as const,
  statement: 'Quand l’incident commence, chaque action compte.',
  support: 'Découvrez comment CORO Incident garde le contexte, la chronologie et l’information utile au même endroit.',
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const requested = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/coro-incident', locale: requested, hasEnglish: false, title: copy.metaTitle, description: copy.description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = resolveAvailableLocale(localeFromSearchParams((await searchParams) ?? {}), false);
  const t = copy;
  const demo = localizedHref('/#demo', l);
  return (
    <V2Shell locale={l} pathname="/coro-incident" englishAvailable={false}>
      <JsonLd value={faqJsonLd(t.faq.map(([q, a]) => ({ question: q, answer: a })))} />

      <EditorialHero id="incident-title" label={t.label} title={t.lines} lead={t.lead}
        photo={{ src: '/website-v2/sentinel/first-responders-arrival.webp', side: 'end', position: '30% 50%', mobilePosition: '30% 50%', coverage: 55, mobileRatio: '16 / 11' }}
        actions={<><Button href={demo} surface="dark">{t.demo}</Button><Button href={LOGIN} variant="ghost" surface="dark" external>{t.access}</Button></>} />

      <PageSection tone="white" labelledBy="incident-s1-title">
        <div className={styles.stack}>
          <MediaFrame src="/website-v2/incident/incident-building.webp" alt="" ratio={1672 / 941} aspect="21 / 9" position="50% 40%" sizes="(min-width: 80rem) 1240px, 100vw" />
          <SplitContent ratio="5-7" align="start"
            text={<EditorialBlock id="incident-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}><p>{t.s1.text}</p></EditorialBlock>}
            media={<ul className={styles.types} aria-label="Types d’incidents">{t.types.map((x) => <li key={x}>{x}</li>)}</ul>} />
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="incident-s2-title">
        <SplitContent ratio="7-5" align="start"
          text={<EditorialBlock id="incident-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p><p><a className={styles.link} href="/sentinelle">{t.s2.sent}<span aria-hidden="true"> →</span></a></p></EditorialBlock>}
          media={<dl className={styles.snap}><div><dt>Personnes inscrites comme présentes</dt><dd>Liste figée</dd></div><div><dt>Équipe d’urgence mobilisable</dt><dd>Rôles inclus</dd></div></dl>} />
      </PageSection>

      <PageSection tone="white" labelledBy="incident-s3-title">
        <SplitContent ratio="4-8" align="start"
          text={<div className={styles.stack}><EditorialBlock id="incident-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading={t.s3.title}><p>{t.s3.text}</p></EditorialBlock><ul className={styles.plain}>{t.s3.items.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          media={<MediaFrame src="/website-v2/incident/incident-command.webp" alt="" ratio={1.5} sizes="(min-width: 68rem) 760px, 100vw" />} />
      </PageSection>

      <PageSection tone="navy" labelledBy="incident-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="incident-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title}><p>{t.s4.lead}</p></EditorialBlock>
          <ol className={styles.timeline}>{t.steps.map(([name, text], i) => <li key={name}><span className={styles.dot} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h3>{name}</h3><p>{text}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="incident-s5-title">
        <SplitContent order="media-text" ratio="5-7" align="start"
          media={<div className={styles.stack}><div className={styles.pan} role="region" tabIndex={0} aria-label={t.s5.panLabel}><MediaFrame kind="technical" src="/alert/fiche_intervention.webp" alt={t.s5.alt} ratio={1} sizes="(min-width: 68rem) 640px, 560px" cartouche={t.s5.cartouche} /></div><div className={styles.legendBlock}><p className={styles.kicker}>{t.s5.onScreen}</p><ul className={styles.legend}>{t.s5.legend.map((x) => <li key={x}>{x}</li>)}</ul></div></div>}
          text={<div className={styles.stack}><EditorialBlock id="incident-s5-title" label={`${t.s5.n} — ${t.s5.label}`} heading={t.s5.title}><p>{t.s5.text}</p></EditorialBlock><ul className={styles.plain}>{t.s5.items.map((x) => <li key={x}>{x}</li>)}</ul></div>} />
      </PageSection>

      <PageSection tone="white" labelledBy="incident-s6-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="incident-s6-title" label={`${t.s6.n} — ${t.s6.label}`} heading={t.s6.title}><p>{t.s6.text}</p></EditorialBlock>}
          media={<p className={styles.statement}>Le rapport est le dossier de l’incident, mis en forme.</p>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="incident-s7-title">
        <div className={styles.stack}>
          <SplitContent ratio="5-7" align="start"
            text={<EditorialBlock id="incident-s7-title" label={`${t.s7.n} — ${t.s7.label}`} heading={t.s7.title}><p>{t.s7.text}</p></EditorialBlock>}
            media={<div className={styles.stack}><p className={styles.kicker}>{t.s7.rexLabel}</p><ol className={styles.rex}>{t.s7.rex.map((x) => <li key={x}>{x}</li>)}</ol></div>} />
          <MediaFrame src="/website-v2/incident/normal-operations.webp" alt="" ratio={1.5} aspect="16 / 9" position="50% 0%" sizes="(min-width: 80rem) 1240px, 100vw" />
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="incident-extra-title">
        <div className={styles.stack}>
          <EditorialBlock id="incident-extra-title" heading="Deux capacités complémentaires." />
          <div className={styles.columns}>{t.extra.map((e) => <section key={e.title}><h3>{e.title}</h3><p>{e.text}</p></section>)}</div>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="incident-eco-title">
        <div className={styles.stack}>
          <EditorialBlock id="incident-eco-title" label={t.eco} heading="Incident, dans la plateforme." />
          <ul className={styles.connect}>{t.links.map((c) => <li key={c.name}><h3>{c.name}</h3><p>{c.text}</p><a href={localizedHref(c.href, l)} aria-label={`${t.explore} ${c.name}`}>{t.explore}<span aria-hidden="true"> →</span></a></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="incident-res-title">
        <div className={styles.stack}>
          <EditorialBlock id="incident-res-title" label={t.resources.label} heading={t.resources.title} />
          <ul className={styles.resources}>{t.resources.items.map((r) => <li key={r.href}><h3><a href={localizedHref(r.href, l)}>{r.title}</a></h3><p>{r.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="incident-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="incident-faq-title" label="FAQ" heading={t.faqTitle} />
          <Accordion label={t.faqTitle} items={t.faq.map(([q, a], i) => ({ id: `faq-${i}`, question: q, answer: a }))} />
        </div>
      </PageSection>

      <CTASection id="incident-cta-title" tone="dark" label={t.label} statement={t.statement} support={t.support} primary={{ label: t.demo, href: demo }} secondary={{ label: t.access, href: LOGIN }} />
    </V2Shell>
  );
}
