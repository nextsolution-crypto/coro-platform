import { Metadata } from 'next';

const SITE_URL = 'https://getcoro.io';
const PAGE_URL = `${SITE_URL}/documents/plan-mesures-urgence-pmu`;

const DOC = {
  code: 'PMU',
  color: '#2980B9',
  fr: {
    title: 'Plan de Mesures d\'Urgence (PMU)',
    seoTitle: 'Plan de Mesures d\'Urgence (PMU) — Guide complet | CORO',
    seoDesc: 'Tout sur le Plan de Mesures d\'Urgence au Québec : cadre légal, contenu requis, fréquence de mise à jour et comment CORO simplifie sa production.',
    hero: 'Plan de Mesures d\'Urgence (PMU)',
    intro: 'Le Plan de Mesures d\'Urgence est le document de référence pour la gestion des situations d\'urgence dans les organisations québécoises et canadiennes. Il définit les rôles, les procédures et les ressources nécessaires pour faire face à toute situation d\'urgence, qu\'elle soit naturelle ou technologique.',
    sections: [
      { title: 'Qu\'est-ce qu\'un Plan de Mesures d\'Urgence ?', content: 'Le PMU décrit les responsabilités assignées ainsi que les mesures et les procédures à entreprendre en cas d\'urgence. En plus des procédures incendie, il couvre d\'autres types d\'urgence : déversement de matières dangereuses, explosion, alerte à la bombe, situation nécessitant des opérations de sauvetage, et autres risques naturels ou technologiques propres à l\'organisation. Il doit être élaboré en fonction des risques spécifiques de l\'entreprise et de son environnement.' },
      { title: 'Cadre légal applicable au Québec', content: 'Au Québec, les obligations en matière de mesures d\'urgence découlent de plusieurs lois et règlements complémentaires. Le Règlement sur la santé et la sécurité du travail (RSST), Section IV — Mesures de sécurité en cas d\'urgence (art. 34 à 36), prescrit les obligations de l\'employeur : plan d\'évacuation, exercices annuels, extincteurs portatifs. La Loi sur la santé et la sécurité du travail (LSST) impose également des obligations à l\'employeur (art. 51.1, 51.5, 51.6, 51.8). La Loi sur la sécurité civile et la Loi sur la sécurité incendie complètent ce cadre réglementaire. La norme de référence pour la planification d\'urgence est la norme CSA Z731-14.' },
      { title: 'PMU vs PSI : quelle différence ?', content: 'Le PSI (Plan de Sécurité Incendie) est un document spécifique aux situations d\'incendie, encadré par le Code national de prévention des incendies (CNPI). Le PMU est plus large : il agit comme plan maître et peut contenir le PSI. La première étape est toujours une analyse de risque qui détermine quels documents sont requis. Tout type d\'organisation doit avoir un PSI ; si un PMU est requis, il agit comme document maître.' },
      { title: 'Contenu d\'un PMU complet', content: 'Un PMU complet comprend : la description du bâtiment et de ses systèmes de sécurité, l\'organigramme des rôles d\'urgence (personnel de surveillance, équipe de première intervention), les listes téléphoniques d\'urgence, les procédures pour chaque type d\'urgence identifié lors de l\'analyse de risque, les plans d\'évacuation, les ressources disponibles sur le site, les mesures pour les occupants nécessitant une assistance, et le programme d\'exercices annuels.' },
      { title: 'Fréquence de mise à jour', content: 'Le PMU est un outil dynamique qui doit être maintenu à jour en fonction des changements organisationnels et environnementaux. Il doit être révisé dès qu\'un changement significatif survient : modification des opérations, nouveaux risques, changement de personnel clé, travaux majeurs ou modification des systèmes de sécurité. Des exercices sur une base régulière permettent d\'ajuster les ressources et les procédures.' },
      { title: 'Comment CORO simplifie la production du PMU', content: 'CORO génère automatiquement la structure complète de votre PMU à partir des informations du bâtiment. Les procédures d\'urgence standardisées sont présélectionnées selon la configuration du site. L\'éditeur intégré permet de compléter chaque module — listes téléphoniques, organigramme, plans techniques, matières dangereuses — et d\'exporter un document PDF professionnel bilingue FR/EN en quelques clics.' },
    ],
    sources: [
      { label: 'Règlement sur la santé et la sécurité du travail (RSST) — Section IV', url: 'https://www.legisquebec.gouv.qc.ca/fr/document/rc/S-2.1,%20r.%2013/' },
      { label: 'Loi sur la santé et la sécurité du travail (LSST)', url: 'https://www.legisquebec.gouv.qc.ca/fr/document/lc/S-2.1' },
      { label: 'Loi sur la sécurité civile — Gouvernement du Québec', url: 'https://www.legisquebec.gouv.qc.ca/fr/document/lc/S-2.3' },
      { label: 'APSAM — Mesures d\'urgence', url: 'https://www.apsam.com/gestion-de-la-prevention/gestion-des-interventions-durgence/mesures-durgence' },
      { label: 'Norme CSA Z731-14 — Planification d\'urgence', url: 'https://www.csagroup.org/fr/store/product/2430252/' },
    ],
    faq: [
      { q: 'Toutes les organisations ont-elles besoin d\'un PMU ?', a: 'Pas nécessairement. La première étape est une analyse de risque qui détermine les documents requis. Toute organisation doit avoir un PSI. Le PMU s\'ajoute lorsque les risques de l\'organisation le justifient.' },
      { q: 'Quelle est la différence entre un PMU et un PSI ?', a: 'Le PSI est spécifique aux situations d\'incendie. Le PMU est plus large et couvre tous les types d\'urgence. Lorsqu\'un PMU est requis, il agit comme plan maître et contient le PSI.' },
      { q: 'Combien de temps faut-il pour produire un PMU ?', a: 'Avec CORO, un PMU complet peut être produit en quelques heures pour un bâtiment standard, contre plusieurs jours avec les méthodes traditionnelles.' },
      { q: 'Peut-on utiliser CORO pour plusieurs bâtiments ?', a: 'Oui. CORO est conçu pour les firmes conseil et les gestionnaires de portefeuilles immobiliers. Gérez tous vos mandats depuis une seule plateforme.' },
    ],
    cta: 'Générer votre PMU avec CORO',
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: DOC.fr.seoTitle,
  description: DOC.fr.seoDesc,
  alternates: {
    canonical: PAGE_URL,
    languages: {
      'fr-CA': PAGE_URL,
      'x-default': PAGE_URL,
    },
  },
  openGraph: {
    type: 'article',
    url: PAGE_URL,
    siteName: 'CORO',
    locale: 'fr_CA',
    title: DOC.fr.seoTitle,
    description: DOC.fr.seoDesc,
    images: [{
      url: '/og-coro.jpg',
      width: 1200,
      height: 630,
      alt: "CORO — Plan de Mesures d'Urgence (PMU)",
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DOC.fr.seoTitle,
    description: DOC.fr.seoDesc,
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

export default function PMUPage() {
  const data = DOC.fr;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: data.title,
    headline: data.seoTitle,
    description: data.seoDesc,
    url: PAGE_URL,
    inLanguage: 'fr-CA',
    isPartOf: { '@type': 'WebSite', name: 'CORO', url: SITE_URL },
    about: [
      { '@type': 'Thing', name: "Plan de Mesures d'Urgence", alternateName: 'PMU' },
      { '@type': 'Thing', name: "Mesures d'urgence" },
      { '@type': 'Thing', name: "Planification d'urgence" },
      { '@type': 'Thing', name: 'Résilience organisationnelle' },
    ],
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
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Documents', item: `${SITE_URL}/gestion-documentaire` },
      { '@type': 'ListItem', position: 3, name: data.title, item: PAGE_URL },
    ],
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} />

      {/* Nav */}
      <nav style={{ backgroundColor: '#2C3E50', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>CO<span style={{ color: '#C0392B' }}>RO</span></span>
          </a>
          <a href="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'none' }}>← Accueil</a>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E9ECEF', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#ADB5BD' }}>
            <a href="/" style={{ color: '#ADB5BD', textDecoration: 'none' }}>getcoro.io</a> / <span style={{ color: '#6C757D' }}>{data.title}</span>
          </p>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, #2C3E50 0%, ${DOC.color}CC 100%)`, padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', fontSize: 13, fontWeight: 800, color: '#FFFFFF', backgroundColor: DOC.color, padding: '4px 14px', borderRadius: 4, letterSpacing: '0.1em', marginBottom: 20 }}>{DOC.code}</span>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginBottom: 24 }}>{data.hero}</h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, maxWidth: 640, margin: '0 auto 32px' }}>{data.intro}</p>
          <a href="/#demo" style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>{data.cta} →</a>
        </div>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(500px, 100%), 1fr))', gap: 32 }}>
          {data.sections.map((s, i) => (
            <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, border: '1px solid #E9ECEF' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2C3E50', marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${DOC.color}` }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: '#495057', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          ))}
        </div>

        {/* Sources */}
        <div style={{ marginTop: 48, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, border: '1px solid #E9ECEF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', marginBottom: 16 }}>📚 Sources et références officielles</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.sources.map((s, i) => (
              <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: DOC.color, textDecoration: 'none' }}>→ {s.label}</a></li>
            ))}
          </ul>
          <p style={{ fontSize: 12, color: '#ADB5BD', marginTop: 16 }}>⚠️ Ce contenu est fourni à titre informatif. Les exigences réglementaires varient selon le type de bâtiment, le secteur d'activité et la municipalité. Consultez les autorités compétentes pour votre situation spécifique.</p>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50', marginBottom: 32, textAlign: 'center' }}>Questions fréquentes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {data.faq.map((f, i) => (
              <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E9ECEF' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', marginBottom: 10 }}>{f.q}</h3>
                <p style={{ fontSize: 15, color: '#6C757D', lineHeight: 1.7 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 64, backgroundColor: '#2C3E50', borderRadius: 16, padding: '48px 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', marginBottom: 16 }}>Prêt à produire votre {DOC.code} ?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>CORO génère, structure et gère vos documents de conformité depuis une seule plateforme.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/#demo" style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>Demander une démo →</a>
            <a href="/blog" style={{ display: 'inline-block', backgroundColor: 'transparent', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '2px solid rgba(255,255,255,0.3)' }}>Lire nos guides →</a>
          </div>
        </div>
      </div>
    </div>
  );
}