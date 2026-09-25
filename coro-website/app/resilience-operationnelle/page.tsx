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
import { localeFromSearchParams, localizedHref, type Locale } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /resilience-operationnelle (MIG-03A) — the organisational level: understand, prepare, coordinate, act, recover, improve.
 * Family: resilience & operations (bridge between documentation and operations). NOT Sentinelle, NOT Incident, NOT a dashboard.
 * PRODUCT TRUTH (audited in coro-backend/src/occupancy, reminders and coro-client-portal): the resilience index (4 weighted components 40/20/25/15),
 * emergency roles with primary/alternate members and an effective organisation, the occupancy register (QR + PIN), incident triggering with
 * SMS (consent only) and email, exercise mode, incident report and REX, organisational recommendations and corrective actions exist in code.
 * NOT claimed: compliance with, or certification to, ISO 22301 / CNPI / CNESST / NFPA / CCOHS (ISO 22301 is a management-system standard, certifiable
 * at organisation level; a report cannot be "compliant"), fixed retention periods, "the only platform", real-time wording, voice calls or app pushes
 * (shown in an old screenshot, absent from the current UI), email alerts on gaps (only an in-app notification is verified), Network, Campus, Knowledge, AI, Ops.
 * The continuum component is not used: its nine captioned stages would need capabilities the product does not evidence (Anticiper, Protéger) and
 * About already carries it; the published seven-step loop is a verified product chain and is used instead.
 * PRODUCT PROOF: V1 screenshots kept after the asset audit: the emergency-organisation form and the alert email (data provenance:
 * PUBLICATION-BLOCKER — RESILIENCE SCREENSHOT DATA PROVENANCE). Every other V1 image is omitted with a written reason (see tests and the migration report).
 * The hero photograph is a MARKETING ILLUSTRATION (decorative, alt=""): any interface, figure or text inside it is illustrative, never proof.
 */
const LOGIN = 'https://client.getcoro.io/login';

