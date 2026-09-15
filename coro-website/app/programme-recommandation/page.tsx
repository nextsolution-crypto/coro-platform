import type { Metadata } from 'next';
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Link2,
  Building2,
  BadgeDollarSign,
  ShieldCheck,
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
      title: 'Programme de recommandation CORO — Recevez 250 $ de crédit',
      description:
        'Recommandez CORO à une organisation et recevez un crédit CORO de 250 $ lorsqu’elle devient un client admissible.',
    },

    badge: 'Programme de recommandation CORO',

    hero: {
      title: 'Recommandez CORO.',
      highlight: 'Recevez 250 $ de crédit.',
      text:
        'Vous connaissez une organisation qui pourrait bénéficier de CORO? Partagez votre lien de recommandation personnel. Lorsqu’elle devient un client admissible, votre organisation peut recevoir un crédit CORO de 250 $.',
      primary: 'Accéder à mon espace CORO',
      secondary: 'Découvrir CORO',
    },

    reward: {
      eyebrow: 'Votre avantage',
      amount: '250 $',
      title: 'de crédit CORO par recommandation admissible',
      text:
        'Le crédit est ajouté au compte de votre organisation après validation de la recommandation par CORO.',
    },

    steps: {
      tag: 'Comment ça fonctionne',
      title: 'Trois étapes simples.',
      intro:
        'Votre lien et votre code de recommandation sont accessibles directement dans votre espace professionnel CORO.',

      items: [
        {
          title: 'Partagez votre lien',
          text:
            'Depuis Administration → Recommandations, copiez votre lien personnel ou votre code de recommandation et transmettez-le à l’organisation de votre choix.',
        },
        {
          title: 'L’organisation découvre CORO',
          text:
            'Elle utilise votre lien pour visiter CORO, demander une démonstration et amorcer sa démarche avec notre équipe.',
        },
        {
          title: 'Recevez votre crédit',
          text:
            'Lorsque l’organisation devient un client admissible et que les conditions du programme sont remplies, un crédit CORO de 250 $ est approuvé pour votre organisation.',
        },
      ],
    },

    account: {
      tag: 'Tout est centralisé',
      title: 'Suivez vos recommandations directement dans CORO.',
      text:
        'Votre espace professionnel vous permet de consulter votre lien personnel, votre code, le statut de vos recommandations ainsi que les crédits approuvés et déjà appliqués.',
      bullets: [
        'Lien de recommandation personnel',
        'Code unique attribué à votre organisation',
        'Statut de chaque recommandation',
        'Crédits CORO approuvés',
        'Historique des recommandations récompensées',
      ],
      cta: 'Ouvrir mon espace professionnel',
    },

    conditions: {
      tag: 'Conditions principales',
      title: 'Un programme conçu pour rester simple et équitable.',
      intro:
        'Certaines conditions s’appliquent afin d’assurer une attribution claire et d’éviter les abus.',

      items: [
        {
          title: 'Nouveau prospect',
          text:
            'La recommandation doit concerner une organisation qui n’est pas déjà cliente CORO et qui n’est pas déjà engagée dans une démarche commerciale active avec CORO.',
        },
        {
          title: 'Une seule attribution',
          text:
            'Une organisation recommandée ne peut être attribuée qu’à une seule organisation référente.',
        },
        {
          title: 'Pas d’auto-recommandation',
          text:
            'Une organisation ne peut pas se recommander elle-même ou utiliser le programme pour contourner la tarification applicable.',
        },
        {
          title: 'Validation par CORO',
          text:
            'Le crédit est accordé après validation de l’admissibilité de la recommandation et de la conversion du nouveau client.',
        },
        {
          title: 'Crédit non monnayable',
          text:
            'Les crédits CORO n’ont aucune valeur monétaire, ne peuvent pas être retirés en argent et sont applicables uniquement aux services CORO admissibles.',
        },
        {
          title: 'Évolution du programme',
          text:
            'CORO peut modifier, suspendre ou mettre fin au programme de recommandation et à ses modalités.',
        },
      ],
    },

    cta: {
      title: 'Vous utilisez déjà CORO?',
      text:
        'Connectez-vous à votre espace professionnel pour récupérer votre lien de recommandation personnel et suivre vos crédits.',
      primary: 'Accéder à CORO',
      secondary: 'Demander une démonstration',
    },

    note:
      'Le crédit de 250 $ est soumis aux conditions du programme et à la validation de CORO. Les crédits n’ont aucune valeur monétaire et sont applicables uniquement aux services CORO admissibles.',
  },

  en: {
    metadata: {
      title: 'CORO Referral Program — Receive $250 in CORO credit',
      description:
        'Refer CORO to an organization and receive $250 in CORO credit when it becomes an eligible customer.',
    },

    badge: 'CORO Referral Program',

    hero: {
      title: 'Refer CORO.',
      highlight: 'Receive $250 in credit.',
      text:
        'Know an organization that could benefit from CORO? Share your personal referral link. When it becomes an eligible CORO customer, your organization may receive $250 in CORO credit.',
      primary: 'Access my CORO account',
      secondary: 'Discover CORO',
    },

    reward: {
      eyebrow: 'Your benefit',
      amount: '$250',
      title: 'in CORO credit per eligible referral',
      text:
        'The credit is added to your organization’s account after the referral has been validated by CORO.',
    },

    steps: {
      tag: 'How it works',
      title: 'Three simple steps.',
      intro:
        'Your referral link and code are available directly from your CORO professional account.',

      items: [
        {
          title: 'Share your link',
          text:
            'From Administration → Referrals, copy your personal link or referral code and share it with the organization of your choice.',
        },
        {
          title: 'The organization discovers CORO',
          text:
            'It uses your link to visit CORO, request a demonstration and begin the process with our team.',
        },
        {
          title: 'Receive your credit',
          text:
            'When the organization becomes an eligible customer and the program conditions are met, a $250 CORO credit is approved for your organization.',
        },
      ],
    },

    account: {
      tag: 'Everything in one place',
      title: 'Track your referrals directly in CORO.',
      text:
        'Your professional account lets you view your personal link, referral code, referral statuses and both approved and applied CORO credits.',
      bullets: [
        'Personal referral link',
        'Unique code assigned to your organization',
        'Status of each referral',
        'Approved CORO credits',
        'History of rewarded referrals',
      ],
      cta: 'Open my professional account',
    },

    conditions: {
      tag: 'Main conditions',
      title: 'A program designed to remain simple and fair.',
      intro:
        'Certain conditions apply to ensure clear attribution and prevent misuse.',

      items: [
        {
          title: 'New prospect',
          text:
            'The referral must involve an organization that is not already a CORO customer and is not already engaged in an active sales process with CORO.',
        },
        {
          title: 'Single attribution',
          text:
            'A referred organization may only be attributed to one referring organization.',
        },
        {
          title: 'No self-referrals',
          text:
            'An organization may not refer itself or use the program to circumvent applicable CORO pricing.',
        },
        {
          title: 'CORO validation',
          text:
            'The credit is granted after CORO validates the referral’s eligibility and the new customer conversion.',
        },
        {
          title: 'No cash value',
          text:
            'CORO credits have no cash value, cannot be withdrawn as cash and may only be applied to eligible CORO services.',
        },
        {
          title: 'Program changes',
          text:
            'CORO may modify, suspend or terminate the referral program and its terms.',
        },
      ],
    },

    cta: {
      title: 'Already using CORO?',
      text:
        'Sign in to your professional account to retrieve your personal referral link and track your credits.',
      primary: 'Access CORO',
      secondary: 'Request a demo',
    },

    note:
      '$250 credit is subject to program conditions and CORO validation. Credits have no cash value and may only be applied to eligible CORO services.',
  },
};

