import { Metadata } from 'next';

const DOC = {
  code: 'PRA',
  color: '#E67E22',
  fr: {
    title: 'Plan de Reprise des Activités (PRA)',
    seoTitle: 'Plan de Reprise des Activités (PRA) — Guide complet | CORO',
    seoDesc: 'Tout sur le Plan de Reprise des Activités : définition, différence avec le PCA, RTO, RPO et comment CORO simplifie sa production.',
    hero: 'Plan de Reprise des Activités (PRA)',
    intro: 'Le Plan de Reprise des Activités définit les procédures permettant à une organisation de restaurer ses activités normales après un sinistre ou une interruption majeure. Il complète le PCA en se concentrant sur le retour à la normale.',
    sections: [
      { title: 'Qu\'est-ce qu\'un Plan de Reprise des Activités ?', content: 'Le PRA (aussi appelé DRP — Disaster Recovery Plan en anglais) définit les étapes séquentielles pour restaurer les systèmes, les données, les infrastructures et les opérations après une interruption. Il précise les priorités de reprise, les objectifs de délai de reprise (RTO — Recovery Time Objective) et les objectifs de point de reprise (RPO — Recovery Point Objective). La norme de référence est la série ISO 22301 et pour les aspects informatiques, la norme ISO/IEC 27031.' },
      { title: 'PRA vs PCA : quelle différence ?', content: 'Le PCA se concentre sur le maintien des activités pendant l\'interruption. Le PRA se concentre sur le retour à la normale après l\'interruption. Dans la pratique, les deux plans fonctionnent en séquence : le PCA prend le relais lors de l\'interruption, le PRA guide le retour à la normale. Ils doivent être développés ensemble pour assurer une couverture complète.' },
      { title: 'Contenu d\'un PRA complet', content: 'Un PRA comprend : l\'inventaire des systèmes et ressources critiques, les objectifs de reprise (RTO/RPO) par activité, les procédures de restauration par ordre de priorité, les responsabilités de chaque équipe, les ressources alternatives (sites de secours, équipements de remplacement, services infonuagiques), et les procédures de validation avant reprise normale.' },
      { title: 'PRA informatique et PRA opérationnel', content: 'Le PRA informatique (IT DRP) se concentre sur la restauration des systèmes technologiques, encadré par la norme ISO/IEC 27031. Le PRA opérationnel couvre la reprise des processus métiers. Un PRA complet intègre les deux dimensions et définit leurs interdépendances.' },
      { title: 'Fréquence de test', content: 'Le PRA doit être testé au moins une fois par année. Les tests peuvent être partiels (restauration d\'un système spécifique) ou complets (simulation d\'une reprise totale). Chaque test doit être documenté et ses enseignements intégrés au plan, conformément aux exigences de la norme ISO 22301.' },
      { title: 'Comment CORO supporte la production du PRA', content: 'CORO structure la rédaction de votre PRA avec des modèles de procédures de reprise, des matrices de priorités et des fiches de responsabilités. L\'export PDF professionnel facilite la communication du plan à toutes les parties prenantes.' },
    ],
    sources: [
      { label: 'ISO 22301:2019 — Systèmes de management de la continuité des activités', url: 'https://www.iso.org/fr/standard/75106.html' },
      { label: 'ISO/IEC 27031:2011 — Technologies de l\'information — Continuité des activités', url: 'https://www.iso.org/fr/standard/44374.html' },
      { label: 'Gouvernement du Canada — Plan de continuité des opérations', url: 'https://www.canada.ca/fr/gouvernement/systeme/gouvernement-numerique/politiques-normes-lignes-directrices-orientation-gouvernement-numerique/orientation-gouvernement-canada-gestion-continuite-operationnelle.html' },
    ],
    faq: [
      { q: 'Quelle est la différence entre RTO et RPO ?', a: 'Le RTO (Recovery Time Objective) est le délai maximal acceptable pour reprendre une activité après une interruption. Le RPO (Recovery Point Objective) est la quantité maximale de données qu\'on peut se permettre de perdre, exprimée en durée (ex : 4 heures = on accepte de perdre au maximum 4 heures de données).' },
      { q: 'Le PRA s\'applique-t-il uniquement à l\'informatique ?', a: 'Non. Le PRA couvre toutes les ressources critiques : systèmes informatiques, équipements, fournisseurs, locaux et personnel. CORO vous aide à couvrir toutes ces dimensions.' },
      { q: 'Doit-on avoir un site de secours ?', a: 'Pas nécessairement. Les stratégies de reprise peuvent inclure le télétravail, des ententes avec des fournisseurs alternatifs ou l\'utilisation de services infonuagiques. Le PRA définit la stratégie adaptée à votre organisation.' },
      { q: 'Le PRA doit-il être testé ?', a: 'Absolument. Un plan non testé est un plan non fiable. CORO intègre un module de suivi des exercices pour documenter et archiver chaque test.' },
    ],
    cta: 'Structurer votre PRA avec CORO',
  },
};

export const metadata: Metadata = {
  title: DOC.fr.seoTitle,
  description: DOC.fr.seoDesc,
  alternates: { canonical: 'https://getcoro.io/documents/plan-reprise-activites-pra' },
  openGraph: { title: DOC.fr.seoTitle, description: DOC.fr.seoDesc, url: 'https://getcoro.io/documents/plan-reprise-activites-pra', siteName: 'CORO', locale: 'fr_CA', type: 'website' },
  twitter: { card: 'summary_large_image', title: DOC.fr.seoTitle, description: DOC.fr.seoDesc },
};

export default function PRAPage() {
  const data = DOC.fr;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: data.title, description: data.seoDesc, url: 'https://getcoro.io/documents/plan-reprise-activites-pra', publisher: { '@type': 'Organization', name: 'CORO', url: 'https://getcoro.io' }, inLanguage: 'fr-CA' };
  const breadcrumbLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://getcoro.io' }, { '@type': 'ListItem', position: 2, name: 'Documents', item: 'https://getcoro.io/documents' }, { '@type': 'ListItem', position: 3, name: data.title, item: 'https://getcoro.io/documents/plan-reprise-activites-pra' }] };
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