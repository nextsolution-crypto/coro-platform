import { Metadata } from 'next';

const DOC = {
  code: 'PCA',
  color: '#27AE60',
  fr: {
    title: 'Plan de Continuité des Activités (PCA)',
    seoTitle: 'Plan de Continuité des Activités (PCA) — Guide complet | CORO',
    seoDesc: 'Tout sur le Plan de Continuité des Activités : définition, contenu, secteurs concernés et comment CORO simplifie sa production pour les organisations canadiennes.',
    hero: 'Plan de Continuité des Activités (PCA)',
    intro: 'Le Plan de Continuité des Activités garantit qu\'une organisation peut maintenir ses opérations critiques lors d\'une interruption majeure : sinistre, panne informatique, pandémie, perte d\'accès aux locaux ou défaillance d\'un fournisseur clé.',
    sections: [
      { title: 'Qu\'est-ce qu\'un Plan de Continuité des Activités ?', content: 'Le PCA est un document stratégique qui identifie les activités critiques d\'une organisation, évalue les risques d\'interruption et définit les mesures pour maintenir ou reprendre rapidement ces activités en cas de sinistre. La norme internationale de référence est l\'ISO 22301 — Sécurité et résilience — Systèmes de management de la continuité des activités.' },
      { title: 'Secteurs pour lesquels un PCA est exigé ou recommandé', content: 'Bien que le PCA ne soit pas universellement obligatoire par une loi unique au Canada, il est exigé ou fortement recommandé dans plusieurs secteurs : les institutions financières (selon les lignes directrices du Bureau du surintendant des institutions financières — BSIF) ; les organisations de soins de santé ; les services gouvernementaux et fournisseurs de services essentiels ; et les organisations certifiées ISO 22301.' },
      { title: 'Contenu d\'un PCA complet', content: 'Un PCA comprend : l\'analyse d\'impact sur les activités (Business Impact Analysis — BIA), l\'identification des activités critiques et des délais maximaux d\'interruption tolérables (RTO — Recovery Time Objective, et RPO — Recovery Point Objective), les stratégies de continuité, les procédures de mise en œuvre, les plans de communication de crise, et les programmes de tests et exercices.' },
      { title: 'PCA et normes internationales', content: 'La norme ISO 22301:2019 — Sécurité et résilience — Systèmes de management de la continuité des activités est la référence internationale. Elle définit les exigences pour planifier, établir, mettre en œuvre, exploiter, surveiller, réviser, maintenir et améliorer continuellement un système de management de la continuité des activités.' },
      { title: 'Fréquence de test et de révision', content: 'Le PCA doit être testé au moins une fois par année et révisé après chaque test, après tout changement organisationnel significatif ou après l\'activation réelle du plan. La norme ISO 22301 exige que les exercices soient documentés et que leurs résultats soient intégrés aux améliorations continues du plan.' },
      { title: 'Comment CORO supporte la production du PCA', content: 'CORO structure la rédaction de votre PCA avec des modèles adaptés à votre secteur d\'activité. La plateforme intègre les modules de gestion des ressources critiques, les listes de contacts et les procédures d\'activation, le tout exportable en PDF professionnel.' },
    ],
    sources: [
      { label: 'ISO 22301:2019 — Sécurité et résilience — Management de la continuité des activités', url: 'https://www.iso.org/fr/standard/75106.html' },
      { label: 'BSIF — Lignes directrices sur la continuité des activités', url: 'https://www.osfi-bsif.gc.ca/fr/directives-lignes-directrices/lignes-directrices/continuit%C3%A9-activit%C3%A9s' },
      { label: 'Gouvernement du Canada — Plan de continuité des opérations', url: 'https://www.canada.ca/fr/gouvernement/systeme/gouvernement-numerique/politiques-normes-lignes-directrices-orientation-gouvernement-numerique/orientation-gouvernement-canada-gestion-continuite-operationnelle.html' },
    ],
    faq: [
      { q: 'Le PCA est-il obligatoire ?', a: 'Il n\'existe pas de loi unique rendant le PCA obligatoire pour toutes les organisations canadiennes. Cependant, certains secteurs l\'exigent explicitement (BSIF pour les institutions financières, soins de santé, services essentiels) et il est exigé par la norme ISO 22301 pour les organisations certifiées.' },
      { q: 'Quelle est la différence entre un PCA et un PRA ?', a: 'Le PCA vise à maintenir les activités pendant une interruption. Le PRA (Plan de Reprise des Activités) se concentre sur le retour à la normale après l\'interruption. Les deux sont complémentaires et fonctionnent en séquence.' },
      { q: 'Qu\'est-ce que le RTO et le RPO ?', a: 'Le RTO (Recovery Time Objective) est le délai maximal acceptable pour reprendre une activité. Le RPO (Recovery Point Objective) est la quantité maximale de données qu\'on peut se permettre de perdre, exprimée en temps.' },
      { q: 'Combien de temps faut-il pour développer un PCA ?', a: 'Avec CORO, un premier PCA opérationnel peut être produit rapidement. La complexité dépend de la taille de l\'organisation et du nombre d\'activités critiques à couvrir.' },
    ],
    cta: 'Structurer votre PCA avec CORO',
  },
};

export const metadata: Metadata = {
  title: DOC.fr.seoTitle,
  description: DOC.fr.seoDesc,
  alternates: { canonical: 'https://getcoro.io/documents/plan-continuite-activites-pca' },
  openGraph: { title: DOC.fr.seoTitle, description: DOC.fr.seoDesc, url: 'https://getcoro.io/documents/plan-continuite-activites-pca', siteName: 'CORO', locale: 'fr_CA', type: 'website' },
  twitter: { card: 'summary_large_image', title: DOC.fr.seoTitle, description: DOC.fr.seoDesc },
};

export default function PCAPage() {
  const data = DOC.fr;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: data.title, description: data.seoDesc, url: 'https://getcoro.io/documents/plan-continuite-activites-pca', publisher: { '@type': 'Organization', name: 'CORO', url: 'https://getcoro.io' }, inLanguage: 'fr-CA' };
  const breadcrumbLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://getcoro.io' }, { '@type': 'ListItem', position: 2, name: 'Documents', item: 'https://getcoro.io/documents' }, { '@type': 'ListItem', position: 3, name: data.title, item: 'https://getcoro.io/documents/plan-continuite-activites-pca' }] };
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