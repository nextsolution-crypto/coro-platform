import { Metadata } from 'next';

const SITE_URL = 'https://getcoro.io';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang: langParam } = await searchParams;
  const isEnglish = langParam === 'en';

  const frUrl = `${SITE_URL}/resilience-operationnelle`;
  const enUrl = `${SITE_URL}/resilience-operationnelle?lang=en`;
  const currentUrl = isEnglish ? enUrl : frUrl;

  const title = isEnglish
    ? 'Operational Resilience & Incident Management — CORO'
    : 'Résilience opérationnelle et gestion d\'incidents — CORO';

  const description = isEnglish
    ? 'CORO connects your emergency plans to real-time building presence. Real-time resilience index, automatic role substitution, incident module with automatic procedures, ISO 22301 / NFPA 2020 / CCOHS compliant reports and full REX cycle.'
    : 'CORO connecte vos plans d\'urgence à la présence réelle dans le bâtiment. Indice de résilience temps réel, substitution automatique des rôles, module Incident avec procédures automatiques, rapports conformes ISO 22301 / CNPI 2020 / CNESST et boucle REX complète.';

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: currentUrl,
      languages: { 'fr-CA': frUrl, 'en-CA': enUrl, 'x-default': frUrl },
    },
    openGraph: {
      type: 'website', url: currentUrl, siteName: 'CORO',
      locale: isEnglish ? 'en_CA' : 'fr_CA',
      alternateLocale: [isEnglish ? 'fr_CA' : 'en_CA'],
      title, description,
      images: [{ url: '/og-coro.jpg', width: 1200, height: 630, alt: isEnglish ? 'CORO operational resilience and incident management' : 'Résilience opérationnelle CORO' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-coro.jpg'] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  };
}

export default async function ResilienceOperationnellePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const lang = params?.lang === 'en' ? 'en' : 'fr';

  const content = {
    fr: {
      tag: 'Résilience & Intervention',
      heroEyebrow: 'De la présence réelle à la mobilisation d\'urgence',
      title: 'Vos plans d\'urgence ne valent rien s\'ils ne reflètent pas la réalité du terrain.',
      intro: 'CORO est la seule plateforme qui ferme la boucle complète : du plan d\'urgence approuvé à la présence réelle, de l\'indice de résilience au déclenchement d\'incident, du rapport conforme ISO 22301 au retour d\'expérience qui améliore le plan.',
      heroImage: '/images/solutions/resilience/coro-resilience-dashboard.webp',
      primaryCta: 'Demander une démo',
      secondaryCta: 'Accéder au portail',
      proofTitle: 'Une plateforme qui sait qui est là et ce qu\'il peut faire',
      proofIntro: 'La plupart des outils gèrent soit les documents, soit les incidents. CORO gère les deux — et les connecte à travers la présence réelle de l\'équipe d\'urgence dans le bâtiment.',
      highlights: [
        { number: '01', title: 'Présence réelle', text: 'QR code + PIN — qui est dans le bâtiment maintenant, à la seconde près.' },
        { number: '02', title: 'Indice CORO', text: '4 composantes pondérées : rôles, qualifications, plans, exercices.' },
        { number: '03', title: 'Module Incident', text: 'Procédure coordonnateur automatique, mobilisation, journal, rapports.' },
        { number: '04', title: 'Boucle REX', text: 'Post-incident → recommandations → PMU amélioré → nouvelle version approuvée.' },
      ],
      sentinelle: {
        kicker: 'Fondation — CORO Sentinelle',
        title: 'Savoir qui est présent est la première condition de toute résilience',
        text: 'CORO Sentinelle établit en temps réel la liste exacte des occupants dans le bâtiment grâce au pointage QR code et PIN. Cette donnée devient immédiatement exploitable pour calculer la capacité d\'intervention réelle — pas celle inscrite sur un organigramme théorique.',
        bullets: [
          'Pointage en 5 secondes — QR code borne + PIN personnel',
          'Détection automatique entrée / sortie',
          'Employés, visiteurs et contracteurs',
          'Mode hors ligne — synchronisation dès le retour de connexion',
          'Conservation 12 mois (Loi 25) · Évacuations 36 mois (ISO 22301)',
          'Rapport PDF d\'évacuation conforme CNPI 2020',
        ],
        image: '/images/solutions/resilience/coro-sentinelle-kiosk.webp',
        alt: 'Borne kiosque CORO Sentinelle — pointage QR et PIN',
      },
      readiness: {
        kicker: 'Indice CORO de résilience',
        title: 'Un score pondéré qui répond à une question simple : sommes-nous vraiment prêts maintenant ?',
        text: 'L\'indice CORO de résilience opérationnelle calcule en temps réel la capacité réelle d\'intervention du bâtiment, pas sa capacité théorique. Il combine quatre composantes pondérées et se met à jour automatiquement à chaque punch IN ou punch OUT.',
        components: [
          { label: 'Couverture des rôles', weight: '40 %', desc: 'Coordonnateur, EPI, secouristes, accompagnateurs PNA — présents ou absents?' },
          { label: 'Qualifications', weight: '20 %', desc: 'RCR/DEA, extincteur, EPI, matières dangereuses — qui peut agir?' },
          { label: 'Plans approuvés', weight: '25 %', desc: 'PMU ou PSI validé et à jour dans CORO.' },
          { label: 'Exercices (CNPI 2020)', weight: '15 %', desc: 'Dernier exercice d\'évacuation < 12 mois.' },
        ],
        image: '/images/solutions/resilience/coro-resilience-index.webp',
        alt: 'Indice CORO de résilience opérationnelle — tableau de bord temps réel',
      },
      substitution: {
        kicker: 'Organisation d\'urgence dynamique',
        title: 'Le coordonnateur titulaire sort du bâtiment. Le substitut prend automatiquement le relais.',
        text: 'Chaque membre de l\'équipe d\'urgence est configuré avec son rôle, son type (titulaire ou substitut) et sa priorité. Dès qu\'un punch OUT modifie la composition de l\'équipe, CORO recalcule immédiatement l\'organisation opérationnelle effective — sans intervention manuelle.',
        bullets: [
          'Rôles : Coordonnateur, EPI, Responsable rassemblement, Chercheur, Surveillant de sortie, Accompagnateur PNA, Secouriste',
          'Titulaires et substituts (#1, #2) configurés par rôle et par bâtiment',
          'Substitution automatique visible en temps réel sur le tableau de résilience',
          'Alerte lacune si aucun coordonnateur ou secouriste présent (CRON 15 min)',
          'Notifications courriel au gestionnaire si lacune critique détectée',
          'Qualifications par membre : RCR/DEA, extincteur, EPI, HAZMAT',
        ],
        image: '/images/solutions/resilience/coro-organisation-urgence.webp',
        alt: 'Organisation d\'urgence dynamique CORO — substitution automatique des rôles',
      },
      incident: {
        kicker: 'Module Incident',
        title: 'Déclenchement. Procédure. Mobilisation. Rapport. En une seule plateforme.',
        text: 'Lorsqu\'un incident survient, CORO ne cherche pas dans une liste théorique de 14 membres. Il interroge Sentinelle : qui est physiquement présent maintenant ? La procédure correspondante s\'affiche immédiatement pour le coordonnateur. Les membres reçoivent un SMS et un courriel avec lien d\'accusé de réception. Les occupants sont notifiés selon la phase.',
        bullets: [
          '15 types d\'incidents mappés aux procédures CORO (P001–P026)',
          'Checklist coordonnateur extraite automatiquement de la procédure active',
          'SMS + courriel simultanés — membres mobilisés en secondes',
          'Lien d\'accusé de réception — confirmation visible sur l\'écran du coordonnateur',
          'Incidents multiples simultanés supportés',
          'Journal chronologique automatique horodaté',
          'Mode exercice — occupants non notifiés, préfixe [EXERCICE]',
        ],
        image: '/images/solutions/resilience/coro-module-incident.webp',
        alt: 'Module Incident CORO — checklist coordonnateur et mobilisation temps réel',
      },
      report: {
        kicker: 'Historique & Rapports',
        title: 'Chaque incident génère un rapport conforme prêt pour inspection',
        text: 'L\'historique complet de tous les incidents est conservé dans CORO. Chaque incident produit un rapport PDF structuré en 7 sections, numéroté, horodaté, avec le journal chronologique, les étapes cochées de la procédure, l\'équipe mobilisée et le retour d\'expérience.',
        steps: ['Identification', 'Chronologie', 'Occupants', 'Équipe mobilisée', 'Procédure', 'REX', 'Signatures'],
        features: [
          { title: 'Conforme ISO 22301', text: 'Conservation 36 mois. Rapport structuré selon les exigences de management de la continuité d\'activité.' },
          { title: 'Conforme CNPI 2020', text: 'Exercices d\'évacuation archivés 24 mois. Rapport d\'évacuation avec comptage des occupants.' },
          { title: 'Conforme CNESST', text: 'Incidents avec blessés conservés 5 ans. Identification des causes et actions correctives documentées.' },
          { title: 'Retour d\'expérience (REX)', text: 'Ce qui a bien fonctionné, points à améliorer, recommandations, actions correctives. Formulaire intégré au rapport.' },
          { title: 'Export PDF en un clic', text: 'Rapport généré à la demande, prêt à archiver ou à soumettre à une inspection réglementaire.' },
        ],
        image: '/images/solutions/resilience/coro-rapport-incident.webp',
        alt: 'Rapport d\'incident CORO — 7 sections conformes ISO 22301 / CNPI 2020 / CNESST',
      },
      intel: {
        kicker: 'Intelligence organisationnelle',
        title: 'CORO détecte les lacunes avant qu\'un incident survienne',
        text: 'Le module d\'intelligence organisationnelle analyse en continu les 4 composantes de l\'indice de résilience et génère des recommandations proactives classées par niveau de criticité — avant même qu\'une urgence ne se déclare.',
        examples: [
          '🔴 Aucun PMU approuvé pour ce bâtiment',
          '🔴 Aucun exercice d\'évacuation enregistré',
          '🔴 Aucun coordonnateur ou substitut présent',
          '🟠 Dernier exercice il y a plus de 12 mois (CNPI 2020)',
          '🟠 EPI : moins de 50 % des membres requis présents',
          '🟠 PMU non mis à jour depuis plus de 18 mois',
          '🔵 3 incidents de type Alerte incendie en 90 jours — récurrence anormale',
          '🔵 Actions correctives REX documentées — vérifier leur mise en œuvre',
        ],
        image: '/images/solutions/resilience/coro-intelligence-organisationnelle.webp',
        alt: 'Intelligence organisationnelle CORO — recommandations proactives',
      },
      loop: {
        kicker: 'La boucle complète',
        title: 'Du plan à l\'incident. De l\'incident au plan amélioré.',
        text: 'CORO est la seule plateforme qui connecte la production documentaire à l\'opérationnel terrain — et qui referme la boucle grâce au REX. Chaque incident améliore le plan. Chaque plan améliore la résilience.',
        steps: ['PMU approuvé dans CORO', 'Sentinelle — présence réelle', 'Indice de résilience', 'Incident déclenché', 'Procédure + Mobilisation', 'Rapport + REX', 'PMU mis à jour + approuvé'],
      },
      faqTitle: 'Questions fréquentes',
      faq: [
        { q: 'Comment CORO sait-il qui est dans le bâtiment ?', a: 'Grâce à CORO Sentinelle : chaque employé dispose d\'un PIN personnel et d\'un QR code. Il scanne le QR de la borne à l\'entrée et entre son PIN. Le système enregistre l\'heure et met à jour le registre d\'occupation en temps réel.' },
        { q: 'Que se passe-t-il si le coordonnateur quitte le bâtiment pendant la journée ?', a: 'CORO détecte immédiatement le punch OUT et active automatiquement le substitut configuré. La page Résilience est mise à jour en quelques secondes. Si aucun substitut n\'est disponible, une alerte de lacune critique est générée.' },
        { q: 'Les SMS sont-ils inclus dans CORO ?', a: 'Oui. L\'envoi de SMS via Brevo est intégré. Chaque membre de l\'équipe d\'urgence ayant fourni son consentement explicite reçoit un SMS simultanément au courriel lors du déclenchement d\'un incident.' },
        { q: 'Peut-on déclencher un exercice sans notifier les vrais occupants ?', a: 'Oui. Le mode exercice intégré envoie des courriels et SMS préfixés [EXERCICE] à l\'équipe d\'urgence, mais ne notifie pas les occupants. Le rapport généré mentionne explicitement le mode exercice.' },
        { q: 'Le rapport PDF est-il vraiment conforme CNPI 2020 et ISO 22301 ?', a: 'Oui. Le rapport structuré en 7 sections couvre les exigences de traçabilité ISO 22301 (36 mois), la conservation des exercices CNPI 2020 (24 mois) et la documentation CNESST pour les incidents avec blessés (5 ans). Il est généré en un clic depuis l\'historique des incidents.' },
        { q: 'Le module Incident fonctionne-t-il si plusieurs incidents surviennent simultanément ?', a: 'Oui. CORO supporte les incidents multiples simultanés. Chaque incident a son propre journal, sa propre checklist coordonnateur et son propre rapport — indépendants les uns des autres.' },
      ],
      finalTitle: 'Un plan d\'urgence ne vaut que s\'il peut être exécuté par les bonnes personnes au bon moment.',
      finalText: 'Avec CORO, vous savez en permanence si votre bâtiment est opérationnel, qui peut intervenir maintenant, et comment chaque incident améliore votre prochaine réponse.',
    },
    en: {
      tag: 'Resilience & Incident Response',
      heroEyebrow: 'From real-time presence to emergency mobilization',
      title: 'Your emergency plans are only as good as the people available to execute them.',
      intro: 'CORO is the only platform that closes the complete loop: from the approved emergency plan to real-time building presence, from the resilience index to incident activation, from the ISO 22301-compliant report to the lessons learned that improve the plan.',
      heroImage: '/images/solutions/resilience/coro-resilience-dashboard.webp',
      primaryCta: 'Request a demo',
      secondaryCta: 'Access the portal',
      proofTitle: 'A platform that knows who is there and what they can do',
      proofIntro: 'Most tools manage either documents or incidents. CORO manages both — and connects them through the real-time presence of the emergency team in the building.',
      highlights: [
        { number: '01', title: 'Real presence', text: 'QR code + PIN — who is in the building right now, to the second.' },
        { number: '02', title: 'CORO Index', text: '4 weighted components: roles, qualifications, plans, drills.' },
        { number: '03', title: 'Incident Module', text: 'Automatic coordinator procedure, mobilization, log, reports.' },
        { number: '04', title: 'REX Loop', text: 'Post-incident → recommendations → improved ERP → new approved version.' },
      ],
      sentinelle: {
        kicker: 'Foundation — CORO Sentinel',
        title: 'Knowing who is present is the first condition of any resilience',
        text: 'CORO Sentinel establishes in real time the exact list of occupants in the building through QR code and PIN check-in. This data immediately feeds the calculation of actual response capacity — not the one written on a theoretical org chart.',
        bullets: [
          '5-second check-in — kiosk QR code + personal PIN',
          'Automatic entry / exit detection',
          'Employees, visitors and contractors',
          'Offline mode — sync on connection return',
          '12-month retention (Law 25) · Evacuations 36 months (ISO 22301)',
          'Evacuation PDF report compliant with NFPA 2020',
        ],
        image: '/images/solutions/resilience/coro-sentinelle-kiosk.webp',
        alt: 'CORO Sentinel kiosk — QR and PIN check-in',
      },
      readiness: {
        kicker: 'CORO Resilience Index',
        title: 'A weighted score that answers one simple question: are we actually ready right now?',
        text: 'The CORO operational resilience index calculates in real time the building\'s actual response capacity — not its theoretical capacity. It combines four weighted components and updates automatically with every check-in or check-out.',
        components: [
          { label: 'Role coverage', weight: '40 %', desc: 'Coordinator, FRT, first aiders, PNA escorts — present or absent?' },
          { label: 'Qualifications', weight: '20 %', desc: 'CPR/AED, extinguisher, FRT, hazmat — who can actually act?' },
          { label: 'Approved plans', weight: '25 %', desc: 'ERP or FSP validated and current in CORO.' },
          { label: 'Drills (NFPA 2020)', weight: '15 %', desc: 'Last evacuation drill < 12 months.' },
        ],
        image: '/images/solutions/resilience/coro-resilience-index.webp',
        alt: 'CORO operational resilience index — real-time dashboard',
      },
      substitution: {
        kicker: 'Dynamic emergency organization',
        title: 'The lead coordinator leaves the building. The alternate automatically takes over.',
        text: 'Each emergency team member is configured with their role, type (primary or alternate) and priority. As soon as a check-out changes the team composition, CORO immediately recalculates the effective operational structure — with no manual intervention.',
        bullets: [
          'Roles: Coordinator, FRT, Assembly Point Warden, Searcher, Exit Monitor, PNA Escort, First Aider',
          'Primaries and alternates (#1, #2) configured per role and building',
          'Automatic substitution visible in real time on the resilience dashboard',
          'Gap alert if no coordinator or first aider present (15-min CRON)',
          'Email notification to manager when critical gap is detected',
          'Qualifications per member: CPR/AED, extinguisher, FRT, HAZMAT',
        ],
        image: '/images/solutions/resilience/coro-organisation-urgence.webp',
        alt: 'CORO dynamic emergency organization — automatic role substitution',
      },
      incident: {
        kicker: 'Incident Module',
        title: 'Activation. Procedure. Mobilization. Report. In one platform.',
        text: 'When an incident occurs, CORO does not look through a theoretical list of 14 members. It queries Sentinel: who is physically present right now? The corresponding procedure immediately appears for the coordinator. Members receive simultaneous SMS and email with acknowledgement link. Occupants are notified according to the phase.',
        bullets: [
          '15 incident types mapped to CORO procedures (P001–P026)',
          'Coordinator checklist extracted automatically from the active procedure',
          'Simultaneous SMS + email — members mobilized in seconds',
          'Acknowledgement link — confirmation visible on coordinator screen',
          'Multiple simultaneous incidents supported',
          'Automatic timestamped chronological log',
          'Exercise mode — occupants not notified, [EXERCISE] prefix',
        ],
        image: '/images/solutions/resilience/coro-module-incident.webp',
        alt: 'CORO Incident Module — coordinator checklist and real-time mobilization',
      },
      report: {
        kicker: 'History & Reports',
        title: 'Every incident generates a compliant report ready for inspection',
        text: 'The complete history of all incidents is retained in CORO. Each incident produces a structured 7-section PDF report, numbered, timestamped, with the chronological log, procedure steps checked, team mobilized and lessons learned.',
        steps: ['Identification', 'Timeline', 'Occupants', 'Team mobilized', 'Procedure', 'Lessons learned', 'Signatures'],
        features: [
          { title: 'ISO 22301 compliant', text: '36-month retention. Report structured to business continuity management requirements.' },
          { title: 'NFPA 2020 compliant', text: 'Evacuation drills archived 24 months. Evacuation report with occupant count.' },
          { title: 'CCOHS compliant', text: 'Incidents with injuries retained 5 years. Root cause and corrective actions documented.' },
          { title: 'Lessons learned (REX)', text: 'What worked, areas for improvement, recommendations, corrective actions. Form integrated into the report.' },
          { title: 'One-click PDF export', text: 'Report generated on demand, ready to archive or submit for regulatory inspection.' },
        ],
        image: '/images/solutions/resilience/coro-rapport-incident.webp',
        alt: 'CORO incident report — 7 sections compliant with ISO 22301 / NFPA 2020 / CCOHS',
      },
      intel: {
        kicker: 'Organizational intelligence',
        title: 'CORO identifies gaps before an incident occurs',
        text: 'The organizational intelligence module continuously analyzes the 4 resilience index components and generates proactive recommendations ranked by criticality level — before any emergency occurs.',
        examples: [
          '🔴 No approved ERP for this building',
          '🔴 No evacuation drill on record',
          '🔴 No coordinator or alternate present',
          '🟠 Last drill more than 12 months ago (NFPA 2020)',
          '🟠 FRT: fewer than 50% of required members present',
          '🟠 ERP not updated in more than 18 months',
          '🔵 3 fire alert incidents in 90 days — abnormal recurrence',
          '🔵 REX corrective actions documented — verify implementation',
        ],
        image: '/images/solutions/resilience/coro-intelligence-organisationnelle.webp',
        alt: 'CORO organizational intelligence — proactive recommendations',
      },
      loop: {
        kicker: 'The complete loop',
        title: 'From plan to incident. From incident to improved plan.',
        text: 'CORO is the only platform that connects document production to field operations — and closes the loop through lessons learned. Every incident improves the plan. Every plan improves resilience.',
        steps: ['Approved ERP in CORO', 'Sentinel — real presence', 'Resilience index', 'Incident activated', 'Procedure + Mobilization', 'Report + REX', 'Updated ERP + approved'],
      },
      faqTitle: 'Frequently asked questions',
      faq: [
        { q: 'How does CORO know who is in the building?', a: 'Through CORO Sentinel: each employee has a personal PIN and QR code. They scan the kiosk QR at entry and enter their PIN. The system records the time and updates the occupancy register in real time.' },
        { q: 'What happens if the coordinator leaves the building during the day?', a: 'CORO immediately detects the check-out and automatically activates the configured alternate. The Resilience page updates within seconds. If no alternate is available, a critical gap alert is generated.' },
        { q: 'Is SMS included in CORO?', a: 'Yes. SMS sending via Brevo is integrated. Each emergency team member who has provided explicit consent receives an SMS simultaneously with the email when an incident is triggered.' },
        { q: 'Can we run a drill without notifying real occupants?', a: 'Yes. The built-in exercise mode sends emails and SMS prefixed with [EXERCISE] to the emergency team, but does not notify occupants. The generated report explicitly mentions exercise mode.' },
        { q: 'Is the PDF report actually compliant with NFPA 2020 and ISO 22301?', a: 'Yes. The 7-section structured report covers ISO 22301 traceability requirements (36 months), NFPA 2020 drill retention (24 months) and CCOHS documentation for incidents with injuries (5 years). It is generated in one click from the incident history.' },
        { q: 'Does the Incident Module work if multiple incidents occur simultaneously?', a: 'Yes. CORO supports multiple simultaneous incidents. Each incident has its own log, coordinator checklist and report — fully independent from one another.' },
      ],
      finalTitle: 'An emergency plan is only worth its value if the right people can execute it at the right time.',
      finalText: 'With CORO, you always know whether your building is operationally ready, who can respond right now, and how every incident improves your next response.',
    },
  };

  const d = content[lang];
  const currentUrl = lang === 'en' ? `${SITE_URL}/resilience-operationnelle?lang=en` : `${SITE_URL}/resilience-operationnelle`;

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: d.title, description: d.intro, url: currentUrl,
    inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA',
    isPartOf: { '@type': 'WebSite', name: 'CORO', url: SITE_URL },
    about: { '@type': 'SoftwareApplication', name: 'CORO', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Coro Solutions Inc.', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/coro-logo.png` } },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: lang === 'fr' ? 'Accueil' : 'Home', item: lang === 'en' ? `${SITE_URL}/?lang=en` : SITE_URL },
      { '@type': 'ListItem', position: 2, name: d.tag, item: currentUrl },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: d.faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  };

  return (
    <div className="res-page">
      <style>{`
        * { box-sizing: border-box; }
        .res-page { min-height: 100vh; background: #f7f9fb; color: #243746; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .res-container { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
        .res-nav { background: #2c3e50; padding: 0 24px; }
        .res-nav-inner { max-width: 1200px; height: 64px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
        .res-logo { color: white; font-weight: 900; font-size: 24px; letter-spacing: -1px; text-decoration: none; }
        .res-logo span { color: #c0392b; }
        .res-nav-links { display: flex; gap: 16px; align-items: center; }
        .res-nav-link { color: rgba(255,255,255,.72); font-size: 14px; text-decoration: none; }
        .res-lang { border: 1px solid rgba(255,255,255,.2); border-radius: 6px; padding: 5px 10px; font-size: 13px; }
        .res-breadcrumb { padding: 12px 24px; background: white; border-bottom: 1px solid #e9ecef; }
        .res-breadcrumb p { max-width: 1180px; margin: 0 auto; font-size: 13px; color: #adb5bd; }
        .res-breadcrumb a { color: #adb5bd; text-decoration: none; }
        .res-hero { position: relative; overflow: hidden; padding: 88px 0 92px; background: radial-gradient(circle at 85% 15%, rgba(192,57,43,.18), transparent 28%), linear-gradient(135deg, #1a0a09 0%, #2c1210 40%, #1a2530 100%); }
        .res-hero-grid { display: grid; grid-template-columns: .92fr 1.08fr; gap: 56px; align-items: center; }
        .res-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; margin-bottom: 22px; border: 1px solid rgba(192,57,43,.4); border-radius: 999px; color: #f5c6c0; background: rgba(192,57,43,.15); text-transform: uppercase; letter-spacing: .1em; font-size: 11px; font-weight: 800; }
        .res-hero h1 { margin: 0 0 22px; max-width: 680px; font-size: clamp(36px, 4.5vw, 55px); line-height: 1.06; letter-spacing: -.04em; color: white; font-weight: 900; }
        .res-hero p { margin: 0 0 32px; max-width: 640px; color: rgba(255,255,255,.8); font-size: 17px; line-height: 1.75; }
        .res-actions { display: flex; flex-wrap: wrap; gap: 14px; }
        .res-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; padding: 0 25px; border-radius: 9px; font-size: 15px; font-weight: 750; text-decoration: none; transition: transform .2s ease, box-shadow .2s ease; }
        .res-btn:hover { transform: translateY(-2px); }
        .res-btn-primary { background: #c0392b; color: white; box-shadow: 0 10px 30px rgba(192,57,43,.28); }
        .res-btn-outline { color: white; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.04); }
        .res-hero-media .res-browser { overflow: hidden; border-radius: 15px; border: 1px solid rgba(255,255,255,.14); background: white; box-shadow: 0 30px 80px rgba(0,0,0,.4); }
        .res-browser-bar { height: 32px; display: flex; align-items: center; gap: 6px; padding: 0 12px; background: #eef2f5; border-bottom: 1px solid #e4e8eb; }
        .res-browser-bar span { width: 7px; height: 7px; border-radius: 50%; background: #bcc6cc; }
        .res-browser img { display: block; width: 100%; height: auto; }
        .res-proof { padding: 76px 0 68px; background: white; }
        .res-center { max-width: 820px; margin: 0 auto; text-align: center; margin-bottom: 44px; }
        .res-kicker { display: inline-block; margin-bottom: 10px; color: #c0392b; font-size: 12px; font-weight: 850; text-transform: uppercase; letter-spacing: .11em; }
        .res-center h2, .res-copy h2 { margin: 0 0 16px; color: #22394a; font-weight: 900; letter-spacing: -.025em; }
        .res-center h2 { font-size: clamp(26px, 3vw, 38px); }
        .res-center p, .res-copy > p { color: #667984; font-size: 16px; line-height: 1.75; }
        .res-highlights { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .res-highlight { padding: 26px; border: 1px solid #e5eaed; border-radius: 14px; background: #fbfcfd; }
        .res-highlight-num { display: block; margin-bottom: 18px; color: #bfc9cf; font-size: 13px; font-weight: 800; }
        .res-highlight h3 { margin: 0 0 8px; color: #263f50; font-size: 17px; }
        .res-highlight p { margin: 0; color: #73838d; font-size: 14px; line-height: 1.6; }
        .res-section { padding: 92px 0; }
        .res-white { background: white; }
        .res-soft { background: #f7f9fb; }
        .res-dark { color: white; background: linear-gradient(135deg, #0d2338, #174463); }
        .res-dark2 { color: white; background: linear-gradient(135deg, #1a0a09, #2c1a10); }
        .res-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 64px; align-items: center; }
        .res-grid-rev { display: grid; grid-template-columns: 1.1fr .9fr; gap: 64px; align-items: center; }
        .res-copy h2 { font-size: clamp(26px, 3vw, 38px); line-height: 1.12; }
        .res-dark .res-copy h2, .res-dark2 .res-copy h2 { color: white; }
        .res-dark .res-copy > p, .res-dark2 .res-copy > p { color: rgba(255,255,255,.8); }
        .res-list { margin: 24px 0 0; padding: 0; list-style: none; display: grid; gap: 10px; }
        .res-list li { position: relative; padding-left: 26px; color: #405965; font-size: 15px; line-height: 1.55; }
        .res-list li::before { content: "✓"; position: absolute; left: 0; top: 0; color: #2dad71; font-weight: 900; }
        .res-dark .res-list li, .res-dark2 .res-list li { color: rgba(255,255,255,.85); }
        .res-shot { display: block; width: 100%; border-radius: 16px; border: 1px solid #e1e7eb; box-shadow: 0 24px 60px rgba(28,45,58,.12); }
        .res-dark .res-shot, .res-dark2 .res-shot { border-color: rgba(255,255,255,.12); box-shadow: 0 30px 70px rgba(0,0,0,.3); }
        .res-components { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 28px; }
        .res-component { padding: 18px 20px; border-radius: 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); }
        .res-component-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .res-component-label { font-size: 14px; font-weight: 800; color: white; }
        .res-component-weight { font-size: 13px; font-weight: 700; color: #C0392B; background: rgba(192,57,43,.2); padding: 2px 8px; border-radius: 4px; }
        .res-component p { margin: 0; font-size: 13px; color: rgba(255,255,255,.65); line-height: 1.5; }
        .res-loop { padding: 80px 0; background: #0f283d; text-align: center; }
        .res-loop h2 { font-size: clamp(26px, 3vw, 38px); color: white; font-weight: 900; margin: 0 0 14px; letter-spacing: -.02em; }
        .res-loop > div > p { color: rgba(255,255,255,.7); font-size: 16px; line-height: 1.7; max-width: 700px; margin: 0 auto 40px; }
        .res-loop-steps { display: flex; flex-wrap: wrap; justify-content: center; gap: 0; margin-bottom: 8px; }
        .res-loop-step { position: relative; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 14px 18px; color: rgba(255,255,255,.9); font-size: 14px; font-weight: 600; white-space: nowrap; }
        .res-loop-arrow { display: flex; align-items: center; color: #c0392b; font-size: 20px; padding: 0 6px; font-weight: 900; }
        .res-cycle { padding: 96px 0; background: white; }
        .res-cycle-steps { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 36px 0 46px; }
        .res-cycle-step { position: relative; padding: 14px 10px; border-radius: 10px; border: 1px solid #dce7e1; background: #f7fbf9; text-align: center; color: #335348; font-size: 12px; font-weight: 750; }
        .res-cycle-step:not(:last-child)::after { content: "→"; position: absolute; right: -8px; top: 50%; z-index: 2; transform: translate(50%, -50%); color: #a8b6ae; font-size: 14px; }
        .res-cycle-layout { display: grid; grid-template-columns: 1.2fr .8fr; gap: 48px; align-items: start; }
        .res-cycle-cards { display: grid; gap: 12px; }
        .res-cycle-card { padding: 20px 22px; border: 1px solid #e5eaed; border-radius: 12px; background: #fbfcfd; }
        .res-cycle-card h3 { margin: 0 0 6px; color: #283f50; font-size: 15px; }
        .res-cycle-card p { margin: 0; color: #6b7d87; font-size: 13px; line-height: 1.6; }
        .res-intel-examples { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 28px; }
        .res-intel-item { padding: 12px 14px; border-radius: 9px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.85); font-size: 14px; line-height: 1.5; }
        .res-faq { padding: 90px 0; background: #f7f9fb; }
        .res-faq-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 1000px; margin: 0 auto; }
        .res-faq-item { padding: 26px; border-radius: 13px; border: 1px solid #e4e9ec; background: white; }
        .res-faq-item h3 { margin: 0 0 10px; color: #293f4f; font-size: 16px; }
        .res-faq-item p { margin: 0; color: #6d7e88; font-size: 14px; line-height: 1.7; }
        .res-final { padding: 88px 0; text-align: center; background: linear-gradient(135deg, #1a0a09 0%, #2c1210 50%, #0f283d 100%); }
        .res-final h2 { max-width: 780px; margin: 0 auto 18px; color: white; font-size: clamp(28px, 4vw, 44px); line-height: 1.1; letter-spacing: -.03em; font-weight: 900; }
        .res-final p { max-width: 680px; margin: 0 auto 30px; color: rgba(255,255,255,.75); font-size: 16px; line-height: 1.75; }
        .res-footer { padding: 25px 24px; background: #0a1d2c; color: #8ea4b2; font-size: 12px; text-align: center; }
        @media (max-width: 980px) {
          .res-hero-grid, .res-grid, .res-grid-rev, .res-cycle-layout { grid-template-columns: 1fr; }
          .res-highlights, .res-components, .res-intel-examples { grid-template-columns: repeat(2, 1fr); }
          .res-cycle-steps { grid-template-columns: repeat(3, 1fr); }
          .res-loop-steps { flex-direction: column; align-items: center; }
          .res-loop-arrow { transform: rotate(90deg); }
        }
        @media (max-width: 700px) {
          .res-container { width: min(100% - 30px, 1180px); }
          .res-hero { padding: 62px 0 66px; }
          .res-hero h1 { font-size: 34px; }
          .res-section, .res-cycle, .res-faq { padding: 68px 0; }
          .res-highlights, .res-faq-grid, .res-components, .res-intel-examples { grid-template-columns: 1fr; }
          .res-cycle-steps { grid-template-columns: 1fr; }
          .res-cycle-step:not(:last-child)::after { content: "↓"; right: auto; top: auto; left: 50%; bottom: -14px; transform: translateX(-50%); }
          .res-btn { width: 100%; }
        }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />

      {/* NAV */}
      <nav className="res-nav">
        <div className="res-nav-inner">
          <a href={lang === 'en' ? '/?lang=en' : '/'} className="res-logo">CO<span>RO</span></a>
          <div className="res-nav-links">
            <a href={lang === 'en' ? '/?lang=en' : '/'} className="res-nav-link">{lang === 'fr' ? '← Accueil' : '← Home'}</a>
            <a href={lang === 'fr' ? '/resilience-operationnelle?lang=en' : '/resilience-operationnelle'} className="res-nav-link res-lang">{lang === 'fr' ? 'EN' : 'FR'}</a>
          </div>
        </div>
      </nav>

      {/* BREADCRUMB */}
      <div className="res-breadcrumb">
        <p><a href={lang === 'en' ? '/?lang=en' : '/'}>getcoro.io</a>{' / '}<span>{d.tag}</span></p>
      </div>

      {/* HERO */}
      <section className="res-hero">
        <div className="res-container res-hero-grid">
          <div>
            <span className="res-eyebrow">🛡️ {d.heroEyebrow}</span>
            <h1>{d.title}</h1>
            <p>{d.intro}</p>
            <div className="res-actions">
              <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'} className="res-btn res-btn-primary">{d.primaryCta} →</a>
              <a href="https://client.getcoro.io/login" className="res-btn res-btn-outline">{d.secondaryCta} →</a>
            </div>
          </div>
          <div className="res-hero-media">
            <div className="res-browser">
              <div className="res-browser-bar"><span /><span /><span /></div>
              <img src={d.heroImage} alt={lang === 'fr' ? 'Tableau de résilience opérationnelle CORO' : 'CORO operational resilience dashboard'} />
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="res-proof">
        <div className="res-container">
          <div className="res-center">
            <span className="res-kicker">{d.tag}</span>
            <h2>{d.proofTitle}</h2>
            <p>{d.proofIntro}</p>
          </div>
          <div className="res-highlights">
            {d.highlights.map(item => (
              <div className="res-highlight" key={item.number}>
                <span className="res-highlight-num">{item.number}</span>
                <h3>{item.title}</h3><p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SENTINELLE */}
      <section className="res-section res-soft">
        <div className="res-container res-grid">
          <div className="res-copy">
            <span className="res-kicker">{d.sentinelle.kicker}</span>
            <h2>{d.sentinelle.title}</h2>
            <p>{d.sentinelle.text}</p>
            <ul className="res-list">{d.sentinelle.bullets.map(b => <li key={b}>{b}</li>)}</ul>
          </div>
          <div><img className="res-shot" src={d.sentinelle.image} alt={d.sentinelle.alt} loading="lazy" /></div>
        </div>
      </section>

      {/* INDICE DE RÉSILIENCE */}
      <section className="res-section res-dark">
        <div className="res-container res-grid-rev">
          <div><img className="res-shot" src={d.readiness.image} alt={d.readiness.alt} loading="lazy" /></div>
          <div className="res-copy">
            <span className="res-kicker">{d.readiness.kicker}</span>
            <h2>{d.readiness.title}</h2>
            <p>{d.readiness.text}</p>
            <div className="res-components">
              {d.readiness.components.map(c => (
                <div className="res-component" key={c.label}>
                  <div className="res-component-header">
                    <span className="res-component-label">{c.label}</span>
                    <span className="res-component-weight">{c.weight}</span>
                  </div>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SUBSTITUTION */}
      <section className="res-section res-white">
        <div className="res-container res-grid">
          <div className="res-copy">
            <span className="res-kicker">{d.substitution.kicker}</span>
            <h2>{d.substitution.title}</h2>
            <p>{d.substitution.text}</p>
            <ul className="res-list">{d.substitution.bullets.map(b => <li key={b}>{b}</li>)}</ul>
          </div>
          <div><img className="res-shot" src={d.substitution.image} alt={d.substitution.alt} loading="lazy" /></div>
        </div>
      </section>

      {/* MODULE INCIDENT */}
      <section className="res-section res-dark2">
        <div className="res-container res-grid-rev">
          <div><img className="res-shot" src={d.incident.image} alt={d.incident.alt} loading="lazy" /></div>
          <div className="res-copy">
            <span className="res-kicker">{d.incident.kicker}</span>
            <h2>{d.incident.title}</h2>
            <p>{d.incident.text}</p>
            <ul className="res-list">{d.incident.bullets.map(b => <li key={b}>{b}</li>)}</ul>
          </div>
        </div>
      </section>

      {/* RAPPORT */}
      <section className="res-cycle">
        <div className="res-container">
          <div className="res-center">
            <span className="res-kicker">{d.report.kicker}</span>
            <h2>{d.report.title}</h2>
            <p>{d.report.text}</p>
          </div>
          <div className="res-cycle-steps">
            {d.report.steps.map(s => <div className="res-cycle-step" key={s}>{s}</div>)}
          </div>
          <div className="res-cycle-layout">
            <div><img className="res-shot" src={d.report.image} alt={d.report.alt} loading="lazy" /></div>
            <div className="res-cycle-cards">
              {d.report.features.map(f => (
                <div className="res-cycle-card" key={f.title}><h3>{f.title}</h3><p>{f.text}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INTELLIGENCE */}
      <section className="res-section res-dark">
        <div className="res-container res-grid">
          <div className="res-copy">
            <span className="res-kicker">{d.intel.kicker}</span>
            <h2>{d.intel.title}</h2>
            <p>{d.intel.text}</p>
            <div className="res-intel-examples">
              {d.intel.examples.map(e => <div className="res-intel-item" key={e}>{e}</div>)}
            </div>
          </div>
          <div><img className="res-shot" src={d.intel.image} alt={d.intel.alt} loading="lazy" /></div>
        </div>
      </section>

      {/* BOUCLE COMPLÈTE */}
      <section className="res-loop">
        <div className="res-container">
          <span className="res-kicker" style={{ color: '#c0392b', background: 'rgba(192,57,43,.15)', padding: '6px 14px', borderRadius: 99 }}>{d.loop.kicker}</span>
          <h2 style={{ marginTop: 12 }}>{d.loop.title}</h2>
          <p>{d.loop.text}</p>
          <div className="res-loop-steps">
            {d.loop.steps.map((s, i) => (
              <>
                <div className="res-loop-step" key={s}>{s}</div>
                {i < d.loop.steps.length - 1 && <div className="res-loop-arrow" key={`arrow-${i}`}>→</div>}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="res-faq">
        <div className="res-container">
          <div className="res-center">
            <span className="res-kicker">FAQ</span>
            <h2>{d.faqTitle}</h2>
          </div>
          <div className="res-faq-grid">
            {d.faq.map(item => (
              <div className="res-faq-item" key={item.q}><h3>{item.q}</h3><p>{item.a}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL */}
      <section className="res-final">
        <div className="res-container">
          <h2>{d.finalTitle}</h2>
          <p>{d.finalText}</p>
          <div className="res-actions" style={{ justifyContent: 'center' }}>
            <a href={lang === 'fr' ? '/#demo' : '/?lang=en#demo'} className="res-btn res-btn-primary">{d.primaryCta} →</a>
            <a href="https://client.getcoro.io/login" className="res-btn res-btn-outline">{d.secondaryCta} →</a>
          </div>
        </div>
      </section>

      <div className="res-footer">
        © 2026 CORO — {lang === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'} · NEQ 2282543935
      </div>
    </div>
  );
}