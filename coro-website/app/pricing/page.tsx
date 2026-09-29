import type { Metadata } from 'next';
import DemoForm from '@/app/DemoForm';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
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
 * /pricing (MIG-04B) — MODEL A: no fixed public prices. The page explains how a CORO commercial offer is configured and leads to a personalised discussion.
 * Authority: docs/website-v2/05-migration/MIG-04-PRE-SECURITY-PRICING-GATE.md (claim matrix §7, human decisions D1-D14). LANGUAGE: TRUE FR / EN.
 * PRODUCT CAPABILITY (what CORO does) is kept apart from COMMERCIAL PACKAGING (how access is sold): capabilities are described for what they allow, never as
 * separately priced modules, tiers or bundles; the four scoping dimensions "help define the scope" and are explicitly not billing rules.
 * NOT published: any price, "starting at", discount, plan or tier name, free trial or its limits, founder programme, referral credit, a firm response delay,
 * SLA or support tiers, included hours, a billing formula, future modules (Knowledge, Network, Campus, Ops, AI as a product), Phase-2 document types,
 * "built by practitioners", "most common configuration". The Sentinelle Population scoping variables are NOT listed here: they belong to the commercial discovery.
 * The hero is a MARKETING ILLUSTRATION (decorative, alt=""): the screen is an abstract representation, never a product screenshot.
 * The shared DemoForm is unchanged (its confirmation message still carries a 24-hour phrase: recorded cross-page debt).
 */
