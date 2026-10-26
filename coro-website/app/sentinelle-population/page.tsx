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
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /sentinelle-population (MIG-03C) — OUTSIDE the site: the external population potentially affected by an industrial / environmental emergency.
 * NOT Sentinelle (building occupants, MIG-03B). The V1 fictional scenario (ammonia release, fictitious "Installation industrielle Prémont", Boucherville)
 * is the narrative source of truth and is PRESERVED step by step; all its images are generated MARKETING ILLUSTRATIONS (never product proof).
 * Complete French and English editorial content; illustrative scenario assets retain their original language.
 * PRODUCT TRUTH (backend src/population): SMS and email are the only CORO delivery channels (Brevo), subscriber consent and verification, a public citizen portal,
 * scenario / zone / message preparation, approval, frozen recipients, sending, delivery status, SANDBOX vs LIVE mode, evidence report. NO voice, siren, social-media,
 * municipal-system or 911 integration exists; those appear in the hero illustration only as concepts and are not claimed.
 * REGULATORY (official source: Règlement sur les urgences environnementales (2019), DORS/2019-51, laws-lois.justice.gc.ca): the V1 sentence about the surroundings and
 * public communications is supported; the page claims support for preparation, never compliance.
 * Data in the imagery (12 400 people, 48 890 recipients, a Boucherville address, phone numbers) is FICTIONAL DEMO DATA in generated scenes: no screenshot is used as proof.
 */
