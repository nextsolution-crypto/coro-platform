import type { Metadata } from 'next';
import {
  Building2,
  MapPin,
  Users,
  Zap,
  Briefcase,
  FileText,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  Award,
} from 'lucide-react';
import DemoForm from '../DemoForm';

const SITE_URL = 'https://getcoro.io';

type Lang = 'fr' | 'en';

type PageProps = {
  searchParams: Promise<{
    lang?: string | string[];
  }>;
};

function getLang(raw: string | string[] | undefined): Lang {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'en' ? 'en' : 'fr';
}

const CONTENT = {
  fr: {
    metadata: {
      title: 'Tarification CORO — Une configuration adaptée à votre organisation',
      description:
        'La tarification CORO s\'adapte au nombre de sites et bâtiments, aux utilisateurs, aux capacités CORO activées et au niveau d\'accompagnement souhaité. Demandez une démonstration adaptée à votre organisation.',
    },

    tag: 'Tarification',

    hero: {
      eyebrow: 'TARIFICATION',
      title: 'Une tarification qui s\'adapte à votre organisation.',
      text:
        'CORO s\'adapte à votre réalité opérationnelle : le nombre de sites et de bâtiments, le nombre d\'utilisateurs, les capacités activées et le niveau d\'accompagnement souhaité. Nous construisons cette configuration avec vous.',
      primaryCta: 'Demander une démo',
      secondaryCta: 'Voir les facteurs de configuration',
      reassurance: 'Réponse sous 24 heures',
      expertise: 'Conçu par des praticiens de la sécurité incendie et des mesures d\'urgence',
    },

    founderProgram: {
      ribbon: 'PROGRAMME FONDATEUR',
      sealLabel: 'FONDATEUR',
      title: 'Devenez l\'une des premières organisations à faire confiance à CORO.',
      subtitle:
        'Les organisations qui rejoignent CORO maintenant façonnent la plateforme avec nous — et en gardent les avantages.',
      benefits: [
        'Tarif fondateur préservé à long terme',
        'Influence directe sur les priorités de développement',
        'Accompagnement prioritaire à la mise en place',
        'Reconnaissance comme partenaire fondateur de CORO',
      ],
      cta: 'Devenir partenaire fondateur',
      footnote:
        'Nombre de places limité — les conditions fondateur ne seront pas offertes indéfiniment.',
    },

    plans: {
      tag: 'CONFIGURATIONS TYPES',
      title: 'Trois profils courants, à titre indicatif.',
      intro:
        'Ces profils illustrent des combinaisons fréquentes de capacités CORO. Votre configuration réelle peut les combiner ou s\'en écarter selon votre réalité.',
      disclaimer:
        'Aucun de ces profils n\'est un forfait fixe — nous établissons votre configuration avec vous lors de l\'évaluation de vos besoins.',
      items: [
        {
          icon: <Building2 size={26} />,
          name: 'Bâtiment unique',
          desc: 'Pour une organisation qui gère un seul bâtiment et veut structurer sa préparation.',
          includes: [
            'Production documentaire (PMU, PSI, PCA)',
            'Présence en temps réel avec Sentinelle',
            'Indice CORO et suivi de préparation',
            'Accompagnement de base',
          ],
          featured: false,
        },
        {
          icon: <MapPin size={26} />,
          name: 'Organisation multi-sites',
          badge: 'CONFIGURATION LA PLUS COURANTE',
          desc: 'Pour une organisation qui gère plusieurs bâtiments et veut une vue consolidée de sa résilience.',
          includes: [
            'Toutes les capacités documentaires',
            'Gestion de projets et mandats multi-bâtiments',
            'Résilience & Intervention complète',
            'Accompagnement dédié à la configuration',
          ],
          featured: true,
        },
        {
          icon: <Briefcase size={26} />,
          name: 'Firmes & professionnels',
          desc: 'Pour les firmes conseil et professionnels qui accompagnent plusieurs organisations clientes.',
          includes: [
            'Portails dédiés par client',
            'Mandats, livrables et échéances centralisés',
            'Configuration adaptée au nombre de clients',
            'Accompagnement multi-organisations',
          ],
          featured: false,
        },
      ],
      cta: 'Demander une démo',
    },

    factors: {
      tag: 'CE QUI INFLUENCE VOTRE CONFIGURATION',
      title: 'Quatre facteurs déterminent votre configuration CORO.',
      intro:
        'La tarification CORO est établie à partir de ces quatre dimensions, afin de refléter fidèlement la réalité de votre organisation.',
      items: [
        {
          icon: <Building2 size={22} />,
          title: 'Sites et bâtiments',
          text:
            'Le nombre de sites, de bâtiments et leur complexité — type d\'occupation, risques, réalité multisite — influencent l\'étendue de la configuration CORO déployée.',
        },
        {
          icon: <Users size={22} />,
          title: 'Utilisateurs',
          text:
            'Le nombre de personnes appelées à utiliser CORO — équipe interne, intervenants, gestionnaires — oriente le nombre de comptes et de rôles à prévoir.',
        },
        {
          icon: <Zap size={22} />,
          title: 'Capacités CORO',
          text:
            'Les dimensions activées — documentaire, gestion de projets, performance, portail client, résilience & intervention — déterminent l\'étendue fonctionnelle de votre environnement.',
        },
        {
          icon: <Briefcase size={22} />,
          title: 'Accompagnement',
          text:
            'Le niveau de configuration assistée, de formation et de support continu souhaité oriente l\'accompagnement prévu avec CORO.',
        },
      ],
    },

    capabilities: {
      tag: 'LES CINQ DIMENSIONS CORO',
      title: 'Activez les capacités CORO pertinentes pour votre organisation.',
      intro:
        'Votre configuration peut combiner une ou plusieurs de ces dimensions selon vos besoins.',
      items: [
        {
          icon: <FileText size={20} />,
          title: 'Production & conformité documentaire',
          text:
            'PMU, PSI et PCA disponibles dès maintenant — procédures intégrées, génération automatisée, approbation et export PDF bilingue. PGC, PRA et PUE sont prévus en phase 2.',
        },
        {
          icon: <Briefcase size={20} />,
          title: 'Gestion de projets & mandats',
          text:
            'Centralisez bâtiments, activités, échéances et responsabilités, et suivez l\'avancement de chaque mandat depuis un environnement unique.',
        },
        {
          icon: <BarChart3 size={20} />,
          title: 'Performance & objectifs',
          text:
            'Suivez les objectifs, indicateurs et niveaux de performance pour mesurer les progrès et orienter les actions d\'amélioration.',
        },
        {
          icon: <Building2 size={20} />,
          title: 'Portail client',
          text:
            'Donnez à vos clients un accès structuré à leurs documents, à leurs activités et à leur statut de préparation.',
        },
        {
          icon: <ShieldCheck size={20} />,
          title: 'Résilience & Intervention',
          text:
            'Reliez préparation et intervention grâce à l\'Indice CORO, la présence en temps réel, la mobilisation des équipes, la gestion des incidents, l\'information destinée aux secours, les exercices et le retour d\'expérience.',
        },
      ],
    },

    perspectives: {
      tag: 'DEUX PERSPECTIVES',
      title: 'CORO s\'adapte à la façon dont vous gérez la résilience.',
      intro:
        'Que vous accompagniez plusieurs clients ou pilotiez directement la résilience de votre organisation, la configuration CORO reflète votre rôle.',
      professionals: {
        title: 'Pour les professionnels',
        text:
          'Firmes conseil et professionnels qui accompagnent plusieurs clients.',
        bullets: [
          'Accompagnez plusieurs clients depuis un environnement unique',
          'Centralisez mandats, livrables et échéances',
          'Donnez à chaque client son propre portail',
          'Configuration adaptée au nombre de clients et de bâtiments gérés',
        ],
      },
      organizations: {
        title: 'Pour les organisations',
        text:
          'Propriétaires, gestionnaires et organisations qui pilotent directement leur résilience.',
        bullets: [
          'Centralisez vos bâtiments et vos plans',
          'Suivez votre niveau réel de préparation',
          'Sachez qui est présent et mobilisable',
          'Structurez la réponse aux incidents et transformez-la en amélioration continue',
        ],
      },
    },

    deployment: {
      tag: 'DÉPLOIEMENT',
      title: 'De l\'évaluation à l\'accompagnement continu.',
      steps: [
        {
          num: '01',
          title: 'Évaluation',
          text:
            'Nous discutons de votre environnement — sites, bâtiments, équipes et besoins opérationnels — pour comprendre votre réalité.',
        },
        {
          num: '02',
          title: 'Configuration',
          text:
            'Les capacités CORO pertinentes sont activées et paramétrées selon les facteurs identifiés lors de l\'évaluation.',
        },
        {
          num: '03',
          title: 'Déploiement',
          text:
            'Votre environnement CORO est mis en place et vos équipes commencent à l\'utiliser.',
        },
        {
          num: '04',
          title: 'Accompagnement',
          text:
            'Un accompagnement continu est assuré selon le niveau convenu — configuration, formation et support.',
        },
      ],
    },

    faq: {
      tag: 'QUESTIONS FRÉQUENTES',
      title: 'Questions fréquentes sur la tarification',
      items: [
        {
          q: 'Pourquoi les prix ne sont-ils pas affichés directement?',
          a: 'CORO peut couvrir des réalités très différentes d\'une organisation à l\'autre. La tarification dépend de votre environnement, des capacités activées, du nombre d\'utilisateurs et du niveau d\'accompagnement souhaité — nous l\'établissons avec vous lors de l\'évaluation de vos besoins.',
        },
        {
          q: 'Pouvons-nous faire évoluer notre configuration CORO avec le temps?',
          a: 'Oui. Votre configuration peut être ajustée à mesure que vos besoins évoluent — nouveaux sites, nouveaux utilisateurs ou capacités additionnelles — en discussion avec CORO.',
        },
        {
          q: 'CORO peut-il gérer plusieurs sites ou bâtiments?',
          a: 'Oui. CORO est conçu pour supporter un ou plusieurs bâtiments, avec une configuration qui reflète le nombre de sites et leur réalité opérationnelle respective.',
        },
        {
          q: 'Nous sommes une firme qui accompagne plusieurs clients — est-ce pris en charge?',
          a: 'Oui. CORO peut être configuré pour des professionnels qui gèrent des mandats pour plusieurs organisations clientes, avec des portails et des livrables distincts par client.',
        },
        {
          q: 'La formation et l\'accompagnement sont-ils inclus?',
          a: 'Le niveau d\'accompagnement — configuration assistée, formation, support continu — fait partie des éléments abordés lors de l\'évaluation de vos besoins.',
        },
        {
          q: 'Où sont hébergées nos données?',
          a: 'Les données sont hébergées au Canada, sur une infrastructure DigitalOcean à Toronto. Les caractéristiques techniques et les mesures de sécurité applicables peuvent être précisées lors de l\'évaluation de vos besoins.',
        },
      ],
    },

    demo: {
      eyebrow: 'PARLONS DE VOTRE ENVIRONNEMENT',
      title: 'Voyons quelle configuration CORO correspond à votre réalité.',
      text:
        'Partagez quelques informations sur votre organisation — nous reviendrons vers vous avec une configuration adaptée.',
    },

    nav: {
      home: '← Accueil',
      lang: 'EN',
    },
  },

  en: {
    metadata: {
      title: 'CORO Pricing — A configuration adapted to your organization',
      description:
        'CORO pricing adapts to your number of sites and buildings, users, activated CORO capabilities and desired level of support. Request a demonstration tailored to your organization.',
    },

    tag: 'Pricing',

    hero: {
      eyebrow: 'PRICING',
      title: 'Pricing that adapts to your organization.',
      text:
        'CORO adapts to your operational reality: the number of sites and buildings, the number of users, the capabilities you activate and the level of support you need. We build this configuration together with you.',
      primaryCta: 'Request a demo',
      secondaryCta: 'See the configuration factors',
      reassurance: 'Response within 24 hours',
      expertise: 'Built by fire safety and emergency measures practitioners',
    },

    founderProgram: {
      ribbon: 'FOUNDING PARTNER PROGRAM',
      sealLabel: 'FOUNDER',
      title: 'Become one of the first organizations to trust CORO.',
      subtitle:
        'Organizations that join CORO now help shape the platform with us — and keep the benefits.',
      benefits: [
        'Founder pricing preserved long-term',
        'Direct influence on development priorities',
        'Priority support during setup',
        'Recognition as a CORO founding partner',
      ],
      cta: 'Become a founding partner',
      footnote:
        'Limited number of spots — founder terms will not be offered indefinitely.',
    },

    plans: {
      tag: 'TYPICAL CONFIGURATIONS',
      title: 'Three common profiles, for illustration.',
      intro:
        'These profiles illustrate frequent combinations of CORO capabilities. Your actual configuration can combine or depart from them depending on your reality.',
      disclaimer:
        'None of these profiles is a fixed package — we build your configuration with you during the assessment of your needs.',
      items: [
        {
          icon: <Building2 size={26} />,
          name: 'Single building',
          desc: 'For an organization that manages one building and wants to structure its readiness.',
          includes: [
            'Document production (ERP, FSP, BCP)',
            'Real-time occupancy with Sentinel',
            'CORO index and readiness tracking',
            'Basic support',
          ],
          featured: false,
        },
        {
          icon: <MapPin size={26} />,
          name: 'Multi-site organization',
          badge: 'MOST COMMON CONFIGURATION',
          desc: 'For an organization that manages several buildings and wants a consolidated view of its resilience.',
          includes: [
            'All document capabilities',
            'Project and engagement management across buildings',
            'Full Resilience & Response',
            'Dedicated configuration support',
          ],
          featured: true,
        },
        {
          icon: <Briefcase size={26} />,
          name: 'Firms & professionals',
          desc: 'For consulting firms and professionals who support multiple client organizations.',
          includes: [
            'Dedicated portals per client',
            'Centralized engagements, deliverables and deadlines',
            'Configuration adapted to the number of clients',
            'Multi-organization support',
          ],
          featured: false,
        },
      ],
      cta: 'Request a demo',
    },

    factors: {
      tag: 'WHAT SHAPES YOUR CONFIGURATION',
      title: 'Four factors determine your CORO configuration.',
      intro:
        'CORO pricing is built around these four dimensions, so it accurately reflects your organization.',
      items: [
        {
          icon: <Building2 size={22} />,
          title: 'Sites and buildings',
          text:
            'The number of sites, buildings and their complexity — occupancy type, hazards, multi-site reality — influence the scope of the CORO configuration deployed.',
        },
        {
          icon: <Users size={22} />,
          title: 'Users',
          text:
            'The number of people who will use CORO — internal team, responders, managers — shapes the number of accounts and roles to plan for.',
        },
        {
          icon: <Zap size={22} />,
          title: 'CORO capabilities',
          text:
            'The dimensions you activate — documents, project management, performance, client portal, resilience & response — determine the functional scope of your environment.',
        },
        {
          icon: <Briefcase size={22} />,
          title: 'Support',
          text:
            'The desired level of guided configuration, training and ongoing support shapes the accompaniment provided by CORO.',
        },
      ],
    },

    capabilities: {
      tag: 'THE FIVE CORO DIMENSIONS',
      title: 'Activate the CORO capabilities relevant to your organization.',
      intro:
        'Your configuration can combine one or more of these dimensions depending on your needs.',
      items: [
        {
          icon: <FileText size={20} />,
          title: 'Document production & compliance',
          text:
            'ERP, FSP and BCP available now — built-in procedures, automated generation, approval and bilingual PDF export. CMP, RRP and EEP are planned for phase 2.',
        },
        {
          icon: <Briefcase size={20} />,
          title: 'Project & engagement management',
          text:
            'Centralize buildings, activities, deadlines and responsibilities, and track the progress of every engagement from one environment.',
        },
        {
          icon: <BarChart3 size={20} />,
          title: 'Performance & objectives',
          text:
            'Track objectives, indicators and performance levels to measure progress and guide improvement actions.',
        },
        {
          icon: <Building2 size={20} />,
          title: 'Client portal',
          text:
            'Give your clients structured access to their documents, activities and readiness status.',
        },
        {
          icon: <ShieldCheck size={20} />,
          title: 'Resilience & Response',
          text:
            'Connect preparedness and response through the CORO index, real-time occupancy, team mobilization, incident management, information for first responders, drills and lessons learned.',
        },
      ],
    },

    perspectives: {
      tag: 'TWO PERSPECTIVES',
      title: 'CORO adapts to how you manage resilience.',
      intro:
        'Whether you support multiple clients or directly manage your organization\'s resilience, the CORO configuration reflects your role.',
      professionals: {
        title: 'For professionals',
        text:
          'Consulting firms and professionals who support multiple clients.',
        bullets: [
          'Support multiple clients from a single environment',
          'Centralize engagements, deliverables and deadlines',
          'Give each client their own portal',
          'Configuration adapted to the number of clients and buildings managed',
        ],
      },
      organizations: {
        title: 'For organizations',
        text:
          'Owners, managers and organizations that directly manage their own resilience.',
        bullets: [
          'Centralize your buildings and plans',
          'Track your actual level of readiness',
          'Know who is on site and mobilizable',
          'Structure incident response and turn it into continuous improvement',
        ],
      },
    },

    deployment: {
      tag: 'DEPLOYMENT',
      title: 'From assessment to ongoing support.',
      steps: [
        {
          num: '01',
          title: 'Assessment',
          text:
            'We discuss your environment — sites, buildings, teams and operational needs — to understand your reality.',
        },
        {
          num: '02',
          title: 'Configuration',
          text:
            'The relevant CORO capabilities are activated and configured based on the factors identified during the assessment.',
        },
        {
          num: '03',
          title: 'Deployment',
          text:
            'Your CORO environment is set up and your teams start using it.',
        },
        {
          num: '04',
          title: 'Support',
          text:
            'Ongoing support is provided according to the agreed level — configuration, training and assistance.',
        },
      ],
    },

    faq: {
      tag: 'FREQUENTLY ASKED QUESTIONS',
      title: 'Frequently asked questions about pricing',
      items: [
        {
          q: 'Why aren\'t prices shown directly?',
          a: 'CORO can cover very different realities from one organization to another. Pricing depends on your environment, the capabilities you activate, the number of users and the level of support you need — we work it out with you during the assessment of your needs.',
        },
        {
          q: 'Can we evolve our CORO configuration over time?',
          a: 'Yes. Your configuration can be adjusted as your needs evolve — new sites, new users or additional capabilities — in discussion with CORO.',
        },
        {
          q: 'Can CORO manage multiple sites or buildings?',
          a: 'Yes. CORO is designed to support one or several buildings, with a configuration that reflects the number of sites and their respective operational reality.',
        },
        {
          q: 'We are a firm that supports multiple clients — is that supported?',
          a: 'Yes. CORO can be configured for professionals who manage engagements for multiple client organizations, with distinct portals and deliverables per client.',
        },
        {
          q: 'Is training and support included?',
          a: 'The level of support — guided configuration, training, ongoing assistance — is one of the elements discussed when assessing your needs.',
        },
        {
          q: 'Where is our data hosted?',
          a: 'Data is hosted in Canada, on DigitalOcean infrastructure in Toronto. Technical characteristics and applicable security measures can be clarified when assessing your needs.',
        },
      ],
    },

    demo: {
      eyebrow: 'LET\'S TALK ABOUT YOUR ENVIRONMENT',
      title: 'Let\'s find the CORO configuration that fits your organization.',
      text:
        'Share a few details about your organization — we\'ll get back to you with a tailored configuration.',
    },

    nav: {
      home: '← Home',
      lang: 'FR',
    },
  },
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const t = CONTENT[lang];

  const frUrl = `${SITE_URL}/pricing`;
  const enUrl = `${SITE_URL}/pricing?lang=en`;
  const currentUrl = lang === 'en' ? enUrl : frUrl;

  return {
    metadataBase: new URL(SITE_URL),

    title: t.metadata.title,
    description: t.metadata.description,

    alternates: {
      canonical: currentUrl,
      languages: {
        'fr-CA': frUrl,
        'en-CA': enUrl,
        'x-default': frUrl,
      },
    },

    openGraph: {
      type: 'website',
      url: currentUrl,
      siteName: 'CORO',
      locale: lang === 'fr' ? 'fr_CA' : 'en_CA',
      alternateLocale: [lang === 'fr' ? 'en_CA' : 'fr_CA'],
      title: t.metadata.title,
      description: t.metadata.description,
      images: [
        {
          url: '/og-coro.jpg',
          width: 1200,
          height: 630,
          alt:
            lang === 'fr'
              ? 'Tarification CORO'
              : 'CORO Pricing',
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title: t.metadata.title,
      description: t.metadata.description,
      images: ['/og-coro.jpg'],
    },

    robots: {
      index: true,
      follow: true,

      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export default async function PricingPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const d = CONTENT[lang];

  const homeHref = lang === 'en' ? '/?lang=en' : '/';
  const demoHref = '#demo';
  const otherLangHref = lang === 'fr' ? '/pricing?lang=en' : '/pricing';

  const currentUrl =
    lang === 'en'
      ? `${SITE_URL}/pricing?lang=en`
      : `${SITE_URL}/pricing`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: d.metadata.title,
    description: d.metadata.description,
    url: currentUrl,
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
    isPartOf: { '@type': 'WebSite', name: 'CORO', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'CORO',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/coro-logo.png` },
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: lang === 'fr' ? 'Accueil' : 'Home',
        item: lang === 'en' ? `${SITE_URL}/?lang=en` : SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: d.tag,
        item: currentUrl,
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: d.faq.items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="pricing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* NAV */}
      <nav className="pricing-nav">
        <div className="pricing-nav-inner">
          <a href={homeHref} className="pricing-logo">
            CO<span>RO</span>
          </a>

          <div className="pricing-nav-links">
            <a href={homeHref} className="pricing-nav-link">
              {d.nav.home}
            </a>

            <a
              href={otherLangHref}
              className="pricing-nav-link pricing-lang"
            >
              {d.nav.lang}
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pricing-hero">
        <div className="pricing-container pricing-hero-inner">
          <span className="pricing-eyebrow">{d.hero.eyebrow}</span>
          <h1>{d.hero.title}</h1>
          <p>{d.hero.text}</p>

          <div className="pricing-actions">
            <a href={demoHref} className="pricing-btn pricing-btn-primary">
              {d.hero.primaryCta}
              <ArrowRight size={16} />
            </a>

            <a
              href="#factors"
              className="pricing-btn pricing-btn-outline"
            >
              {d.hero.secondaryCta}
            </a>
          </div>

          <div className="pricing-hero-reassurance">
            <CheckCircle2 size={14} />
            {d.hero.reassurance}
            <span className="pricing-hero-reassurance-sep">·</span>
            {d.hero.expertise}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="pricing-section">
        <div className="pricing-container">
          <div className="pricing-center">
            <span className="pricing-kicker">{d.plans.tag}</span>
            <h2>{d.plans.title}</h2>
            <p>{d.plans.intro}</p>
          </div>

          <div className="pricing-plans-grid">
            {d.plans.items.map(item => (
              <div
                key={item.name}
                className={
                  item.featured
                    ? 'pricing-plan-card pricing-plan-card-featured'
                    : 'pricing-plan-card'
                }
              >
                {item.badge && (
                  <span className="pricing-plan-badge">{item.badge}</span>
                )}

                <div className="pricing-plan-icon">{item.icon}</div>
                <h3 className="pricing-plan-name">{item.name}</h3>
                <p className="pricing-plan-desc">{item.desc}</p>

                <div className="pricing-plan-divider" />

                <div className="pricing-plan-includes">
                  {item.includes.map(line => (
                    <div className="pricing-plan-item" key={line}>
                      <CheckCircle2 size={16} />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={demoHref}
                  className={
                    item.featured
                      ? 'pricing-btn pricing-btn-primary pricing-plan-cta'
                      : 'pricing-btn pricing-btn-outline pricing-plan-cta pricing-plan-cta-light'
                  }
                >
                  {d.plans.cta}
                  <ArrowRight size={15} />
                </a>
              </div>
            ))}
          </div>

          <p className="pricing-plans-disclaimer">{d.plans.disclaimer}</p>
        </div>
      </section>

      {/* FACTORS */}
      <section id="factors" className="pricing-section">
        <div className="pricing-container">
          <div className="pricing-center">
            <span className="pricing-kicker">{d.factors.tag}</span>
            <h2>{d.factors.title}</h2>
            <p>{d.factors.intro}</p>
          </div>

          <div className="pricing-factors-grid">
            {d.factors.items.map(item => (
              <div className="pricing-factor-card" key={item.title}>
                <div className="pricing-factor-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="pricing-section pricing-section-alt">
        <div className="pricing-container">
          <div className="pricing-center">
            <span className="pricing-kicker">{d.capabilities.tag}</span>
            <h2>{d.capabilities.title}</h2>
            <p>{d.capabilities.intro}</p>
          </div>

          <div className="pricing-capabilities-grid">
            {d.capabilities.items.map(item => (
              <div className="pricing-capability-card" key={item.title}>
                <div className="pricing-capability-icon">{item.icon}</div>

                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDER PROGRAM */}
      <section id="fondateur" className="pricing-cta-banner">
        <div className="pricing-cta-glow" />
        <div className="pricing-container pricing-founder-inner">
          <div className="pricing-founder-copy">
            <span className="pricing-founder-ribbon">{d.founderProgram.ribbon}</span>

            <h2>{d.founderProgram.title}</h2>
            <p className="pricing-founder-subtitle">{d.founderProgram.subtitle}</p>

            <div className="pricing-founder-benefits">
              {d.founderProgram.benefits.map(item => (
                <div className="pricing-founder-benefit" key={item}>
                  <CheckCircle2 size={17} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pricing-founder-actions">
              <a href="#demo" className="pricing-btn pricing-btn-primary">
                {d.founderProgram.cta}
                <ArrowRight size={16} />
              </a>

              <span className="pricing-founder-footnote">{d.founderProgram.footnote}</span>
            </div>
          </div>

          <div className="pricing-founder-seal-wrap">
            <div className="pricing-founder-seal">
              <div className="pricing-founder-seal-ring">
                <Award size={34} />
                <strong>{d.founderProgram.sealLabel}</strong>
                <span>CORO</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PERSPECTIVES */}
      <section className="pricing-section">
        <div className="pricing-container">
          <div className="pricing-center">
            <span className="pricing-kicker">{d.perspectives.tag}</span>
            <h2>{d.perspectives.title}</h2>
            <p>{d.perspectives.intro}</p>
          </div>

          <div className="pricing-perspectives-grid">
            <div className="pricing-perspective-card">
              <span className="pricing-perspective-number">01</span>
              <h3>{d.perspectives.professionals.title}</h3>
              <p className="pricing-perspective-intro">
                {d.perspectives.professionals.text}
              </p>

              <div className="pricing-perspective-points">
                {d.perspectives.professionals.bullets.map(item => (
                  <div className="pricing-perspective-point" key={item}>
                    <CheckCircle2 size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pricing-perspective-card pricing-perspective-card-dark">
              <span className="pricing-perspective-number">02</span>
              <h3>{d.perspectives.organizations.title}</h3>
              <p className="pricing-perspective-intro">
                {d.perspectives.organizations.text}
              </p>

              <div className="pricing-perspective-points">
                {d.perspectives.organizations.bullets.map(item => (
                  <div className="pricing-perspective-point" key={item}>
                    <CheckCircle2 size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEPLOYMENT */}
      <section className="pricing-section pricing-section-alt">
        <div className="pricing-container">
          <div className="pricing-center">
            <span className="pricing-kicker">{d.deployment.tag}</span>
            <h2>{d.deployment.title}</h2>
          </div>

          <div className="pricing-deployment-grid">
            {d.deployment.steps.map(step => (
              <div className="pricing-deployment-step" key={step.num}>
                <span className="pricing-deployment-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pricing-section">
        <div className="pricing-container">
          <div className="pricing-center">
            <span className="pricing-kicker">{d.faq.tag}</span>
            <h2>{d.faq.title}</h2>
          </div>

          <div className="pricing-faq-grid">
            {d.faq.items.map(item => (
              <div className="pricing-faq-item" key={item.q}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="pricing-demo">
        <div className="pricing-container pricing-demo-inner">
          <div className="pricing-demo-copy">
            <span className="pricing-demo-eyebrow">{d.demo.eyebrow}</span>
            <h2>{d.demo.title}</h2>
            <p>{d.demo.text}</p>
          </div>

          <div className="pricing-demo-form">
            <DemoForm lang={lang} />

            <div className="pricing-demo-note">
              <Lock size={13} />
              <span>
                {lang === 'fr'
                  ? 'Vos informations sont utilisées pour traiter votre demande et communiquer avec vous au sujet de CORO.'
                  : 'Your information is used to process your request and communicate with you about CORO.'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        * { box-sizing: border-box; }

        .pricing-page {
          min-height: 100vh;
          background: #FFFFFF;
          color: #2C3E50;
          font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif;
        }

        .pricing-container {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
        }

        /* NAV */
        .pricing-nav {
          background: #2C3E50;
          padding: 0 24px;
        }
        .pricing-nav-inner {
          max-width: 1200px;
          height: 64px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pricing-logo {
          color: #FFFFFF;
          font-weight: 900;
          font-size: 24px;
          letter-spacing: -1px;
          text-decoration: none;
        }
        .pricing-logo span { color: #C0392B; }
        .pricing-nav-links {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .pricing-nav-link {
          color: rgba(255,255,255,.72);
          font-size: 14px;
          text-decoration: none;
        }
        .pricing-nav-link:hover { color: #FFFFFF; }
        .pricing-lang {
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 13px;
        }

        /* HERO */
        .pricing-hero {
          position: relative;
          overflow: hidden;
          padding: 96px 0 88px;
          background:
            radial-gradient(circle at 85% 10%, rgba(192,57,43,.22), transparent 32%),
            linear-gradient(135deg, #1A252F 0%, #243746 55%, #2C3E50 100%);
        }
        .pricing-hero-inner {
          max-width: 800px;
          text-align: center;
        }
        .pricing-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 15px;
          margin-bottom: 22px;
          border: 1px solid rgba(192,57,43,.4);
          border-radius: 999px;
          color: #F5C6C0;
          background: rgba(192,57,43,.15);
          text-transform: uppercase;
          letter-spacing: .1em;
          font-size: 11px;
          font-weight: 800;
        }
        .pricing-hero h1 {
          margin: 0 0 20px;
          font-size: clamp(32px, 5vw, 50px);
          line-height: 1.1;
          letter-spacing: -.03em;
          color: #FFFFFF;
          font-weight: 900;
        }
        .pricing-hero p {
          margin: 0 auto 34px;
          max-width: 620px;
          color: rgba(255,255,255,.68);
          font-size: 17px;
          line-height: 1.75;
        }

        .pricing-actions {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .pricing-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 50px;
          padding: 0 26px;
          border-radius: 9px;
          font-size: 15px;
          font-weight: 750;
          text-decoration: none;
          transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease;
        }
        .pricing-btn-primary {
          background: #C0392B;
          color: #FFFFFF;
          box-shadow: 0 10px 30px rgba(192,57,43,.28);
        }
        .pricing-btn-primary:hover { background: #A93226; }
        .pricing-btn-outline {
          color: #FFFFFF;
          border: 1px solid rgba(255,255,255,.35);
          background: rgba(255,255,255,.04);
        }
        .pricing-btn-outline:hover { background: rgba(255,255,255,.1); }

        .pricing-hero-reassurance {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 22px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }
        .pricing-hero-reassurance svg { color: #65D69A; flex-shrink: 0; }
        .pricing-hero-reassurance-sep { color: rgba(255,255,255,.25); }

        /* CTA BANNER */
        .pricing-cta-banner {
          position: relative;
          overflow: hidden;
          padding: 64px 0;
          background:
            radial-gradient(circle at 12% 30%, rgba(192,57,43,.18), transparent 32%),
            linear-gradient(135deg, #1A252F 0%, #2C3E50 100%);
        }
        .pricing-cta-glow {
          position: absolute;
          top: -160px;
          right: -120px;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(192,57,43,.14) 0%, transparent 70%);
          pointer-events: none;
        }
        /* FOUNDER PROGRAM */
        .pricing-founder-inner {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          align-items: center;
          gap: 56px;
        }
        .pricing-founder-ribbon {
          display: inline-block;
          margin-bottom: 18px;
          padding: 7px 14px;
          border: 1px solid rgba(192,57,43,.4);
          border-radius: 999px;
          background: rgba(192,57,43,.15);
          color: #F5C6C0;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .1em;
        }
        .pricing-founder-copy h2 {
          margin: 0 0 14px;
          max-width: 640px;
          color: #FFFFFF;
          font-size: clamp(26px, 3.4vw, 36px);
          font-weight: 900;
          line-height: 1.2;
          letter-spacing: -.02em;
        }
        .pricing-founder-subtitle {
          margin: 0 0 28px;
          max-width: 560px;
          color: rgba(255,255,255,.65);
          font-size: 16px;
          line-height: 1.7;
        }
        .pricing-founder-benefits {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 28px;
          margin-bottom: 32px;
        }
        .pricing-founder-benefit {
          display: grid;
          grid-template-columns: 17px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          color: rgba(255,255,255,.88);
          font-size: 14px;
          line-height: 1.5;
        }
        .pricing-founder-benefit svg {
          margin-top: 1px;
          color: #65D69A;
        }
        .pricing-founder-actions {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .pricing-founder-footnote {
          color: rgba(255,255,255,.42);
          font-size: 12.5px;
          line-height: 1.5;
          max-width: 260px;
        }
        .pricing-founder-seal-wrap {
          display: flex;
          justify-content: center;
        }
        .pricing-founder-seal {
          width: 190px;
          height: 190px;
          border-radius: 50%;
          border: 1.5px dashed rgba(255,255,255,.28);
          display: grid;
          place-items: center;
          animation: pricing-founder-spin 40s linear infinite;
        }
        .pricing-founder-seal-ring {
          width: 152px;
          height: 152px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 20%, rgba(192,57,43,.35), rgba(44,62,80,.9));
          border: 1px solid rgba(255,255,255,.18);
          box-shadow: 0 20px 45px rgba(0,0,0,.35);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #FFFFFF;
          animation: pricing-founder-spin-reverse 40s linear infinite;
        }
        .pricing-founder-seal-ring strong {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .08em;
        }
        .pricing-founder-seal-ring span {
          font-size: 10px;
          color: rgba(255,255,255,.55);
          letter-spacing: .06em;
        }
        @keyframes pricing-founder-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pricing-founder-spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        /* SECTIONS */
        .pricing-section { padding: 100px 0; background: #FFFFFF; }
        .pricing-section-alt { background: #F8F9FA; }

        .pricing-center {
          max-width: 780px;
          margin: 0 auto 52px;
          text-align: center;
        }
        .pricing-kicker {
          display: inline-block;
          margin-bottom: 12px;
          color: #C0392B;
          font-size: 12px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .11em;
        }
        .pricing-center h2 {
          margin: 0 0 16px;
          color: #2C3E50;
          font-size: clamp(28px, 3.6vw, 42px);
          line-height: 1.15;
          letter-spacing: -.025em;
          font-weight: 900;
        }
        .pricing-center p {
          margin: 0;
          color: #6C757D;
          font-size: 16px;
          line-height: 1.75;
        }

        /* PLANS */
        .pricing-plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          max-width: 1100px;
          margin: 0 auto;
          align-items: start;
        }
        .pricing-plan-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 36px 32px 32px;
          border: 1px solid #E9ECEF;
          border-radius: 18px;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(44,62,80,.04), 0 6px 18px rgba(44,62,80,.06);
        }
        .pricing-plan-card-featured {
          border: 2px solid #C0392B;
          box-shadow: 0 20px 50px rgba(192,57,43,.14);
        }
        .pricing-plan-badge {
          position: absolute;
          top: -13px;
          left: 32px;
          padding: 6px 12px;
          border-radius: 999px;
          background: #C0392B;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .pricing-plan-icon {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          margin-bottom: 20px;
          border-radius: 13px;
          background: #FDEDEC;
          color: #C0392B;
        }
        .pricing-plan-card-featured .pricing-plan-icon {
          background: #C0392B;
          color: #FFFFFF;
        }
        .pricing-plan-name {
          margin: 0 0 8px;
          color: #2C3E50;
          font-size: 21px;
          font-weight: 850;
        }
        .pricing-plan-desc {
          margin: 0;
          color: #6C757D;
          font-size: 14px;
          line-height: 1.6;
          min-height: 44px;
        }
        .pricing-plan-divider {
          margin: 24px 0;
          height: 1px;
          background: #EDF0F2;
        }
        .pricing-plan-includes {
          display: flex;
          flex-direction: column;
          gap: 13px;
          margin-bottom: 28px;
          flex: 1;
        }
        .pricing-plan-item {
          display: grid;
          grid-template-columns: 16px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          color: #495057;
          font-size: 14px;
          line-height: 1.5;
        }
        .pricing-plan-item svg {
          margin-top: 1px;
          color: #48A97A;
        }
        .pricing-plan-cta {
          width: 100%;
        }
        .pricing-plan-cta-light {
          color: #2C3E50;
          border: 1px solid #DDE2E6;
          background: transparent;
        }
        .pricing-plan-cta-light:hover {
          background: #F8F9FA;
        }
        .pricing-plans-disclaimer {
          max-width: 620px;
          margin: 36px auto 0;
          color: #9AA2A8;
          font-size: 13px;
          line-height: 1.6;
          text-align: center;
        }

        /* FACTORS */
        .pricing-factors-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .pricing-factor-card {
          padding: 32px 28px;
          border: 1px solid #E9ECEF;
          border-radius: 16px;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(44,62,80,.04), 0 6px 18px rgba(44,62,80,.06);
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .pricing-factor-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 42px rgba(44,62,80,.1);
        }
        .pricing-factor-icon {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          margin-bottom: 18px;
          border-radius: 11px;
          background: #FDEDEC;
          color: #C0392B;
        }
        .pricing-factor-card h3 {
          margin: 0 0 8px;
          color: #2C3E50;
          font-size: 17px;
          font-weight: 800;
        }
        .pricing-factor-card p {
          margin: 0;
          color: #6C757D;
          font-size: 15px;
          line-height: 1.65;
        }

        /* CAPABILITIES */
        .pricing-capabilities-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 18px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .pricing-capability-card {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          gap: 16px;
          padding: 28px;
          border: 1px solid #E9ECEF;
          border-radius: 14px;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(44,62,80,.04), 0 6px 18px rgba(44,62,80,.06);
          flex: 0 1 calc(33.333% - 12px);
        }
        .pricing-capability-icon {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #F3F5F6;
          color: #2C3E50;
        }
        .pricing-capability-card strong {
          display: block;
          margin-bottom: 6px;
          color: #2C3E50;
          font-size: 15px;
          font-weight: 800;
        }
        .pricing-capability-card p {
          margin: 0;
          color: #6C757D;
          font-size: 15px;
          line-height: 1.65;
        }

        /* PERSPECTIVES */
        .pricing-perspectives-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .pricing-perspective-card {
          padding: 36px;
          border: 1px solid #E2E7EA;
          border-radius: 20px;
          background: #FFFFFF;
          box-shadow: 0 12px 36px rgba(44,62,80,.05);
        }
        .pricing-perspective-card-dark {
          border-color: #2C3E50;
          background:
            radial-gradient(circle at 100% 0%, rgba(192,57,43,.17), transparent 35%),
            #2C3E50;
        }
        .pricing-perspective-number {
          display: block;
          margin-bottom: 18px;
          color: #D6DCE0;
          font-size: 32px;
          font-weight: 900;
          line-height: 1;
        }
        .pricing-perspective-card-dark .pricing-perspective-number {
          color: rgba(255,255,255,.15);
        }
        .pricing-perspective-card h3 {
          margin: 0 0 10px;
          color: #2C3E50;
          font-size: 22px;
          font-weight: 850;
        }
        .pricing-perspective-card-dark h3 { color: #FFFFFF; }
        .pricing-perspective-intro {
          margin: 0 0 22px;
          color: #6C757D;
          font-size: 15px;
          line-height: 1.65;
        }
        .pricing-perspective-card-dark .pricing-perspective-intro {
          color: rgba(255,255,255,.64);
        }
        .pricing-perspective-points {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pricing-perspective-point {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          color: #495057;
          font-size: 14px;
          line-height: 1.5;
        }
        .pricing-perspective-point svg { margin-top: 1px; color: #48A97A; }
        .pricing-perspective-card-dark .pricing-perspective-point {
          color: rgba(255,255,255,.82);
        }

        /* DEPLOYMENT */
        .pricing-deployment-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .pricing-deployment-step {
          padding: 30px 26px;
          border: 1px solid #E5E9EC;
          border-radius: 14px;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(44,62,80,.04), 0 6px 18px rgba(44,62,80,.06);
        }
        .pricing-deployment-num {
          display: block;
          margin-bottom: 16px;
          color: #C0392B;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .05em;
        }
        .pricing-deployment-step h3 {
          margin: 0 0 8px;
          color: #2C3E50;
          font-size: 16px;
          font-weight: 800;
        }
        .pricing-deployment-step p {
          margin: 0;
          color: #6C757D;
          font-size: 15px;
          line-height: 1.6;
        }

        /* FAQ */
        .pricing-faq-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .pricing-faq-item {
          padding: 28px;
          border-radius: 13px;
          border: 1px solid #E4E9EC;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(44,62,80,.04), 0 4px 14px rgba(44,62,80,.06);
        }
        .pricing-faq-item h3 {
          margin: 0 0 10px;
          color: #2C3E50;
          font-size: 16px;
          font-weight: 800;
        }
        .pricing-faq-item p {
          margin: 0;
          color: #6D7E88;
          font-size: 14px;
          line-height: 1.7;
        }

        /* DEMO */
        .pricing-demo {
          padding: 100px 0;
          background:
            radial-gradient(circle at 15% 20%, rgba(192,57,43,.14), transparent 30%),
            #1A252F;
        }
        .pricing-demo-inner {
          display: grid;
          grid-template-columns: minmax(0, .95fr) minmax(380px, 1fr);
          gap: 64px;
          align-items: center;
        }
        .pricing-demo-eyebrow {
          display: inline-block;
          margin-bottom: 16px;
          color: #F5C6C0;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .1em;
        }
        .pricing-demo-copy h2 {
          margin: 0 0 18px;
          color: #FFFFFF;
          font-size: clamp(26px, 3.4vw, 38px);
          line-height: 1.18;
          font-weight: 900;
        }
        .pricing-demo-copy p {
          margin: 0;
          color: rgba(255,255,255,.65);
          font-size: 16px;
          line-height: 1.75;
          max-width: 460px;
        }
        .pricing-demo-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 16px;
          color: rgba(255,255,255,.5);
          font-size: 12px;
          line-height: 1.6;
        }
        .pricing-demo-note svg { flex-shrink: 0; margin-top: 2px; }

        @media (max-width: 980px) {
          .pricing-factors-grid { grid-template-columns: repeat(2, 1fr); }
          .pricing-deployment-grid { grid-template-columns: repeat(2, 1fr); }
          .pricing-capability-card { flex-basis: calc(50% - 9px); }
          .pricing-demo-inner { grid-template-columns: 1fr; gap: 44px; }
          .pricing-founder-inner {
            grid-template-columns: 1fr;
            text-align: left;
          }
          .pricing-founder-seal-wrap {
            display: none;
          }
        }

        @media (max-width: 760px) {
          .pricing-capability-card { flex-basis: 100%; }
          .pricing-perspectives-grid,
          .pricing-faq-grid,
          .pricing-plans-grid {
            grid-template-columns: 1fr;
          }
          .pricing-plan-card-featured {
            order: -1;
          }
          .pricing-founder-benefits {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .pricing-factors-grid,
          .pricing-deployment-grid {
            grid-template-columns: 1fr;
          }
          .pricing-section { padding: 68px 0; }
          .pricing-hero { padding: 68px 0 60px; }
          .pricing-cta-banner { padding: 48px 0; }
          .pricing-btn { width: 100%; }
          .pricing-actions { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
