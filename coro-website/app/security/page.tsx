import type { Metadata } from 'next';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  FileCheck2,
  Globe2,
  KeyRound,
  LockKeyhole,
  Server,
  ShieldCheck,
  UserRoundCheck,
  Activity,
  HardDriveDownload,
  Network,
} from 'lucide-react';

type Lang = 'fr' | 'en';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SITE_URL = 'https://getcoro.io';

const CONTENT = {
  fr: {
    metadata: {
      title: 'Sécurité et protection des données | CORO',
      description:
        'Découvrez l’approche de CORO en matière de sécurité, d’hébergement canadien, de protection des données, de contrôle des accès, de sauvegardes et de continuité.',
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
      tag: 'Sécurité & protection des données',
      title: 'La sécurité fait partie de l’architecture.',
      subtitle:
        'CORO est conçue pour les organisations qui doivent protéger des documents sensibles, contrôler les accès et maintenir leurs données au Canada. Notre approche combine hébergement canadien, chiffrement des communications, contrôle d’accès, sauvegardes et surveillance.',
      primary: 'Parler à notre équipe',
      secondary: 'Voir les fonctionnalités',
    },
    trust: {
      title: 'Une approche conçue pour les environnements professionnels',
      subtitle:
        'La sécurité de CORO repose sur plusieurs couches complémentaires, de l’infrastructure à la gestion des accès.',
      items: [
        {
          icon: 'canada',
          title: 'Données hébergées au Canada',
          desc:
            'Les données et documents de la plateforme sont hébergés sur une infrastructure située à Toronto, Ontario, afin de soutenir les exigences de souveraineté des données des organisations canadiennes.',
        },
        {
          icon: 'lock',
          title: 'Communications chiffrées',
          desc:
            'Les échanges entre les utilisateurs et la plateforme sont protégés par HTTPS/TLS. Les mots de passe sont stockés sous forme hachée et ne sont pas conservés en clair.',
        },
        {
          icon: 'access',
          title: 'Contrôle d’accès',
          desc:
            'Les droits sont attribués selon les rôles utilisateurs. Les environnements clients sont isolés afin de limiter l’accès aux données aux seules personnes autorisées.',
        },
        {
          icon: 'monitor',
          title: 'Surveillance et traçabilité',
          desc:
            'La plateforme intègre des mécanismes de surveillance de disponibilité et de journalisation des actions afin de faciliter le suivi, l’analyse et la détection d’événements inhabituels.',
        },
      ],
    },
    hosting: {
      tag: 'Hébergement & souveraineté',
      title: 'Une infrastructure canadienne pour vos données.',
      text:
        'CORO utilise une infrastructure d’hébergement située au Canada. Cette approche vise à réduire les enjeux de transfert transfrontalier et à répondre aux attentes des organisations canadiennes en matière de localisation et de contrôle des données.',
      cards: [
        {
          icon: 'server',
          title: 'Infrastructure',
          value: 'Toronto, Canada',
          desc: 'Hébergement principal des données et de la plateforme.',
        },
        {
          icon: 'provider',
          title: 'Fournisseur',
          value: 'DigitalOcean',
          desc: 'Infrastructure infonuagique utilisée pour l’exploitation de CORO.',
        },
        {
          icon: 'compliance',
          title: 'Cadre fournisseur',
          value: 'SOC 2 Type II',
          desc: 'Certification du fournisseur d’infrastructure, distincte de CORO elle-même.',
        },
      ],
      note:
        'Les caractéristiques de l’infrastructure peuvent évoluer avec la plateforme. Les détails techniques à jour peuvent être fournis aux équipes TI dans le cadre d’une évaluation de sécurité.',
    },
    access: {
      tag: 'Accès & authentification',
      title: 'Limiter l’accès au strict nécessaire.',
      text:
        'La protection des données commence par une gestion rigoureuse des identités et des permissions. CORO structure les accès selon les responsabilités de chaque utilisateur.',
      bullets: [
        'Rôles et permissions différenciés selon les responsabilités.',
        'Isolation des organisations clientes.',
        'Protection contre les tentatives d’authentification abusives.',
        'Journalisation des actions utilisateurs.',
        'MFA prévu pour les environnements et offres nécessitant un niveau de sécurité renforcé.',
      ],
    },
    continuity: {
      tag: 'Sauvegarde & continuité',
      title: 'Préserver l’intégrité et la disponibilité des données.',
      intro:
        'L’infrastructure de CORO intègre des mécanismes de sauvegarde et de récupération destinés à réduire l’impact d’une défaillance technique ou d’un incident.',
      items: [
        {
          icon: 'backup',
          title: 'Sauvegardes automatisées',
          value: 'Toutes les 6 heures',
          desc: 'Sauvegardes régulières de la base de données.',
        },
        {
          icon: 'retention',
          title: 'Rétention',
          value: '30 jours',
          desc: 'Conservation des sauvegardes selon la configuration actuelle.',
        },
        {
          icon: 'snapshot',
          title: 'Snapshots',
          value: 'Quotidiens',
          desc: 'Snapshots de l’infrastructure pour soutenir les scénarios de récupération.',
        },
        {
          icon: 'availability',
          title: 'Disponibilité infrastructure',
          value: '99,9 %',
          desc: 'SLA publié par le fournisseur d’infrastructure applicable à ses services concernés.',
        },
      ],
    },
    perimeter: {
      tag: 'Protection de l’environnement',
      title: 'Réduire la surface d’exposition.',
      bullets: [
        {
          title: 'Pare-feu réseau',
          desc:
            'Les accès réseau sont limités aux services nécessaires au fonctionnement de la plateforme.',
        },
        {
          title: 'Protection de l’authentification',
          desc:
            'Des mécanismes de protection contre les tentatives répétées et abusives sont appliqués.',
        },
        {
          title: 'En-têtes HTTP de sécurité',
          desc:
            'La configuration Web intègre des en-têtes de sécurité visant à réduire plusieurs classes de risques courants.',
        },
        {
          title: 'Surveillance de disponibilité',
          desc:
            'La disponibilité du service est surveillée afin de détecter rapidement les interruptions.',
        },
      ],
    },
    privacy: {
      tag: 'Vie privée & conformité',
      title: 'Une approche alignée sur les obligations canadiennes.',
      text:
        'CORO traite les renseignements personnels dans le cadre de la législation applicable et maintient des pratiques de protection, de conservation et de gestion des incidents adaptées à ses activités.',
      badges: [
        {
          title: 'Loi 25',
          desc: 'Protection des renseignements personnels au Québec',
        },
        {
          title: 'LPRPDE / PIPEDA',
          desc: 'Cadre fédéral canadien lorsqu’applicable',
        },
        {
          title: 'Hébergement Canada',
          desc: 'Localisation canadienne des données de la plateforme',
        },
      ],
      linkPrivacy: 'Consulter la politique de confidentialité',
      linkTerms: 'Consulter les conditions d’utilisation',
    },
    enterprise: {
      tag: 'Pour les équipes TI',
      title: 'Besoin d’aller plus loin dans l’évaluation?',
      text:
        'Les organisations qui évaluent CORO peuvent demander des renseignements techniques complémentaires concernant l’architecture, l’hébergement, les sauvegardes, les accès et les contrôles de sécurité disponibles.',
      points: [
        'Architecture et environnement d’hébergement',
        'Gestion des identités et des accès',
        'Sauvegardes et continuité',
        'Mesures de protection réseau',
        'Journalisation et suivi',
        'Questionnaire de sécurité fournisseur',
      ],
      cta: 'Demander la documentation technique',
    },
    cta: {
      title: 'La sécurité doit être vérifiable, pas seulement déclarée.',
      text:
        'Parlez-nous de vos exigences TI, de protection des données ou de conformité. Nous vous présenterons l’environnement CORO et les contrôles applicables à votre organisation.',
      primary: 'Demander une démo',
      secondary: 'Nous contacter',
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
      title: 'Security and data protection | CORO',
      description:
        'Learn about CORO’s approach to security, Canadian hosting, data protection, access control, backups and continuity.',
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
      tag: 'Security & data protection',
      title: 'Security is part of the architecture.',
      subtitle:
        'CORO is designed for organizations that need to protect sensitive documents, control access and keep their data in Canada. Our approach combines Canadian hosting, encrypted communications, access control, backups and monitoring.',
      primary: 'Talk to our team',
      secondary: 'View features',
    },
    trust: {
      title: 'An approach designed for professional environments',
      subtitle:
        'CORO security relies on complementary layers, from infrastructure to access management.',
      items: [
        {
          icon: 'canada',
          title: 'Data hosted in Canada',
          desc:
            'Platform data and documents are hosted on infrastructure located in Toronto, Ontario, supporting Canadian organizations’ data-sovereignty requirements.',
        },
        {
          icon: 'lock',
          title: 'Encrypted communications',
          desc:
            'Traffic between users and the platform is protected with HTTPS/TLS. Passwords are stored in hashed form and are not kept in plain text.',
        },
        {
          icon: 'access',
          title: 'Access control',
          desc:
            'Permissions are assigned according to user roles. Customer environments are isolated to restrict data access to authorized users.',
        },
        {
          icon: 'monitor',
          title: 'Monitoring and traceability',
          desc:
            'The platform includes availability monitoring and activity logging mechanisms to support tracking, analysis and detection of unusual events.',
        },
      ],
    },
    hosting: {
      tag: 'Hosting & sovereignty',
      title: 'Canadian infrastructure for your data.',
      text:
        'CORO uses hosting infrastructure located in Canada. This approach is intended to reduce cross-border transfer concerns and support Canadian organizations’ expectations regarding data location and control.',
      cards: [
        {
          icon: 'server',
          title: 'Infrastructure',
          value: 'Toronto, Canada',
          desc: 'Primary hosting location for platform data and services.',
        },
        {
          icon: 'provider',
          title: 'Provider',
          value: 'DigitalOcean',
          desc: 'Cloud infrastructure provider used to operate CORO.',
        },
        {
          icon: 'compliance',
          title: 'Provider framework',
          value: 'SOC 2 Type II',
          desc: 'Infrastructure provider certification; this is distinct from CORO itself.',
        },
      ],
      note:
        'Infrastructure characteristics may evolve with the platform. Current technical details can be provided to IT teams as part of a security assessment.',
    },
    access: {
      tag: 'Access & authentication',
      title: 'Restrict access to what is necessary.',
      text:
        'Data protection starts with disciplined identity and permission management. CORO structures access according to each user’s responsibilities.',
      bullets: [
        'Differentiated roles and permissions based on responsibilities.',
        'Isolation between customer organizations.',
        'Protection against abusive authentication attempts.',
        'Logging of user actions.',
        'MFA planned for environments and plans requiring enhanced security.',
      ],
    },
    continuity: {
      tag: 'Backup & continuity',
      title: 'Preserve data integrity and availability.',
      intro:
        'CORO infrastructure includes backup and recovery mechanisms designed to reduce the impact of a technical failure or incident.',
      items: [
        {
          icon: 'backup',
          title: 'Automated backups',
          value: 'Every 6 hours',
          desc: 'Regular database backups.',
        },
        {
          icon: 'retention',
          title: 'Retention',
          value: '30 days',
          desc: 'Backup retention under the current configuration.',
        },
        {
          icon: 'snapshot',
          title: 'Snapshots',
          value: 'Daily',
          desc: 'Infrastructure snapshots supporting recovery scenarios.',
        },
        {
          icon: 'availability',
          title: 'Infrastructure availability',
          value: '99.9%',
          desc: 'Published infrastructure-provider SLA for applicable services.',
        },
      ],
    },
    perimeter: {
      tag: 'Environment protection',
      title: 'Reduce the exposed surface.',
      bullets: [
        {
          title: 'Network firewall',
          desc:
            'Network access is limited to the services required to operate the platform.',
        },
        {
          title: 'Authentication protection',
          desc:
            'Mechanisms are applied to protect against repeated and abusive login attempts.',
        },
        {
          title: 'HTTP security headers',
          desc:
            'Web configuration includes security headers intended to reduce several common classes of risk.',
        },
        {
          title: 'Availability monitoring',
          desc:
            'Service availability is monitored to help detect interruptions quickly.',
        },
      ],
    },
    privacy: {
      tag: 'Privacy & compliance',
      title: 'An approach aligned with Canadian obligations.',
      text:
        'CORO processes personal information under applicable legislation and maintains protection, retention and incident-management practices appropriate to its activities.',
      badges: [
        {
          title: 'Law 25',
          desc: 'Quebec personal information protection',
        },
        {
          title: 'PIPEDA',
          desc: 'Canadian federal framework where applicable',
        },
        {
          title: 'Canada hosting',
          desc: 'Canadian location of platform data',
        },
      ],
      linkPrivacy: 'Read the Privacy Policy',
      linkTerms: 'Read the Terms of Use',
    },
    enterprise: {
      tag: 'For IT teams',
      title: 'Need to go deeper in your assessment?',
      text:
        'Organizations evaluating CORO can request additional technical information regarding architecture, hosting, backups, access and available security controls.',
      points: [
        'Architecture and hosting environment',
        'Identity and access management',
        'Backups and continuity',
        'Network protection measures',
        'Logging and monitoring',
        'Vendor security questionnaire',
      ],
      cta: 'Request technical documentation',
    },
    cta: {
      title: 'Security should be verifiable, not merely claimed.',
      text:
        'Tell us about your IT, data-protection or compliance requirements. We will walk you through the CORO environment and the controls relevant to your organization.',
      primary: 'Request a demo',
      secondary: 'Contact us',
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

function IconFor({ name, size = 26 }: { name: string; size?: number }) {
  const props = { size, strokeWidth: 1.8, color: '#C0392B' };

  switch (name) {
    case 'canada':
      return <Globe2 {...props} />;
    case 'lock':
      return <LockKeyhole {...props} />;
    case 'access':
      return <UserRoundCheck {...props} />;
    case 'monitor':
      return <Activity {...props} />;
    case 'server':
      return <Server {...props} />;
    case 'provider':
      return <Building2 {...props} />;
    case 'compliance':
      return <FileCheck2 {...props} />;
    case 'backup':
      return <Database {...props} />;
    case 'retention':
      return <HardDriveDownload {...props} />;
    case 'snapshot':
      return <Server {...props} />;
    case 'availability':
      return <Activity {...props} />;
    default:
      return <ShieldCheck {...props} />;
  }
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

function Logo() {
  return (
    <span
      style={{
        fontSize: 28,
        fontWeight: 900,
        color: '#FFFFFF',
        letterSpacing: '-1px',
      }}
    >
      CO<span style={{ color: '#C0392B' }}>RO</span>
    </span>
  );
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const t = CONTENT[lang];

  const canonical =
    lang === 'en' ? `${SITE_URL}/security?lang=en` : `${SITE_URL}/security`;

  return {
    metadataBase: new URL(SITE_URL),
    title: t.metadata.title,
    description: t.metadata.description,
    alternates: {
      canonical,
      languages: {
        'fr-CA': `${SITE_URL}/security`,
        'en-CA': `${SITE_URL}/security?lang=en`,
        'x-default': `${SITE_URL}/security`,
      },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'CORO',
      locale: lang === 'fr' ? 'fr_CA' : 'en_CA',
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

export default async function SecurityPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const t = CONTENT[lang];

  const langSuffix = lang === 'en' ? '?lang=en' : '';
  const otherLangHref = lang === 'fr' ? '/security?lang=en' : '/security';
  const homeLink = (anchor = '') => `/${langSuffix}${anchor}`;

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#2C3E50',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* NAV */}
      <header
        style={{
          backgroundColor: '#1A252F',
          padding: '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            minHeight: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <a
            href={homeLink()}
            aria-label={lang === 'fr' ? 'Accueil CORO' : 'CORO home'}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            <Logo />
          </a>

          <nav className="security-desktop-nav">
            <a href={homeLink('#features')} className="security-nav-link">
              {t.nav.features}
            </a>
            <a href={homeLink('#documents')} className="security-nav-link">
              {t.nav.documents}
            </a>
            <a href={homeLink('#how-it-works')} className="security-nav-link">
              {t.nav.howItWorks}
            </a>
            <a href={homeLink('#pricing')} className="security-nav-link">
              {t.nav.pricing}
            </a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href={otherLangHref} className="security-lang">
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>

            <a
              href="https://app.getcoro.io/login"
              className="security-login security-hide-small"
            >
              {t.nav.login}
            </a>

            <a
              href={homeLink('#demo')}
              className="security-demo security-hide-small"
            >
              {t.nav.demo}
            </a>

            <details className="security-mobile-menu">
              <summary aria-label={lang === 'fr' ? 'Ouvrir le menu' : 'Open menu'}>
                ☰
              </summary>
              <div className="security-mobile-panel">
                <a href={homeLink('#features')}>{t.nav.features}</a>
                <a href={homeLink('#documents')}>{t.nav.documents}</a>
                <a href={homeLink('#how-it-works')}>{t.nav.howItWorks}</a>
                <a href={homeLink('#pricing')}>{t.nav.pricing}</a>
                <a href={lang === 'fr' ? '/about' : '/about?lang=en'}>
                  {lang === 'fr' ? 'À propos' : 'About'}
                </a>
                <a href="https://app.getcoro.io/login">{t.nav.login}</a>
                <a href={homeLink('#demo')}>{t.nav.demo}</a>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section
          style={{
            background:
              'radial-gradient(circle at 80% 20%, rgba(192,57,43,0.18), transparent 32%), linear-gradient(135deg, #1A252F 0%, #2C3E50 100%)',
            padding: '112px 24px 104px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.05fr) minmax(320px, 0.75fr)',
              gap: 70,
              alignItems: 'center',
            }}
            className="security-hero-grid"
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  color: '#F1948A',
                  border: '1px solid rgba(231,76,60,0.32)',
                  backgroundColor: 'rgba(192,57,43,0.14)',
                  borderRadius: 999,
                  padding: '7px 15px',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 24,
                }}
              >
                {t.hero.tag}
              </span>

              <h1
                style={{
                  color: '#FFFFFF',
                  fontSize: 'clamp(42px, 6vw, 68px)',
                  lineHeight: 1.05,
                  letterSpacing: '-2px',
                  fontWeight: 900,
                  margin: '0 0 26px',
                  maxWidth: 800,
                }}
              >
                {t.hero.title}
              </h1>

              <p
                style={{
                  color: 'rgba(255,255,255,0.70)',
                  fontSize: 18,
                  lineHeight: 1.8,
                  maxWidth: 760,
                  margin: 0,
                }}
              >
                {t.hero.subtitle}
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  flexWrap: 'wrap',
                  marginTop: 36,
                }}
              >
                <a href={homeLink('#demo')} className="security-primary-btn">
                  {t.hero.primary} <ArrowRight size={17} />
                </a>
                <a href={homeLink('#features')} className="security-secondary-btn">
                  {t.hero.secondary}
                </a>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 22,
                padding: 'clamp(28px, 5vw, 46px)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <ShieldCheck
                size={62}
                color="#F1948A"
                strokeWidth={1.5}
                style={{ marginBottom: 24 }}
              />
              <p
                style={{
                  color: '#FFFFFF',
                  fontSize: 22,
                  lineHeight: 1.45,
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                {lang === 'fr'
                  ? 'Hébergement canadien. Accès contrôlés. Communications chiffrées. Sauvegardes automatisées.'
                  : 'Canadian hosting. Controlled access. Encrypted communications. Automated backups.'}
              </p>
            </div>
          </div>
        </section>

        {/* TRUST CARDS */}
        <section style={{ padding: '104px 24px', backgroundColor: '#F8F9FA' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ maxWidth: 780, margin: '0 auto 58px', textAlign: 'center' }}>
              <h2 className="security-h2">{t.trust.title}</h2>
              <p className="security-body" style={{ margin: '0 auto' }}>
                {t.trust.subtitle}
              </p>
            </div>

            <div className="security-card-grid">
              {t.trust.items.map((item) => (
                <article className="security-card" key={item.title}>
                  <div className="security-icon-box">
                    <IconFor name={item.icon} />
                  </div>
                  <h3 className="security-h3">{item.title}</h3>
                  <p className="security-card-text">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* HOSTING */}
        <section style={{ padding: '108px 24px', backgroundColor: '#FFFFFF' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="security-two-col">
              <div>
                <SectionTag>{t.hosting.tag}</SectionTag>
                <h2 className="security-h2">{t.hosting.title}</h2>
                <p className="security-body">{t.hosting.text}</p>

                <p
                  style={{
                    marginTop: 28,
                    padding: '18px 20px',
                    backgroundColor: '#F8F9FA',
                    borderLeft: '4px solid #C0392B',
                    borderRadius: 8,
                    color: '#6C757D',
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  {t.hosting.note}
                </p>
              </div>

              <div className="security-host-grid">
                {t.hosting.cards.map((card) => (
                  <div className="security-host-card" key={card.title}>
                    <IconFor name={card.icon} size={28} />
                    <p className="security-small-label">{card.title}</p>
                    <p className="security-value">{card.value}</p>
                    <p className="security-card-text">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ACCESS */}
        <section style={{ padding: '108px 24px', backgroundColor: '#2C3E50' }}>
          <div className="security-two-col" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div>
              <span className="security-dark-tag">{t.access.tag}</span>
              <h2 className="security-h2 security-h2-dark">{t.access.title}</h2>
              <p className="security-body security-body-dark">{t.access.text}</p>
            </div>

            <div>
              <ul className="security-dark-list">
                {t.access.bullets.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={19} color="#F1948A" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CONTINUITY */}
        <section style={{ padding: '108px 24px', backgroundColor: '#F8F9FA' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ maxWidth: 780, marginBottom: 54 }}>
              <SectionTag>{t.continuity.tag}</SectionTag>
              <h2 className="security-h2">{t.continuity.title}</h2>
              <p className="security-body">{t.continuity.intro}</p>
            </div>

            <div className="security-card-grid">
              {t.continuity.items.map((item) => (
                <article className="security-card security-card-flat" key={item.title}>
                  <div className="security-icon-box">
                    <IconFor name={item.icon} />
                  </div>
                  <p className="security-small-label">{item.title}</p>
                  <p
                    style={{
                      color: '#2C3E50',
                      fontSize: 28,
                      fontWeight: 900,
                      margin: '0 0 10px',
                    }}
                  >
                    {item.value}
                  </p>
                  <p className="security-card-text">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* PERIMETER */}
        <section style={{ padding: '108px 24px', backgroundColor: '#FFFFFF' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ maxWidth: 780, marginBottom: 52 }}>
              <SectionTag>{t.perimeter.tag}</SectionTag>
              <h2 className="security-h2">{t.perimeter.title}</h2>
            </div>

            <div className="security-perimeter-grid">
              {t.perimeter.bullets.map((item, index) => {
                const icons = [
                  <Network key="network" size={26} color="#C0392B" />,
                  <KeyRound key="key" size={26} color="#C0392B" />,
                  <ShieldCheck key="shield" size={26} color="#C0392B" />,
                  <Activity key="activity" size={26} color="#C0392B" />,
                ];

                return (
                  <div className="security-perimeter-item" key={item.title}>
                    <div className="security-icon-box" style={{ marginBottom: 0 }}>
                      {icons[index]}
                    </div>
                    <div>
                      <h3 className="security-h3">{item.title}</h3>
                      <p className="security-card-text">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PRIVACY */}
        <section style={{ padding: '108px 24px', backgroundColor: '#F8F9FA' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="security-two-col">
              <div>
                <SectionTag>{t.privacy.tag}</SectionTag>
                <h2 className="security-h2">{t.privacy.title}</h2>
                <p className="security-body">{t.privacy.text}</p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 14,
                    marginTop: 30,
                  }}
                >
                  <a
                    href={lang === 'fr' ? '/privacy' : '/privacy?lang=en'}
                    className="security-inline-link"
                  >
                    {t.privacy.linkPrivacy} <ArrowRight size={16} />
                  </a>
                  <a
                    href={lang === 'fr' ? '/terms' : '/terms?lang=en'}
                    className="security-inline-link"
                  >
                    {t.privacy.linkTerms} <ArrowRight size={16} />
                  </a>
                </div>
              </div>

              <div className="security-badge-grid">
                {t.privacy.badges.map((badge) => (
                  <div className="security-badge-card" key={badge.title}>
                    <ShieldCheck size={27} color="#C0392B" />
                    <p className="security-value" style={{ fontSize: 22 }}>
                      {badge.title}
                    </p>
                    <p className="security-card-text">{badge.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ENTERPRISE / IT */}
        <section style={{ padding: '108px 24px', backgroundColor: '#FFFFFF' }}>
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              border: '1px solid #E9ECEF',
              borderRadius: 20,
              padding: 'clamp(30px, 6vw, 58px)',
              boxShadow: '0 18px 50px rgba(44,62,80,0.06)',
            }}
          >
            <div className="security-two-col">
              <div>
                <SectionTag>{t.enterprise.tag}</SectionTag>
                <h2 className="security-h2">{t.enterprise.title}</h2>
                <p className="security-body">{t.enterprise.text}</p>

                <a
                  href="mailto:info@getcoro.io?subject=Documentation%20technique%20CORO"
                  className="security-primary-btn"
                  style={{ marginTop: 30 }}
                >
                  {t.enterprise.cta} <ArrowRight size={17} />
                </a>
              </div>

              <ul className="security-light-list">
                {t.enterprise.points.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={18} color="#C0392B" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            background: 'linear-gradient(135deg, #C0392B 0%, #922B21 100%)',
            padding: '96px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2
              style={{
                color: '#FFFFFF',
                fontSize: 'clamp(30px, 5vw, 46px)',
                lineHeight: 1.18,
                fontWeight: 900,
                margin: '0 0 20px',
              }}
            >
              {t.cta.title}
            </h2>

            <p
              style={{
                color: 'rgba(255,255,255,0.82)',
                fontSize: 18,
                lineHeight: 1.75,
                margin: '0 auto 36px',
                maxWidth: 720,
              }}
            >
              {t.cta.text}
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <a href={homeLink('#demo')} className="security-cta-white">
                {t.cta.primary} <ArrowRight size={17} />
              </a>
              <a
                href="mailto:info@getcoro.io"
                className="security-cta-outline"
              >
                {t.cta.secondary}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
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

          <div className="security-footer-grid">
            <div>
              <h3 className="security-footer-heading">🇨🇦 Canada</h3>
              <p className="security-footer-text">
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
                  gap: 7,
                  marginTop: 12,
                }}
              >
                <a href="mailto:info@getcoro.io" className="security-footer-link">
                  info@getcoro.io
                </a>
                <a href="tel:+15147917871" className="security-footer-link">
                  +1 (514) 791-7871
                </a>
              </div>
            </div>

            <div>
              <h3 className="security-footer-heading">{t.footer.product}</h3>
              <div className="security-footer-links">
                <a href={homeLink('#features')} className="security-footer-link">
                  {t.footer.features}
                </a>
                <a href={homeLink('#pricing')} className="security-footer-link">
                  {t.footer.pricing}
                </a>
                <a
                  href="https://app.getcoro.io/login"
                  className="security-footer-link"
                >
                  {t.footer.login}
                </a>
              </div>
            </div>

            <div>
              <h3 className="security-footer-heading">{t.footer.company}</h3>
              <div className="security-footer-links">
                <a
                  href={lang === 'fr' ? '/about' : '/about?lang=en'}
                  className="security-footer-link"
                >
                  {t.footer.about}
                </a>
                <a
                  href={lang === 'fr' ? '/security' : '/security?lang=en'}
                  className="security-footer-link"
                >
                  {t.footer.security}
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="security-footer-link">{t.footer.blog}</span>
                  <span className="security-soon">{t.footer.soon}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="security-footer-link">{t.footer.partners}</span>
                  <span className="security-soon">{t.footer.soon}</span>
                </div>
                <a href={homeLink('#demo')} className="security-footer-link">
                  {t.footer.contact}
                </a>
              </div>
            </div>

            <div>
              <h3 className="security-footer-heading">{t.footer.legal}</h3>
              <div className="security-footer-links">
                <a
                  href={lang === 'fr' ? '/privacy' : '/privacy?lang=en'}
                  className="security-footer-link"
                >
                  {t.footer.privacy}
                </a>
                <a
                  href={lang === 'fr' ? '/terms' : '/terms?lang=en'}
                  className="security-footer-link"
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
            <div className="security-footer-bottom">
              <p className="security-footer-muted">{t.footer.rights}</p>

              <div className="security-footer-bottom-right">
                <p className="security-footer-muted">{t.footer.hosting}</p>
                <a href={otherLangHref} className="security-footer-language">
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

        .security-desktop-nav {
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .security-nav-link {
          color: rgba(255,255,255,0.86);
          font-size: 15px;
          font-weight: 500;
          text-decoration: none;
        }

        .security-nav-link:hover {
          color: #FFFFFF;
        }

        .security-lang,
        .security-login {
          padding: 7px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.28);
          color: #FFFFFF;
          text-decoration: none;
        }

        .security-login {
          padding: 8px 17px;
          font-size: 14px;
          font-weight: 500;
        }

        .security-lang:hover,
        .security-login:hover {
          background-color: rgba(255,255,255,0.08);
        }

        .security-demo {
          padding: 9px 18px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 700;
          color: #FFFFFF;
          background-color: #C0392B;
          text-decoration: none;
        }

        .security-demo:hover {
          background-color: #A93226;
        }

        .security-mobile-menu {
          display: none;
          position: relative;
        }

        .security-mobile-menu summary {
          list-style: none;
          cursor: pointer;
          color: #FFFFFF;
          font-size: 24px;
          padding: 5px;
        }

        .security-mobile-menu summary::-webkit-details-marker {
          display: none;
        }

        .security-mobile-panel {
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
          z-index: 1000;
        }

        .security-mobile-panel a {
          color: #2C3E50;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          padding: 10px 12px;
          border-radius: 7px;
        }

        .security-mobile-panel a:hover {
          background: #F8F9FA;
          color: #C0392B;
        }

        .security-primary-btn,
        .security-secondary-btn,
        .security-cta-white,
        .security-cta-outline {
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
        }

        .security-primary-btn {
          color: #FFFFFF;
          background-color: #C0392B;
          border: 2px solid #C0392B;
        }

        .security-primary-btn:hover {
          background-color: #A93226;
          border-color: #A93226;
        }

        .security-secondary-btn {
          color: #FFFFFF;
          background: rgba(255,255,255,0.06);
          border: 2px solid rgba(255,255,255,0.28);
        }

        .security-secondary-btn:hover {
          background: rgba(255,255,255,0.10);
        }

        .security-h2 {
          color: #2C3E50;
          font-size: clamp(30px, 4vw, 44px);
          font-weight: 900;
          line-height: 1.18;
          letter-spacing: -1px;
          margin: 0 0 20px;
        }

        .security-h2-dark {
          color: #FFFFFF;
        }

        .security-h3 {
          color: #2C3E50;
          font-size: 19px;
          font-weight: 800;
          line-height: 1.3;
          margin: 0 0 10px;
        }

        .security-body {
          color: #6C757D;
          font-size: 17px;
          line-height: 1.8;
          margin: 0;
          max-width: 740px;
        }

        .security-body-dark {
          color: rgba(255,255,255,0.68);
        }

        .security-card-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
        }

        .security-card {
          background: #FFFFFF;
          border: 1px solid #E9ECEF;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 8px 28px rgba(44,62,80,0.04);
        }

        .security-card-flat {
          box-shadow: none;
        }

        .security-icon-box {
          width: 54px;
          height: 54px;
          border-radius: 13px;
          background: #FDEDEC;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
          flex-shrink: 0;
        }

        .security-card-text {
          color: #6C757D;
          font-size: 15px;
          line-height: 1.7;
          margin: 0;
        }

        .security-two-col {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 70px;
          align-items: center;
        }

        .security-host-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .security-host-card,
        .security-badge-card {
          background: #F8F9FA;
          border: 1px solid #E9ECEF;
          border-radius: 14px;
          padding: 24px;
        }

        .security-host-card svg,
        .security-badge-card svg {
          margin-bottom: 18px;
        }

        .security-small-label {
          margin: 0 0 6px;
          color: #ADB5BD;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .security-value {
          color: #2C3E50;
          font-size: 20px;
          font-weight: 900;
          margin: 0 0 8px;
        }

        .security-dark-tag {
          display: inline-block;
          color: #F1948A;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .security-dark-list,
        .security-light-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .security-dark-list li,
        .security-light-list li {
          display: flex;
          gap: 11px;
          align-items: flex-start;
          font-size: 16px;
          line-height: 1.6;
        }

        .security-dark-list li {
          color: rgba(255,255,255,0.74);
        }

        .security-light-list li {
          color: #495057;
        }

        .security-dark-list svg,
        .security-light-list svg {
          flex-shrink: 0;
          margin-top: 3px;
        }

        .security-perimeter-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
        }

        .security-perimeter-item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          padding: 28px;
          border: 1px solid #E9ECEF;
          border-radius: 14px;
        }

        .security-badge-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .security-inline-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #C0392B;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
        }

        .security-inline-link:hover {
          text-decoration: underline;
        }

        .security-cta-white {
          background: #FFFFFF;
          color: #C0392B;
          border: 2px solid #FFFFFF;
        }

        .security-cta-outline {
          color: #FFFFFF;
          border: 2px solid rgba(255,255,255,0.45);
          background: transparent;
        }

        .security-footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 48px;
          margin-bottom: 72px;
          align-items: start;
        }

        .security-footer-heading {
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 700;
          margin: 0 0 20px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .security-footer-text {
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          line-height: 1.75;
          margin: 0;
        }

        .security-footer-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .security-footer-link {
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          text-decoration: none;
        }

        .security-footer-link:hover {
          color: #FFFFFF;
        }

        .security-soon {
          font-size: 10px;
          font-weight: 700;
          color: #F39C12;
          background-color: rgba(243,156,18,0.15);
          border: 1px solid rgba(243,156,18,0.3);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .security-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .security-footer-bottom-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .security-footer-muted {
          color: rgba(255,255,255,0.3);
          font-size: 13px;
          margin: 0;
        }

        .security-footer-language {
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.5);
          text-decoration: none;
        }

        @media (max-width: 1000px) {
          .security-desktop-nav {
            display: none;
          }

          .security-mobile-menu {
            display: block;
          }

          .security-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .security-two-col,
          .security-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 44px !important;
          }

          .security-host-grid,
          .security-badge-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .security-hide-small {
            display: none;
          }

          .security-card-grid,
          .security-perimeter-grid,
          .security-host-grid,
          .security-badge-grid {
            grid-template-columns: 1fr;
          }

          .security-footer-bottom,
          .security-footer-bottom-right {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}