function getLang(raw: string | string[] | undefined): Lang {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'en' ? 'en' : 'fr';
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const t = CONTENT[lang];

  const frUrl = `${SITE_URL}/programme-recommandation`;
  const enUrl = `${SITE_URL}/programme-recommandation?lang=en`;
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
              ? 'Programme de recommandation CORO'
              : 'CORO Referral Program',
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

export default async function ReferralProgramPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const lang = getLang(params.lang);
  const t = CONTENT[lang];

  const otherLangHref =
    lang === 'fr'
      ? '/programme-recommandation?lang=en'
      : '/programme-recommandation';

  const homeHref = lang === 'fr' ? '/' : '/?lang=en';
  const demoHref = lang === 'fr' ? '/#demo' : '/?lang=en#demo';

  const currentUrl =
    lang === 'en'
      ? `${SITE_URL}/programme-recommandation?lang=en`
      : `${SITE_URL}/programme-recommandation`;

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

  return (
    <main
      style={{
        fontFamily:
          'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#FFFFFF',
        color: '#2C3E50',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      {/* HEADER */}
      <header
        style={{
          backgroundColor: '#1A252F',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <a
            href={homeHref}
            style={{
              textDecoration: 'none',
              color: '#FFFFFF',
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: '-1px',
            }}
          >
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </a>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <a
              href={otherLangHref}
              className="referral-header-link"
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>

            <a
              href="https://app.getcoro.io/login"
              className="referral-header-link"
            >
              {lang === 'fr' ? 'Connexion' : 'Login'}
            </a>

            <a href={demoHref} className="referral-header-cta">
              {lang === 'fr' ? 'Demander une démo' : 'Request a demo'}
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          background:
            'linear-gradient(135deg, #1A252F 0%, #243746 60%, #2C3E50 100%)',
          padding: '110px 24px 118px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div className="referral-badge">
            <Gift size={16} />
            {t.badge}
          </div>

          <h1
            style={{
              color: '#FFFFFF',
              fontSize: 'clamp(42px, 7vw, 72px)',
              lineHeight: 1.04,
              fontWeight: 900,
              letterSpacing: '-0.045em',
              margin: '26px auto 26px',
              maxWidth: 950,
            }}
          >
            {t.hero.title}
            <br />
            <span style={{ color: '#E74C3C' }}>
              {t.hero.highlight}
            </span>
          </h1>

          <p
            style={{
              color: 'rgba(255,255,255,0.72)',
              fontSize: 'clamp(18px, 2.4vw, 21px)',
              lineHeight: 1.7,
              maxWidth: 780,
              margin: '0 auto 38px',
            }}
          >
            {t.hero.text}
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <a
              href="https://app.getcoro.io/login"
              className="referral-primary-btn"
            >
              {t.hero.primary}
              <ArrowRight size={17} />
            </a>

            <a
              href={homeHref}
              className="referral-secondary-btn"
            >
              {t.hero.secondary}
            </a>
          </div>
        </div>
      </section>

      {/* REWARD */}
      <section
        style={{
          padding: '88px 24px',
          backgroundColor: '#F8F9FA',
        }}
      >
        <div
          style={{
            maxWidth: 920,
            margin: '0 auto',
          }}
        >
          <div className="referral-reward-card">
            <div className="referral-reward-icon">
              <BadgeDollarSign size={36} />
            </div>

            <div>
              <p className="referral-eyebrow">
                {t.reward.eyebrow}
              </p>

              <div className="referral-reward-line">
                <span className="referral-amount">
                  {t.reward.amount}
                </span>

                <h2 className="referral-reward-title">
                  {t.reward.title}
                </h2>
              </div>

              <p className="referral-body" style={{ marginBottom: 0 }}>
                {t.reward.text}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section
        style={{
          padding: '110px 24px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              maxWidth: 720,
              marginBottom: 52,
            }}
          >
            <span className="referral-tag">
              {t.steps.tag}
            </span>

            <h2 className="referral-h2">
              {t.steps.title}
            </h2>

            <p className="referral-body">
              {t.steps.intro}
            </p>
          </div>

          <div className="referral-steps-grid">
            {t.steps.items.map((item, index) => {
              const icons = [
                <Link2 key="link" size={28} />,
                <Building2 key="building" size={28} />,
                <Gift key="gift" size={28} />,
              ];

              return (
                <div
                  key={item.title}
                  className="referral-step-card"
                >
                  <div className="referral-step-top">
                    <div className="referral-step-icon">
                      {icons[index]}
                    </div>

                    <span className="referral-step-number">
                      0{index + 1}
                    </span>
                  </div>

                  <h3 className="referral-h3">
                    {item.title}
                  </h3>

                  <p className="referral-card-text">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ACCOUNT */}
      <section
        style={{
          padding: '110px 24px',
          backgroundColor: '#F8F9FA',
        }}
      >
        <div className="referral-two-col">
          <div>
            <span className="referral-tag">
              {t.account.tag}
            </span>

            <h2 className="referral-h2">
              {t.account.title}
            </h2>

            <p className="referral-body">
              {t.account.text}
            </p>

            <a
              href="https://app.getcoro.io/login"
              className="referral-dark-btn"
            >
              {t.account.cta}
              <ArrowRight size={17} />
            </a>
          </div>

          <div className="referral-account-card">
            {t.account.bullets.map((item) => (
              <div
                key={item}
                className="referral-account-row"
              >
                <CheckCircle2
                  size={20}
                  color="#C0392B"
                  strokeWidth={2}
                />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONDITIONS */}
      <section
        style={{
          padding: '110px 24px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              maxWidth: 760,
              marginBottom: 50,
            }}
          >
            <span className="referral-tag">
              {t.conditions.tag}
            </span>

            <h2 className="referral-h2">
              {t.conditions.title}
            </h2>

            <p className="referral-body">
              {t.conditions.intro}
            </p>
          </div>

          <div className="referral-conditions-grid">
            {t.conditions.items.map((item) => (
              <div
                key={item.title}
                className="referral-condition-card"
              >
                <ShieldCheck
                  size={24}
                  color="#C0392B"
                  strokeWidth={1.8}
                />

                <h3 className="referral-condition-title">
                  {item.title}
                </h3>

                <p className="referral-card-text">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '96px 24px',
          background:
            'linear-gradient(135deg, #C0392B 0%, #922B21 100%)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: '0 auto',
          }}
        >
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
              margin: '0 auto 34px',
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
            <a
              href="https://app.getcoro.io/login"
              className="referral-white-btn"
            >
              {t.cta.primary}
              <ArrowRight size={17} />
            </a>

            <a
              href={demoHref}
              className="referral-outline-btn"
            >
              {t.cta.secondary}
            </a>
          </div>
        </div>
      </section>

      {/* NOTE */}
      <section
        style={{
          padding: '30px 24px',
          backgroundColor: '#1A252F',
        }}
      >
        <p
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 12,
            lineHeight: 1.65,
            maxWidth: 900,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          {t.note}
        </p>
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .referral-header-link {
          color: rgba(255,255,255,0.82);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 10px;
        }

        .referral-header-link:hover {
          color: #FFFFFF;
        }

        .referral-header-cta,
        .referral-primary-btn,
        .referral-dark-btn,
        .referral-white-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          font-weight: 700;
          border-radius: 7px;
        }

        .referral-header-cta {
          background: #C0392B;
          color: #FFFFFF;
          padding: 10px 17px;
          font-size: 14px;
        }

        .referral-header-cta:hover,
        .referral-primary-btn:hover {
          background: #A93226;
        }

        .referral-badge {
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

        .referral-primary-btn {
          padding: 14px 22px;
          background: #C0392B;
          color: #FFFFFF;
          font-size: 15px;
        }

        .referral-secondary-btn {
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

        .referral-secondary-btn:hover {
          background: rgba(255,255,255,0.06);
        }

        .referral-reward-card {
          background: #FFFFFF;
          border: 1px solid #E8ECEF;
          border-radius: 22px;
          box-shadow: 0 20px 60px rgba(44,62,80,0.08);
          padding: clamp(28px, 5vw, 48px);
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 28px;
          align-items: center;
        }

        .referral-reward-icon {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: #FDEDEC;
          color: #C0392B;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .referral-eyebrow {
          margin: 0 0 8px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
          color: #C0392B;
        }

        .referral-reward-line {
          display: flex;
          align-items: baseline;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .referral-amount {
          color: #C0392B;
          font-size: clamp(38px, 6vw, 58px);
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .referral-reward-title {
          color: #2C3E50;
          font-size: clamp(21px, 3vw, 28px);
          line-height: 1.3;
          margin: 0;
          font-weight: 800;
        }

        .referral-tag {
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

        .referral-h2 {
          color: #2C3E50;
          font-size: clamp(30px, 5vw, 46px);
          line-height: 1.15;
          letter-spacing: -0.025em;
          font-weight: 900;
          margin: 0 0 20px;
        }

        .referral-h3 {
          color: #2C3E50;
          font-size: 21px;
          line-height: 1.3;
          font-weight: 800;
          margin: 22px 0 12px;
        }

        .referral-body {
          color: #6C757D;
          font-size: 17px;
          line-height: 1.8;
          margin: 0 0 26px;
        }

        .referral-card-text {
          color: #6C757D;
          font-size: 15px;
          line-height: 1.75;
          margin: 0;
        }

        .referral-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 22px;
        }

        .referral-step-card {
          border: 1px solid #E8ECEF;
          border-radius: 18px;
          padding: 30px;
          min-height: 300px;
          background: #FFFFFF;
          box-shadow: 0 12px 32px rgba(44,62,80,0.045);
        }

        .referral-step-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .referral-step-icon {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FDEDEC;
          color: #C0392B;
        }

        .referral-step-number {
          font-size: 12px;
          color: #ADB5BD;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .referral-two-col {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 70px;
          align-items: center;
        }

        .referral-dark-btn {
          background: #2C3E50;
          color: #FFFFFF;
          padding: 13px 19px;
          font-size: 15px;
        }

        .referral-dark-btn:hover {
          background: #1A252F;
        }

        .referral-account-card {
          background: #FFFFFF;
          border: 1px solid #E8ECEF;
          border-radius: 20px;
          padding: 18px 30px;
          box-shadow: 0 18px 50px rgba(44,62,80,0.06);
        }

        .referral-account-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 0;
          border-bottom: 1px solid #EEF1F3;
          color: #495057;
          font-size: 15px;
          font-weight: 600;
        }

        .referral-account-row:last-child {
          border-bottom: none;
        }

        .referral-conditions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .referral-condition-card {
          border: 1px solid #E8ECEF;
          border-radius: 15px;
          padding: 25px;
          background: #FFFFFF;
        }

        .referral-condition-title {
          color: #2C3E50;
          font-size: 17px;
          line-height: 1.35;
          font-weight: 800;
          margin: 16px 0 9px;
        }

        .referral-white-btn {
          background: #FFFFFF;
          color: #922B21;
          padding: 14px 22px;
          font-size: 15px;
        }

        .referral-white-btn:hover {
          background: #F8F9FA;
        }

        .referral-outline-btn {
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

        .referral-outline-btn:hover {
          background: rgba(255,255,255,0.08);
        }

        @media (max-width: 850px) {
          .referral-steps-grid,
          .referral-conditions-grid,
          .referral-two-col {
            grid-template-columns: 1fr;
          }

          .referral-two-col {
            gap: 40px;
          }

          .referral-reward-card {
            grid-template-columns: 1fr;
          }

          .referral-reward-icon {
            width: 60px;
            height: 60px;
          }
        }

        @media (max-width: 600px) {
          .referral-header-cta {
            display: none;
          }

          .referral-step-card {
            min-height: auto;
          }
        }
      `}</style>
    </main>
  );
}