const copy = {
  fr: {
    home: 'Accueil', lang: 'EN', demo: 'Demander une démonstration', discover: 'Voir comment ça fonctionne',
    h1: 'Votre PUE prévoit l’alerte à la population. Sentinelle Population la rend opérationnelle.',
    lead: 'De la préparation du plan d’urgence environnementale à l’intervention réelle, Sentinelle Population aide les installations industrielles à préparer, activer, diffuser et documenter leurs communications à la population lorsqu’une urgence environnementale survient.',
    note: 'Pensé notamment pour les installations concernées par le Règlement sur les urgences environnementales (2019).',
    problem: 'Un plan d’alerte ne devrait pas rester dans un classeur.',
    problemText: 'Le PUE structure les scénarios, responsabilités et mesures prévues. Lorsqu’un événement survient, l’équipe doit transformer cette préparation en décisions et communications traçables.',
    plan: ['Scénarios', 'Responsabilités', 'Zones et populations', 'Consignes', 'Moyens de communication'], execute: ['Activation', 'Évaluation', 'Secteur concerné', 'Message', 'Diffusion et suivi'],
    scenario: '10 h 17 — Une fuite d’ammoniac est détectée.',
    scenarioText: 'Mise en situation fictive : les décisions réelles dépendent du PUE, de l’évaluation de l’événement et des autorités compétentes.',
    steps: [
      ['Détection', 'Une fuite NH₃ est signalée. CORO ne détecte pas la fuite : l’information provient des opérations du site.', 'sentinelle-population-fuite-ammoniac.webp'],
      ['Mise en œuvre du PUE', 'L’organisation applique la procédure préparée : rôles, mesures immédiates, notifications et critères de décision.', 'sentinelle-population-activation-pue.webp'],
      ['Évaluation', 'L’équipe évalue le secteur potentiellement concerné selon les méthodes et responsabilités applicables.', 'sentinelle-population-zone-impact.webp'],
      ['Activation du volet population', 'Lorsqu’une personne autorisée prend la décision applicable, Sentinelle Population soutient sa mise en œuvre.', 'sentinelle-population-dashboard.webp'],
      ['Population concernée', 'La zone préparée est appliquée aux abonnés actifs.', 'sentinelle-population-zone.webp'],
      ['Message', 'L’équipe prépare une communication adaptée. Les consignes demeurent celles approuvées pour la situation réelle.', 'sentinelle-population-messages.webp'],
      ['Diffusion', 'Après validation humaine, les communications admissibles sont diffusées par les canaux activés.', 'sentinelle-population-diffusion.webp'],
      ['Suivi', 'Le cockpit distingue préparation, diffusion, acceptation fournisseur et preuves de livraison disponibles.', 'sentinelle-population-incident.webp'],
      ['Fin d’alerte', 'Une communication accompagne le retour à la normale lorsque la décision appropriée est prise.', 'sentinelle-population-fin-alerte.webp'],
      ['Traçabilité et REX', 'La chronologie, les actions, les messages et les statuts soutiennent la revue après l’événement.', 'sentinelle-population-tracabilite.webp'],
    ],
    phases: [['AVANT', 'Préparer', 'Installation, scénario, zone, consignes, canaux et gouvernance.'], ['PENDANT', 'Alerter', 'Évaluer, cibler, préparer, approuver, diffuser et suivre.'], ['APRÈS', 'Documenter', 'Fin d’alerte, chronologie, preuves disponibles et retour d’expérience.']],
    portal: 'Un portail citoyen conçu pour l’inscription.', portalText: 'Le citoyen peut consentir, confirmer ses canaux et enregistrer son secteur d’alerte.',
    zone: 'De la zone potentiellement concernée à la communication.', flow: ['INSTALLATION', 'SCÉNARIO', 'ZONE POTENTIELLEMENT CONCERNÉE', 'POPULATION ABONNÉE', 'COMMUNICATION'],
    value: 'Ce que Sentinelle Population apporte sur le terrain.', values: [['Préparation en amont', 'Structurer le programme, les zones et les consignes avant l’événement.'], ['Activation opérationnelle', 'Passer du scénario préparé à une alerte gouvernée par des permissions explicites.'], ['Communication ciblée', 'Calculer des agrégats et préparer les canaux réellement disponibles.'], ['Suivi de diffusion', 'Suivre les états opérationnels et les preuves disponibles.'], ['Traçabilité', 'Conserver un historique exploitable pour la revue.']],
    continuity: 'Une seule continuité : de la planification à l’intervention.',
    reg: 'Conçu pour soutenir une préparation structurée.', regText: 'Le Règlement sur les urgences environnementales (2019), pris sous la Loi canadienne sur la protection de l’environnement (1999), prévoit notamment des éléments relatifs aux environs d’une installation et aux communications avec les membres du public susceptibles d’être touchés.',
    disclaimer: 'CORO soutient la planification, l’intervention et la traçabilité. Son utilisation ne garantit pas à elle seule la conformité et ne remplace pas les obligations, décisions ou communications des autorités compétentes.',
    trace: 'Une alerte envoyée ne devrait jamais devenir une action impossible à retracer.', traceText: 'CORO conserve les étapes de préparation et d’approbation, le message figé, les canaux, les agrégats, les tentatives et les statuts disponibles.',
    distinct: 'Deux périmètres complémentaires, une même résilience.', final: 'Votre PUE est-il prêt à passer du document à l’action?', finalText: 'Découvrez comment Sentinelle Population peut soutenir la préparation et la mise en œuvre du volet d’alerte à la population de votre organisation.',
    faqs: [['Sentinelle Population remplace-t-il un PUE?', 'Non. Le PUE demeure le cadre de planification et d’intervention.'], ['Garantit-il la conformité réglementaire?', 'Non. CORO est un outil de soutien; l’organisation demeure responsable de ses obligations et décisions.'], ['Peut-on préparer les communications à l’avance?', 'Oui. Scénarios, zones et instructions peuvent être préparés avant une alerte autorisée.'], ['Peut-on l’utiliser lors d’un exercice?', 'Oui, dans un cadre contrôlé, notamment en mode simulation, sans envoi réel aux abonnés.'], ['Remplace-t-il Québec En Alerte?', 'Non. Les autorités et systèmes publics conservent leurs responsabilités et mécanismes.']],
  },
  en: {
    home: 'Home', lang: 'FR', demo: 'Request a demonstration', discover: 'See how it works',
    h1: 'Your environmental emergency plan includes public alerting. Sentinelle Population supports its implementation.',
    lead: 'From preparation to response, Sentinelle Population helps industrial facilities prepare, activate, distribute and document communications to the public during an environmental emergency.',
    note: 'Designed in particular for facilities subject to the Environmental Emergency Regulations, 2019.',
    problem: 'An alerting plan should not stay in a binder.', problemText: 'The environmental emergency plan defines scenarios, responsibilities and measures. When an event occurs, staff need to turn preparation into traceable decisions and communications.',
    plan: ['Scenarios', 'Responsibilities', 'Zones and populations', 'Instructions', 'Communication channels'], execute: ['Activation', 'Assessment', 'Affected area', 'Message', 'Distribution and follow-up'],
    scenario: '10:17 a.m. — An ammonia leak is reported.', scenarioText: 'Fictional scenario: actual decisions depend on the environmental emergency plan, assessment of the event and competent authorities.',
    steps: [
      ['Detection', 'An NH₃ leak is reported. CORO does not detect the leak; the information comes from site operations.', 'sentinelle-population-fuite-ammoniac.webp'],
      ['Implement the plan', 'The organization follows its prepared procedure: roles, immediate measures, notifications and decision criteria.', 'sentinelle-population-activation-pue.webp'],
      ['Assessment', 'The team assesses the potentially affected area using the applicable methods and responsibilities.', 'sentinelle-population-zone-impact.webp'],
      ['Activate public communications', 'When an authorized person makes the appropriate decision, Sentinelle Population supports its implementation.', 'sentinelle-population-dashboard.webp'],
      ['Affected subscribers', 'The prepared zone is applied to active subscribers.', 'sentinelle-population-zone.webp'],
      ['Message', 'Staff prepare a suitable communication. Instructions remain those approved for the actual situation.', 'sentinelle-population-messages.webp'],
      ['Distribution', 'After human approval, eligible communications are distributed through enabled channels.', 'sentinelle-population-diffusion.webp'],
      ['Follow-up', 'The interface distinguishes preparation, distribution, provider acceptance and available delivery evidence.', 'sentinelle-population-incident.webp'],
      ['All-clear', 'A communication supports the return to normal when the appropriate decision is made.', 'sentinelle-population-fin-alerte.webp'],
      ['Traceability and lessons learned', 'The timeline, actions, messages and statuses support review after the event.', 'sentinelle-population-tracabilite.webp'],
    ],
    phases: [['BEFORE', 'Prepare', 'Facility, scenario, zone, instructions, channels and governance.'], ['DURING', 'Alert', 'Assess, target, prepare, approve, distribute and follow up.'], ['AFTER', 'Document', 'All-clear, timeline, available evidence and lessons learned.']],
    portal: 'A citizen portal for registration.', portalText: 'Residents can give consent, verify their channels and register their alert area.',
    zone: 'From the potentially affected zone to communication.', flow: ['FACILITY', 'SCENARIO', 'POTENTIALLY AFFECTED ZONE', 'SUBSCRIBERS', 'COMMUNICATION'],
    value: 'What Sentinelle Population supports.', values: [['Advance preparation', 'Structure the program, zones and instructions before an event.'], ['Controlled activation', 'Move from a prepared scenario to an alert governed by explicit permissions.'], ['Targeted communication', 'Calculate aggregates and prepare the channels actually available.'], ['Distribution tracking', 'Track operational states and available evidence.'], ['Traceability', 'Keep a usable history for review.']],
    continuity: 'Continuity from planning to response.', reg: 'Supporting structured preparedness.',
    regText: 'The Environmental Emergency Regulations, 2019, under the Canadian Environmental Protection Act, 1999, include provisions concerning the area surrounding a facility and communications with members of the public who may be affected.',
    disclaimer: 'CORO supports planning, response and traceability. Its use alone does not guarantee compliance or replace the obligations, decisions or communications of competent authorities.',
    trace: 'A distributed alert should remain traceable.', traceText: 'CORO retains preparation and approval steps, the frozen message, channels, aggregates, attempts and available statuses.',
    distinct: 'Two complementary scopes supporting resilience.', final: 'Is your environmental emergency plan ready to support action?', finalText: 'Explore how Sentinelle Population can support preparation and implementation of your public alerting arrangements.',
    faqs: [['Does Sentinelle Population replace an environmental emergency plan?', 'No. The plan remains the framework for preparation and response.'], ['Does it guarantee regulatory compliance?', 'No. CORO is a support tool; the organization remains responsible for its obligations and decisions.'], ['Can communications be prepared in advance?', 'Yes. Scenarios, zones and instructions can be prepared before an authorized alert.'], ['Can it support exercises?', 'Yes, in a controlled simulation setting without actual messages to subscribers.'], ['Does it replace Québec En Alerte?', 'No. Public authorities and systems retain their own responsibilities and mechanisms.']],
  },

};

