import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowDown, ArrowRight, BellRing, Building2, CheckCircle2, FileText, MapPinned, ShieldCheck, Users } from 'lucide-react';
import styles from './page.module.css';

const ROOT = '/images/sentinelle_population';
const SITE = 'https://getcoro.io';
type Props = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const en = (await searchParams).lang === 'en';
  const title = en ? 'Sentinelle Population | Public alerting and E2 plans | CORO' : 'Sentinelle Population | Alerte à la population et PUE | CORO';
  const description = en ? 'Help industrial facilities prepare, implement and document public communications as part of environmental emergency planning.' : 'Sentinelle Population aide les installations industrielles à préparer, mettre en œuvre et documenter leurs communications à la population dans le cadre de leur planification d’urgence environnementale.';
  const url = `${SITE}/sentinelle-population${en ? '?lang=en' : ''}`;
  return { title, description, alternates: { canonical: url, languages: { 'fr-CA': `${SITE}/sentinelle-population`, 'en-CA': `${SITE}/sentinelle-population?lang=en` } }, openGraph: { title, description, url, type: 'website', images: [`${ROOT}/sentinelle-population-hero-ammoniac.webp`] }, twitter: { card: 'summary_large_image', title, description, images: [`${ROOT}/sentinelle-population-hero-ammoniac.webp`] } };
}

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
      ['Population concernée', 'La zone préparée est appliquée aux abonnés actifs, sans exposer leur position individuelle aux opérateurs.', 'sentinelle-population-zone.webp'],
      ['Message', 'L’équipe prépare une communication adaptée. Les consignes demeurent celles approuvées pour la situation réelle.', 'sentinelle-population-messages.webp'],
      ['Diffusion', 'Après validation humaine, les communications admissibles sont diffusées par les canaux activés.', 'sentinelle-population-diffusion.webp'],
      ['Suivi', 'Le cockpit distingue préparation, diffusion, acceptation fournisseur et preuves de livraison disponibles.', 'sentinelle-population-incident.webp'],
      ['Fin d’alerte', 'Une communication accompagne le retour à la normale lorsque la décision appropriée est prise.', 'sentinelle-population-fin-alerte.webp'],
      ['Traçabilité et REX', 'La chronologie, les actions, les messages et les statuts soutiennent la revue après l’événement.', 'sentinelle-population-tracabilite.webp'],
    ],
    phases: [['AVANT', 'Préparer', 'Installation, scénario, zone, consignes, canaux et gouvernance.'], ['PENDANT', 'Alerter', 'Évaluer, cibler, préparer, approuver, diffuser et suivre.'], ['APRÈS', 'Documenter', 'Fin d’alerte, chronologie, preuves disponibles et retour d’expérience.']],
    portal: 'Un portail citoyen conçu pour l’inscription, pas pour exposer la population.', portalText: 'Le citoyen peut consentir, confirmer ses canaux et enregistrer son secteur d’alerte. L’adresse temporairement saisie n’est pas conservée; les opérateurs ne voient ni coordonnées ni marqueurs individuels.',
    zone: 'De la zone potentiellement concernée à la communication.', flow: ['INSTALLATION', 'SCÉNARIO', 'ZONE POTENTIELLEMENT CONCERNÉE', 'POPULATION ABONNÉE', 'COMMUNICATION'],
    value: 'Ce que Sentinelle Population apporte sur le terrain.', values: [['Préparation en amont', 'Structurer le programme, les zones et les consignes avant l’événement.'], ['Activation opérationnelle', 'Passer du scénario préparé à une alerte gouvernée par des permissions explicites.'], ['Communication ciblée', 'Calculer des agrégats et préparer les canaux réellement disponibles.'], ['Suivi de diffusion', 'Suivre les états opérationnels et les preuves disponibles.'], ['Confidentialité intégrée', 'Savoir où alerter sans montrer qui habite où.'], ['Traçabilité', 'Conserver un historique exploitable pour la revue.']],
    continuity: 'Une seule continuité : de la planification à l’intervention.', future: 'Le configurateur PUE complet demeure une évolution prévue. Sentinelle Population est conçu pour s’intégrer à cette continuité sans présenter cette intégration future comme déjà disponible.',
    reg: 'Conçu pour soutenir une préparation structurée.', regText: 'Le Règlement sur les urgences environnementales (2019), pris sous la Loi canadienne sur la protection de l’environnement (1999), prévoit notamment des éléments relatifs aux environs d’une installation et aux communications avec les membres du public susceptibles d’être touchés.',
    disclaimer: 'CORO soutient la planification, l’intervention et la traçabilité. Son utilisation ne garantit pas à elle seule la conformité et ne remplace pas les obligations, décisions ou communications des autorités compétentes.',
    trace: 'Une alerte envoyée ne devrait jamais devenir une action impossible à retracer.', traceText: 'CORO conserve les étapes de préparation et d’approbation, le message figé, les canaux, les agrégats, les tentatives et les statuts disponibles.',
    distinct: 'Deux périmètres complémentaires, une même résilience.', final: 'Votre PUE est-il prêt à passer du document à l’action?', finalText: 'Découvrez comment Sentinelle Population peut soutenir la préparation et la mise en œuvre du volet d’alerte à la population de votre organisation.',
    faqs: [['Sentinelle Population remplace-t-il un PUE?', 'Non. Le PUE demeure le cadre de planification et d’intervention.'], ['Garantit-il la conformité réglementaire?', 'Non. CORO est un outil de soutien; l’organisation demeure responsable de ses obligations et décisions.'], ['Peut-on préparer les communications à l’avance?', 'Oui. Scénarios, zones et instructions peuvent être préparés avant une alerte autorisée.'], ['Peut-on l’utiliser lors d’un exercice?', 'Oui, dans un cadre contrôlé, notamment en mode SANDBOX.'], ['Remplace-t-il Québec En Alerte?', 'Non. Les autorités et systèmes publics conservent leurs responsabilités et mécanismes.']],
  },
  en: {} as never,
};

