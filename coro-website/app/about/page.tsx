import type { Metadata } from 'next';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  FileText,
  Globe2,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Workflow,
} from 'lucide-react';

type Lang = 'fr' | 'en';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SITE_URL = 'https://getcoro.io';

const CONTENT = {
  fr: {
    metadata: {
  title: 'À propos de CORO | Plateforme SaaS de conformité opérationnelle',
  description:
    'Découvrez CORO, une plateforme SaaS canadienne de conformité opérationnelle conçue pour les professionnels des mesures d’urgence, de la sécurité incendie et de la continuité des activités.',
},
    nav: {
      features: 'Fonctionnalités',
      documents: 'Documents',
      howItWorks: 'Comment ça fonctionne',
      pricing: 'Tarifs',
      login: 'Connexion',
      demo: 'Demander une démo',
    },
    hero: {
      tag: 'À propos de CORO',
      title: 'Conçue par le terrain.\nPensée pour les professionnels.',
      subtitle:
        'CORO est une plateforme SaaS de conformité documentaire conçue pour moderniser la création, la gestion et la mise à jour des plans de mesures d’urgence, de sécurité incendie et de continuité des activités — tout en laissant l’expertise humaine au centre des décisions.',
      primary: 'Découvrir la plateforme',
      secondary: 'Demander une démo',
    },
    origin: {
      tag: 'Pourquoi CORO',
      title: 'Une plateforme née d’un besoin concret',
      p1:
        'Dans les domaines des mesures d’urgence, de la sécurité incendie et de la résilience organisationnelle, une part importante du travail documentaire repose encore sur des méthodes manuelles : reprendre des gabarits, déplacer des sections, mettre à jour des procédures, vérifier la cohérence des informations et remettre en forme des documents complexes.',
      p2:
        'CORO a été développée à partir de cette réalité. L’objectif n’est pas de remplacer le jugement professionnel, mais de structurer et d’automatiser les tâches répétitives afin que les spécialistes puissent consacrer davantage de temps à l’analyse des risques, à la qualité des recommandations et à l’accompagnement de leurs clients.',
      note:
        'CORO n’est pas une plateforme générique adaptée après coup à la sécurité. Son fonctionnement est structuré autour des réalités opérationnelles de la production de documents de conformité.',
    },
    mission: {
      tag: 'Notre mission',
      title: 'Moderniser la conformité documentaire sans remplacer l’expertise.',
      text:
        'Nous croyons que la technologie est utile lorsqu’elle permet aux professionnels de mieux exercer leur métier. CORO automatise ce qui peut l’être, structure ce qui doit l’être et laisse les décisions professionnelles entre les mains des personnes responsables.',
      quote:
        'Nous ne cherchons pas à remplacer l’expertise. Nous créons les outils qui lui permettent de s’exprimer pleinement.',
    },
    approach: {
      tag: 'Notre approche',
      title: 'Le terrain d’abord. La technologie ensuite.',
      subtitle:
        'Chaque fonction de CORO répond à un objectif opérationnel : réduire la friction, améliorer la cohérence et renforcer le contrôle qualité.',
      items: [
        {
          icon: 'field',
          title: 'Partir de la réalité du terrain',
          desc:
            'La structure de la plateforme s’appuie sur les étapes réelles d’un mandat : collecte d’information, analyse du bâtiment, sélection des procédures, rédaction, révision, approbation et livraison.',
        },
        {
          icon: 'structure',
          title: 'Structurer l’information',
          desc:
            'Les données sont organisées pour limiter les doubles saisies, améliorer la cohérence entre les sections et simplifier les mises à jour futures.',
        },
        {
          icon: 'automation',
          title: 'Automatiser intelligemment',
          desc:
            'CORO prend en charge les tâches répétitives et la génération structurée, sans retirer au professionnel la maîtrise du contenu ni des décisions.',
        },
        {
          icon: 'quality',
          title: 'Renforcer le contrôle qualité',
          desc:
            'Les workflows de révision, les validations et le suivi documentaire contribuent à produire des livrables plus cohérents, plus faciles à réviser et plus simples à maintenir.',
        },
      ],
    },
    principle: {
      eyebrow: 'Un principe simple',
      title: 'L’expertise humaine reste au centre.',
      text:
        'Une plateforme peut accélérer un processus, structurer des données et soutenir une décision. Elle ne remplace pas la connaissance d’un bâtiment, l’analyse d’un risque, l’expérience opérationnelle ni la responsabilité professionnelle. CORO a été conçue autour de cette distinction.',
      leftTitle: 'Ce que CORO prend en charge',
      leftItems: [
        'Structuration des documents et des projets',
        'Automatisation des tâches répétitives',
        'Organisation des procédures et des données',
        'Workflow de révision et d’approbation',
        'Production de livrables professionnels',
      ],
      rightTitle: 'Ce qui demeure professionnel',
      rightItems: [
        'Analyse des risques et du contexte',
        'Choix des stratégies et des mesures',
        'Adaptation aux particularités du site',
        'Validation du contenu',
        'Jugement et responsabilité professionnelle',
      ],
    },
    expertise: {
      tag: 'Expertise métier',
      title: 'Conçue pour les environnements où la rigueur compte',
      subtitle:
        'CORO s’adresse aux professionnels et aux organisations qui doivent produire, gérer et maintenir des documents structurants pour la sécurité, la préparation et la continuité.',
      cards: [
        {
          icon: 'building',
          title: 'Bâtiments commerciaux',
          desc:
            'Tours à bureaux, centres commerciaux, hôtels, établissements de santé, institutions d’enseignement et autres immeubles où les plans d’urgence et de sécurité doivent rester accessibles, cohérents et à jour.',
        },
        {
          icon: 'factory',
          title: 'Sites industriels',
          desc:
            'Usines, entrepôts et installations de production comportant des équipements, des risques particuliers ou des matières dangereuses nécessitant une approche documentaire structurée.',
        },
      ],
      docsTitle: 'Une même plateforme pour plusieurs familles de documents',
      docs: [
        'Plan de mesures d’urgence (PMU)',
        'Plan de sécurité incendie (PSI)',
        'Plan de continuité des activités (PCA)',
        'Plan de gestion de crise (PGC)',
        'Plan de reprise des activités (PRA)',
        'Plan d’urgence environnementale (PUE)',
      ],
    },
    values: {
      tag: 'Ce qui nous guide',
      title: 'Quatre principes qui orientent CORO',
      items: [
        {
          icon: 'rigor',
          title: 'Rigueur',
          desc:
            'La conformité documentaire exige une structure claire, une information cohérente et une méthode de travail reproductible.',
        },
        {
          icon: 'control',
          title: 'Contrôle professionnel',
          desc:
            'Le professionnel conserve la maîtrise de ses documents, de ses recommandations, de ses validations et de la livraison finale.',
        },
        {
          icon: 'useful',
          title: 'Technologie utile',
          desc:
            'Une fonction n’a de valeur que si elle réduit réellement le temps consacré aux tâches sans valeur ajoutée ou améliore la qualité du travail.',
        },
        {
          icon: 'evolve',
          title: 'Évolution continue',
          desc:
            'Les besoins opérationnels, les pratiques et les exigences évoluent. La plateforme est pensée pour évoluer avec eux.',
        },
      ],
    },
    canada: {
      tag: 'Une plateforme canadienne',
      title: 'Pensée pour les organisations d’ici, prête à évoluer avec elles.',
      text:
        'CORO est une plateforme bilingue français–anglais dont les données sont hébergées au Canada. Son approche tient compte des réalités de conformité, de protection des renseignements et de souveraineté des données auxquelles sont confrontées les organisations canadiennes.',
      items: [
        { title: 'Canada', desc: 'Données hébergées au Canada' },
        { title: 'FR / EN', desc: 'Expérience bilingue' },
        { title: 'Sécurité', desc: 'Accès et données protégés' },
      ],
      link: 'En savoir plus sur la sécurité de CORO',
    },
    cta: {
      title: 'Voyez comment CORO peut moderniser votre pratique.',
      subtitle:
        'Découvrez une plateforme conçue pour réduire la charge documentaire et remettre l’expertise professionnelle au centre du travail.',
      primary: 'Demander une démo',
      secondary: 'Voir les fonctionnalités',
    },
    footer: {
      tagline: 'La conformité, pensée par des experts du terrain.',
      product: 'Produit',
      company: 'Compagnie',
      legal: 'Légal',
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      login: 'Connexion',
      about: 'À propos',
      security: 'Sécurité',
      blog: 'Blogue',
      partners: 'Partenaires',
      contact: 'Nous contacter',
      soon: 'Bientôt',
      privacy: 'Politique de confidentialité',
      terms: 'Conditions d’utilisation',
      rights: '© 2026 CORO. Tous droits réservés.',
      hosting: 'Hébergé au Canada 🇨🇦',
      language: '🌐 English',
    },
  },
  en: {
    metadata: {
  title: 'About CORO | Operational Compliance SaaS Platform',
  description:
    'Discover CORO, a Canadian operational compliance SaaS platform built for emergency management, fire safety and business continuity professionals.',
},
    nav: {
      features: 'Features',
      documents: 'Documents',
      howItWorks: 'How it works',
      pricing: 'Pricing',
      login: 'Login',
      demo: 'Request a demo',
    },
    hero: {
      tag: 'About CORO',
      title: 'Built from the field.\nDesigned for professionals.',
      subtitle:
        'CORO is a document compliance SaaS platform designed to modernize the creation, management and updating of emergency response, fire safety and business continuity plans — while keeping human expertise at the center of every decision.',
      primary: 'Discover the platform',
      secondary: 'Request a demo',
    },
    origin: {
      tag: 'Why CORO',
      title: 'A platform born from a concrete need',
      p1:
        'In emergency management, fire safety and organizational resilience, a significant part of document production still depends on manual methods: reusing templates, moving sections, updating procedures, checking information consistency and reformatting complex documents.',
      p2:
        'CORO was developed from that reality. The goal is not to replace professional judgment, but to structure and automate repetitive tasks so specialists can devote more time to risk analysis, recommendation quality and client support.',
      note:
        'CORO is not a generic platform retrofitted for safety. Its workflows are structured around the operational realities of producing compliance documentation.',
    },
    mission: {
      tag: 'Our mission',
      title: 'Modernize document compliance without replacing expertise.',
      text:
        'We believe technology is valuable when it helps professionals do their work better. CORO automates what can be automated, structures what must be structured and keeps professional decisions in the hands of the people responsible for them.',
      quote:
        'We are not trying to replace expertise. We build the tools that allow it to perform at its best.',
    },
    approach: {
      tag: 'Our approach',
      title: 'Field reality first. Technology second.',
      subtitle:
        'Every CORO feature serves an operational purpose: reduce friction, improve consistency and strengthen quality control.',
      items: [
        {
          icon: 'field',
          title: 'Start with field reality',
          desc:
            'The platform follows the actual stages of a mandate: information gathering, building analysis, procedure selection, drafting, review, approval and delivery.',
        },
        {
          icon: 'structure',
          title: 'Structure information',
          desc:
            'Data is organized to reduce duplicate entry, improve consistency across sections and make future updates easier.',
        },
        {
          icon: 'automation',
          title: 'Automate intelligently',
          desc:
            'CORO handles repetitive tasks and structured generation without taking control of content or professional decisions away from the user.',
        },
        {
          icon: 'quality',
          title: 'Strengthen quality control',
          desc:
            'Review workflows, validations and document tracking help produce more consistent deliverables that are easier to review and maintain.',
        },
      ],
    },
    principle: {
      eyebrow: 'A simple principle',
      title: 'Human expertise stays at the center.',
      text:
        'A platform can accelerate a process, structure data and support a decision. It cannot replace knowledge of a building, risk analysis, operational experience or professional accountability. CORO was designed around that distinction.',
      leftTitle: 'What CORO handles',
      leftItems: [
        'Document and project structuring',
        'Automation of repetitive tasks',
        'Organization of procedures and data',
        'Review and approval workflows',
        'Production of professional deliverables',
      ],
      rightTitle: 'What remains professional',
      rightItems: [
        'Risk and context analysis',
        'Selection of strategies and measures',
        'Adaptation to site-specific conditions',
        'Content validation',
        'Professional judgment and accountability',
      ],
    },
    expertise: {
      tag: 'Domain expertise',
      title: 'Built for environments where rigor matters',
      subtitle:
        'CORO is designed for professionals and organizations that must produce, manage and maintain critical documentation for safety, preparedness and continuity.',
      cards: [
        {
          icon: 'building',
          title: 'Commercial buildings',
          desc:
            'Office towers, shopping centers, hotels, healthcare facilities, educational institutions and other properties where emergency and safety plans must remain accessible, consistent and up to date.',
        },
        {
          icon: 'factory',
          title: 'Industrial sites',
          desc:
            'Factories, warehouses and production facilities with equipment, specific hazards or dangerous materials requiring a structured documentation approach.',
        },
      ],
      docsTitle: 'One platform for multiple document families',
      docs: [
        'Emergency Response Plan (ERP)',
        'Fire Safety Plan (FSP)',
        'Business Continuity Plan (BCP)',
        'Crisis Management Plan (CMP)',
        'Disaster Recovery Plan (DRP)',
        'Environmental Emergency Plan (EEP)',
      ],
    },
    values: {
      tag: 'What guides us',
      title: 'Four principles that shape CORO',
      items: [
        {
          icon: 'rigor',
          title: 'Rigor',
          desc:
            'Document compliance requires a clear structure, consistent information and a reproducible work method.',
        },
        {
          icon: 'control',
          title: 'Professional control',
          desc:
            'Professionals retain control over their documents, recommendations, validations and final delivery.',
        },
        {
          icon: 'useful',
          title: 'Useful technology',
          desc:
            'A feature only has value if it truly reduces time spent on low-value tasks or improves the quality of the work.',
        },
        {
          icon: 'evolve',
          title: 'Continuous evolution',
          desc:
            'Operational needs, practices and requirements evolve. The platform is designed to evolve with them.',
        },
      ],
    },
    canada: {
      tag: 'A Canadian platform',
      title: 'Built for Canadian organizations, ready to grow with them.',
      text:
        'CORO is a bilingual French–English platform with data hosted in Canada. Its approach reflects the compliance, privacy and data-sovereignty realities faced by Canadian organizations.',
      items: [
        { title: 'Canada', desc: 'Data hosted in Canada' },
        { title: 'FR / EN', desc: 'Bilingual experience' },
        { title: 'Security', desc: 'Protected access and data' },
      ],
      link: 'Learn more about CORO security',
    },
    cta: {
      title: 'See how CORO can modernize your practice.',
      subtitle:
        'Discover a platform designed to reduce document workload and put professional expertise back at the center of the work.',
      primary: 'Request a demo',
      secondary: 'View features',
    },
    footer: {
      tagline: 'Compliance, designed by field experts.',
      product: 'Product',
      company: 'Company',
      legal: 'Legal',
      features: 'Features',
      pricing: 'Pricing',
      login: 'Login',
      about: 'About us',
      security: 'Security',
      blog: 'Blog',
      partners: 'Partners',
      contact: 'Contact us',
      soon: 'Soon',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
      rights: '© 2026 CORO. All rights reserved.',
      hosting: 'Hosted in Canada 🇨🇦',
      language: '🌐 Français',
    },
  },
};

