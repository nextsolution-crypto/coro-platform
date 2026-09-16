import type { Metadata } from 'next';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  Building2,
  ShieldCheck,
  Radio,
  Handshake,
  MessageSquare,
  Rocket,
} from 'lucide-react';

const SITE_URL = 'https://getcoro.io';

type Lang = 'fr' | 'en';

type PageProps = {
  searchParams: Promise<{
    lang?: string | string[];
  }>;
};

const CONTENT = {
  fr: {
    metadata: {
      title: 'Programme Partenaires CORO — Devenez partenaire fondateur',
      description:
        'Vous accompagnez des organisations en sécurité incendie, gestion immobilière ou gestion de risques ? Faites de CORO une extension naturelle de votre offre et devenez partenaire fondateur.',
    },

    badge: 'Programme Partenaires CORO',

    hero: {
      title: 'Vos clients ont besoin de conformité.',
      highlight: 'Devenez leur partenaire technologique.',
      text:
        'Vous accompagnez déjà des organisations en sécurité incendie, en gestion immobilière ou en gestion de risques. Faites de CORO une extension naturelle de votre offre — sans concevoir, héberger ni maintenir le moindre outil.',
      primary: 'Devenir partenaire',
      secondary: 'Découvrir CORO',
    },

    personas: {
      tag: 'Pour qui',
      title: 'Le programme s’adresse aux organisations qui accompagnent déjà des bâtiments et des équipes.',
      intro: 'Si vos clients doivent se conformer, se préparer ou gérer un risque opérationnel, CORO a probablement sa place dans votre offre.',
      items: [
        {
          icon: 'flame',
          title: 'Cabinets conseils en sécurité incendie et mesures d’urgence',
          text: 'Vous rédigez déjà des PMU, PSI ou plans de continuité pour vos clients. Offrez-leur une plateforme pour les gérer, les maintenir à jour et les faire approuver — sans devenir vous-même un fournisseur logiciel.',
        },
        {
          icon: 'building',
          title: 'Gestionnaires et propriétaires immobiliers',
          text: 'Vous administrez plusieurs bâtiments pour le compte de propriétaires ou de locataires. Donnez à votre portefeuille une longueur d’avance en matière de conformité et de résilience opérationnelle.',
        },
        {
          icon: 'shield',
          title: 'Courtiers et assureurs commerciaux',
          text: 'La conformité documentaire et la préparation aux mesures d’urgence réduisent le risque de vos assurés. Faites de CORO un argument concret dans vos discussions de renouvellement.',
        },
        {
          icon: 'radio',
          title: 'Fournisseurs de technologies de sécurité',
          text: 'Systèmes d’alarme, contrôle d’accès, vidéosurveillance : vos clients cherchent aussi à structurer leurs plans et leurs registres. CORO complète votre offre technologique sans s’y substituer.',
        },
      ],
    },

    benefits: {
      tag: 'Pourquoi devenir partenaire',
      title: 'Un partenariat pensé pour renforcer votre pratique, pas la remplacer.',
      items: [
        {
          title: 'Une offre différenciante, sans développement',
          text: 'Proposez un outil de conformité moderne à vos clients sans avoir à le concevoir, l’héberger ou le maintenir.',
        },
        {
          title: 'Vous restez le conseiller de confiance',
          text: 'CORO reste l’outil ; vous demeurez l’expert que vos clients consultent. Aucune compétition avec votre pratique.',
        },
        {
          title: 'Un revenu additionnel structuré avec vous',
          text: 'Chaque entente de partenariat est bâtie selon votre réalité et vos clients — pas de modèle unique imposé.',
        },
        {
          title: 'Une voix dans l’évolution du produit',
          text: 'Les partenaires fondateurs influencent directement les priorités de développement de CORO.',
        },
      ],
    },

    steps: {
      tag: 'Comment ça fonctionne',
      title: 'Trois étapes, aucun engagement imposé.',
      items: [
        {
          title: 'On discute de votre pratique',
          text: 'Un premier échange pour comprendre votre clientèle, vos services actuels et où CORO pourrait s’intégrer naturellement.',
        },
        {
          title: 'On structure l’entente ensemble',
          text: 'Modalités de référencement ou de revente, conditions et rôles sont définis clairement avant tout engagement.',
        },
        {
          title: 'Vous introduisez CORO, on prend le relais',
          text: 'Vous présentez CORO à vos clients ; notre équipe s’occupe de l’implémentation et du support technique.',
        },
      ],
    },

    founder: {
      ribbon: 'PARTENAIRES FONDATEURS',
      title: 'Devenez l’un des premiers partenaires CORO.',
      subtitle: 'CORO est une plateforme jeune, construite avec des praticiens du terrain. Les premiers partenaires qui nous rejoignent façonnent la suite — et conservent des conditions qui ne seront pas reconduites indéfiniment.',
      benefits: [
        'Reconnaissance officielle comme partenaire fondateur de CORO',
        'Conditions de partenariat préservées à long terme',
        'Accès direct à l’équipe produit pour orienter les priorités',
        'Visibilité auprès des clients CORO dans votre secteur',
      ],
      cta: 'Devenir partenaire fondateur',
      footnote: 'Le nombre de partenaires fondateurs restera restreint — ces conditions ne seront pas offertes indéfiniment.',
      sealLabel: 'FONDATEUR',
    },

    faq: {
      tag: 'Questions fréquentes',
      title: 'Ce qu’il faut savoir avant d’en discuter.',
      items: [
        {
          q: 'Dois-je être client CORO pour devenir partenaire ?',
          a: 'Non. Le programme partenaires s’adresse aux organisations qui accompagnent d’autres organisations — vous n’avez pas besoin d’utiliser CORO vous-même pour votre propre conformité.',
        },
        {
          q: 'Comment est structurée la rémunération ?',
          a: 'Chaque entente est définie individuellement selon votre pratique et le volume de clients référés. Nous en discutons directement avec vous, sans modèle imposé d’avance.',
        },
        {
          q: 'Est-ce que je perds le contrôle de ma relation client ?',
          a: 'Non. Vous demeurez le point de contact principal de vos clients ; CORO agit comme l’outil derrière votre accompagnement.',
        },
        {
          q: 'Je suis déjà client CORO et je veux référer une autre organisation — est-ce la même chose ?',
          a: 'Non. Ce programme s’adresse aux firmes qui accompagnent d’autres organisations. Si votre organisation utilise déjà CORO et souhaite en recommander une autre, consultez plutôt notre Programme de recommandation.',
          linkHref: '/programme-recommandation',
          linkLabel: 'Voir le programme de recommandation →',
        },
        {
          q: 'Mon organisation prévoit aussi utiliser CORO pour sa propre conformité — est-ce compatible ?',
          a: 'Oui, tout à fait. Un partenariat et un abonnement client sont indépendants. Découvrez aussi notre Programme Fondateur pour les organisations clientes.',
          linkHref: '/pricing#fondateur',
          linkLabel: 'Voir le programme fondateur clients →',
        },
      ],
    },

    cta: {
      title: 'Prêt à explorer un partenariat ?',
      text: 'Parlons de votre pratique, de vos clients et de la façon dont CORO pourrait s’y intégrer.',
      primary: 'Nous contacter',
      secondary: 'Découvrir CORO',
    },
  },

  en: {
    metadata: {
      title: 'CORO Partner Program — Become a founding partner',
      description:
        'Do you support organizations in fire safety, property management or risk management? Make CORO a natural extension of your offering and become a founding partner.',
    },

    badge: 'CORO Partner Program',

    hero: {
      title: 'Your clients need compliance.',
      highlight: 'Become their technology partner.',
      text:
        'You already support organizations in fire safety, property management or risk management. Make CORO a natural extension of your offering — without designing, hosting or maintaining any tool yourself.',
      primary: 'Become a partner',
      secondary: 'Discover CORO',
    },

    personas: {
      tag: 'Who it’s for',
      title: 'The program is built for organizations that already support buildings and teams.',
      intro: 'If your clients need to comply, prepare, or manage operational risk, CORO likely belongs in your offering.',
      items: [
        {
          icon: 'flame',
          title: 'Fire safety and emergency measures consulting firms',
          text: 'You already draft emergency plans and fire safety plans for your clients. Give them a platform to manage, keep current, and get them approved — without becoming a software vendor yourself.',
        },
        {
          icon: 'building',
          title: 'Property managers and building owners',
          text: 'You manage multiple buildings on behalf of owners or tenants. Give your portfolio a head start on compliance and operational resilience.',
        },
        {
          icon: 'shield',
          title: 'Commercial brokers and insurers',
          text: 'Documentary compliance and emergency preparedness reduce your insureds’ risk. Make CORO a concrete talking point in your renewal discussions.',
        },
        {
          icon: 'radio',
          title: 'Security technology providers',
          text: 'Alarm systems, access control, video surveillance: your clients are also looking to structure their plans and registers. CORO complements your technology offering without replacing it.',
        },
      ],
    },

    benefits: {
      tag: 'Why partner with CORO',
      title: 'A partnership designed to strengthen your practice, not replace it.',
      items: [
        {
          title: 'A differentiated offering, no development required',
          text: 'Offer your clients a modern compliance tool without having to design, host or maintain it.',
        },
        {
          title: 'You remain the trusted advisor',
          text: 'CORO stays the tool; you remain the expert your clients consult. No competition with your practice.',
        },
        {
          title: 'Additional revenue structured with you',
          text: 'Every partnership agreement is built around your reality and your clients — no one-size-fits-all model imposed.',
        },
        {
          title: 'A voice in product direction',
          text: 'Founding partners directly influence CORO’s development priorities.',
        },
      ],
    },

    steps: {
      tag: 'How it works',
      title: 'Three steps, no imposed commitment.',
      items: [
        {
          title: 'We talk about your practice',
          text: 'A first conversation to understand your client base, your current services, and where CORO could naturally fit in.',
        },
        {
          title: 'We structure the agreement together',
          text: 'Referral or resale terms, conditions and roles are clearly defined before any commitment.',
        },
        {
          title: 'You introduce CORO, we take it from there',
          text: 'You present CORO to your clients; our team handles implementation and technical support.',
        },
      ],
    },

    founder: {
      ribbon: 'FOUNDING PARTNERS',
      title: 'Become one of the first CORO partners.',
      subtitle: 'CORO is a young platform, built with practitioners from the field. The first partners who join us shape what comes next — and keep terms that won’t be offered indefinitely.',
      benefits: [
        'Official recognition as a CORO founding partner',
        'Partnership terms preserved long-term',
        'Direct access to the product team to shape priorities',
        'Visibility with CORO clients in your sector',
      ],
      cta: 'Become a founding partner',
      footnote: 'The number of founding partners will stay limited — these terms won’t be offered indefinitely.',
      sealLabel: 'FOUNDER',
    },

    faq: {
      tag: 'Frequently asked questions',
      title: 'What to know before we talk.',
      items: [
        {
          q: 'Do I need to be a CORO customer to become a partner?',
          a: 'No. The partner program is for organizations that support other organizations — you don’t need to use CORO yourself for your own compliance.',
        },
        {
          q: 'How is compensation structured?',
          a: 'Each agreement is defined individually based on your practice and the volume of referred clients. We discuss it directly with you, with no model imposed in advance.',
        },
        {
          q: 'Do I lose control of my client relationship?',
          a: 'No. You remain your clients’ main point of contact; CORO acts as the tool behind your guidance.',
        },
        {
          q: 'I’m already a CORO customer and want to refer another organization — is this the same thing?',
          a: 'No. This program is for firms that support other organizations. If your organization already uses CORO and wants to refer another one, check out our Referral Program instead.',
          linkHref: '/programme-recommandation?lang=en',
          linkLabel: 'See the referral program →',
        },
        {
          q: 'My organization also plans to use CORO for its own compliance — is that compatible?',
          a: 'Yes, absolutely. A partnership and a customer subscription are independent. Also check out our Founder Program for customer organizations.',
          linkHref: '/pricing?lang=en#fondateur',
          linkLabel: 'See the customer founder program →',
        },
      ],
    },

    cta: {
      title: 'Ready to explore a partnership?',
      text: 'Let’s talk about your practice, your clients, and how CORO could fit in.',
      primary: 'Contact us',
      secondary: 'Discover CORO',
    },
  },
};

