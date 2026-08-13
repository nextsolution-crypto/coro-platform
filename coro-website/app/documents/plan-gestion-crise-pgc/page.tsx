import { Metadata } from 'next';

const DOC = {
  code: 'PGC',
  color: '#8E44AD',
  fr: {
    title: 'Plan de Gestion de Crise (PGC)',
    seoTitle: 'Plan de Gestion de Crise (PGC) — Guide complet | CORO',
    seoDesc: 'Tout sur le Plan de Gestion de Crise : définition, structure, rôles de la cellule de crise et comment CORO aide les organisations à se préparer.',
    hero: 'Plan de Gestion de Crise (PGC)',
    intro: 'Le Plan de Gestion de Crise définit les protocoles de décision, de communication et d\'intervention lors de situations affectant gravement l\'organisation : crise médiatique, cyberattaque, incident majeur sur les lieux de travail, ou toute situation à fort impact réputationnel ou opérationnel.',
    sections: [
      { title: 'Qu\'est-ce qu\'un Plan de Gestion de Crise ?', content: 'Le PGC est un cadre décisionnel qui permet à une organisation de réagir rapidement et de façon coordonnée lors d\'une crise. Il définit qui décide quoi, comment communiquer en interne et en externe, et comment minimiser l\'impact sur les opérations et la réputation. La norme ISO 22361:2022 — Gestion de crise fournit des lignes directrices sur les principes et le cadre de la gestion de crise.' },
      { title: 'Différence entre urgence et crise', content: 'Une urgence affecte principalement la sécurité physique des personnes (incendie, accident) et nécessite un PMU ou un PSI. Une crise affecte la réputation, la viabilité ou la confiance envers l\'organisation. Les deux peuvent survenir simultanément et nécessitent des plans distincts mais complémentaires.' },
      { title: 'Contenu d\'un PGC complet', content: 'Un PGC comprend : la cellule de crise et ses membres, les déclencheurs d\'activation du plan, les protocoles de communication interne et externe, la gestion des médias et des réseaux sociaux, les procédures d\'escalade décisionnelle, et les scénarios préétablis pour les types de crises les plus probables selon l\'analyse de risque de l\'organisation.' },
      { title: 'La communication de crise', content: 'La communication est au cœur de la gestion de crise. Le PGC définit les porte-paroles autorisés, les messages clés pour chaque scénario, les canaux de communication prioritaires et les protocoles de validation des communications avant diffusion. Une mauvaise communication de crise peut aggraver significativement l\'impact d\'un incident.' },
      { title: 'Fréquence de révision et d\'exercices', content: 'Le PGC doit être révisé annuellement et après chaque activation réelle. Des exercices de simulation (tabletop exercises) sont recommandés tous les 12 à 18 mois pour tester la réactivité de la cellule de crise et identifier les lacunes du plan.' },
      { title: 'Comment CORO supporte la production du PGC', content: 'CORO structure votre PGC avec des modèles de scénarios, des fiches rôles pour la cellule de crise et des procédures de communication. La plateforme centralise tous vos documents de conformité et de gestion des risques.' },
    ],
    sources: [
      { label: 'ISO 22361:2022 — Sécurité et résilience — Gestion de crise — Lignes directrices', url: 'https://www.iso.org/fr/standard/77720.html' },
      { label: 'ISO 22301:2019 — Systèmes de management de la continuité des activités', url: 'https://www.iso.org/fr/standard/75106.html' },
      { label: 'Gouvernement du Canada — Cadre de gestion des urgences', url: 'https://www.securitepublique.gc.ca/cnt/rsrcs/pblctns/mrgnc-mngmnt-frmwrk/index-fr.aspx' },
    ],
    faq: [
      { q: 'Toutes les organisations ont-elles besoin d\'un PGC ?', a: 'Toute organisation exposée à des risques réputationnels, médiatiques, cybernétiques ou opérationnels majeurs devrait avoir un PGC. La taille n\'est pas le critère principal — c\'est l\'exposition au risque.' },
      { q: 'Qui fait partie de la cellule de crise ?', a: 'Typiquement : le PDG ou directeur général, le responsable des communications, le conseiller juridique, le directeur des ressources humaines et les responsables opérationnels concernés selon le type de crise.' },
      { q: 'Le PGC est-il relié au PCA ?', a: 'Oui. Le PGC gère la dimension décisionnelle et communicationnelle, tandis que le PCA assure la continuité opérationnelle. Les deux fonctionnent en parallèle lors d\'une crise majeure.' },
      { q: 'Comment tester un PGC ?', a: 'Par des exercices tabletop : simulation d\'un scénario de crise avec la cellule de crise pour tester les réflexes, les outils et les communications. Ces exercices doivent être documentés.' },
    ],
    cta: 'Structurer votre PGC avec CORO',
  },
};