const copy = {
  fr: {
    metaTitle: 'Tarification : une offre configurée selon votre organisation',
    description: 'CORO n’affiche pas de prix fixe. L’offre se définit avec vous selon vos bâtiments, vos utilisateurs, les capacités utiles et l’accompagnement souhaité.',
    label: 'Tarification',
    lines: ['Une offre configurée', 'autour de votre organisation.'],
    lead: 'CORO n’affiche pas de prix fixe. Chaque organisation a ses bâtiments, ses équipes et ses besoins : l’offre se définit avec vous, à partir de votre environnement.',
    detail: 'Démonstration d’abord · Offre définie avec vous',
    ask: 'Demander une offre', how: 'Voir comment l’offre est définie',
    s1: { n: '01', label: 'Pourquoi il n’y a pas un prix unique', title: 'Des environnements différents demandent une portée différente.',
      text: [
        'Deux organisations peuvent utiliser CORO de façons très différentes : un seul bâtiment ou plusieurs, une équipe interne ou des mandats pour des clients, quelques capacités ou l’ensemble.',
        'C’est pourquoi aucun prix n’est affiché : nous préférons définir avec vous une offre qui correspond à votre situation plutôt que de vous proposer un forfait qui ne lui correspondrait pas.',
      ],
      examplesLabel: 'À titre d’exemple',
      examples: [
        ['Un bâtiment', 'Structurer la préparation d’un bâtiment : plans d’urgence, présence des occupants, suivi de la préparation.'],
        ['Plusieurs bâtiments ou sites', 'Obtenir une vue consolidée de la résilience d’un parc de bâtiments, avec des documents et des mandats suivis à cette échelle.'],
        ['Firmes et professionnels', 'Accompagner plusieurs organisations clientes, avec un portail distinct par client et des mandats, livrables et échéances centralisés.'],
      ] as const,
      note: 'Ces situations ne sont pas des forfaits : elles illustrent des contextes courants. Votre offre peut les combiner ou s’en écarter.' },
    s2: { n: '02', label: 'Comprendre votre environnement', title: 'Quatre repères pour définir la portée.',
      text: 'Ces repères nous aident à comprendre votre situation et à définir la portée de l’offre.',
      dims: [
        ['Sites et bâtiments', 'Le nombre de sites et de bâtiments, et leur complexité (type d’occupation, risques, réalité multisite), aident à définir l’étendue du déploiement.'],
        ['Utilisateurs', 'Les personnes appelées à utiliser CORO (équipe interne, intervenants, gestionnaires) aident à prévoir les comptes et les rôles.'],
        ['Capacités CORO', 'Les capacités utiles à votre organisation, décrites ci-dessous, définissent l’étendue fonctionnelle de votre environnement.'],
        ['Accompagnement', 'Le niveau souhaité de configuration assistée, de formation et de soutien continu.'],
      ] as const,
      note: 'Ces repères servent à comprendre votre environnement. Ils ne sont pas des règles de facturation : les conditions commerciales sont précisées dans l’offre.' },
    s3: { n: '03', label: 'Choisir les capacités utiles', title: 'Les capacités CORO actuelles.',
      text: 'Voici ce que CORO permet de faire aujourd’hui. Chaque capacité est décrite pour ce qu’elle permet, et non comme un module vendu séparément.',
      caps: [
        { name: 'Production documentaire', text: 'Plans de mesures d’urgence (PMU), de sécurité incendie (PSI) et de continuité des activités (PCA) : procédures intégrées, génération, approbation et export PDF bilingue.', href: '/gestion-documentaire' },
        { name: 'Gestion de projets et de mandats', text: 'Centralisez bâtiments, activités, échéances et responsabilités, et suivez l’avancement de chaque mandat depuis un environnement unique.', href: '/gestion-de-projets' },
        { name: 'Performance', text: 'Lisez les heures, la capacité d’équipe et l’avancement de vos mandats pour orienter vos décisions.', href: '/performance-objectifs' },
        { name: 'Portail client', text: 'Donnez à vos clients un accès structuré à leurs documents, à leurs activités et à leur statut de préparation.', href: '/portail-client' },
        { name: 'Résilience opérationnelle', text: 'Reliez préparation et intervention : indice de résilience, organisation d’urgence, registre de présence, gestion d’incidents et retour d’expérience.', href: '/resilience-operationnelle' },
      ] as const,
      statement: 'Ce que CORO permet de faire (les capacités) et la façon dont l’accès est proposé (l’offre) sont deux choses distinctes. Cette page décrit la première ; la seconde se précise dans la discussion.',
      population: 'Certains contextes spécialisés, comme l’alerte à la population autour d’une installation industrielle, demandent une discussion de cadrage distincte.', populationLink: 'Découvrir Sentinelle Population', explore: 'Découvrir', coreLabel: 'Au centre', coreTitle: 'Votre organisation.', coreText: 'CORO se compose autour de votre environnement : les capacités retenues dépendent de vos besoins.' },
    s4: { n: '04', label: 'De la portée à l’offre', title: 'Du premier échange à l’accompagnement.',
      steps: [
        ['Évaluation', 'Nous discutons de votre environnement (sites, bâtiments, équipes et besoins opérationnels) pour comprendre votre réalité. Une offre adaptée vous est ensuite proposée.'],
        ['Configuration', 'Les capacités CORO pertinentes sont activées et paramétrées selon ce qui a été défini avec vous.'],
        ['Déploiement', 'Votre environnement CORO est mis en place et vos équipes commencent à l’utiliser.'],
        ['Accompagnement', 'Un accompagnement est assuré selon ce qui est convenu : configuration, formation et soutien.'],
      ] as const },
    s5: { n: '05', label: 'Une conversation, pas un tableau de prix', statement: 'Pas de prix générique pour une organisation qui ne l’est pas.',
      text: 'CORO est configuré selon l’environnement de votre organisation, les capacités dont elle a besoin et le niveau d’accompagnement convenu.', itemsLabel: 'La discussion permet de clarifier',
      items: ['Les sites et les bâtiments concernés', 'Les capacités utiles à votre organisation', 'Les utilisateurs et les rôles à prévoir', 'Le niveau d’accompagnement souhaité', 'Les besoins particuliers de votre contexte'] as const },
    res: { label: 'Ressources', title: 'Pour situer votre besoin.', items: [
      { slug: 'combien-coute-plan-mesures-urgence-pmu', title: 'Combien coûte un plan de mesures d’urgence (PMU) ?', text: 'Ce qui fait varier l’effort et le coût d’un plan d’urgence, et pourquoi il n’existe pas de tarif universel.' },
      { slug: 'plan-mesures-urgence-word-excel-logiciel', title: 'Plan de mesures d’urgence : Word, Excel ou logiciel spécialisé ?', text: 'Quand passer de fichiers Word et Excel à un logiciel spécialisé de gestion des mesures d’urgence.' },
      { slug: 'gerer-plans-urgence-plusieurs-batiments', title: 'Comment gérer les plans d’urgence de plusieurs bâtiments ?', text: 'Standardiser, centraliser et tenir à jour les plans d’urgence d’un parc de bâtiments.' },
    ] as const },
    referral: { label: 'Programme de recommandation', title: 'Vous connaissez une organisation qui pourrait bénéficier de CORO?', text: 'CORO a un programme de recommandation. Lorsqu’une organisation devient un client admissible, votre organisation peut recevoir un crédit CORO de 250 $, selon les conditions du programme. Ce programme est distinct de l’offre décrite sur cette page.', link: 'Découvrir le programme de recommandation' },
    faq: 'Questions fréquentes sur l’offre', faqLabel: 'FAQ',
    faqItems: [
      { q: 'Pourquoi les prix ne sont-ils pas affichés directement?', a: 'Parce que les environnements diffèrent : nombre de sites et de bâtiments, capacités utiles, utilisateurs, accompagnement. L’offre est définie avec vous lors d’une discussion, à partir de votre situation.' },
      { q: 'Pouvons-nous faire évoluer notre configuration CORO avec le temps?', a: 'Oui. Votre configuration peut être ajustée à mesure que vos besoins évoluent (nouveaux sites, nouveaux utilisateurs ou capacités additionnelles), en discussion avec CORO.' },
      { q: 'CORO peut-il gérer plusieurs sites ou bâtiments?', a: 'Oui. CORO est conçu pour supporter un ou plusieurs bâtiments, avec une configuration qui reflète le nombre de sites et leur réalité opérationnelle respective.' },
      { q: 'Nous sommes une firme qui accompagne plusieurs clients : est-ce pris en charge?', a: 'Oui. CORO peut être configuré pour des professionnels qui gèrent des mandats pour plusieurs organisations clientes, avec des portails et des livrables distincts par client.' },
      { q: 'La formation et l’accompagnement sont-ils inclus?', a: 'Le niveau d’accompagnement (configuration assistée, formation, soutien continu) fait partie des éléments abordés lors de l’évaluation de vos besoins.' },
      { q: 'Où sont hébergées nos données?', a: 'L’infrastructure applicative principale de CORO est hébergée au Canada, dans la région de Toronto. Certains services de soutien peuvent faire appel à des fournisseurs qui traitent certaines données ailleurs. La page Sécurité et hébergement explique ce que cela signifie.' },
      { q: 'Existe-t-il une période d’essai?', a: 'Nous commençons par une démonstration et une discussion sur votre environnement. Un accès de démonstration ou d’évaluation peut être convenu séparément, selon la situation.' },
      { q: 'Comment demander une offre?', a: 'Utilisez le formulaire de cette page. C’est le même que celui de la demande de démonstration. Notre équipe vous contactera pour discuter de vos besoins.' },
    ],
    form: { label: 'Demander une offre', title: 'Construisons votre environnement CORO.', text: 'Décrivez-nous votre contexte, vos bâtiments ou sites et ce dont vous avez besoin. Notre équipe vous contactera pour discuter de vos besoins et de la configuration qui convient. Le formulaire est le même que celui de la demande de démonstration.' },
  },
  en: {
    metaTitle: 'Pricing: an offer configured around your organization',
    description: 'CORO does not display fixed prices. The offer is defined with you based on your buildings, your users, the capabilities you need and the support you want.',
    label: 'Pricing',
    lines: ['An offer configured', 'around your organization.'],
    lead: 'CORO does not display fixed prices. Each organization has its own buildings, teams and needs: the offer is defined with you, based on your environment.',
    detail: 'Demo first · Offer defined with you',
    ask: 'Request an offer', how: 'See how the offer is defined',
    s1: { n: '01', label: 'Why there is no single price', title: 'Different environments call for a different scope.',
      text: [
        'Two organizations can use CORO in very different ways: one building or several, an internal team or engagements for clients, a few capabilities or all of them.',
        'This is why no price is displayed: we prefer to define with you an offer that fits your situation rather than propose a package that would not.',
      ],
      examplesLabel: 'For example',
      examples: [
        ['One building', 'Structure the readiness of a building: emergency plans, occupant presence, readiness tracking.'],
        ['Several buildings or sites', 'Get a consolidated view of the resilience of a portfolio of buildings, with documents and engagements tracked at that scale.'],
        ['Firms and professionals', 'Support several client organizations, with a separate portal per client and centralized engagements, deliverables and deadlines.'],
      ] as const,
      note: 'These situations are not packages: they illustrate common contexts. Your offer may combine them or depart from them.' },
    s2: { n: '02', label: 'Understand your environment', title: 'Four reference points to define the scope.',
      text: 'These reference points help us understand your situation and define the scope of the offer.',
      dims: [
        ['Sites and buildings', 'The number of sites and buildings, and their complexity (occupancy type, hazards, multi-site reality), help define the extent of the deployment.'],
        ['Users', 'The people who will use CORO (internal team, responders, managers) help plan accounts and roles.'],
        ['CORO capabilities', 'The capabilities useful to your organization, described below, define the functional scope of your environment.'],
        ['Support', 'The desired level of guided configuration, training and ongoing support.'],
      ] as const,
      note: 'These reference points help us understand your environment. They are not billing rules: commercial terms are set out in the offer.' },
    s3: { n: '03', label: 'Choose the useful capabilities', title: 'CORO’s current capabilities.',
      text: 'Here is what CORO allows you to do today. Each capability is described for what it enables, not as a separately sold module.',
      caps: [
        { name: 'Document production', text: 'Emergency response plans (ERP), fire safety plans (FSP) and business continuity plans (BCP): built-in procedures, generation, approval and bilingual PDF export.', href: '/gestion-documentaire' },
        { name: 'Project and engagement management', text: 'Centralize buildings, activities, deadlines and responsibilities, and track the progress of every engagement from one environment.', href: '/gestion-de-projets' },
        { name: 'Performance', text: 'Read hours, team capacity and engagement progress to guide your decisions.', href: '/performance-objectifs' },
        { name: 'Client portal', text: 'Give your clients structured access to their documents, activities and readiness status.', href: '/portail-client' },
        { name: 'Operational resilience', text: 'Connect preparedness and response: resilience index, emergency organization, occupancy register, incident management and lessons learned.', href: '/resilience-operationnelle' },
      ] as const,
      statement: 'What CORO allows you to do (the capabilities) and how access is offered (the offer) are two separate things. This page describes the first; the second is set out in the discussion.',
      population: 'Some specialized contexts, such as public alerting around an industrial facility, call for a separate scoping discussion.', populationLink: 'Discover Sentinelle Population', explore: 'Discover', coreLabel: 'At the center', coreTitle: 'Your organization.', coreText: 'CORO is composed around your environment: the capabilities selected depend on your needs.' },
    s4: { n: '04', label: 'From scope to offer', title: 'From the first conversation to ongoing support.',
      steps: [
        ['Assessment', 'We discuss your environment (sites, buildings, teams and operational needs) to understand your reality. A tailored offer is then proposed.'],
        ['Configuration', 'The relevant CORO capabilities are activated and configured according to what was defined with you.'],
        ['Deployment', 'Your CORO environment is set up and your teams start using it.'],
        ['Support', 'Support is provided as agreed: configuration, training and assistance.'],
      ] as const },
    s5: { n: '05', label: 'A conversation, not a price table', statement: 'No generic price for an organization that isn’t generic.',
      text: 'CORO is configured around your organization’s environment, the capabilities it needs and the agreed level of support.', itemsLabel: 'The discussion helps clarify',
      items: ['The sites and buildings involved', 'The capabilities useful to your organization', 'The users and roles to plan for', 'The level of support you want', 'The particular needs of your context'] as const },
    res: { label: 'Resources', title: 'To frame your need.', items: [
      { slug: 'combien-coute-plan-mesures-urgence-pmu', title: 'How much does an emergency response plan cost?', text: 'What makes the effort and cost of an emergency plan vary, and why there is no universal rate.' },
      { slug: 'plan-mesures-urgence-word-excel-logiciel', title: 'Emergency response plan: Word, Excel or specialized software?', text: 'When to move from Word and Excel files to specialized emergency-management software.' },
      { slug: 'gerer-plans-urgence-plusieurs-batiments', title: 'How to manage emergency response plans across multiple buildings', text: 'Standardize, centralize and keep up to date the emergency plans of a portfolio of buildings.' },
    ] as const },
    referral: { label: 'Referral program', title: 'Do you know an organization that could benefit from CORO?', text: 'CORO has a referral program. When an organization becomes an eligible customer, your organization may receive $250 in CORO credit, subject to the program’s conditions. This program is separate from the offer described on this page.', link: 'Discover the referral program' },
    faq: 'Frequently asked questions about the offer', faqLabel: 'FAQ',
    faqItems: [
      { q: 'Why aren’t prices shown directly?', a: 'Because environments differ: number of sites and buildings, useful capabilities, users, support. The offer is defined with you in a discussion, based on your situation.' },
      { q: 'Can we evolve our CORO configuration over time?', a: 'Yes. Your configuration can be adjusted as your needs evolve (new sites, new users or additional capabilities), in discussion with CORO.' },
      { q: 'Can CORO manage multiple sites or buildings?', a: 'Yes. CORO is designed to support one or several buildings, with a configuration that reflects the number of sites and their respective operational reality.' },
      { q: 'We are a firm that supports multiple clients: is that supported?', a: 'Yes. CORO can be configured for professionals who manage engagements for multiple client organizations, with distinct portals and deliverables per client.' },
      { q: 'Are training and support included?', a: 'The level of support (guided configuration, training, ongoing assistance) is one of the elements discussed when assessing your needs.' },
      { q: 'Where is our data hosted?', a: 'CORO’s primary application infrastructure is hosted in Canada, in the Toronto region. Some supporting services may rely on providers that process certain data elsewhere. The Security and hosting page explains what this means.' },
      { q: 'Is there a trial period?', a: 'We start with a demonstration and a discussion about your environment. A demonstration or evaluation access can be agreed separately, depending on the situation.' },
      { q: 'How do I request an offer?', a: 'Use the form on this page. It is the same form as the demonstration request. Our team will contact you to discuss your needs.' },
    ],
    form: { label: 'Request an offer', title: 'Let’s build your CORO environment.', text: 'Tell us about your context, your buildings or sites and what you need. Our team will contact you to discuss your needs and the configuration that fits. The form is the same as the demonstration request form.' },
  },
};

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/pricing', locale: l, title: copy[l].metaTitle, description: copy[l].description });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[l];
  return (
    <V2Shell locale={l} pathname="/pricing">
      <JsonLd value={faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />

      <EditorialHero id="pricing-title" label={t.label} title={t.lines} lead={t.lead} detail={t.detail}
        photo={{ src: '/website-v2/pricing/pricing-coro-modular-platform-v2.webp', side: 'end', position: '80% 50%', mobilePosition: '80% 50%', coverage: 58, mobileRatio: '16 / 11' }}
        actions={<><Button href="#demo" surface="dark">{t.ask}</Button><Button href="#portee" variant="ghost" surface="dark">{t.how}</Button></>} />

      <PageSection tone="white" labelledBy="pricing-s1-title">
        <div className={styles.stack}>
          <EditorialBlock id="pricing-s1-title" label={`${t.s1.n} — ${t.s1.label}`} heading={t.s1.title}>{t.s1.text.map((p) => <p key={p}>{p}</p>)}</EditorialBlock>
          <ul className={styles.situations} aria-label={t.s1.examplesLabel}>{t.s1.examples.map(([name, text], i) => <li key={name} className={styles.card}><span className={styles.cardNum} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h3>{name}</h3><p>{text}</p></li>)}</ul>
          <p className={styles.note}>{t.s1.note}</p>
        </div>
      </PageSection>

      <PageSection tone="soft" id="portee" labelledBy="pricing-s2-title">
        <div className={styles.stack}>
          <EditorialBlock id="pricing-s2-title" label={`${t.s2.n} — ${t.s2.label}`} heading={t.s2.title}><p>{t.s2.text}</p></EditorialBlock>
          <ol className={styles.scope}>{t.s2.dims.map(([name, text], i) => <li key={name} className={styles.card}><span className={styles.cardNum} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h3>{name}</h3><p>{text}</p></li>)}</ol>
          <p className={styles.note}>{t.s2.note}</p>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="pricing-s3-title">
        <div className={styles.stack}>
          <EditorialBlock id="pricing-s3-title" label={`${t.s3.n} — ${t.s3.label}`} heading={t.s3.title}><p>{t.s3.text}</p></EditorialBlock>
          <div className={styles.compose}>
            <div className={styles.core}><p className={styles.kicker}>{t.s3.coreLabel}</p><h3>{t.s3.coreTitle}</h3><p>{t.s3.coreText}</p><p className={styles.coreNote}>{t.s3.statement}</p></div>
            <ul className={styles.blocks}>{t.s3.caps.map((c) => <li key={c.name}><h3>{c.name}</h3><p>{c.text}</p><a className={styles.link} href={localizedHref(c.href, l)} aria-label={`${t.s3.explore} : ${c.name}`}>{t.s3.explore}<span aria-hidden="true"> →</span></a></li>)}</ul>
          </div>
          <p className={styles.note}>{t.s3.population} <a className={styles.link} href={localizedHref('/sentinelle-population', l)}>{t.s3.populationLink}<span aria-hidden="true"> →</span></a></p>
        </div>
      </PageSection>

      <PageSection tone="navy" labelledBy="pricing-s4-title">
        <div className={styles.stack}>
          <EditorialBlock id="pricing-s4-title" label={`${t.s4.n} — ${t.s4.label}`} heading={t.s4.title} />
          <ol className={styles.flow}>{t.s4.steps.map(([name, text], i) => <li key={name}><span className={styles.dot} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h3>{name}</h3><p>{text}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="white" density="immersive" labelledBy="pricing-s5-title">
        <div className={styles.band}>
          <div className={styles.bandStatement}>
            <p className={styles.kicker}>{`${t.s5.n} — ${t.s5.label}`}</p>
            <h2 id="pricing-s5-title">{t.s5.statement}</h2>
            <p className={styles.bandText}>{t.s5.text}</p>
          </div>
          <div className={styles.stack}><p className={styles.kicker}>{t.s5.itemsLabel}</p><ul className={styles.plain}>{t.s5.items.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </PageSection>

      <PageSection tone="soft" density="compact" labelledBy="pricing-res-title">
        <div className={styles.stack}>
          <EditorialBlock id="pricing-res-title" label={t.res.label} heading={t.res.title} />
          <ul className={styles.rows}>{t.res.items.map((r) => <li key={r.slug}><h3><a className={styles.link} href={localizedHref(`/blog/${r.slug}`, l)}>{r.title}</a></h3><p>{r.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" density="compact" labelledBy="pricing-ref-title">
        <div className={styles.callout}>
          <div className={styles.calloutCopy}>
            <p className={styles.kicker}>{t.referral.label}</p>
            <h2 id="pricing-ref-title">{t.referral.title}</h2>
            <p>{t.referral.text}</p>
          </div>
          <Button href={localizedHref('/programme-recommandation', l)} variant="secondary">{t.referral.link}</Button>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="pricing-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="pricing-faq-title" label={t.faqLabel} heading={t.faq} />
          <Accordion label={t.faq} items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <PageSection tone="white" id="demo" labelledBy="pricing-form-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="pricing-form-title" label={t.form.label} heading={t.form.title}><p>{t.form.text}</p></EditorialBlock>}
          media={<div className={styles.formPanel}><DemoForm lang={l} /></div>} />
      </PageSection>
    </V2Shell>
  );
}