export default async function Page({ searchParams }: Props) {
  const en = (await searchParams).lang === 'en';
  const t = copy.fr;
  const contact = en ? '/contact?lang=en' : '/contact';
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: t.faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) };
  return <main className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }} />
    <nav className={styles.nav}><a className={styles.logo} href={en ? '/?lang=en' : '/'}>CO<span>RO</span></a><div><a href={en ? '/?lang=en' : '/'}>{t.home}</a><a href={en ? '/sentinelle-population' : '/sentinelle-population?lang=en'}>{t.lang}</a><a className={styles.navCta} href={contact}>{t.demo}</a></div></nav>
    <section className={styles.hero}><Image src={`${ROOT}/sentinelle-population-hero-ammoniac.webp`} alt="" fill priority sizes="100vw"/><div className={styles.shade}/><div className={styles.heroCopy}><p className={styles.eyebrow}>CORO · SENTINELLE POPULATION</p><h1>{t.h1}</h1><p>{t.lead}</p><div className={styles.actions}><a href={contact}>{t.demo}<ArrowRight/></a><a href="#scenario">{t.discover}<ArrowDown/></a></div><small><ShieldCheck/>{t.note}</small></div></section>
    <section className={styles.light}><div className={styles.container}><header><span>PUE → OPÉRATIONS</span><h2>{t.problem}</h2><p>{t.problemText}</p></header><div className={styles.bridge}><article><b>01 · PLANIFIER</b>{t.plan.map(x=><p key={x}>{x}</p>)}</article><div><FileText/><strong>PUE</strong><ArrowRight/><BellRing/><strong>Sentinelle Population</strong></div><article><b>02 · EXÉCUTER</b>{t.execute.map(x=><p key={x}>{x}</p>)}</article></div></div></section>
    <section id="scenario" className={styles.dark}><div className={styles.container}><header><span>MISE EN SITUATION · FUITE NH₃</span><h2>{t.scenario}</h2><p>{t.scenarioText}</p></header><div className={styles.steps}>{t.steps.map(([title,text,img],i)=><article key={title}><div><b>{String(i+1).padStart(2,'0')}</b><h3>{title}</h3><p>{text}</p></div><Image src={`${ROOT}/${img}`} alt={`${title} — mise en situation fictive Sentinelle Population`} width={1200} height={750} sizes="(max-width: 800px) 100vw, 52vw"/></article>)}</div></div></section>
    <section className={styles.phases}><div className={styles.container}><h2>Préparer. Alerter. Documenter.</h2><div>{t.phases.map(([a,b,c])=><article key={a}><span>{a}</span><h3>{b}</h3><p>{c}</p></article>)}</div></div></section>
    <section className={styles.split}><div className={styles.container}><div><span>PORTAIL CITOYEN</span><h2>{t.portal}</h2><p>{t.portalText}</p><aside><strong>Installation industrielle Prémont</strong><small>Sentinelle Population · Propulsé par CORO</small></aside></div><Image src={`${ROOT}/sentinelle-population-portail.webp`} alt="Portail citoyen de l’installation fictive Prémont" width={1400} height={900}/></div></section>
    <section className={styles.zone}><div className={styles.container}><header><span>DE LA ZONE À LA COMMUNICATION</span><h2>{t.zone}</h2></header><div className={styles.zoneGrid}><div>{t.flow.map((x,i)=><p key={x}><b>{i+1}</b>{x}</p>)}</div><Image src={`${ROOT}/sentinelle-population-zone.webp`} alt="Carte agrégée sans position citoyenne individuelle" width={1400} height={900}/></div></div></section>
    <section className={styles.values}><div className={styles.container}><header><span>CAPACITÉS ACTUELLES</span><h2>{t.value}</h2></header>{t.values.map(([a,b],i)=><article key={a}><b>{String(i+1).padStart(2,'0')}</b><div><h3>{a}</h3><p>{b}</p></div></article>)}</div></section>
    <section className={styles.continuity}><div className={styles.container}><h2>{t.continuity}</h2><div><article><FileText/><h3>LE PUE PRÉPARE</h3><p>Scénarios · responsabilités · mesures · zones · communications</p></article><article><BellRing/><h3>SENTINELLE POPULATION OPÉRATIONNALISE</h3><p>Population concernée · messages · approbation · diffusion · suivi</p></article><article><CheckCircle2/><h3>CORO DOCUMENTE</h3><p>Chronologie · actions · communications · preuves disponibles · REX</p></article></div><small>{t.future}</small></div></section>
    <section className={styles.reg}><div className={styles.container}><div><span>RUE / E2</span><h2>{t.reg}</h2><p>{t.regText}</p><a href="https://laws-lois.justice.gc.ca/fra/reglements/DORS-2019-51/" target="_blank" rel="noreferrer">Consulter le règlement officiel <ArrowRight/></a></div><aside><ShieldCheck/><p>{t.disclaimer}</p></aside></div></section>
    <section className={styles.eco}><div className={styles.container}><span>ÉCOSYSTÈME CORO</span><h2>Une continuité numérique, de la préparation à l’amélioration.</h2><div>{['Documentation / planification','PUE','Sentinelle Population','Gestion de l’incident','Intervention','Traçabilité','Exercices / REX'].map(x=><strong key={x}>{x}</strong>)}</div></div></section>
    <section className={styles.responders}><Image src={`${ROOT}/sentinelle-population-intervention.webp`} alt="Équipe industrielle et premiers répondants" fill sizes="100vw"/><div className={styles.shade}/><div className={styles.container}><Users/><h2>L’installation agit au sein d’un écosystème d’intervention.</h2><p>Sentinelle Population ne remplace ni l’organisation d’urgence, ni les municipalités, ni les services d’urgence, ni les autorités environnementales. La plateforme soutient les communications relevant du plan et des responsabilités de l’installation.</p></div></section>
    <section className={styles.split}><div className={styles.container}><Image src={`${ROOT}/sentinelle-population-tracabilite.webp`} alt="Traçabilité des communications Sentinelle Population" width={1400} height={900}/><div><span>TRAÇABILITÉ</span><h2>{t.trace}</h2><p>{t.traceText}</p></div></div></section>
    <section className={styles.distinct}><div className={styles.container}><h2>{t.distinct}</h2><div><article><Building2/><h3>CORO Sentinelle</h3><b>Qui est présent dans mon bâtiment?</b><p>Occupation, visiteurs, employés, évacuation et point de rassemblement.</p></article><article><MapPinned/><h3>Sentinelle Population</h3><b>Qui pourrait être touché autour de mon installation?</b><p>Zone, population abonnée, messages, diffusion et traçabilité.</p></article></div></div></section>
    <section className={styles.faq}><div className={styles.container}><header><span>FAQ</span><h2>Questions fréquentes</h2></header>{t.faqs.map(([q,a])=><details key={q}><summary>{q}<b>+</b></summary><p>{a}</p></details>)}</div></section>
    <section className={styles.final}><div className={styles.container}><span>SENTINELLE POPULATION</span><h2>{t.final}</h2><p>{t.finalText}</p><a href={contact}>{t.demo}<ArrowRight/></a></div></section>
  </main>;
}