function getLang(raw: string | string[] | undefined): Lang {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'en' ? 'en' : 'fr';
}

const PERSONA_ICONS: Record<string, React.ReactNode> = {
  flame: <Flame size={26} />,
  building: <Building2 size={26} />,
  shield: <ShieldCheck size={26} />,
  radio: <Radio size={26} />,
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const t = CONTENT[lang];

  const frUrl = `${SITE_URL}/partners`;
  const enUrl = `${SITE_URL}/partners?lang=en`;
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
          alt: lang === 'fr' ? 'Programme Partenaires CORO' : 'CORO Partner Program',
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

export default async function PartnersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const t = CONTENT[lang];

  const otherLangHref = lang === 'fr' ? '/partners?lang=en' : '/partners';
  const homeHref = lang === 'fr' ? '/' : '/?lang=en';
  const contactHref = lang === 'fr' ? '/contact' : '/contact?lang=en';

  const currentUrl = lang === 'en' ? `${SITE_URL}/partners?lang=en` : `${SITE_URL}/partners`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: t.metadata.title,
    description: t.metadata.description,
    url: currentUrl,
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
    publisher: {
      '@type': 'Organization',
      name: 'CORO',
      url: SITE_URL,
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <main
      style={{
        fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#FFFFFF',
        color: '#2C3E50',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* HEADER */}
      <header style={{ backgroundColor: '#1A252F', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <a href={homeHref} style={{ textDecoration: 'none', color: '#FFFFFF', fontSize: 28, fontWeight: 900, letterSpacing: '-1px' }}>
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href={otherLangHref} className="partner-header-link">
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>
            <a href="https://app.getcoro.io/login" className="partner-header-link">
              {lang === 'fr' ? 'Connexion' : 'Login'}
            </a>
            <a href={contactHref} className="partner-header-cta">
              {lang === 'fr' ? 'Devenir partenaire' : 'Become a partner'}
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #1A252F 0%, #243746 60%, #2C3E50 100%)', padding: '110px 24px 118px', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div className="partner-badge">
            <Handshake size={16} />
            {t.badge}
          </div>

          <h1 style={{ color: '#FFFFFF', fontSize: 'clamp(38px, 6.4vw, 66px)', lineHeight: 1.08, fontWeight: 900, letterSpacing: '-0.04em', margin: '26px auto 26px', maxWidth: 950 }}>
            {t.hero.title}
            <br />
            <span style={{ color: '#E74C3C' }}>{t.hero.highlight}</span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'clamp(18px, 2.4vw, 21px)', lineHeight: 1.7, maxWidth: 780, margin: '0 auto 38px' }}>
            {t.hero.text}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a href={contactHref} className="partner-primary-btn">
              {t.hero.primary}
              <ArrowRight size={17} />
            </a>
            <a href={homeHref} className="partner-secondary-btn">
              {t.hero.secondary}
            </a>
          </div>
        </div>
      </section>

      {/* PERSONAS */}
      <section style={{ padding: '110px 24px', backgroundColor: '#F8F9FA' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ maxWidth: 760, marginBottom: 52 }}>
            <span className="partner-tag">{t.personas.tag}</span>
            <h2 className="partner-h2">{t.personas.title}</h2>
            <p className="partner-body">{t.personas.intro}</p>
          </div>

          <div className="partner-persona-grid">
            {t.personas.items.map((item) => (
              <div key={item.title} className="partner-persona-card">
                <div className="partner-persona-icon">{PERSONA_ICONS[item.icon]}</div>
                <h3 className="partner-h3">{item.title}</h3>
                <p className="partner-card-text">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section style={{ padding: '110px 24px', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ maxWidth: 760, marginBottom: 52 }}>
            <span className="partner-tag">{t.benefits.tag}</span>
            <h2 className="partner-h2">{t.benefits.title}</h2>
          </div>

          <div className="partner-benefits-grid">
            {t.benefits.items.map((item) => (
              <div key={item.title} className="partner-benefit-card">
                <CheckCircle2 size={22} color="#C0392B" strokeWidth={2} />
                <h3 className="partner-h3" style={{ margin: '16px 0 9px' }}>{item.title}</h3>
                <p className="partner-card-text">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section style={{ padding: '110px 24px', backgroundColor: '#F8F9FA' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ maxWidth: 720, marginBottom: 52 }}>
            <span className="partner-tag">{t.steps.tag}</span>
            <h2 className="partner-h2">{t.steps.title}</h2>
          </div>

          <div className="partner-steps-grid">
            {t.steps.items.map((item, index) => {
              const icons = [<MessageSquare key="msg" size={28} />, <Handshake key="hs" size={28} />, <Rocket key="rk" size={28} />];
              return (
                <div key={item.title} className="partner-step-card">
                  <div className="partner-step-top">
                    <div className="partner-step-icon">{icons[index]}</div>
                    <span className="partner-step-number">0{index + 1}</span>
                  </div>
                  <h3 className="partner-h3">{item.title}</h3>
                  <p className="partner-card-text">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOUNDING PARTNERS */}
      <section className="partner-founder-banner">
        <div className="partner-founder-glow" />
        <div className="partner-founder-inner">
          <div className="partner-founder-copy">
            <span className="partner-founder-ribbon">{t.founder.ribbon}</span>
            <h2>{t.founder.title}</h2>
            <p className="partner-founder-subtitle">{t.founder.subtitle}</p>

            <div className="partner-founder-benefits">
              {t.founder.benefits.map((item) => (
                <div className="partner-founder-benefit" key={item}>
                  <CheckCircle2 size={17} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="partner-founder-actions">
              <a href={contactHref} className="partner-white-btn">
                {t.founder.cta}
                <ArrowRight size={16} />
              </a>
              <span className="partner-founder-footnote">{t.founder.footnote}</span>
            </div>
          </div>

          <div className="partner-founder-seal-wrap">
            <div className="partner-founder-seal">
              <div className="partner-founder-seal-ring">
                <Award size={34} />
                <strong>{t.founder.sealLabel}</strong>
                <span>CORO</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '110px 24px', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ maxWidth: 760, marginBottom: 52 }}>
            <span className="partner-tag">{t.faq.tag}</span>
            <h2 className="partner-h2">{t.faq.title}</h2>
          </div>

          <div className="partner-faq-grid">
            {t.faq.items.map((item) => (
              <div key={item.q} className="partner-faq-item">
                <h3 className="partner-h3" style={{ margin: '0 0 10px' }}>{item.q}</h3>
                <p className="partner-card-text">{item.a}</p>
                {'linkHref' in item && item.linkHref && (
                  <a href={item.linkHref} className="partner-faq-link">
                    {item.linkLabel}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '96px 24px', background: 'linear-gradient(135deg, #C0392B 0%, #922B21 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ color: '#FFFFFF', fontSize: 'clamp(30px, 5vw, 46px)', lineHeight: 1.18, fontWeight: 900, margin: '0 0 20px' }}>
            {t.cta.title}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 18, lineHeight: 1.75, margin: '0 auto 34px', maxWidth: 720 }}>
            {t.cta.text}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a href={contactHref} className="partner-white-btn">
              {t.cta.primary}
              <ArrowRight size={17} />
            </a>
            <a href={homeHref} className="partner-outline-btn">
              {t.cta.secondary}
            </a>
          </div>
        </div>
      </section>

      <style>{`
        * { box-sizing: border-box; }

        .partner-header-link {
          color: rgba(255,255,255,0.82);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 10px;
        }
        .partner-header-link:hover { color: #FFFFFF; }

        .partner-header-cta,
        .partner-primary-btn,
        .partner-white-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          font-weight: 700;
          border-radius: 7px;
        }

        .partner-header-cta {
          background: #C0392B;
          color: #FFFFFF;
          padding: 10px 17px;
          font-size: 14px;
        }
        .partner-header-cta:hover, .partner-primary-btn:hover { background: #A93226; }

        .partner-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 15px;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 30px;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.82);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .partner-primary-btn {
          padding: 14px 22px;
          background: #C0392B;
          color: #FFFFFF;
          font-size: 15px;
        }

        .partner-secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 22px;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.25);
          color: #FFFFFF;
          text-decoration: none;
          font-size: 15px;
          font-weight: 700;
        }
        .partner-secondary-btn:hover { background: rgba(255,255,255,0.06); }

        .partner-tag {
          display: inline-block;
          background: #FDEDEC;
          color: #C0392B;
          border-radius: 20px;
          padding: 6px 14px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .partner-h2 {
          color: #2C3E50;
          font-size: clamp(28px, 4.4vw, 42px);
          line-height: 1.18;
          letter-spacing: -0.02em;
          font-weight: 900;
          margin: 0 0 18px;
        }

        .partner-h3 {
          color: #2C3E50;
          font-size: 19px;
          line-height: 1.32;
          font-weight: 800;
          margin: 18px 0 10px;
        }

        .partner-body {
          color: #6C757D;
          font-size: 17px;
          line-height: 1.8;
          margin: 0;
        }

        .partner-card-text {
          color: #6C757D;
          font-size: 15px;
          line-height: 1.75;
          margin: 0;
        }

        .partner-persona-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .partner-persona-card {
          border: 1px solid #E8ECEF;
          border-radius: 18px;
          padding: 28px;
          background: #FFFFFF;
          box-shadow: 0 12px 32px rgba(44,62,80,0.045);
        }

        .partner-persona-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FDEDEC;
          color: #C0392B;
        }

        .partner-benefits-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .partner-benefit-card {
          border: 1px solid #E8ECEF;
          border-radius: 18px;
          padding: 28px;
          background: #F8F9FA;
        }

        .partner-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 22px;
        }

        .partner-step-card {
          border: 1px solid #E8ECEF;
          border-radius: 18px;
          padding: 30px;
          min-height: 260px;
          background: #FFFFFF;
          box-shadow: 0 12px 32px rgba(44,62,80,0.045);
        }

        .partner-step-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .partner-step-icon {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FDEDEC;
          color: #C0392B;
        }

        .partner-step-number {
          font-size: 12px;
          color: #ADB5BD;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        /* FOUNDING PARTNERS BANNER */
        .partner-founder-banner {
          position: relative;
          overflow: hidden;
          padding: 64px 24px;
          background:
            radial-gradient(circle at 12% 30%, rgba(192,57,43,.18), transparent 32%),
            linear-gradient(135deg, #1A252F 0%, #2C3E50 100%);
        }
        .partner-founder-glow {
          position: absolute;
          top: -160px;
          right: -120px;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(192,57,43,.14) 0%, transparent 70%);
          pointer-events: none;
        }
        .partner-founder-inner {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          align-items: center;
          gap: 56px;
        }
        .partner-founder-ribbon {
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
        .partner-founder-copy h2 {
          margin: 0 0 14px;
          max-width: 640px;
          color: #FFFFFF;
          font-size: clamp(26px, 3.4vw, 36px);
          font-weight: 900;
          line-height: 1.2;
          letter-spacing: -.02em;
        }
        .partner-founder-subtitle {
          margin: 0 0 28px;
          max-width: 560px;
          color: rgba(255,255,255,.65);
          font-size: 16px;
          line-height: 1.7;
        }
        .partner-founder-benefits {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 28px;
          margin-bottom: 32px;
        }
        .partner-founder-benefit {
          display: grid;
          grid-template-columns: 17px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          color: rgba(255,255,255,.88);
          font-size: 14px;
          line-height: 1.5;
        }
        .partner-founder-benefit svg { margin-top: 1px; color: #65D69A; }
        .partner-founder-actions {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .partner-founder-footnote {
          color: rgba(255,255,255,.42);
          font-size: 12.5px;
          line-height: 1.5;
          max-width: 260px;
        }
        .partner-founder-seal-wrap {
          display: flex;
          justify-content: center;
        }
        .partner-founder-seal {
          width: 190px;
          height: 190px;
          border-radius: 50%;
          border: 1.5px dashed rgba(255,255,255,.28);
          display: grid;
          place-items: center;
          animation: partner-founder-spin 40s linear infinite;
        }
        .partner-founder-seal-ring {
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
          animation: partner-founder-spin-reverse 40s linear infinite;
        }
        .partner-founder-seal-ring strong { font-size: 13px; font-weight: 900; letter-spacing: .08em; }
        .partner-founder-seal-ring span { font-size: 10px; color: rgba(255,255,255,.55); letter-spacing: .06em; }
        @keyframes partner-founder-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes partner-founder-spin-reverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

        .partner-faq-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }
        .partner-faq-item {
          border: 1px solid #E8ECEF;
          border-radius: 15px;
          padding: 26px;
          background: #F8F9FA;
        }
        .partner-faq-link {
          display: inline-block;
          margin-top: 12px;
          color: #C0392B;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }
        .partner-faq-link:hover { text-decoration: underline; }

        .partner-outline-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.45);
          color: #FFFFFF;
          padding: 14px 22px;
          border-radius: 7px;
          text-decoration: none;
          font-size: 15px;
          font-weight: 700;
        }
        .partner-outline-btn:hover { background: rgba(255,255,255,0.08); }

        .partner-white-btn {
          background: #FFFFFF;
          color: #922B21;
          padding: 14px 22px;
          font-size: 15px;
        }
        .partner-white-btn:hover { background: #F8F9FA; }

        @media (max-width: 1000px) {
          .partner-persona-grid,
          .partner-benefits-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 850px) {
          .partner-steps-grid,
          .partner-faq-grid {
            grid-template-columns: 1fr;
          }
          .partner-founder-inner {
            grid-template-columns: 1fr;
          }
          .partner-founder-seal-wrap {
            order: -1;
          }
        }

        @media (max-width: 600px) {
          .partner-header-cta { display: none; }
          .partner-persona-grid,
          .partner-benefits-grid {
            grid-template-columns: 1fr;
          }
          .partner-step-card { min-height: auto; }
        }
      `}</style>
    </main>
  );
}
