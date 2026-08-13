import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Production & Conformité Documentaire — CORO',
  description: 'Générez, structurez et gérez vos PMU, PSI, PCA, PGC, PRA et PUE depuis une seule plateforme. Procédures intégrées, workflow d\'approbation et export PDF professionnel.',
  alternates: { canonical: 'https://getcoro.io/gestion-documentaire' },
  openGraph: {
    title: 'Production & Conformité Documentaire — CORO',
    description: 'Générez, structurez et gérez vos documents de conformité depuis une seule plateforme.',
    url: 'https://getcoro.io/gestion-documentaire',
    siteName: 'CORO',
    locale: 'fr_CA',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Production & Conformité Documentaire — CORO', description: 'Générez, structurez et gérez vos documents de conformité depuis une seule plateforme.' },
};

export default function GestionDocumentairePage({ searchParams }: { searchParams: { lang?: string } }) {
  const lang = searchParams?.lang === 'en' ? 'en' : 'fr';

  const content = {
    fr: {
      tag: 'Production & Conformité documentaire',
      title: 'Créez et gérez vos documents de conformité',
      intro: 'CORO centralise la production, la structuration et la gestion de vos PMU, PSI, PCA, PGC, PRA et PUE — avec la rigueur qu\'exige le terrain et l\'efficacité qu\'exige votre pratique.',
      image: '/images/solutions/coro-gestion-documentaire.webp',
      sections: [
        { title: '43 procédures intégrées et codifiées', content: 'CORO intègre 43 procédures d\'urgence standardisées (P001–P028 standards, P101–P108 équipe d\'intervention industrielle, P111–P122 occupants industriels). Chaque procédure est structurée avec titre bilingue, objectif, étapes, rôles et code couleur. Les procédures pertinentes sont présélectionnées automatiquement selon la configuration du bâtiment.' },
        { title: 'Génération automatique de la structure', content: 'Configurez le bâtiment une fois — type d\'occupation, équipements de sécurité, risques présents, matières dangereuses — et CORO génère automatiquement la structure complète du document. Fini les documents copiés-collés d\'un bâtiment à l\'autre.' },
        { title: 'Éditeur intégré par modules', content: 'Complétez chaque module dans un éditeur structuré : liste téléphonique d\'urgence, organigramme des rôles, description du bâtiment, équipements de sécurité, plans techniques, photos du site, matières dangereuses. Chaque section est validée automatiquement.' },
        { title: 'Workflow d\'approbation et contrôle qualité', content: 'Soumettez le document pour révision par un collègue. L\'approbateur consulte le document, ajoute des observations structurées et approuve ou refuse. Un score de qualité documentaire identifie les sections incomplètes avant l\'export.' },
        { title: 'Export PDF professionnel bilingue', content: 'Exportez en PDF professionnel avec sommaire dynamique à numérotation précise, séparateurs de sections, filigranes configurables et pagination continue. L\'export est disponible en français, en anglais ou les deux simultanément.' },
        { title: 'Suivi des délais réglementaires', content: 'CORO calcule automatiquement les dates de révision réglementaire selon le type de document et envoie des alertes avant échéance. Aucun document ne passe entre les mailles.' },
      ],
      documents: [
        { code: 'PMU', name: 'Plan de Mesures d\'Urgence', color: '#2980B9', href: '/documents/plan-mesures-urgence-pmu' },
        { code: 'PSI', name: 'Plan de Sécurité Incendie', color: '#C0392B', href: '/documents/plan-securite-incendie-psi' },
        { code: 'PCA', name: 'Plan de Continuité des Activités', color: '#27AE60', href: '/documents/plan-continuite-activites-pca' },
        { code: 'PGC', name: 'Plan de Gestion de Crise', color: '#8E44AD', href: '/documents/plan-gestion-crise-pgc' },
        { code: 'PRA', name: 'Plan de Reprise des Activités', color: '#E67E22', href: '/documents/plan-reprise-activites-pra' },
        { code: 'PUE', name: 'Plan d\'Urgence Environnementale', color: '#16A085', href: '/documents/plan-urgence-environnementale-pue' },
      ],
      faq: [
        { q: 'Combien de temps faut-il pour produire un PMU complet ?', a: 'Avec CORO, un PMU complet pour un bâtiment standard peut être produit en quelques heures. La structure est générée automatiquement ; il ne reste qu\'à compléter les informations spécifiques au site.' },
        { q: 'Peut-on personnaliser les procédures intégrées ?', a: 'Oui. Chaque procédure peut être adaptée au contexte du bâtiment. CORO propose également un générateur de procédures personnalisées pour les situations non couvertes par la bibliothèque standard.' },
        { q: 'Le document peut-il être révisé par plusieurs personnes ?', a: 'Oui. Le workflow d\'approbation permet à un conseiller de produire le document et à un réviseur de l\'examiner, commenter et approuver avant l\'export final.' },
        { q: 'L\'export PDF respecte-t-il les exigences réglementaires ?', a: 'L\'export PDF inclut toutes les sections requises par la réglementation applicable. CORO ne se substitue pas au jugement professionnel — c\'est un outil qui structure et accélère la production documentaire.' },
      ],
      cta: 'Demander une démo',
    },
    en: {
      tag: 'Document Production & Compliance',
      title: 'Create and manage your compliance documents',
      intro: 'CORO centralizes the production, structuring and management of your ERP, FSP, BCP, CMP, DRP and EEP — with the rigor field work demands and the efficiency your practice requires.',
      image: '/images/solutions/en/coro-document-management.webp',
      sections: [
        { title: '43 integrated and codified procedures', content: 'CORO integrates 43 standardized emergency procedures (P001–P028 standard, P101–P108 industrial intervention team, P111–P122 industrial occupants). Each procedure is structured with bilingual title, objective, steps, roles and color code. Relevant procedures are automatically pre-selected based on building configuration.' },
        { title: 'Automatic structure generation', content: 'Configure the building once — occupancy type, safety equipment, present risks, hazardous materials — and CORO automatically generates the complete document structure. No more copy-pasted documents from one building to another.' },
        { title: 'Integrated modular editor', content: 'Complete each module in a structured editor: emergency contact list, role organizational chart, building description, safety equipment, technical plans, site photos, hazardous materials. Each section is automatically validated.' },
        { title: 'Approval workflow and quality control', content: 'Submit the document for peer review. The approver consults the document, adds structured observations and approves or rejects. A document quality score identifies incomplete sections before export.' },
        { title: 'Professional bilingual PDF export', content: 'Export as professional PDF with dynamic table of contents with precise pagination, section separators, configurable watermarks and continuous pagination. Export is available in French, English or both simultaneously.' },
        { title: 'Regulatory deadline tracking', content: 'CORO automatically calculates regulatory revision dates based on document type and sends alerts before deadlines. No document falls through the cracks.' },
      ],
      documents: [
        { code: 'ERP', name: 'Emergency Response Plan', color: '#2980B9', href: '/documents/plan-mesures-urgence-pmu' },
        { code: 'FSP', name: 'Fire Safety Plan', color: '#C0392B', href: '/documents/plan-securite-incendie-psi' },
        { code: 'BCP', name: 'Business Continuity Plan', color: '#27AE60', href: '/documents/plan-continuite-activites-pca' },
        { code: 'CMP', name: 'Crisis Management Plan', color: '#8E44AD', href: '/documents/plan-gestion-crise-pgc' },
        { code: 'DRP', name: 'Disaster Recovery Plan', color: '#E67E22', href: '/documents/plan-reprise-activites-pra' },
        { code: 'EEP', name: 'Environmental Emergency Plan', color: '#16A085', href: '/documents/plan-urgence-environnementale-pue' },
      ],
      faq: [
        { q: 'How long does it take to produce a complete ERP?', a: 'With CORO, a complete ERP for a standard building can be produced in a few hours. The structure is automatically generated; you only need to fill in site-specific information.' },
        { q: 'Can integrated procedures be customized?', a: 'Yes. Each procedure can be adapted to the building context. CORO also offers a custom procedure generator for situations not covered by the standard library.' },
        { q: 'Can the document be reviewed by multiple people?', a: 'Yes. The approval workflow allows an advisor to produce the document and a reviewer to examine, comment and approve it before final export.' },
        { q: 'Does the PDF export meet regulatory requirements?', a: 'The PDF export includes all sections required by applicable regulations. CORO does not replace professional judgment — it is a tool that structures and accelerates document production.' },
      ],
      cta: 'Request a demo',
    },
  };

  const d = content[lang];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: d.title,
    url: `https://getcoro.io/gestion-documentaire${lang === 'en' ? '?lang=en' : ''}`,
    publisher: { '@type': 'Organization', name: 'CORO', url: 'https://getcoro.io' },
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: lang === 'fr' ? 'Accueil' : 'Home', item: 'https://getcoro.io' },
      { '@type': 'ListItem', position: 2, name: d.tag, item: 'https://getcoro.io/gestion-documentaire' },
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
            <a href={lang === 'fr' ? '/gestion-documentaire?lang=en' : '/gestion-documentaire'}
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
      <div style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #C0392BCC 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, color: '#FFFFFF', backgroundColor: '#C0392B', padding: '4px 14px', borderRadius: 4, letterSpacing: '0.1em', marginBottom: 20 }}>
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
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2C3E50', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #C0392B' }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: '#495057', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          ))}
        </div>

        {/* Documents supportés */}
        <div style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#2C3E50', marginBottom: 8, textAlign: 'center' }}>
            {lang === 'fr' ? 'Documents supportés par CORO' : 'Documents supported by CORO'}
          </h2>
          <p style={{ fontSize: 16, color: '#6C757D', textAlign: 'center', marginBottom: 32 }}>
            {lang === 'fr' ? 'Cliquez sur un document pour en savoir plus.' : 'Click on a document to learn more.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {d.documents.map((doc, i) => (
              <a key={i} href={doc.href} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                backgroundColor: '#FFFFFF', borderRadius: 10, padding: '20px 24px',
                border: '1px solid #E9ECEF', borderLeft: `4px solid ${doc.color}`,
                textDecoration: 'none', transition: 'box-shadow 0.2s, transform 0.2s',
              }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#FFFFFF', backgroundColor: doc.color, padding: '4px 10px', borderRadius: 6, flexShrink: 0 }}>{doc.code}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#2C3E50' }}>{doc.name}</span>
              </a>
            ))}
          </div>
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
            {lang === 'fr' ? 'Prêt à moderniser votre production documentaire ?' : 'Ready to modernize your document production?'}
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