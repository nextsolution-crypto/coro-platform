import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestion de Projets & Mandats — CORO',
  description: 'Pilotez vos mandats du démarrage à la livraison. Centralisez projets, bâtiments, activités, échéances et heures depuis une seule plateforme.',
  alternates: { canonical: 'https://getcoro.io/gestion-de-projets' },
  openGraph: {
    title: 'Gestion de Projets & Mandats — CORO',
    description: 'Pilotez vos mandats du démarrage à la livraison depuis une seule plateforme.',
    url: 'https://getcoro.io/gestion-de-projets',
    siteName: 'CORO',
    locale: 'fr_CA',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Gestion de Projets & Mandats — CORO', description: 'Pilotez vos mandats du démarrage à la livraison depuis une seule plateforme.' },
};

export default function GestionProjetsPage({ searchParams }: { searchParams: { lang?: string } }) {
  const lang = searchParams?.lang === 'en' ? 'en' : 'fr';

  const content = {
    fr: {
      tag: 'Gestion de projets & mandats',
      title: 'Pilotez vos mandats du démarrage à la livraison',
      intro: 'CORO centralise la gestion de vos projets de conformité : bâtiments, clients, activités, échéances, responsabilités et heures — tout dans un environnement unique conçu pour les firmes conseil en mesures d\'urgence.',
      image: '/images/solutions/coro-gestion-projets.webp',
      sections: [
        { title: 'Vue portefeuille complète', content: 'Visualisez l\'ensemble de vos mandats actifs depuis un tableau de bord centralisé. Filtrez par client, bâtiment, type de document, statut ou conseiller assigné. Identifiez rapidement les projets en retard ou approchant une échéance réglementaire.' },
        { title: 'Gestion des clients et bâtiments', content: 'Chaque client peut avoir plusieurs bâtiments, et chaque bâtiment peut avoir plusieurs projets actifs simultanément. CORO maintient l\'historique complet de chaque mandat : versions précédentes, dates de révision, conseillers ayant travaillé sur le dossier.' },
        { title: 'Suivi des activités et des tâches', content: 'Décomposez chaque mandat en activités et tâches assignables. Suivez l\'avancement en temps réel, les heures prévues versus réalisées, et les livrables attendus. Les modèles de tâches accélèrent la création de nouveaux mandats.' },
        { title: 'Gestion des échéances réglementaires', content: 'CORO calcule automatiquement les dates de révision selon le type de document et la réglementation applicable. Des alertes proactives sont envoyées avant chaque échéance pour éviter les non-conformités chez vos clients.' },
        { title: 'Timelog et suivi des heures', content: 'Enregistrez les heures travaillées directement dans CORO. Comparez les heures budgétées aux heures réelles par mandat, par conseiller et par type d\'activité. Exportez les données pour la facturation.' },
        { title: 'Collaboration en équipe', content: 'Assignez des mandats à différents conseillers au sein de votre organisation. Chaque membre voit ses propres projets et activités. Le workflow d\'approbation intégré structure la révision croisée des documents produits.' },
      ],
      faq: [
        { q: 'Peut-on gérer plusieurs clients et bâtiments simultanément ?', a: 'Oui. CORO est conçu pour les firmes conseil qui gèrent un portefeuille de dizaines ou centaines de bâtiments. La vue portefeuille permet de tout surveiller depuis un seul endroit.' },
        { q: 'Comment fonctionne le suivi des échéances ?', a: 'CORO calcule automatiquement les dates de révision selon le type de document. Des notifications sont envoyées à l\'approche des échéances pour que vous puissiez planifier les mises à jour à l\'avance.' },
        { q: 'Peut-on exporter les données de facturation ?', a: 'Le timelog de CORO permet d\'exporter les heures par mandat pour alimenter votre processus de facturation. Des intégrations avec des logiciels de comptabilité sont prévues dans les prochaines versions.' },
        { q: 'CORO remplace-t-il notre logiciel de gestion de projet existant ?', a: 'CORO est spécialisé pour la gestion de mandats en conformité documentaire — il n\'est pas conçu pour remplacer un outil généraliste comme Asana ou Monday. Il complète votre stack existant en centralisant tout ce qui est spécifique à la conformité.' },
      ],
      cta: 'Demander une démo',
    },
    en: {
      tag: 'Project & Mandate Management',
      title: 'Manage your mandates from kickoff to delivery',
      intro: 'CORO centralizes the management of your compliance projects: buildings, clients, activities, deadlines, responsibilities and hours — all in a single environment designed for emergency management consulting firms.',
      image: '/images/solutions/en/coro-project-management.webp',
      sections: [
        { title: 'Complete portfolio view', content: 'Visualize all your active mandates from a centralized dashboard. Filter by client, building, document type, status or assigned advisor. Quickly identify projects that are delayed or approaching a regulatory deadline.' },
        { title: 'Client and building management', content: 'Each client can have multiple buildings, and each building can have multiple active projects simultaneously. CORO maintains the complete history of each mandate: previous versions, revision dates, advisors who worked on the file.' },
        { title: 'Activity and task tracking', content: 'Break down each mandate into assignable activities and tasks. Track progress in real time, planned versus actual hours, and expected deliverables. Task templates accelerate the creation of new mandates.' },
        { title: 'Regulatory deadline management', content: 'CORO automatically calculates revision dates based on document type and applicable regulations. Proactive alerts are sent before each deadline to avoid non-compliance for your clients.' },
        { title: 'Timelog and hour tracking', content: 'Log hours worked directly in CORO. Compare budgeted to actual hours by mandate, advisor and activity type. Export data for billing.' },
        { title: 'Team collaboration', content: 'Assign mandates to different advisors within your organization. Each member sees their own projects and activities. The integrated approval workflow structures cross-review of produced documents.' },
      ],
      faq: [
        { q: 'Can multiple clients and buildings be managed simultaneously?', a: 'Yes. CORO is designed for consulting firms managing a portfolio of dozens or hundreds of buildings. The portfolio view lets you monitor everything from one place.' },
        { q: 'How does deadline tracking work?', a: 'CORO automatically calculates revision dates based on document type. Notifications are sent as deadlines approach so you can plan updates in advance.' },
        { q: 'Can billing data be exported?', a: 'CORO\'s timelog allows exporting hours by mandate to feed your billing process. Integrations with accounting software are planned for future versions.' },
        { q: 'Does CORO replace our existing project management software?', a: 'CORO is specialized for compliance document mandate management — it is not designed to replace a general tool like Asana or Monday. It complements your existing stack by centralizing everything specific to compliance.' },
      ],
      cta: 'Request a demo',
    },
  };

  const d = content[lang];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: d.title,
    url: `https://getcoro.io/gestion-de-projets${lang === 'en' ? '?lang=en' : ''}`,
    publisher: { '@type': 'Organization', name: 'CORO', url: 'https://getcoro.io' },
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: lang === 'fr' ? 'Accueil' : 'Home', item: 'https://getcoro.io' },
      { '@type': 'ListItem', position: 2, name: d.tag, item: 'https://getcoro.io/gestion-de-projets' },
    ],
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Nav */}
      <nav style={{ backgroundColor: '#2C3E50', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>CO<span style={{ color: '#C0392B' }}>RO</span></span>
          </a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'none' }}>
              {lang === 'fr' ? '← Accueil' : '← Home'}
            </a>
            <a href={lang === 'fr' ? '/gestion-de-projets?lang=en' : '/gestion-de-projets'}
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 4 }}>
              {lang === 'fr' ? 'EN' : 'FR'}
            </a>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E9ECEF', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#ADB5BD' }}>
            <a href={lang === 'en' ? '/?lang=en' : '/'} style={{ color: '#ADB5BD', textDecoration: 'none' }}>getcoro.io</a>
            {' '}/ <span style={{ color: '#6C757D' }}>{d.tag}</span>
          </p>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #1A6B3ACC 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, color: '#FFFFFF', backgroundColor: '#27AE60', padding: '4px 14px', borderRadius: 4, letterSpacing: '0.1em', marginBottom: 20 }}>
              {d.tag}
            </span>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginBottom: 20 }}>{d.title}</h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 32 }}>{d.intro}</p>
            <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'}
              style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
              {d.cta} →
            </a>
          </div>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
            <img src={d.image} alt={d.title} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: 32 }}>
          {d.sections.map((s, i) => (
            <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, border: '1px solid #E9ECEF' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2C3E50', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #27AE60' }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: '#495057', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50', marginBottom: 32, textAlign: 'center' }}>
            {lang === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {d.faq.map((f, i) => (
              <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 28, border: '1px solid #E9ECEF' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', marginBottom: 10 }}>{f.q}</h3>
                <p style={{ fontSize: 15, color: '#6C757D', lineHeight: 1.7 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 64, backgroundColor: '#2C3E50', borderRadius: 16, padding: '48px 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', marginBottom: 16 }}>
            {lang === 'fr' ? 'Prêt à centraliser la gestion de vos mandats ?' : 'Ready to centralize your mandate management?'}
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
            {lang === 'fr' ? 'CORO génère, structure et gère vos documents de conformité depuis une seule plateforme.' : 'CORO generates, structures and manages your compliance documents from a single platform.'}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'} style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
              {d.cta} →
            </a>
            <a href={lang === 'fr' ? '/blog' : '/blog?lang=en'} style={{ display: 'inline-block', backgroundColor: 'transparent', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '2px solid rgba(255,255,255,0.3)' }}>
              {lang === 'fr' ? 'Lire nos guides →' : 'Read our guides →'}
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#2C3E50', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          © 2026 CORO — <a href="https://getcoro.io" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>getcoro.io</a>
        </p>
      </div>
    </div>
  );
}