function getLang(raw: string | string[] | undefined): Lang {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'en' ? 'en' : 'fr';
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const t = CONTENT[lang];

  const canonical = lang === 'en' ? `${SITE_URL}/about?lang=en` : `${SITE_URL}/about`;

  return {
    title: t.metadata.title,
    description: t.metadata.description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical,
      languages: {
        'fr-CA': `${SITE_URL}/about`,
        'en-CA': `${SITE_URL}/about?lang=en`,
        'x-default': `${SITE_URL}/about`,
      },
    },
    openGraph: {
      type: 'website',
      locale: lang === 'fr' ? 'fr_CA' : 'en_CA',
      url: canonical,
      siteName: 'CORO',
      title: t.metadata.title,
      description: t.metadata.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: t.metadata.title,
      description: t.metadata.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

function IconFor({ name, size = 26 }: { name: string; size?: number }) {
  const props = { size, strokeWidth: 1.8, color: '#C0392B' };

  switch (name) {
    case 'field':
      return <UsersRound {...props} />;
    case 'structure':
      return <Layers3 {...props} />;
    case 'automation':
      return <Workflow {...props} />;
    case 'quality':
      return <ClipboardCheck {...props} />;
    case 'building':
      return <Building2 {...props} />;
    case 'factory':
      return <Factory {...props} />;
    case 'rigor':
      return <ShieldCheck {...props} />;
    case 'control':
      return <Target {...props} />;
    case 'useful':
      return <Sparkles {...props} />;
    case 'evolve':
      return <ArrowRight {...props} />;
    default:
      return <CheckCircle2 {...props} />;
  }
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span
      aria-label="CORO"
      style={{
        fontSize: 28,
        fontWeight: 900,
        color: dark ? '#2C3E50' : '#FFFFFF',
        letterSpacing: '-1px',
      }}
    >
      CO<span style={{ color: '#C0392B' }}>RO</span>
    </span>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: '#FDEDEC',
        color: '#C0392B',
        borderRadius: 20,
        padding: '6px 14px',
        marginBottom: 16,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </span>
  );
}

export default async function AboutPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const t = CONTENT[lang];

  const langSuffix = lang === 'en' ? '?lang=en' : '';
  const otherLangHref = lang === 'fr' ? '/about?lang=en' : '/about';

  const homeLink = (anchor = '') => `/${langSuffix}${anchor}`;

  const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',

  name: 'CORO',

  alternateName:
    'CORO — Conformité Opérationnelle et Résilience Organisationnelle',

  url: SITE_URL,

  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/coro-logo.png`,
    contentUrl: `${SITE_URL}/coro-logo.png`,
  },

  email: 'info@getcoro.io',

  telephone: '+1-514-791-7871',

  address: {
    '@type': 'PostalAddress',
    streetAddress: '2879 Boul. Pierre-Bernard',
    addressLocality: 'Montréal',
    addressRegion: 'QC',
    postalCode: 'H1L 4R2',
    addressCountry: 'CA',
  },

  description: t.metadata.description,
};

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#2C3E50',
        backgroundColor: '#FFFFFF',
      }}
    >
      <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c'),
  }}
/>

      {/* ───────────────────────────── */}
      {/* NAVIGATION */}
      {/* ───────────────────────────── */}
      <nav
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            height: 72,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <a
            href={homeLink()}
            aria-label={lang === 'fr' ? 'Retour à l’accueil CORO' : 'Back to CORO home'}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            <Logo />
          </a>

          <div className="about-desktop-nav">
            <a href={homeLink('#features')} className="about-nav-link">
              {t.nav.features}
            </a>
            <a href={homeLink('#documents')} className="about-nav-link">
              {t.nav.documents}
            </a>
            <a href={homeLink('#how-it-works')} className="about-nav-link">
              {t.nav.howItWorks}
            </a>
            <a href={homeLink('#pricing')} className="about-nav-link">
              {t.nav.pricing}
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href={otherLangHref} className="about-lang">
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>

            <a
              href="https://app.getcoro.io/login"
              className="about-login about-hide-small"
            >
              {t.nav.login}
            </a>

            <a
              href={homeLink('#demo')}
              className="about-demo about-hide-small"
            >
              {t.nav.demo}
            </a>

            <details className="about-mobile-menu">
              <summary aria-label={lang === 'fr' ? 'Ouvrir le menu' : 'Open menu'}>
                ☰
              </summary>
              <div className="about-mobile-panel">

  <a href={homeLink('#features')}>
    {t.nav.features}
  </a>

  <a href={homeLink('#documents')}>
    {t.nav.documents}
  </a>

  <a href={homeLink('#how-it-works')}>
    {t.nav.howItWorks}
  </a>

  <a href={homeLink('#pricing')}>
    {t.nav.pricing}
  </a>

  <a href={lang === 'fr' ? '/security' : '/security?lang=en'}>
    {lang === 'fr' ? 'Sécurité' : 'Security'}
  </a>

  <a href="https://app.getcoro.io/login">
    {t.nav.login}
  </a>

  <a href={homeLink('#demo')}>
    {t.nav.demo}
  </a>

</div>
            </details>
          </div>
        </div>
      </nav>

      <main>
        {/* ───────────────────────────── */}
        {/* HERO */}
        {/* ───────────────────────────── */}
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, #1A252F 0%, #2C3E50 65%, #7B2D26 100%)',
            padding: '168px 24px 112px',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: 520,
              height: 520,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.07)',
              right: '-120px',
              top: '-180px',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: 360,
              height: 360,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.05)',
              right: '80px',
              bottom: '-220px',
            }}
          />

          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ maxWidth: 860 }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: 'rgba(192,57,43,0.18)',
                  border: '1px solid rgba(231,76,60,0.38)',
                  borderRadius: 20,
                  padding: '7px 16px',
                  marginBottom: 26,
                  color: '#F1948A',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t.hero.tag}
              </span>

              <h1
                style={{
                  fontSize: 'clamp(42px, 6vw, 72px)',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  lineHeight: 1.06,
                  letterSpacing: '-2px',
                  margin: 0,
                  marginBottom: 28,
                  whiteSpace: 'pre-line',
                  maxWidth: 900,
                }}
              >
                {t.hero.title}
              </h1>

              <p
                style={{
                  fontSize: 'clamp(17px, 2vw, 20px)',
                  color: 'rgba(255,255,255,0.74)',
                  lineHeight: 1.75,
                  margin: 0,
                  maxWidth: 790,
                }}
              >
                {t.hero.subtitle}
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 14,
                  marginTop: 38,
                }}
              >
                <a href={homeLink('#features')} className="about-btn-primary">
                  {t.hero.primary} <ArrowRight size={17} />
                </a>
                <a href={homeLink('#demo')} className="about-btn-secondary">
                  {t.hero.secondary}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────── */}
        {/* POURQUOI CORO */}
        {/* ───────────────────────────── */}
        <section style={{ padding: '108px 24px', backgroundColor: '#FFFFFF' }}>
          <div
            className="about-two-columns"
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              alignItems: 'center',
            }}
          >
            <div>
              <SectionTag>{t.origin.tag}</SectionTag>

              <h2 className="about-h2">{t.origin.title}</h2>

              <p className="about-body">{t.origin.p1}</p>
              <p className="about-body" style={{ marginTop: 20 }}>
                {t.origin.p2}
              </p>
            </div>

            <div
              style={{
                background:
                  'linear-gradient(145deg, #F8F9FA 0%, #FFFFFF 100%)',
                border: '1px solid #E9ECEF',
                borderRadius: 20,
                padding: 'clamp(30px, 5vw, 54px)',
                boxShadow: '0 22px 60px rgba(44,62,80,0.08)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  backgroundColor: '#FDEDEC',
                  right: -42,
                  top: -44,
                }}
              />
              <FileText
                size={48}
                color="#C0392B"
                strokeWidth={1.5}
                style={{ marginBottom: 28, position: 'relative' }}
              />
              <p
                style={{
                  fontSize: 'clamp(22px, 3vw, 30px)',
                  fontWeight: 800,
                  lineHeight: 1.35,
                  color: '#2C3E50',
                  margin: 0,
                  position: 'relative',
                }}
              >
                {t.origin.note}
              </p>
            </div>
          </div>
        </section>

        {/* ───────────────────────────── */}
        {/* MISSION */}
        {/* ───────────────────────────── */}
        <section
          style={{
            padding: '110px 24px',
            backgroundColor: '#2C3E50',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 80% 20%, rgba(192,57,43,0.18), transparent 34%)',
            }}
          />

          <div
            style={{
              maxWidth: 1000,
              margin: '0 auto',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                color: '#F1948A',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 20,
              }}
            >
              {t.mission.tag}
            </span>

            <h2
              style={{
                color: '#FFFFFF',
                fontSize: 'clamp(32px, 5vw, 52px)',
                lineHeight: 1.15,
                letterSpacing: '-1px',
                fontWeight: 900,
                margin: 0,
                marginBottom: 26,
              }}
            >
              {t.mission.title}
            </h2>

            <p
              style={{
                color: 'rgba(255,255,255,0.68)',
                fontSize: 18,
                lineHeight: 1.8,
                maxWidth: 820,
                margin: '0 auto',
              }}
            >
              {t.mission.text}
            </p>

            <div
              style={{
                height: 1,
                width: 72,
                backgroundColor: '#C0392B',
                margin: '42px auto',
              }}
            />

            <p
              style={{
                color: '#FFFFFF',
                fontSize: 'clamp(23px, 3vw, 32px)',
                fontWeight: 800,
                lineHeight: 1.45,
                maxWidth: 850,
                margin: '0 auto',
              }}
            >
              “{t.mission.quote}”
            </p>
          </div>
        </section>

        {/* ───────────────────────────── */}
        {/* APPROCHE */}
        {/* ───────────────────────────── */}
        <section style={{ padding: '108px 24px', backgroundColor: '#F8F9FA' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 62px' }}>
              <SectionTag>{t.approach.tag}</SectionTag>
              <h2 className="about-h2" style={{ marginBottom: 18 }}>
                {t.approach.title}
              </h2>
              <p className="about-body" style={{ margin: '0 auto' }}>
                {t.approach.subtitle}
              </p>
            </div>

            <div className="about-card-grid">
              {t.approach.items.map((item, index) => (
                <article className="about-card" key={item.title}>
                  <div className="about-icon-box">
                    <IconFor name={item.icon} />
                  </div>
                  <p
                    style={{
                      color: '#C0392B',
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      margin: '0 0 8px',
                    }}
                  >
                    0{index + 1}
                  </p>
                  <h3 className="about-h3">{item.title}</h3>
                  <p className="about-card-text">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────────── */}
        {/* PRINCIPE : HUMAIN AU CENTRE */}
        {/* ───────────────────────────── */}
        <section style={{ padding: '108px 24px', backgroundColor: '#FFFFFF' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ maxWidth: 800, marginBottom: 56 }}>
              <SectionTag>{t.principle.eyebrow}</SectionTag>
              <h2 className="about-h2">{t.principle.title}</h2>
              <p className="about-body">{t.principle.text}</p>
            </div>

            <div className="about-principle-grid">
              <div
                style={{
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #E9ECEF',
                  borderRadius: 16,
                  padding: 'clamp(28px, 4vw, 42px)',
                }}
              >
                <div className="about-icon-box">
                  <Workflow size={27} color="#C0392B" strokeWidth={1.8} />
                </div>
                <h3 className="about-h3" style={{ fontSize: 22 }}>
                  {t.principle.leftTitle}
                </h3>
                <ul className="about-check-list">
                  {t.principle.leftItems.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={18} color="#C0392B" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                style={{
                  backgroundColor: '#2C3E50',
                  border: '1px solid #2C3E50',
                  borderRadius: 16,
                  padding: 'clamp(28px, 4vw, 42px)',
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 13,
                    backgroundColor: 'rgba(255,255,255,0.09)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 24,
                  }}
                >
                  <UsersRound size={27} color="#FFFFFF" strokeWidth={1.8} />
                </div>
                <h3
                  className="about-h3"
                  style={{ fontSize: 22, color: '#FFFFFF' }}
                >
                  {t.principle.rightTitle}
                </h3>
                <ul className="about-check-list about-check-list-dark">
                  {t.principle.rightItems.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={18} color="#F1948A" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────── */}
        {/* EXPERTISE & DOCUMENTS */}
        {/* ───────────────────────────── */}
        <section style={{ padding: '108px 24px', backgroundColor: '#F8F9FA' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 60px' }}>
              <SectionTag>{t.expertise.tag}</SectionTag>
              <h2 className="about-h2" style={{ marginBottom: 18 }}>
                {t.expertise.title}
              </h2>
              <p className="about-body" style={{ margin: '0 auto' }}>
                {t.expertise.subtitle}
              </p>
            </div>

            <div className="about-expertise-grid">
              {t.expertise.cards.map((card) => (
                <article
                  key={card.title}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                    borderRadius: 18,
                    padding: 'clamp(30px, 5vw, 48px)',
                  }}
                >
                  <div className="about-icon-box" style={{ width: 62, height: 62 }}>
                    <IconFor name={card.icon} size={30} />
                  </div>
                  <h3 className="about-h3" style={{ fontSize: 23 }}>
                    {card.title}
                  </h3>
                  <p className="about-card-text" style={{ fontSize: 16 }}>
                    {card.desc}
                  </p>
                </article>
              ))}
            </div>

            <div
              style={{
                marginTop: 34,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E9ECEF',
                borderRadius: 18,
                padding: 'clamp(28px, 5vw, 48px)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                  marginBottom: 28,
                }}
              >
                <div className="about-icon-box" style={{ marginBottom: 0 }}>
                  <FileText size={26} color="#C0392B" strokeWidth={1.8} />
                </div>
                <h3
                  style={{
                    fontSize: 'clamp(20px, 3vw, 26px)',
                    fontWeight: 800,
                    color: '#2C3E50',
                    margin: 0,
                  }}
                >
                  {t.expertise.docsTitle}
                </h3>
              </div>

              <div className="about-doc-grid">
                {t.expertise.docs.map((doc) => (
                  <div
                    key={doc}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <CheckCircle2
                      size={18}
                      color="#C0392B"
                      strokeWidth={2}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        color: '#495057',
                        fontSize: 15,
                        lineHeight: 1.55,
                      }}
                    >
                      {doc}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 30 }}>
                <a href={homeLink('#documents')} className="about-inline-link">
                  {lang === 'fr'
                    ? 'Découvrir les documents pris en charge'
                    : 'Explore supported documents'}
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────── */}
        {/* VALEURS */}
        {/* ───────────────────────────── */}
        <section style={{ padding: '108px 24px', backgroundColor: '#FFFFFF' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 60px' }}>
              <SectionTag>{t.values.tag}</SectionTag>
              <h2 className="about-h2">{t.values.title}</h2>
            </div>

            <div className="about-card-grid">
              {t.values.items.map((item) => (
                <article className="about-card about-card-flat" key={item.title}>
                  <div className="about-icon-box">
                    <IconFor name={item.icon} />
                  </div>
                  <h3 className="about-h3">{item.title}</h3>
                  <p className="about-card-text">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────────── */}
        {/* CANADA */}
        {/* ───────────────────────────── */}
        <section style={{ padding: '104px 24px', backgroundColor: '#F8F9FA' }}>
          <div
            className="about-canada-grid"
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              alignItems: 'center',
            }}
          >
            <div>
              <SectionTag>{t.canada.tag}</SectionTag>
              <h2 className="about-h2">{t.canada.title}</h2>
              <p className="about-body">{t.canada.text}</p>

              <a
                href={lang === 'fr' ? '/security' : '/security?lang=en'}
                className="about-inline-link"
                style={{ marginTop: 28 }}
              >
                {t.canada.link}
                <ArrowRight size={16} />
              </a>
            </div>

            <div className="about-canada-stats">
              {t.canada.items.map((item, index) => {
                const icons = [
                  <Globe2 key="globe" size={28} color="#C0392B" strokeWidth={1.8} />,
                  <FileText key="file" size={28} color="#C0392B" strokeWidth={1.8} />,
                  <LockKeyhole key="lock" size={28} color="#C0392B" strokeWidth={1.8} />,
                ];

                return (
                  <div className="about-canada-stat" key={item.title}>
                    {icons[index]}
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: '#2C3E50',
                          fontSize: 22,
                          fontWeight: 900,
                        }}
                      >
                        {item.title}
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0',
                          color: '#6C757D',
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────────── */}
        {/* CTA FINAL */}
        {/* ───────────────────────────── */}
        <section
          style={{
            background: 'linear-gradient(135deg, #C0392B 0%, #922B21 100%)',
            padding: '100px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <h2
              style={{
                fontSize: 'clamp(30px, 5vw, 48px)',
                fontWeight: 900,
                color: '#FFFFFF',
                margin: '0 0 20px',
                lineHeight: 1.18,
                letterSpacing: '-1px',
              }}
            >
              {t.cta.title}
            </h2>

            <p
              style={{
                fontSize: 18,
                color: 'rgba(255,255,255,0.82)',
                margin: '0 auto 38px',
                lineHeight: 1.7,
                maxWidth: 700,
              }}
            >
              {t.cta.subtitle}
            </p>

            <div
              style={{
                display: 'flex',
                gap: 14,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <a href={homeLink('#demo')} className="about-cta-white">
                {t.cta.primary} <ArrowRight size={17} />
              </a>
              <a href={homeLink('#features')} className="about-cta-outline">
                {t.cta.secondary}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ───────────────────────────── */}
      {/* FOOTER */}
      {/* ───────────────────────────── */}
      <footer
        style={{
          backgroundColor: '#1A252F',
          padding: '56px 24px 32px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 52 }}>
            <a
              href={homeLink()}
              style={{ textDecoration: 'none', display: 'inline-block' }}
              aria-label={lang === 'fr' ? 'Accueil CORO' : 'CORO home'}
            >
              <Logo />
            </a>

            <p
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 14,
                marginTop: 12,
                lineHeight: 1.7,
                maxWidth: 300,
              }}
            >
              {t.footer.tagline}
            </p>
          </div>

          <div className="about-footer-grid">
            <div>
              <h3 className="about-footer-heading">🇨🇦 Canada</h3>

              <p className="about-footer-text">
                2879 Boul. Pierre-Bernard
                <br />
                Montréal (QC), H1L 4R2
                <br />
                Canada
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 7,
                  marginTop: 12,
                }}
              >
                <a href="mailto:info@getcoro.io" className="about-footer-link">
                  info@getcoro.io
                </a>
                <a href="tel:+15147917871" className="about-footer-link">
                  +1 (514) 791-7871
                </a>
              </div>
            </div>

            <div>
              <h3 className="about-footer-heading">{t.footer.product}</h3>
              <div className="about-footer-links">
                <a href={homeLink('#features')} className="about-footer-link">
                  {t.footer.features}
                </a>
                <a href={homeLink('#pricing')} className="about-footer-link">
                  {t.footer.pricing}
                </a>
                <a
                  href="https://app.getcoro.io/login"
                  className="about-footer-link"
                >
                  {t.footer.login}
                </a>
              </div>
            </div>

            <div>
  <h3 className="about-footer-heading">{t.footer.company}</h3>

  <div className="about-footer-links">
    <a
      href={lang === 'fr' ? '/about' : '/about?lang=en'}
      className="about-footer-link"
    >
      {t.footer.about}
    </a>

    <a
      href={lang === 'fr' ? '/security' : '/security?lang=en'}
      className="about-footer-link"
    >
      {t.footer.security}
    </a>

    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        className="about-footer-link"
        style={{ cursor: 'default' }}
      >
        {t.footer.blog}
      </span>
      <span className="about-soon">{t.footer.soon}</span>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        className="about-footer-link"
        style={{ cursor: 'default' }}
      >
        {t.footer.partners}
      </span>
      <span className="about-soon">{t.footer.soon}</span>
    </div>

    <a
      href={homeLink('#demo')}
      className="about-footer-link"
    >
      {t.footer.contact}
    </a>
  </div>
</div>

<div>
  <h3 className="about-footer-heading">{t.footer.legal}</h3>

  <div className="about-footer-links">
    <a
      href={lang === 'fr' ? '/privacy' : '/privacy?lang=en'}
      className="about-footer-link"
    >
      {t.footer.privacy}
    </a>

    <a
      href={lang === 'fr' ? '/terms' : '/terms?lang=en'}
      className="about-footer-link"
    >
      {t.footer.terms}
    </a>
  </div>
</div>
</div>

          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: 28,
            }}
          >
            <div className="about-footer-bottom">
              <div className="about-footer-bottom-left">
                <p className="about-footer-muted">{t.footer.rights}</p>
                <span className="about-footer-separator">|</span>
                <a
  href={lang === 'fr' ? '/privacy' : '/privacy?lang=en'}
  className="about-footer-muted-link"
>
  {t.footer.privacy}
</a>

<span className="about-footer-separator">|</span>

<a
  href={lang === 'fr' ? '/terms' : '/terms?lang=en'}
  className="about-footer-muted-link"
>
  {t.footer.terms}
</a>
              </div>

              <div className="about-footer-bottom-right">
                <p className="about-footer-muted">{t.footer.hosting}</p>
                <a href={otherLangHref} className="about-footer-language">
                  {t.footer.language}
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        .about-desktop-nav {
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .about-nav-link {
          color: rgba(255,255,255,0.88);
          font-size: 15px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .about-nav-link:hover {
          color: #FFFFFF;
        }

        .about-lang,
        .about-login {
          padding: 7px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.34);
          color: #FFFFFF;
          text-decoration: none;
          transition: background-color 0.2s ease;
        }

        .about-login {
          padding: 8px 17px;
          font-size: 14px;
          font-weight: 500;
        }

        .about-lang:hover,
        .about-login:hover {
          background-color: rgba(255,255,255,0.10);
        }

        .about-demo {
          padding: 9px 18px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 700;
          color: #FFFFFF;
          background-color: #C0392B;
          text-decoration: none;
          transition: background-color 0.2s ease;
        }

        .about-demo:hover {
          background-color: #A93226;
        }

        .about-mobile-menu {
          display: none;
          position: relative;
        }

        .about-mobile-menu summary {
          list-style: none;
          cursor: pointer;
          color: #FFFFFF;
          font-size: 24px;
          line-height: 1;
          padding: 5px;
        }

        .about-mobile-menu summary::-webkit-details-marker {
          display: none;
        }

        .about-mobile-panel {
          position: absolute;
          right: 0;
          top: 42px;
          min-width: 240px;
          background: #FFFFFF;
          border: 1px solid #E9ECEF;
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 16px 42px rgba(0,0,0,0.18);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .about-mobile-panel a {
          color: #2C3E50;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          padding: 10px 12px;
          border-radius: 7px;
        }

        .about-mobile-panel a:hover {
          background: #F8F9FA;
          color: #C0392B;
        }

        .about-btn-primary,
        .about-btn-secondary,
        .about-cta-white,
        .about-cta-outline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
        }

        .about-btn-primary {
          background-color: #C0392B;
          color: #FFFFFF;
          border: 2px solid #C0392B;
        }

        .about-btn-primary:hover {
          background-color: #A93226;
          border-color: #A93226;
          transform: translateY(-1px);
        }

        .about-btn-secondary {
          color: #FFFFFF;
          background-color: rgba(255,255,255,0.07);
          border: 2px solid rgba(255,255,255,0.30);
        }

        .about-btn-secondary:hover {
          background-color: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.55);
        }

        .about-h2 {
          font-size: clamp(30px, 4vw, 44px);
          line-height: 1.17;
          letter-spacing: -1px;
          font-weight: 850;
          color: #2C3E50;
          margin: 0 0 24px;
        }

        .about-h3 {
          font-size: 19px;
          line-height: 1.3;
          font-weight: 800;
          color: #2C3E50;
          margin: 0 0 12px;
        }

        .about-body {
          font-size: 17px;
          color: #6C757D;
          line-height: 1.8;
          margin: 0;
          max-width: 720px;
        }

        .about-two-columns {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: 72px;
        }

        .about-card-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
        }

        .about-card {
          background-color: #FFFFFF;
          border: 1px solid #E9ECEF;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 6px 20px rgba(44,62,80,0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .about-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 34px rgba(44,62,80,0.08);
        }

        .about-card-flat {
          box-shadow: none;
        }

        .about-icon-box {
          width: 54px;
          height: 54px;
          border-radius: 13px;
          background-color: #FDEDEC;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
        }

        .about-card-text {
          color: #6C757D;
          font-size: 15px;
          line-height: 1.7;
          margin: 0;
        }

        .about-principle-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 26px;
        }

        .about-check-list {
          list-style: none;
          margin: 24px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .about-check-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #495057;
          font-size: 15px;
          line-height: 1.55;
        }

        .about-check-list li svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .about-check-list-dark li {
          color: rgba(255,255,255,0.72);
        }

        .about-expertise-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 26px;
        }

        .about-doc-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px 28px;
        }

        .about-inline-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #C0392B;
          font-size: 15px;
          font-weight: 750;
          text-decoration: none;
        }

        .about-inline-link:hover {
          text-decoration: underline;
        }

        .about-canada-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.85fr);
          gap: 80px;
        }

        .about-canada-stats {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .about-canada-stat {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 22px 24px;
          background: #FFFFFF;
          border: 1px solid #E9ECEF;
          border-radius: 13px;
        }

        .about-canada-stat svg {
          flex-shrink: 0;
        }

        .about-cta-white {
          background: #FFFFFF;
          color: #C0392B;
          border: 2px solid #FFFFFF;
        }

        .about-cta-white:hover {
          transform: translateY(-1px);
          background: #F8F9FA;
        }

        .about-cta-outline {
          background: transparent;
          color: #FFFFFF;
          border: 2px solid rgba(255,255,255,0.45);
        }

        .about-cta-outline:hover {
          background: rgba(255,255,255,0.10);
          border-color: #FFFFFF;
        }

        .about-footer-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 72px;
          align-items: start;
        }

        .about-footer-heading {
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 700;
          margin: 0 0 20px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .about-footer-text {
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          line-height: 1.75;
          margin: 0;
        }

        .about-footer-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .about-footer-link {
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .about-footer-link:hover {
          color: #FFFFFF;
        }

        .about-soon {
          font-size: 10px;
          font-weight: 700;
          color: #F39C12;
          background-color: rgba(243,156,18,0.15);
          border: 1px solid rgba(243,156,18,0.3);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .about-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .about-footer-bottom-left,
        .about-footer-bottom-right {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .about-footer-bottom-right {
          gap: 16px;
        }

        .about-footer-muted {
          color: rgba(255,255,255,0.3);
          font-size: 13px;
          margin: 0;
        }

        .about-footer-separator {
          color: rgba(255,255,255,0.15);
          font-size: 13px;
        }

        .about-footer-muted-link {
          color: rgba(255,255,255,0.3);
          font-size: 13px;
          text-decoration: none;
        }

        .about-footer-muted-link:hover {
          color: #FFFFFF;
        }

        .about-footer-language {
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.15);
          background-color: transparent;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
        }

        .about-footer-language:hover {
          color: #FFFFFF;
        }

        @media (max-width: 1000px) {
          .about-desktop-nav {
            display: none;
          }

          .about-mobile-menu {
            display: block;
          }

          .about-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .about-two-columns,
          .about-canada-grid {
            grid-template-columns: 1fr;
            gap: 44px;
          }

          .about-canada-grid {
            gap: 42px;
          }

          .about-footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .about-hide-small {
            display: none;
          }

          .about-principle-grid,
          .about-expertise-grid,
          .about-doc-grid {
            grid-template-columns: 1fr;
          }

          .about-card-grid {
            grid-template-columns: 1fr;
          }

          .about-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 42px 24px;
          }

          .about-footer-separator {
            display: none;
          }

          .about-footer-bottom-left,
          .about-footer-bottom-right {
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          .about-footer-grid {
            grid-template-columns: 1fr;
          }

          .about-footer-bottom {
            align-items: flex-start;
            flex-direction: column;
          }

          .about-footer-bottom-left,
          .about-footer-bottom-right {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}