const copy = {
  fr: {
    metaTitle: 'Résilience opérationnelle : préparer, agir, rétablir, améliorer',
    description: 'CORO relie les plans d’urgence approuvés à la présence réelle dans le bâtiment : indice de résilience, organisation d’urgence, gestion d’incidents et retour d’expérience.',
    label: 'Résilience opérationnelle',
    lines: ['Vos plans d’urgence ne valent rien', 's’ils ne reflètent pas la réalité du terrain.'],
    lead: 'CORO relie le plan d’urgence approuvé à la présence réelle dans le bâtiment, l’indice de résilience au déclenchement d’un incident, et le rapport d’incident au retour d’expérience qui améliore le plan.',
    detail: 'De la présence réelle à la mobilisation d’urgence',
    demo: 'Demander une démonstration', access: 'Accéder à CORO Client',
    defLabel: 'Le niveau supérieur', defTitle: 'Comprendre, préparer, coordonner, agir, rétablir, améliorer.',
    defText: 'La résilience opérationnelle décrit la capacité d’une organisation à comprendre sa situation, à se préparer, à coordonner ses ressources, à agir, à rétablir ses activités et à s’améliorer. CORO relie la documentation d’urgence à ce qui se passe réellement dans le bâtiment.',
    bridge: ['Documentation et préparation', 'Opérations, intervention et apprentissage'],
    loopLabel: 'La boucle complète', loopTitle: 'Du plan à l’incident. De l’incident au plan amélioré.',
    loopText: 'CORO connecte la production documentaire à l’opérationnel de terrain et referme la boucle grâce au retour d’expérience : ce que chaque incident enseigne peut améliorer le plan.',
    loopGroups: [
      { name: 'Avant l’événement', steps: ['PMU approuvé dans CORO', 'Sentinelle — présence réelle', 'Indice de résilience'] },
      { name: 'Pendant', steps: ['Incident déclenché', 'Procédure et mobilisation'] },
      { name: 'Après', steps: ['Rapport et retour d’expérience', 'PMU mis à jour et approuvé'] },
    ],
    proofTitle: 'Une plateforme qui sait qui est là et ce qu’il peut faire',
    highlights: [
      { title: 'Présence réelle', text: 'Le pointage par QR code et PIN indique qui est dans le bâtiment.' },
      { title: 'Indice CORO', text: '4 composantes pondérées : rôles, qualifications, plans, exercices.' },
      { title: 'Module Incident', text: 'Procédure du coordonnateur, mobilisation, journal et rapport.' },
      { title: 'Boucle REX', text: 'Après l’incident : retour d’expérience, recommandations et actions correctives pour améliorer le plan.' },
    ],
    dimLabel: 'Trois dimensions opérationnelles', dimTitle: 'Présence, intervention, exercice',
    dims: [
      { kicker: 'Présence', name: 'CORO Sentinelle', text: 'Sentinelle indique qui est présent dans le bâtiment et quelles ressources peuvent être mobilisées si une urgence survient.',
        items: ['Registre d’occupation', 'Pointage par QR code et PIN personnel', 'Entrées et sorties horodatées'], link: 'En savoir plus sur CORO Sentinelle' },
      { kicker: 'Intervention', name: 'Module Incident', text: 'Lorsqu’un incident survient, CORO utilise la présence pour identifier l’équipe d’urgence présente, notifier les contacts désignés et transmettre l’essentiel pour agir.',
        items: ['Membres présents identifiés au déclenchement', 'Courriel et SMS aux contacts désignés (SMS avec consentement)', 'Journal chronologique horodaté'], link: '' },
      { kicker: 'Préparation', name: 'Exercices', text: 'Le mode exercice distingue un exercice d’un incident réel, et le dernier exercice d’évacuation compte dans l’indice CORO.',
        items: ['Messages préfixés [EXERCICE]', 'Occupants non notifiés'], link: '' },
    ],
    indexLabel: 'Indice CORO de résilience', indexTitle: 'Un score pondéré qui répond à une question simple : sommes-nous vraiment prêts?',
    indexText: 'L’indice CORO de résilience opérationnelle calcule la capacité d’intervention actuelle du bâtiment, pas sa capacité théorique. Il combine quatre composantes pondérées et se recalcule à partir des présences et des données à jour.',
    components: [
      { label: 'Couverture des rôles', weight: '40 %', desc: 'Coordonnateur, EPI, secouristes, accompagnateurs PNA : présents ou absents?' },
      { label: 'Qualifications', weight: '20 %', desc: 'RCR/DEA, extincteur, EPI, matières dangereuses : qui peut agir?' },
      { label: 'Plans approuvés', weight: '25 %', desc: 'PMU ou PSI validé et à jour dans CORO.' },
      { label: 'Exercices', weight: '15 %', desc: 'Dernier exercice d’évacuation de moins de 12 mois.' },
    ],
    componentsLabel: 'Les quatre composantes de l’indice',
    orgLabel: 'Organisation d’urgence dynamique', orgTitle: 'Le coordonnateur titulaire sort du bâtiment. Le substitut prend le relais.',
    orgText: 'Chaque membre de l’équipe d’urgence est configuré avec son rôle, son type (titulaire ou substitut) et sa priorité. Quand la composition de l’équipe présente change, CORO recalcule l’organisation d’urgence effective.',
    orgItems: ['Rôles : coordonnateur, EPI, responsable du rassemblement, chercheur, surveillant de sortie, accompagnateur PNA, secouriste', 'Titulaires et substituts configurés par rôle et par bâtiment', 'Substitution visible sur le tableau de résilience', 'Lacune signalée si aucun coordonnateur ou secouriste n’est présent', 'Qualifications par membre : RCR/DEA, extincteur, EPI, matières dangereuses'],
    orgAlt: 'Formulaire d’un employé dans CORO Sentinelle (interface en français) : identité, consentement aux notifications SMS, rôle principal, type titulaire ou substitut, secteur et qualifications.',
    orgCartouche: ['CORO Sentinelle · Organisation d’urgence', 'Rôle, type et qualifications', 'Capture d’écran'] as const,
    orgLegend: ['Rôle principal', 'Titulaire ou substitut', 'Secteur et étage', 'Qualifications', 'Consentement aux notifications SMS'],
    alertLabel: 'Alerte', alertTitle: 'Déclencher. Notifier. Mobiliser. Agir.',
    alertText: 'Une alerte doit être directement exploitable : le destinataire reçoit le type d’incident, le bâtiment, l’adresse et la consigne à transmettre aux services d’urgence.',
    alertAlt: 'Courriel d’alerte panique CORO (exemple en français et en anglais) : type d’incident, bâtiment, adresse, heure de déclenchement et consigne à dire au 911.',
    alertCartouche: ['CORO Sentinelle · Courriel d’alerte', 'Menace active, exemple', 'Exemple de courriel'] as const,
    alertLegend: ['Type d’incident et bâtiment', 'Adresse et heure de déclenchement', 'Consigne à communiquer au 911'],
    panLabel: 'Capture d’écran, défilable horizontalement', onScreen: 'Sur cet écran',
    reportLabel: 'Historique et rapport', reportTitle: 'Chaque incident laisse une trace exploitable',
    reportText: 'L’historique des incidents est conservé dans CORO. Chaque incident produit un rapport PDF structuré en 7 sections, avec le journal chronologique, l’équipe mobilisée et le retour d’expérience.',
    reportItems: [
      { title: 'Retour d’expérience (REX)', text: 'Ce qui a bien fonctionné, points à améliorer, recommandations, actions correctives.' },
      { title: 'Responsabilité de conformité', text: 'Les exigences de conservation et de documentation varient selon l’organisation et la réglementation applicable. CORO fournit la trace; la conformité demeure la responsabilité de l’organisation.' },
    ],
    intelLabel: 'Intelligence organisationnelle', intelTitle: 'Repérer les lacunes avant qu’un incident survienne',
    intelText: 'À partir des quatre composantes de l’indice, CORO génère des recommandations classées par niveau de criticité, avant même qu’une urgence ne se déclare.',
    intelExamples: [['Critique', 'Aucun PMU ou PSI actif associé à ce bâtiment'], ['Critique', 'Aucun coordonnateur d’urgence ou substitut présent'], ['Critique', 'Aucun exercice d’évacuation enregistré'], ['Attention', 'Incidents répétés du même type en 90 jours : récurrence anormale']] as const,
    platform: 'Cette partie de la plateforme', platformTitle: 'Un socle produit relié', platformLead: 'La résilience opérationnelle s’appuie sur les autres parties de CORO : les documents à approuver, les mandats à réaliser, la performance à lire et l’accès du client.', explore: 'Explorer',
    products: [
      { name: 'Documents', text: 'Structure les données et les livrables.', href: '/gestion-documentaire' },
      { name: 'Projects', text: 'Organise les mandats et le travail.', href: '/gestion-de-projets' },
      { name: 'Performance', text: 'Mesure activité, objectifs et capacité.', href: '/performance-objectifs' },
      { name: 'Client', text: 'Rend l’information accessible au client.', href: '/portail-client' },
    ],
    faq: 'FAQ', faqTitle: 'Questions fréquentes',
    faqItems: [
      { q: 'Comment CORO sait-il qui est dans le bâtiment?', a: 'Grâce à CORO Sentinelle : chaque employé dispose d’un PIN personnel et d’un QR code. Il scanne le QR de la borne à l’entrée et entre son PIN. Le système enregistre l’heure et met à jour le registre d’occupation.' },
      { q: 'Que se passe-t-il si le coordonnateur quitte le bâtiment pendant la journée?', a: 'Quand le coordonnateur pointe sa sortie, CORO recalcule l’organisation d’urgence effective à partir des membres présents : le substitut configuré prend le relais. Si aucun coordonnateur ou substitut n’est présent, une lacune critique apparaît dans l’indice et dans les recommandations.' },
      { q: 'Les SMS sont-ils inclus dans CORO?', a: 'Oui. Chaque membre de l’équipe d’urgence ayant donné son consentement explicite reçoit un SMS en plus du courriel lors du déclenchement d’un incident.' },
      { q: 'Peut-on déclencher un exercice sans notifier les vrais occupants?', a: 'Oui. Le mode exercice envoie des courriels et des SMS préfixés [EXERCICE] à l’équipe d’urgence, mais ne notifie pas les occupants.' },
      { q: 'Le rapport d’incident garantit-il la conformité réglementaire?', a: 'Non. Le rapport documente l’incident : chronologie, occupants, équipe mobilisée, procédure suivie et retour d’expérience. Les exigences de conservation et de conformité dépendent de votre organisation et de la réglementation applicable, et demeurent sous votre responsabilité.' },
      { q: 'Le module Incident fonctionne-t-il si plusieurs incidents surviennent simultanément?', a: 'Oui. CORO supporte les incidents simultanés. Chaque incident a son propre journal, sa propre liste de tâches du coordonnateur et son propre rapport, indépendants les uns des autres.' },
    ],
    statement: 'Un plan d’urgence ne vaut que s’il peut être exécuté par les bonnes personnes au bon moment.',
    support: 'Avec CORO, vous voyez si votre bâtiment est prêt à intervenir, qui peut agir maintenant et comment chaque incident améliore la réponse suivante.',
  },
  en: {
    metaTitle: 'Operational resilience: prepare, respond, recover, improve',
    description: 'CORO connects approved emergency plans to real building presence: resilience index, emergency organization, incident management and lessons learned.',
    label: 'Operational resilience',
    lines: ['Your emergency plans are only as good', 'as the people available to execute them.'],
    lead: 'CORO connects the approved emergency plan to real presence in the building, the resilience index to incident activation, and the incident report to the lessons learned that improve the plan.',
    detail: 'From real presence to emergency mobilization',
    demo: 'Request a demonstration', access: 'Access CORO Client',
    defLabel: 'The higher level', defTitle: 'Understand, prepare, coordinate, act, recover, improve.',
    defText: 'Operational resilience describes an organization’s ability to understand its situation, prepare, coordinate its resources, act, recover its activities and improve. CORO connects emergency documentation to what actually happens in the building.',
    bridge: ['Documentation and preparation', 'Operations, response and learning'],
    loopLabel: 'The complete loop', loopTitle: 'From plan to incident. From incident to improved plan.',
    loopText: 'CORO connects document production to field operations and closes the loop through lessons learned: what each incident teaches can improve the plan.',
    loopGroups: [
      { name: 'Before the event', steps: ['Approved ERP in CORO', 'Sentinel — real presence', 'Resilience index'] },
      { name: 'During', steps: ['Incident activated', 'Procedure and mobilization'] },
      { name: 'After', steps: ['Report and lessons learned', 'Updated and approved ERP'] },
    ],
    proofTitle: 'A platform that knows who is there and what they can do',
    highlights: [
      { title: 'Real presence', text: 'QR code and PIN check-in shows who is in the building.' },
      { title: 'CORO Index', text: '4 weighted components: roles, qualifications, plans, drills.' },
      { title: 'Incident Module', text: 'Coordinator procedure, mobilization, log and report.' },
      { title: 'REX Loop', text: 'After the incident: lessons learned, recommendations and corrective actions to improve the plan.' },
    ],
    dimLabel: 'Three operational dimensions', dimTitle: 'Presence, response, drills',
    dims: [
      { kicker: 'Presence', name: 'CORO Sentinel', text: 'Sentinel shows who is present in the building and which resources can be mobilized if an emergency occurs.',
        items: ['Occupancy register', 'Check-in by QR code and personal PIN', 'Timestamped entries and exits'], link: 'Learn more about CORO Sentinel' },
      { kicker: 'Response', name: 'Incident Module', text: 'When an incident occurs, CORO uses presence to identify the emergency team on site, notify designated contacts and deliver the essentials to act.',
        items: ['Members present identified at activation', 'Email and SMS to designated contacts (SMS with consent)', 'Timestamped chronological log'], link: '' },
      { kicker: 'Preparation', name: 'Drills', text: 'Exercise mode separates a drill from a real incident, and the last evacuation drill counts in the CORO index.',
        items: ['Messages prefixed [EXERCISE]', 'Occupants not notified'], link: '' },
    ],
    indexLabel: 'CORO Resilience Index', indexTitle: 'A weighted score that answers one simple question: are we actually ready?',
    indexText: 'The CORO operational resilience index calculates the building’s current response capacity, not its theoretical capacity. It combines four weighted components and is recalculated from current presence and up-to-date data.',
    components: [
      { label: 'Role coverage', weight: '40 %', desc: 'Coordinator, FRT, first aiders, PNA escorts: present or absent?' },
      { label: 'Qualifications', weight: '20 %', desc: 'CPR/AED, extinguisher, FRT, hazmat: who can actually act?' },
      { label: 'Approved plans', weight: '25 %', desc: 'ERP or FSP validated and current in CORO.' },
      { label: 'Drills', weight: '15 %', desc: 'Last evacuation drill within 12 months.' },
    ],
    componentsLabel: 'The four components of the index',
    orgLabel: 'Dynamic emergency organization', orgTitle: 'The primary coordinator leaves the building. The alternate takes over.',
    orgText: 'Each emergency team member is configured with a role, a type (primary or alternate) and a priority. When the composition of the team on site changes, CORO recalculates the effective emergency organization.',
    orgItems: ['Roles: coordinator, FRT, assembly point warden, searcher, exit monitor, PNA escort, first aider', 'Primaries and alternates configured per role and building', 'Substitution visible on the resilience dashboard', 'Gap flagged if no coordinator or first aider is present', 'Qualifications per member: CPR/AED, extinguisher, FRT, hazmat'],
    orgAlt: 'Employee form in CORO Sentinel (French interface shown): identity, consent to SMS notifications, main role, primary or alternate type, sector and qualifications.',
    orgCartouche: ['CORO Sentinel · Emergency organization', 'Role, type and qualifications', 'Screenshot'] as const,
    orgLegend: ['Main role', 'Primary or alternate', 'Sector and floor', 'Qualifications', 'Consent to SMS notifications'],
    alertLabel: 'Alert', alertTitle: 'Activate. Notify. Mobilize. Respond.',
    alertText: 'An alert must be immediately actionable: the recipient receives the incident type, the building, the address and the information to give emergency services.',
    alertAlt: 'CORO panic alert email (example in French and English): incident type, building, address, activation time and the instruction to say to 911.',
    alertCartouche: ['CORO Sentinel · Alert email', 'Active threat, example', 'Email example'] as const,
    alertLegend: ['Incident type and building', 'Address and activation time', 'Instruction to give to 911'],
    panLabel: 'Screenshot, horizontally scrollable', onScreen: 'On this screen',
    reportLabel: 'History and report', reportTitle: 'Every incident leaves a usable record',
    reportText: 'The incident history is retained in CORO. Each incident produces a structured 7-section PDF report, with the chronological log, the team mobilized and the lessons learned.',
    reportItems: [
      { title: 'Lessons learned (REX)', text: 'What worked, areas for improvement, recommendations, corrective actions.' },
      { title: 'Compliance responsibility', text: 'Retention and documentation requirements vary by organization and applicable regulation. CORO provides the record; compliance remains the organization’s responsibility.' },
    ],
    intelLabel: 'Organizational intelligence', intelTitle: 'Identify gaps before an incident occurs',
    intelText: 'From the four components of the index, CORO generates recommendations ranked by criticality, before any emergency occurs.',
    intelExamples: [['Critical', 'No active ERP or FSP linked to this building'], ['Critical', 'No emergency coordinator or alternate present'], ['Critical', 'No evacuation drill on record'], ['Attention', 'Repeated incidents of the same type within 90 days: abnormal recurrence']] as const,
    platform: 'This part of the platform', platformTitle: 'A connected product foundation', platformLead: 'Operational resilience relies on the other parts of CORO: documents to approve, mandates to deliver, performance to read and client access.', explore: 'Explore',
    products: [
      { name: 'Documents', text: 'Structures data and deliverables.', href: '/gestion-documentaire' },
      { name: 'Projects', text: 'Organizes mandates and work.', href: '/gestion-de-projets' },
      { name: 'Performance', text: 'Measures activity, goals and capacity.', href: '/performance-objectifs' },
      { name: 'Client', text: 'Makes information accessible to clients.', href: '/portail-client' },
    ],
    faq: 'FAQ', faqTitle: 'Frequently asked questions',
    faqItems: [
      { q: 'How does CORO know who is in the building?', a: 'Through CORO Sentinel: each employee has a personal PIN and QR code. They scan the kiosk QR at entry and enter their PIN. The system records the time and updates the occupancy register.' },
      { q: 'What happens if the coordinator leaves the building during the day?', a: 'When the coordinator checks out, CORO recalculates the effective emergency organization from the members present: the configured alternate takes over. If no coordinator or alternate is present, a critical gap appears in the index and in the recommendations.' },
      { q: 'Is SMS included in CORO?', a: 'Yes. Each emergency team member who has given explicit consent receives an SMS in addition to the email when an incident is triggered.' },
      { q: 'Can we run a drill without notifying real occupants?', a: 'Yes. Exercise mode sends emails and SMS prefixed [EXERCISE] to the emergency team, but does not notify occupants.' },
      { q: 'Does the incident report guarantee regulatory compliance?', a: 'No. The report documents the incident: chronology, occupants, team mobilized, procedure followed and lessons learned. Retention and compliance requirements depend on your organization and the applicable regulation, and remain your responsibility.' },
      { q: 'Does the Incident Module work if multiple incidents occur simultaneously?', a: 'Yes. CORO supports simultaneous incidents. Each incident has its own log, its own coordinator task list and its own report, independent from one another.' },
    ],
    statement: 'An emergency plan is only worth its value if the right people can execute it at the right time.',
    support: 'With CORO, you see whether your building is ready to respond, who can act right now, and how every incident improves your next response.',
  },
} as const satisfies Record<Locale, unknown>;

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/resilience-operationnelle', locale: l, title: copy[l].metaTitle, description: copy[l].description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[l];
  const demo = localizedHref('/#demo', l);
  const offsets = t.loopGroups.map((_, i) => t.loopGroups.slice(0, i).reduce((n, g) => n + g.steps.length, 0));
  return (
    <V2Shell locale={l} pathname="/resilience-operationnelle">
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />

      <EditorialHero id="resilience-title" label={t.label} title={t.lines} lead={t.lead} detail={t.detail}
        photo={{ src: '/website-v2/resilience/resilience-emergency-coordination.webp', side: 'end', position: '0% 50%', mobilePosition: '0% 50%', coverage: 50, mobileRatio: '5 / 4' }}
        actions={<><Button href={demo} surface="dark">{t.demo}</Button><Button href={LOGIN} variant="ghost" surface="dark" external>{t.access}</Button></>} />

      <PageSection tone="white" labelledBy="resilience-def-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="resilience-def-title" label={t.defLabel} heading={t.defTitle}><p>{t.defText}</p></EditorialBlock>}
          media={<ol className={styles.bridge} aria-label={t.defTitle}>{t.bridge.map((b) => <li key={b}>{b}</li>)}</ol>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="resilience-loop-title">
        <div className={styles.stack}>
          <EditorialBlock id="resilience-loop-title" label={t.loopLabel} heading={t.loopTitle}><p>{t.loopText}</p></EditorialBlock>
          <div className={styles.loop}>
            {t.loopGroups.map((group, gi) => (
              <section key={group.name} aria-label={group.name}>
                <h3>{group.name}</h3>
                <ol>{group.steps.map((step, si) => <li key={step} data-n={String(offsets[gi] + si + 1).padStart(2, '0')}>{step}</li>)}</ol>
              </section>
            ))}
          </div>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="resilience-highlights-title">
        <div className={styles.stack}>
          <EditorialBlock id="resilience-highlights-title" heading={t.proofTitle} />
          <ol className={styles.cards} aria-label={t.proofTitle}>{t.highlights.map((h) => <li key={h.title}><h3>{h.title}</h3><p>{h.text}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="resilience-dims-title">
        <div className={styles.stack}>
          <EditorialBlock id="resilience-dims-title" label={t.dimLabel} heading={t.dimTitle} />
          <div className={styles.dims}>
            {t.dims.map((d) => (
              <section key={d.name} aria-label={d.name}>
                <p className={styles.kicker}>{d.kicker}</p>
                <h3>{d.name}</h3>
                <p>{d.text}</p>
                <ul>{d.items.map((item) => <li key={item}>{item}</li>)}</ul>
                {d.link && <a href="/sentinelle">{d.link}<span aria-hidden="true"> →</span></a>}
              </section>
            ))}
          </div>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="resilience-index-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="resilience-index-title" label={t.indexLabel} heading={t.indexTitle}><p>{t.indexText}</p></EditorialBlock>}
          media={<div className={styles.stack}><p className={styles.dimLabel}>{t.componentsLabel}</p><dl className={styles.weights}>{t.components.map((c) => <div key={c.label}><dt>{c.label}</dt><dd className={styles.weight}>{c.weight}</dd><dd>{c.desc}</dd></div>)}</dl></div>} />
      </PageSection>

      <PageSection tone="white" labelledBy="resilience-org-title">
        <SplitContent order="media-text" ratio="4-8" align="start"
          media={<div className={styles.stack}><div className={styles.pan} role="region" tabIndex={0} aria-label={t.panLabel}><MediaFrame kind="technical" src="/images/solutions/resilience/coro-organisation-urgence.webp" alt={t.orgAlt} ratio={1439 / 1093} sizes="(min-width: 68rem) 800px, 560px" cartouche={t.orgCartouche} /></div><div className={styles.legendBlock}><p className={styles.dimLabelInk}>{t.onScreen}</p><ul className={styles.legend}>{t.orgLegend.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
          text={<div className={styles.stack}><EditorialBlock id="resilience-org-title" label={t.orgLabel} heading={t.orgTitle}><p>{t.orgText}</p></EditorialBlock><ul className={styles.plain}>{t.orgItems.map((item) => <li key={item}>{item}</li>)}</ul></div>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="resilience-alert-title">
        <SplitContent ratio="5-7" align="start"
          text={<div className={styles.stack}><EditorialBlock id="resilience-alert-title" label={t.alertLabel} heading={t.alertTitle}><p>{t.alertText}</p></EditorialBlock><div className={styles.legendBlock}><p className={styles.dimLabelInk}>{t.onScreen}</p><ul className={styles.legend}>{t.alertLegend.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
          media={<div className={styles.pan} role="region" tabIndex={0} aria-label={t.panLabel}><MediaFrame kind="technical" src="/alert/coro-alerte-panique-courriel.webp" alt={t.alertAlt} ratio={784 / 734} sizes="(min-width: 68rem) 640px, 560px" cartouche={t.alertCartouche} /></div>} />
      </PageSection>

      <PageSection tone="white" labelledBy="resilience-report-title">
        <div className={styles.stack}>
          <EditorialBlock id="resilience-report-title" label={t.reportLabel} heading={t.reportTitle}><p>{t.reportText}</p></EditorialBlock>
          <ul className={styles.notes}>{t.reportItems.map((item) => <li key={item.title}><h3>{item.title}</h3><p>{item.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="resilience-intel-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="resilience-intel-title" label={t.intelLabel} heading={t.intelTitle}><p>{t.intelText}</p></EditorialBlock>}
          media={<ul className={styles.recs}>{t.intelExamples.map(([level, text]) => <li key={text}><span>{level}</span>{text}</li>)}</ul>} />
      </PageSection>

      <PageSection tone="white" labelledBy="resilience-platform-title">
        <div className={styles.stack}>
          <EditorialBlock id="resilience-platform-title" label={t.platform} heading={t.platformTitle}><p>{t.platformLead}</p></EditorialBlock>
          <ul className={styles.connect}>
            {t.products.map((c) => (
              <li key={c.name}><h3>{c.name}</h3><p>{c.text}</p><a href={localizedHref(c.href, l)} aria-label={`${t.explore} ${c.name}`}>{t.explore}<span aria-hidden="true"> →</span></a></li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="resilience-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="resilience-faq-title" label={t.faq} heading={t.faqTitle} />
          <Accordion label={t.faqTitle} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="resilience-cta-title" tone="dark" label={t.label} statement={t.statement} support={t.support} primary={{ label: t.demo, href: demo }} secondary={{ label: t.access, href: LOGIN }} />
    </V2Shell>
  );
}
