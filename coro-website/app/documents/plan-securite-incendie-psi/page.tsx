import { Metadata } from 'next';

const DOC = {
  code: 'PSI',
  color: '#C0392B',
  fr: {
    title: 'Plan de Sécurité Incendie (PSI)',
    seoTitle: 'Plan de Sécurité Incendie (PSI) — Guide complet | CORO',
    seoDesc: 'Tout sur le Plan de Sécurité Incendie au Québec : bâtiments visés, contenu requis, obligations légales selon le CNPI 2020 et comment CORO accélère sa production.',
    hero: 'Plan de Sécurité Incendie (PSI)',
    intro: 'Le Plan de Sécurité Incendie est un document réglementaire qui définit les mesures de prévention et d\'intervention en cas d\'incendie. Au Québec, il est encadré par le Code national de prévention des incendies — Canada 2020 (CNPI), entré en vigueur le 17 avril 2025 via le Code de sécurité du Québec, Chapitre VIII — Bâtiment.',
    sections: [
      { title: 'Qu\'est-ce qu\'un Plan de Sécurité Incendie ?', content: 'Le PSI est un document détaillé traitant de tous les aspects de la sécurité incendie relativement à un bâtiment ou à un établissement donné. Il précise les mesures de prévention, les procédures d\'évacuation, les rôles du personnel désigné, les équipements de protection incendie disponibles et les protocoles d\'intervention. Le PSI est le document de base de tout bâtiment — toute organisation doit en avoir un.' },
      { title: 'Bâtiments visés par le PSI au Québec', content: 'Selon le Code national de prévention des incendies (CNPI) et le Code de sécurité du Québec, le PSI est obligatoire pour : les établissements de réunion, de soins, de traitement ou de détention ; les résidences privées pour aînés (RPA) et les ressources intermédiaires (RI) ; les services de garde (selon les exigences du ministère de la Famille, sous forme de PSI-MU) ; les bâtiments d\'habitation (selon les guides du gouvernement du Québec).' },
      { title: 'Contenu d\'un PSI complet', content: 'Un PSI complet comprend les éléments requis par le CNPI : la désignation et la préparation du personnel de surveillance, l\'inspection et l\'entretien des installations de sécurité, les procédures d\'évacuation incluant les personnes nécessitant une assistance, l\'avis au service d\'incendie, les instructions aux occupants lors du déclenchement de l\'alarme, et le programme d\'exercices d\'évacuation (obligatoire selon l\'art. 2.8.3 du CNPI). Un plan d\'évacuation affiché par aire de plancher est également obligatoire (art. 2.8.2.7 du CNPI).' },
      { title: 'Cadre légal — CNPI 2020 au Québec', content: 'Le Code de sécurité du Québec, Chapitre VIII — Bâtiment, intègre le Code national de prévention des incendies — Canada 2020 (CNPI 2020), avec les modifications spécifiques au Québec, entrées en vigueur le 17 avril 2025. Le CNPI est publié par la Commission canadienne des codes du bâtiment et de prévention des incendies du Conseil national de recherches du Canada (CNRC). Le service de sécurité incendie local peut exiger un exemplaire du PSI pour vérifier sa conformité.' },
      { title: 'Fréquence de mise à jour', content: 'Le propriétaire ou l\'exploitant d\'un bâtiment doit mettre à jour son PSI annuellement, notamment la liste des membres de l\'équipe d\'urgence. Une mise à jour est également requise dès qu\'un changement affecte le bâtiment : travaux de rénovation, modification des systèmes d\'alarme ou de gicleurs, changement d\'occupation ou de personnel désigné. La formation du personnel de surveillance est obligatoire lors de l\'implantation ou de la mise à jour du PSI selon le CNPI (art. 2.8.1.2).' },
      { title: 'Comment CORO simplifie la production du PSI', content: 'CORO intègre toutes les procédures incendie standardisées selon le CNPI et les adapte automatiquement à votre type de bâtiment et d\'occupation. Les listes du personnel désigné, les plans d\'évacuation par aire de plancher et les équipements sont gérés directement dans la plateforme. L\'export PDF professionnel inclut toutes les sections requises par la réglementation, avec mise à jour annuelle simplifiée.' },
    ],
    sources: [
      { label: 'Code national de prévention des incendies — Canada 2020 (CNPI) — CNRC', url: 'https://nrc.canada.ca/fr/certifications-evaluations-normes/codes-canada/publications-codes-canada/code-national-prevention-incendies-canada-2020' },
      { label: 'RBQ — Exigences du Code national de prévention des incendies', url: 'https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/interpretation-directives-techniques-et-administratives/chapitre-batiment-du-code-de-securite/exigences-du-code-national-de-prevention-des-incendies/' },
      { label: 'RBQ — CNPI 2020 modifié Québec : principaux changements (en vigueur 17 avril 2025)', url: 'https://www.rbq.gouv.qc.ca/domaines-dintervention/batiment/la-formation/code-national-de-securite-incendie-2020-modifie-quebec/' },
      { label: 'Guide PSI-MU pour habitations — Gouvernement du Québec', url: 'https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/securite-publique/publications-adm/publications-secteurs/securite-incendie/services-securite-incendie/materiel-prevention/Guide_PSIMU_Habitations_VF.pdf' },
    ],
    faq: [
      { q: 'Quelle est la différence entre un PSI et un PMU ?', a: 'Le PSI est spécifique aux situations d\'incendie. Le PMU est plus large et couvre tous les types d\'urgence. Toute organisation doit avoir un PSI ; lorsqu\'un PMU est requis, il agit comme plan maître et contient le PSI.' },
      { q: 'Mon bâtiment a-t-il besoin d\'un PSI ?', a: 'Selon le CNPI, tous les établissements de réunion, de soins, de traitement ou de détention doivent avoir un PSI. Les résidences pour aînés, les services de garde et les bâtiments d\'habitation sont également visés. Consultez votre service de sécurité incendie local pour les exigences spécifiques à votre territoire.' },
      { q: 'À quelle fréquence doit-on mettre à jour le PSI ?', a: 'Le PSI doit être mis à jour annuellement, notamment la liste des membres de l\'équipe d\'urgence. Une mise à jour est également requise lors de tout changement significatif au bâtiment.' },
      { q: 'Le PSI doit-il être soumis aux autorités ?', a: 'Le service de sécurité incendie local peut exiger un exemplaire du PSI pour vérifier sa conformité. Renseignez-vous auprès de votre municipalité pour connaître les exigences spécifiques à votre territoire.' },
    ],
    cta: 'Générer votre PSI avec CORO',
  },
};

export const metadata: Metadata = {
  title: DOC.fr.seoTitle,
  description: DOC.fr.seoDesc,
  alternates: { canonical: 'https://getcoro.io/documents/plan-securite-incendie-psi' },
  openGraph: { title: DOC.fr.seoTitle, description: DOC.fr.seoDesc, url: 'https://getcoro.io/documents/plan-securite-incendie-psi', siteName: 'CORO', locale: 'fr_CA', type: 'website' },
  twitter: { card: 'summary_large_image', title: DOC.fr.seoTitle, description: DOC.fr.seoDesc },
};

export default function PSIPage() {
  const data = DOC.fr;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: data.title, description: data.seoDesc, url: 'https://getcoro.io/documents/plan-securite-incendie-psi', publisher: { '@type': 'Organization', name: 'CORO', url: 'https://getcoro.io' }, inLanguage: 'fr-CA' };
  const breadcrumbLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://getcoro.io' }, { '@type': 'ListItem', position: 2, name: 'Documents', item: 'https://getcoro.io/documents' }, { '@type': 'ListItem', position: 3, name: data.title, item: 'https://getcoro.io/documents/plan-securite-incendie-psi' }] };
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