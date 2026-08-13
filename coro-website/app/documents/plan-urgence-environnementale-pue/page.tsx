import { Metadata } from 'next';

const DOC = {
  code: 'PUE',
  color: '#16A085',
  fr: {
    title: 'Plan d\'Urgence Environnementale (PUE)',
    seoTitle: 'Plan d\'Urgence Environnementale (PUE) — Guide complet | CORO',
    seoDesc: 'Tout sur le Plan d\'Urgence Environnementale au Canada : Règlement sur les urgences environnementales (2019), 249 substances réglementées, obligations et comment CORO simplifie sa production.',
    hero: 'Plan d\'Urgence Environnementale (PUE)',
    intro: 'Le Plan d\'Urgence Environnementale définit les mesures de prévention et d\'intervention en cas d\'incident environnemental impliquant des substances dangereuses. Au Canada, il est encadré par le Règlement sur les urgences environnementales (2019) (DORS/2019-51), pris en vertu de la Loi canadienne sur la protection de l\'environnement (1999) (LCPE), entré en vigueur le 24 août 2019.',
    sections: [
      { title: 'Cadre réglementaire : le Règlement sur les urgences environnementales (2019)', content: 'Le Règlement sur les urgences environnementales (2019) (DORS/2019-51) règlemente 249 substances dangereuses pour lesquelles il y a des exigences en matière de déclaration et de planification d\'urgence environnementale pour les installations à risque élevé. Il s\'applique à toute personne propriétaire d\'une substance figurant à l\'annexe 1 du Règlement, à des concentrations et quantités égales ou supérieures aux seuils définis. Six catégories de danger sont visées : toxicité en milieu aquatique, combustible, danger d\'explosion, danger de feu en nappe, danger en cas d\'inhalation, et oxydant pouvant exploser.' },
      { title: 'Êtes-vous assujetti au Règlement ?', content: 'Le Règlement s\'applique si votre installation possède ou a autorité sur une substance figurant à l\'annexe 1 du Règlement UE (2019), à des concentrations et quantités égales ou supérieures aux seuils définis. Les obligations varient selon que vous êtes en situation de déclaration uniquement ou en situation de planification complète. Pour vérifier si votre installation est assujettie, consultez la liste des 249 substances réglementées sur le site d\'Environnement et Changement climatique Canada.' },
      { title: 'Contenu d\'un PUE complet', content: 'Un PUE comprend : l\'inventaire des substances dangereuses présentes sur le site (fiches de données de sécurité — FDS), l\'identification des risques et des scénarios d\'accidents potentiels, les mesures de prévention et de confinement, les procédures de notification aux autorités (avis immédiat à Environnement et Changement climatique Canada en cas de rejet), les responsabilités en cas d\'intervention, les équipements de réponse disponibles, et les mesures de décontamination et de remédiation.' },
      { title: 'Obligations de notification', content: 'En vertu de la LCPE (1999), le gouvernement fédéral doit être avisé immédiatement du rejet ou du rejet probable d\'une substance réglementée. Pour signaler une urgence environnementale, contactez la Division des urgences environnementales d\'Environnement et Changement climatique Canada : ec.ue-e2.ec@canada.ca.' },
      { title: 'Matières dangereuses, SIMDUT et REPTOX', content: 'La réglementation sur le Système d\'information sur les matières dangereuses utilisées au travail (SIMDUT) exige des fiches de données de sécurité (FDS) pour toutes les matières dangereuses utilisées au travail. Au Québec, le répertoire REPTOX, géré par l\'IRSST, fournit les informations toxicologiques essentielles pour la gestion sécuritaire des substances.' },
      { title: 'Comment CORO supporte la production du PUE', content: 'CORO intègre un module de gestion des matières dangereuses qui permet de documenter l\'inventaire des substances, les fiches de données de sécurité et les procédures d\'intervention par scénario. La plateforme génère les sections réglementaires du PUE et permet l\'export d\'un document structuré conforme aux exigences réglementaires.' },
    ],
    sources: [
      { label: 'Règlement sur les urgences environnementales (2019) — DORS/2019-51', url: 'https://pollution-dechets.canada.ca/registre-protection-environnementale/reglements/visualiser?id=139' },
      { label: 'Environnement et Changement climatique Canada — Programme des urgences environnementales', url: 'https://www.canada.ca/fr/environnement-changement-climatique/services/programme-urgences-environnementales/reglementation.html' },
      { label: 'Loi canadienne sur la protection de l\'environnement (1999) (LCPE)', url: 'https://laws-lois.justice.gc.ca/fra/lois/C-15.31/' },
      { label: 'IRSST — Répertoire REPTOX', url: 'https://reptox.cnesst.gouv.qc.ca/' },
      { label: 'Signaler une urgence environnementale — Canada.ca', url: 'https://www.canada.ca/fr/environnement-changement-climatique/services/programme-urgences-environnementales/signaler-urgence.html' },
    ],
    faq: [
      { q: 'Mon installation est-elle assujettie au Règlement ?', a: 'Si votre installation possède ou a autorité sur une substance figurant à l\'annexe 1 du Règlement UE (2019) en quantité égale ou supérieure aux seuils définis, vous êtes assujetti. Consultez la liste des 249 substances sur le site d\'Environnement et Changement climatique Canada.' },
      { q: 'Que dois-je faire en cas de rejet accidentel ?', a: 'En vertu de la LCPE, vous devez aviser immédiatement le gouvernement fédéral. Contactez la Division des urgences environnementales d\'Environnement et Changement climatique Canada : ec.ue-e2.ec@canada.ca.' },
      { q: 'Qu\'est-ce qu\'une fiche de données de sécurité (FDS) ?', a: 'La FDS est un document standardisé décrivant les propriétés d\'une substance chimique, ses risques et les mesures de sécurité. Le SIMDUT exige des FDS pour toutes les matières dangereuses utilisées au travail.' },
      { q: 'Le PUE est-il relié au PMU ?', a: 'Oui. Le PUE est souvent intégré au PMU comme procédure spécifique pour les incidents environnementaux. Dans les sites industriels, il peut constituer un document distinct en raison des exigences réglementaires fédérales.' },
    ],
    cta: 'Générer votre PUE avec CORO',
  },
};

export const metadata: Metadata = {
  title: DOC.fr.seoTitle,
  description: DOC.fr.seoDesc,
  alternates: { canonical: 'https://getcoro.io/documents/plan-urgence-environnementale-pue' },
  openGraph: { title: DOC.fr.seoTitle, description: DOC.fr.seoDesc, url: 'https://getcoro.io/documents/plan-urgence-environnementale-pue', siteName: 'CORO', locale: 'fr_CA', type: 'website' },
  twitter: { card: 'summary_large_image', title: DOC.fr.seoTitle, description: DOC.fr.seoDesc },
};

export default function PUEPage() {
  const data = DOC.fr;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: data.title, description: data.seoDesc, url: 'https://getcoro.io/documents/plan-urgence-environnementale-pue', publisher: { '@type': 'Organization', name: 'CORO', url: 'https://getcoro.io' }, inLanguage: 'fr-CA' };
  const breadcrumbLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://getcoro.io' }, { '@type': 'ListItem', position: 2, name: 'Documents', item: 'https://getcoro.io/documents' }, { '@type': 'ListItem', position: 3, name: data.title, item: 'https://getcoro.io/documents/plan-urgence-environnementale-pue' }] };
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