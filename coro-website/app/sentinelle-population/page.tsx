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
 * /sentinelle-population (MIG-03C) — OUTSIDE the site: the external population potentially affected by an industrial / environmental emergency.
 * NOT Sentinelle (building occupants, MIG-03B). The V1 fictional scenario (ammonia release, fictitious "Installation industrielle Prémont", Boucherville)
 * is the narrative source of truth and is PRESERVED step by step; all its images are generated MARKETING ILLUSTRATIONS (never product proof).
 * LANGUAGE: FR ONLY (the V1 English copy object was empty and ?lang=en rendered the French text) => englishAvailable={false}, canonical FR, hreflang fr-CA + x-default.
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
};

const REG_URL = 'https://laws-lois.justice.gc.ca/fra/reglements/DORS-2019-51/';
const IMG = '/images/sentinelle_population';
const t = copy.fr;
const channelNote = 'Canaux de diffusion directs de CORO : SMS et courriel, auprès des abonnés qui ont consenti. Les sirènes, les médias, les réseaux sociaux et les systèmes municipaux relèvent des autorités et de l’organisation; CORO ne les active pas.';
const mapMeaning = 'La carte illustre le principe : le scénario définit un territoire potentiellement concerné, organisé en zones autour de l’installation. Ces zones servent à considérer la population et les établissements sensibles susceptibles d’être touchés, puis à cibler les communications.';
const illus = 'Illustration de mise en situation fictive';

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const requested = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/sentinelle-population', locale: requested, hasEnglish: false, title: 'Alerte à la population et plan d’urgence environnementale (PUE)', description: 'Sentinelle Population aide les installations industrielles à préparer, mettre en œuvre et documenter leurs communications à la population dans le cadre de leur planification d’urgence environnementale.', image: IMG + '/sentinelle-population-hero-ammoniac.webp' });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = resolveAvailableLocale(localeFromSearchParams((await searchParams) ?? {}), false);
  const demo = localizedHref('/#demo', l);
  return (
    <V2Shell locale={l} pathname="/sentinelle-population" englishAvailable={false}>
      <JsonLd value={faqJsonLd(t.faqs.map(([q, a]) => ({ question: q, answer: a })))} />

      <EditorialHero id="population-title" label="CORO · Sentinelle Population" title={[t.h1]} lead={t.lead} detail={t.note}
        photo={{ src: '/website-v2/sentinel/sentinelle-population-alert-territory.webp', side: 'end', position: '52% 50%', mobilePosition: '52% 50%', coverage: 58, mobileRatio: '16 / 11' }}
        actions={<><Button href={demo} surface="dark">{t.demo}</Button><Button href="#scenario" variant="ghost" surface="dark">{t.discover}</Button></>} />

      <PageSection tone="white" labelledBy="population-problem-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-problem-title" label="PUE → OPÉRATIONS" heading={t.problem}><p>{t.problemText}</p></EditorialBlock>
          <div className={styles.bridge}>
            <section aria-label="Planifier"><h3>01 · PLANIFIER</h3><ol>{t.plan.map((x) => <li key={x}>{x}</li>)}</ol></section>
            <p className={styles.bridgeMid}>PUE <span aria-hidden="true">→</span> Sentinelle Population</p>
            <section aria-label="Exécuter"><h3>02 · EXÉCUTER</h3><ol>{t.execute.map((x) => <li key={x}>{x}</li>)}</ol></section>
          </div>
        </div>
      </PageSection>

      <PageSection tone="navy" id="scenario" labelledBy="population-scenario-title">
        <EditorialBlock id="population-scenario-title" label="MISE EN SITUATION · FUITE NH₃" heading={t.scenario}><p>{t.scenarioText}</p><p className={styles.illusOnDark}>{illus}. Une seule situation, quatre actes.</p></EditorialBlock>
      </PageSection>

      {/* ACTE I — Détecter et comprendre: the field photograph is the large narrative moment; the two interfaces are operational proof. */}
      <PageSection tone="white" labelledBy="population-act-1">
        <div className={styles.stack}>
          <p className={styles.act}>ACTE I</p><h2 id="population-act-1" className={styles.actTitle}>Détecter et comprendre</h2>
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
          <p className={styles.act}>ACTE II</p><h2 id="population-act-2" className={styles.actTitle}>Déterminer qui peut être concerné</h2>
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
                  <p className={styles.illus}>Zones et chiffres illustratifs d’un scénario fictif : ils ne constituent pas une analyse d’impact. {illus}.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      {/* ACTE III — Informer et suivre: interfaces as operational proof. */}
      <PageSection tone="white" labelledBy="population-act-3">
        <div className={styles.stack}>
          <p className={styles.act}>ACTE III</p><h2 id="population-act-3" className={styles.actTitle}>Informer et suivre</h2>
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
          <p className={styles.act}>ACTE IV</p><h2 id="population-act-4" className={styles.actTitle}>Fermer et apprendre</h2>
          <div className={styles.strip}>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[8][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(9).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-9">{t.steps[8][0]}</h3><p>{t.steps[8][1]}</p></div></div>
            <div className={`${styles.panel}`}><MediaFrame src={`${IMG}/${t.steps[9][2]}`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 620px, 100vw" /><div className={styles.pbody}><p className={styles.big}>{String(10).padStart(2, '0')}<span>/10</span></p><h3 id="population-step-10">{t.steps[9][0]}</h3><p>{t.steps[9][1]}</p><p className={styles.trace}><strong>{t.trace}</strong> {t.traceText}</p></div></div>
          </div>
          <p className={styles.illus}>{illus}.</p>
        </div>
      </PageSection>

      {/* Break: from the scenario to what supports it. */}
      <PageSection tone="navy" labelledBy="population-frame-title">
        <EditorialBlock id="population-frame-title" label="APRÈS LE SCÉNARIO" heading="Ce qui soutient ce scénario." />
      </PageSection>

      <PageSection tone="white" labelledBy="population-phases-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-phases-title" heading="Préparer. Alerter. Documenter." />
          <ol className={styles.timeline}>{t.phases.map(([a, b, c], i) => <li key={a} data-stage={i}><p className={styles.stageKicker}>{a}</p><h3>{b}</h3><p>{c}</p></li>)}</ol>
          <h2 className={styles.subTitle}>{t.value}</h2>
          <ol className={styles.values}>{t.values.map(([a, b]) => <li key={a}><h3>{a}</h3><p>{b}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="population-portal-title">
        <SplitContent order="media-text" ratio="5-7" align="center"
          media={<MediaFrame src={`${IMG}/sentinelle-population-portail.webp`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 720px, 100vw" />}
          text={<div className={styles.stack}><EditorialBlock id="population-portal-title" label="PORTAIL CITOYEN" heading={t.portal}><p>{t.portalText}</p></EditorialBlock><p className={styles.illus}>Installation industrielle Prémont (site fictif) · Sentinelle Population · Propulsé par CORO. {illus}.</p></div>} />
      </PageSection>

      <PageSection tone="navy" labelledBy="population-continuity-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-continuity-title" heading={t.continuity} />
          <div className={styles.columns}>
            <section><h3>LE PUE PRÉPARE</h3><p>Scénarios · responsabilités · mesures · zones · communications</p></section>
            <section><h3>SENTINELLE POPULATION OPÉRATIONNALISE</h3><p>Population concernée · messages · approbation · diffusion · suivi</p></section>
            <section><h3>CORO DOCUMENTE</h3><p>Chronologie · actions · communications · preuves disponibles · REX</p></section>
          </div>
          <h3 className={styles.subTitleDark}>Une continuité numérique, de la préparation à l’amélioration.</h3><ol className={styles.eco} aria-label="Écosystème CORO">{['Documentation / planification', 'PUE', 'Sentinelle Population', 'Gestion de l’incident', 'Intervention', 'Traçabilité', 'Exercices / REX'].map((x) => <li key={x} data-self={x === 'Sentinelle Population' ? 'true' : undefined}>{x}</li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="population-responders-title">
        <SplitContent ratio="5-7" align="center"
          text={<div className={styles.stack}><EditorialBlock id="population-responders-title" heading="L’installation agit au sein d’un écosystème d’intervention."><p>Sentinelle Population ne remplace ni l’organisation d’urgence, ni les municipalités, ni les services d’urgence, ni les autorités environnementales. La plateforme soutient les communications relevant du plan et des responsabilités de l’installation.</p></EditorialBlock></div>}
          media={<MediaFrame src={`${IMG}/sentinelle-population-intervention.webp`} alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 720px, 100vw" />} />
      </PageSection>

      <PageSection tone="soft" labelledBy="population-reg-title">
        <SplitContent ratio="5-7" align="start"
          text={<div className={styles.stack}><EditorialBlock id="population-reg-title" label="RUE / E2" heading={t.reg}><p>{t.regText}</p></EditorialBlock><a className={styles.ext} href={REG_URL} target="_blank" rel="noreferrer">Consulter le règlement officiel (site du gouvernement du Canada)<span aria-hidden="true"> ↗</span></a></div>}
          media={<p className={styles.statement}>{t.disclaimer}</p>} />
      </PageSection>

      <PageSection tone="white" labelledBy="population-distinct-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-distinct-title" heading={t.distinct} />
          <div className={styles.columns2}>
            <section><h3>CORO Sentinelle</h3><p className={styles.q}>Qui est présent dans mon bâtiment?</p><p>Occupation, visiteurs, employés, évacuation et point de rassemblement.</p><a href="/sentinelle">En savoir plus sur CORO Sentinelle<span aria-hidden="true"> →</span></a></section>
            <section><h3>Sentinelle Population</h3><p className={styles.q}>Qui pourrait être touché autour de mon installation?</p><p>Zone, population abonnée, messages, diffusion et traçabilité.</p></section>
          </div>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="population-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="population-faq-title" label="FAQ" heading="Questions fréquentes" />
          <Accordion label="Questions fréquentes" items={t.faqs.map(([q, a], i) => ({ id: `faq-${i}`, question: q, answer: a }))} />
        </div>
      </PageSection>

      <CTASection id="population-cta-title" tone="dark" label="Sentinelle Population" statement={t.final} support={t.finalText} primary={{ label: t.demo, href: demo }} />
    </V2Shell>
  );
}