export const metadata: Metadata = {
  title: DOC.fr.seoTitle,
  description: DOC.fr.seoDesc,
  alternates: { canonical: 'https://getcoro.io/documents/plan-gestion-crise-pgc' },
  openGraph: { title: DOC.fr.seoTitle, description: DOC.fr.seoDesc, url: 'https://getcoro.io/documents/plan-gestion-crise-pgc', siteName: 'CORO', locale: 'fr_CA', type: 'website' },
  twitter: { card: 'summary_large_image', title: DOC.fr.seoTitle, description: DOC.fr.seoDesc },
};

export default function PGCPage() {
  const data = DOC.fr;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: data.title, description: data.seoDesc, url: 'https://getcoro.io/documents/plan-gestion-crise-pgc', publisher: { '@type': 'Organization', name: 'CORO', url: 'https://getcoro.io' }, inLanguage: 'fr-CA' };
  const breadcrumbLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://getcoro.io' }, { '@type': 'ListItem', position: 2, name: 'Documents', item: 'https://getcoro.io/documents' }, { '@type': 'ListItem', position: 3, name: data.title, item: 'https://getcoro.io/documents/plan-gestion-crise-pgc' }] };
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: data.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <nav style={{ backgroundColor: '#2C3E50', padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href="/" style={{ textDecoration: 'none' }}><span style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>CO<span style={{ color: '#C0392B' }}>RO</span></span></a>
          <a href="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'none' }}>← Accueil</a>
        </div>
      </nav>
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E9ECEF', padding: '12px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#ADB5BD' }}><a href="/" style={{ color: '#ADB5BD', textDecoration: 'none' }}>getcoro.io</a> / <span style={{ color: '#6C757D' }}>{data.title}</span></p>
        </div>
      </div>
      <div style={{ background: `linear-gradient(135deg, #2C3E50 0%, ${DOC.color}CC 100%)`, padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', fontSize: 13, fontWeight: 800, color: '#FFFFFF', backgroundColor: DOC.color, padding: '4px 14px', borderRadius: 4, letterSpacing: '0.1em', marginBottom: 20 }}>{DOC.code}</span>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginBottom: 24 }}>{data.hero}</h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, maxWidth: 640, margin: '0 auto 32px' }}>{data.intro}</p>
          <a href="/#demo" style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>{data.cta} →</a>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(500px, 100%), 1fr))', gap: 32 }}>
          {data.sections.map((s, i) => (
            <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, border: '1px solid #E9ECEF' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2C3E50', marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${DOC.color}` }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: '#495057', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 32, border: '1px solid #E9ECEF' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50', marginBottom: 16 }}>📚 Sources et références officielles</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.sources.map((s, i) => (<li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: DOC.color, textDecoration: 'none' }}>→ {s.label}</a></li>))}
          </ul>
          <p style={{ fontSize: 12, color: '#ADB5BD', marginTop: 16 }}>⚠️ Ce contenu est fourni à titre informatif. Les exigences réglementaires varient selon le type de bâtiment, le secteur d'activité et la municipalité. Consultez les autorités compétentes pour votre situation spécifique.</p>
        </div>
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
        <div style={{ marginTop: 64, backgroundColor: '#2C3E50', borderRadius: 16, padding: '48px 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', marginBottom: 16 }}>Prêt à produire votre {DOC.code} ?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>CORO génère, structure et gère vos documents de conformité depuis une seule plateforme.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/#demo" style={{ display: 'inline-block', backgroundColor: '#C0392B', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>Demander une démo →</a>
            <a href="/blog" style={{ display: 'inline-block', backgroundColor: 'transparent', color: '#FFFFFF', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, border: '2px solid rgba(255,255,255,0.3)' }}>Lire nos guides →</a>
          </div>
        </div>
      </div>
      <div style={{ backgroundColor: '#2C3E50', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>© 2026 CORO — <a href="https://getcoro.io" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>getcoro.io</a></p>
      </div>
    </div>
  );
}