const REG_URL = 'https://laws-lois.justice.gc.ca/fra/reglements/DORS-2019-51/';
const IMG = '/images/sentinelle_population';

const interfaceCopy = {
 fr: { metaTitle: 'Alerte à la population et plan d’urgence environnementale (PUE)', description: 'Sentinelle Population aide les installations industrielles à préparer, mettre en œuvre et documenter leurs communications à la population dans le cadre de leur planification d’urgence environnementale.', channelNote: 'Canaux de diffusion directs de CORO : SMS et courriel, auprès des abonnés qui ont consenti. Les sirènes, les médias, les réseaux sociaux et les systèmes municipaux relèvent des autorités et de l’organisation; CORO ne les active pas.', mapMeaning: 'La carte illustre le principe : le scénario définit un territoire potentiellement concerné, organisé en zones autour de l’installation. Ces zones servent à considérer la population et les établissements sensibles susceptibles d’être touchés, puis à cibler les communications.', illus: 'Illustration de mise en situation fictive', planLabel: 'Planifier', executeLabel: 'Exécuter', plan: '01 · PLANIFIER', execute: '02 · EXÉCUTER', operations: 'PUE → OPÉRATIONS', scenario: 'MISE EN SITUATION · FUITE NH₃', fourActs: 'Une seule situation, quatre actes.', act: 'ACTE', acts: ['Détecter et comprendre', 'Déterminer qui peut être concerné', 'Informer et suivre', 'Fermer et apprendre'], zoneNote: 'Zones et chiffres illustratifs d’un scénario fictif : ils ne constituent pas une analyse d’impact.', after: 'APRÈS LE SCÉNARIO', frame: 'Ce qui soutient ce scénario.', phases: 'Préparer. Alerter. Documenter.', citizen: 'PORTAIL CITOYEN', brand: 'Installation industrielle Prémont (site fictif) · Sentinelle Population · Propulsé par CORO.', continuity: [['LE PUE PRÉPARE', 'Scénarios · responsabilités · mesures · zones · communications'], ['SENTINELLE POPULATION OPÉRATIONNALISE', 'Population concernée · messages · approbation · diffusion · suivi'], ['CORO DOCUMENTE', 'Chronologie · actions · communications · preuves disponibles · REX']], digital: 'Une continuité numérique, de la préparation à l’amélioration.', ecosystem: 'Écosystème CORO', eco: ['Documentation / planification', 'PUE', 'Sentinelle Population', 'Gestion de l’incident', 'Intervention', 'Traçabilité', 'Exercices / REX'], responders: 'L’installation agit au sein d’un écosystème d’intervention.', respondersText: 'Sentinelle Population ne remplace ni l’organisation d’urgence, ni les municipalités, ni les services d’urgence, ni les autorités environnementales. La plateforme soutient les communications relevant du plan et des responsabilités de l’installation.', regulation: 'Consulter le règlement officiel (site du gouvernement du Canada)', occupants: 'Qui est présent dans mon bâtiment?', occupantsText: 'Occupation, visiteurs, employés, évacuation et point de rassemblement.', sentinelle: 'En savoir plus sur CORO Sentinelle', population: 'Qui pourrait être touché autour de mon installation?', populationText: 'Zone, population abonnée, messages, diffusion et traçabilité.', faq: 'Questions fréquentes', scope: 'Sentinelle Population fait l’objet d’un cadrage et d’une activation distincts. Ses communications externes ne sont pas incluses dans le périmètre du portail Client V1.' },
 en: { metaTitle: 'Public alerting and environmental emergency planning', description: 'Sentinelle Population helps industrial facilities prepare, implement and document public communications as part of environmental emergency planning.', channelNote: 'CORO’s direct distribution channels are SMS and email for consenting subscribers. Sirens, media, social networks and municipal systems remain the responsibility of authorities and the organization; CORO does not activate them.', mapMeaning: 'The map illustrates a principle: a scenario defines a potentially affected territory divided into zones around a facility. Zones help consider people and sensitive facilities that may be affected and target communications.', illus: 'Fictional scenario illustration; embedded interface text may be in French', planLabel: 'Plan', executeLabel: 'Execute', plan: '01 · PLAN', execute: '02 · EXECUTE', operations: 'ENVIRONMENTAL PLAN → OPERATIONS', scenario: 'FICTIONAL SCENARIO · NH₃ LEAK', fourActs: 'One situation, four acts.', act: 'ACT', acts: ['Detect and understand', 'Identify who may be affected', 'Inform and follow up', 'Close and learn'], zoneNote: 'Zones and figures illustrate a fictional scenario; they are not an impact assessment.', after: 'AFTER THE SCENARIO', frame: 'What supports this scenario.', phases: 'Prepare. Alert. Document.', citizen: 'CITIZEN PORTAL', brand: 'Prémont industrial facility (fictional site) · Sentinelle Population · Powered by CORO.', continuity: [['THE PLAN PREPARES', 'Scenarios · responsibilities · measures · zones · communications'], ['SENTINELLE POPULATION SUPPORTS ACTION', 'Affected subscribers · messages · approval · distribution · follow-up'], ['CORO DOCUMENTS', 'Timeline · actions · communications · available evidence · lessons learned']], digital: 'Digital continuity from preparation to improvement.', ecosystem: 'CORO ecosystem', eco: ['Documentation / planning', 'Environmental emergency plan', 'Sentinelle Population', 'Incident management', 'Response', 'Traceability', 'Exercises / lessons learned'], responders: 'The facility acts within a response ecosystem.', respondersText: 'Sentinelle Population does not replace emergency organizations, municipalities, emergency services or environmental authorities. It supports communications within the facility’s plan and responsibilities.', regulation: 'Read the official regulations (Government of Canada)', occupants: 'Who is registered in my building?', occupantsText: 'Occupancy, visitors, employees, evacuation and assembly points.', sentinelle: 'Learn about CORO Sentinelle', population: 'Who may be affected around my facility?', populationText: 'Zones, subscribers, messages, distribution and traceability.', faq: 'Frequently asked questions', scope: 'Sentinelle Population requires separate scoping and activation. Its external communications are not included in Client Portal V1.' },
} as const;

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const requested = localeFromSearchParams((await searchParams) ?? {});
  const ui = interfaceCopy[requested];
  return buildPageMetadata({ path: '/sentinelle-population', locale: requested, title: ui.metaTitle, description: ui.description, image: IMG + '/sentinelle-population-hero-ammoniac.webp' });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[l];
  const ui = interfaceCopy[l];
  const { channelNote, mapMeaning, illus } = ui;
  const demo = localizedHref('/#demo', l);
  return (
    <V2Shell locale={l} pathname="/sentinelle-population">
      <JsonLd value={faqJsonLd(t.faqs.map(([q, a]) => ({ question: q, answer: a })))} />
      <PageSection tone="soft"><p>{ui.scope}</p></PageSection>

      <EditorialHero id="population-title" label="CORO · Sentinelle Population" title={[t.h1]} lead={t.lead} detail={t.note}
        photo={{ src: '/website-v2/sentinel/sentinelle-population-alert-territory.webp', side: 'end', position: '52% 50%', mobilePosition: '52% 50%', coverage: 58, mobileRatio: '16 / 11' }}
        actions={<><Button href={demo} surface="dark">{t.demo}</Button><Button href="#scenario" variant="ghost" surface="dark">{t.discover}</Button></>} />

      <PageSection tone="white" labelledBy="population-problem-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-problem-title" label={ui.operations} heading={t.problem}><p>{t.problemText}</p></EditorialBlock>
          <div className={styles.bridge}>
            <section aria-label={ui.planLabel}><h3>{ui.plan}</h3><ol>{t.plan.map((x) => <li key={x}>{x}</li>)}</ol></section>
            <p className={styles.bridgeMid}>PUE <span aria-hidden="true">→</span> Sentinelle Population</p>
            <section aria-label={ui.executeLabel}><h3>{ui.execute}</h3><ol>{t.execute.map((x) => <li key={x}>{x}</li>)}</ol></section>
          </div>
        </div>
      </PageSection>

      <PageSection tone="navy" id="scenario" labelledBy="population-scenario-title">
        <EditorialBlock id="population-scenario-title" label={ui.scenario} heading={t.scenario}><p>{t.scenarioText}</p><p className={styles.illusOnDark}>{illus}. {ui.fourActs}</p></EditorialBlock>
      </PageSection>

      {/* ACTE I — Détecter et comprendre: the field photograph is the large narrative moment; the two interfaces are operational proof. */}
      <PageSection tone="white" labelledBy="population-act-1">
        <div className={styles.stack}>
          <p className={styles.act}>{ui.act} I</p><h2 id="population-act-1" className={styles.actTitle}>{ui.acts[0]}</h2>
          <div className={styles.strip}>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[0][2]}`} alt="" ratio={1466 / 1073} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(1).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-1">{t.steps[0][0]}</h3><p>{t.steps[0][1]}</p></div></div>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[1][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(2).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-2">{t.steps[1][0]}</h3><p>{t.steps[1][1]}</p></div></div>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[2][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(3).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-3">{t.steps[2][0]}</h3><p>{t.steps[2][1]}</p></div></div>
          </div>
        </div>
      </PageSection>

      {/* ACTE II — Déterminer qui peut être concerné: step 5 is the signature section, dominated by the territorial map. */}
      <PageSection tone="soft" labelledBy="population-act-2">
        <div className={styles.stack}>
          <p className={styles.act}>{ui.act} II</p><h2 id="population-act-2" className={styles.actTitle}>{ui.acts[1]}</h2>
          <div className={styles.strip}>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[3][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(4).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-4">{t.steps[3][0]}</h3><p>{t.steps[3][1]}</p></div></div>
            <div className={`${styles.panel} ${styles.wide}`}>
              <MediaFrame src={`${IMG}/${t.steps[4][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 1200px, 100vw" />
              <div className={styles.pbody}>
                <p className={styles.big}>05<span>/10</span></p><h3 id="population-step-5">{t.steps[4][0]}</h3><p>{t.steps[4][1]}</p>
                <div className={styles.mapText}>
                  <p className={styles.kicker}>{t.zone}</p>
                  <ol className={styles.flow} aria-label={t.zone}>{t.flow.map((x) => <li key={x}>{x}</li>)}</ol>
                  <p>{mapMeaning}</p>
                  <p className={styles.illus}>{ui.zoneNote} {illus}.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      {/* ACTE III — Informer et suivre: interfaces as operational proof. */}
      <PageSection tone="white" labelledBy="population-act-3">
        <div className={styles.stack}>
          <p className={styles.act}>{ui.act} III</p><h2 id="population-act-3" className={styles.actTitle}>{ui.acts[2]}</h2>
          <div className={styles.strip}>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[5][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(6).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-6">{t.steps[5][0]}</h3><p>{t.steps[5][1]}</p></div></div>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[6][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(7).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-7">{t.steps[6][0]}</h3><p>{t.steps[6][1]}</p><p className={styles.channels}>{channelNote}</p></div></div>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[7][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(8).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-8">{t.steps[7][0]}</h3><p>{t.steps[7][1]}</p></div></div>
          </div>
        </div>
      </PageSection>

      {/* ACTE IV — Fermer et apprendre: the closing photograph, then traceability. */}
      <PageSection tone="soft" labelledBy="population-act-4">
        <div className={styles.stack}>
          <p className={styles.act}>{ui.act} IV</p><h2 id="population-act-4" className={styles.actTitle}>{ui.acts[3]}</h2>
          <div className={styles.strip}>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[8][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(9).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-9">{t.steps[8][0]}</h3><p>{t.steps[8][1]}</p></div></div>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[9][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(10).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-10">{t.steps[9][0]}</h3><p>{t.steps[9][1]}</p><p className={styles.trace}><strong>{t.trace}</strong> {t.traceText}</p></div></div>
          </div>
          <p className={styles.illus}>{illus}.</p>
        </div>
      </PageSection>

      {/* Break: from the scenario to what supports it. */}
      <PageSection tone="navy" labelledBy="population-frame-title">
        <EditorialBlock id="population-frame-title" label={ui.after} heading={ui.frame} />
      </PageSection>

      <PageSection tone="white" labelledBy="population-phases-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-phases-title" heading={ui.phases} />
          <ol className={styles.timeline}>{t.phases.map(([a, b, c], i) => <li key={a} data-stage={i}><p className={styles.stageKicker}>{a}</p><h3>{b}</h3><p>{c}</p></li>)}</ol>
          <h2 className={styles.subTitle}>{t.value}</h2>
          <ol className={styles.values}>{t.values.map(([a, b]) => <li key={a}><h3>{a}</h3><p>{b}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="population-portal-title">
        <SplitContent order="media-text" ratio="5-7" align="center"
          media={<MediaFrame src={`${IMG}/sentinelle-population-portail.webp`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 720px, 100vw" />}
          text={<div className={styles.stack}><EditorialBlock id="population-portal-title" label={ui.citizen} heading={t.portal}><p>{t.portalText}</p></EditorialBlock><p className={styles.illus}>{ui.brand} {illus}.</p></div>} />
      </PageSection>

      <PageSection tone="navy" labelledBy="population-continuity-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-continuity-title" heading={t.continuity} />
          <div className={styles.columns}>
            {ui.continuity.map(([title, text]) => <section key={title}><h3>{title}</h3><p>{text}</p></section>)}
          </div>
          <h3 className={styles.subTitleDark}>{ui.digital}</h3><ol className={styles.eco} aria-label={ui.ecosystem}>{ui.eco.map((x) => <li key={x} data-self={x === 'Sentinelle Population' ? 'true' : undefined}>{x}</li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="population-responders-title">
        <SplitContent ratio="5-7" align="center"
          text={<div className={styles.stack}><EditorialBlock id="population-responders-title" heading={ui.responders}><p>{ui.respondersText}</p></EditorialBlock></div>}
          media={<MediaFrame src={`${IMG}/sentinelle-population-intervention.webp`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 720px, 100vw" />} />
      </PageSection>

      <PageSection tone="soft" labelledBy="population-reg-title">
        <SplitContent ratio="5-7" align="start"
          text={<div className={styles.stack}><EditorialBlock id="population-reg-title" label="RUE / E2" heading={t.reg}><p>{t.regText}</p></EditorialBlock><a className={styles.ext} href={l === 'en' ? 'https://laws-lois.justice.gc.ca/eng/regulations/SOR-2019-51/' : REG_URL} target="_blank" rel="noreferrer">{ui.regulation}<span aria-hidden="true"> ↗</span></a></div>}
          media={<p className={styles.statement}>{t.disclaimer}</p>} />
      </PageSection>

      <PageSection tone="white" labelledBy="population-distinct-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-distinct-title" heading={t.distinct} />
          <div className={styles.columns2}>
            <section><h3>CORO Sentinelle</h3><p className={styles.q}>{ui.occupants}</p><p>{ui.occupantsText}</p><a href={localizedHref('/sentinelle', l)}>{ui.sentinelle}<span aria-hidden="true"> →</span></a></section>
            <section><h3>Sentinelle Population</h3><p className={styles.q}>{ui.population}</p><p>{ui.populationText}</p></section>
          </div>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="population-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-faq-title" label="FAQ" heading={ui.faq} />
          <Accordion label={ui.faq} items={t.faqs.map(([q, a], i) => ({ id: `faq-${i}`, question: q, answer: a }))} />
        </div>
      </PageSection>

      <CTASection id="population-cta-title" tone="dark" label="Sentinelle Population" statement={t.final} support={t.finalText} primary={{ label: t.demo, href: demo }} />
    </V2Shell>
  );
}
