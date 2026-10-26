import type { Metadata } from 'next';
import { CTASection } from '@/components/conversion/CTASection';
import { Accordion } from '@/components/page/Accordion';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
import { MediaFrame } from '@/components/page/MediaFrame';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { V2Shell } from '@/components/site/V2Shell';
import { Button } from '@/components/ui/Button';
import { faqJsonLd } from '@/lib/site/json-ld';
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/** Occupancy is declared by users. Translations describe the same scoped capabilities. */
const copy = {
  metaTitle: 'Registre d’occupation et décompte des occupants en évacuation',
  description: 'CORO Sentinelle tient un registre numérique des occupants d’un bâtiment et soutient le décompte lors d’une évacuation, du pointage à l’entrée jusqu’au point de rassemblement.',
  label: 'CORO Sentinelle',
  lines: ['Sachez qui est présent.', 'Sachez qui manque.'],
  lead: 'CORO Sentinelle est un registre numérique de présence conçu pour les bâtiments et les organisations. Employés, visiteurs et contracteurs s’enregistrent à leur arrivée afin de fournir aux responsables une information utile lorsque chaque minute compte.',
  demo: 'Demander une démonstration', how: 'Voir comment ça fonctionne', access: 'Accéder à CORO Client',
  problemLabel: 'Présence et sécurité', problemTitle: 'Un registre de présence pensé pour les situations réelles.',
  problemText: 'Dans de nombreux bâtiments, savoir qui est entré ne suffit pas. Lorsqu’une alarme survient, la véritable question devient : qui était présent et qui n’est pas encore confirmé?',
  statement: 'Le registre quotidien devient une information opérationnelle en situation d’urgence.',
  principlesLabel: 'Une logique simple', principlesTitle: 'De l’arrivée à l’évacuation.',
  principlesLead: 'Sentinelle relie le contrôle quotidien des présences aux besoins opérationnels d’une organisation lorsqu’une situation d’urgence survient.',
  principles: [
    { title: 'S’enregistrer', text: 'La personne scanne le QR code de l’établissement, s’identifie depuis son téléphone et confirme sa présence.' },
    { title: 'Connaître les présences', text: 'Les personnes actuellement enregistrées peuvent être consultées dans une interface centralisée par les utilisateurs autorisés.' },
    { title: 'Faciliter le décompte', text: 'Lors d’une évacuation, cette information contribue au recensement des occupants et au suivi des personnes qui n’ont pas encore été confirmées.' },
  ],
  entryLabel: 'Entrée', entryTitle: 'Un QR temporaire. Plusieurs arrivées en parallèle.',
  entrySteps: [
    { n: 'Étape 01', title: 'Un QR code à l’entrée du bâtiment', text: 'Le QR est renouvelé toutes les 30 secondes sur les écrans Sentinelle. Plusieurs personnes peuvent le scanner et s’enregistrer simultanément depuis leur téléphone, à plusieurs entrées du même bâtiment.', items: ['Aucune application à installer pour l’utilisateur', 'Une identification commencée avec un QR valide peut se terminer pendant une courte fenêtre, même si le QR change'] },
    { n: 'Étape 02', title: 'Identification rapide', text: 'L’employé s’identifie avec son PIN personnel ou choisit la reconnaissance de son téléphone personnel pour les passages suivants. Il vérifie son identité et confirme explicitement son arrivée ou son départ. Les visiteurs et contracteurs utilisent le parcours prévu pour leur catégorie.', items: ['Reconnaissance facultative, révocable et limitée dans le temps', 'Sur appareil partagé : aucune reconnaissance persistante et aucune identité laissée après confirmation'] },
  ],
  registerLabel: 'Registre d’occupation', registerTitle: 'Une vision actualisée des personnes présentes.',
  registerText: 'Les responsables autorisés peuvent consulter les informations nécessaires pour connaître les personnes actuellement enregistrées dans l’établissement.',
  registerTypes: [{ name: 'Employés', text: 'Personnel régulier et utilisateurs du bâtiment.' }, { name: 'Visiteurs', text: 'Clients, invités et visiteurs ponctuels.' }, { name: 'Contracteurs', text: 'Travailleurs externes et fournisseurs.' }],
  registerNote: 'Présences consultables depuis une interface centralisée.',
  evacLabel: 'Lorsqu’une urgence survient', evacTitle: 'Le registre prend une nouvelle valeur.',
  evacText: 'Pendant une évacuation, il ne suffit plus de savoir combien de personnes se trouvaient dans le bâtiment. Les responsables doivent pouvoir déterminer quelles personnes ont été recensées et lesquelles nécessitent encore une vérification.',
  evacItems: ['Appuyer le décompte des occupants', 'Faciliter le travail des responsables d’évacuation', 'Identifier les personnes non encore confirmées', 'Centraliser l’information disponible'],
  seqLabel: 'Du bâtiment au point de rassemblement', seqTitle: 'Une continuité de l’information.',
  seq: [
    { k: '01 — Avant', title: 'Présence', text: 'L’organisation dispose d’une liste des personnes enregistrées comme présentes.' },
    { k: '02 — Alarme', title: 'Évacuation', text: 'Les occupants quittent le bâtiment conformément aux procédures de l’établissement.' },
    { k: '03 — Extérieur', title: 'Décompte', text: 'Les responsables effectuent le recensement au point de rassemblement.' },
    { k: '04 — Analyse', title: 'Vérification', text: 'Les informations recueillies permettent de déterminer quelles personnes n’ont pas encore été confirmées.' },
  ],
  assemblyLabel: 'Point de rassemblement', assemblyTitle: 'Passer de « combien? » à « qui? ».',
  assemblyText: ['Le point de rassemblement constitue l’un des moments les plus importants du processus d’évacuation. CORO Sentinelle permet de soutenir les responsables qui doivent établir une situation aussi claire que possible après la sortie des occupants.', 'Sentinelle contribue à établir une information nominative permettant de comparer les personnes enregistrées comme présentes avec celles qui ont effectivement été recensées.', 'Une personne non confirmée est une personne dont la présence n’a pas encore été confirmée lors du recensement. Sentinelle enregistre les entrées, les sorties et les statuts opérationnels déclarés; le registre d’occupation n’assure pas la géolocalisation continue des personnes.'],
  boundaryLabel: 'Ce que Sentinelle est, et n’est pas', boundaryTitle: 'Un registre d’occupation, pas un système de suivi.',
  boundaryItems: ['Enregistre l’arrivée et le départ déclarés à l’entrée', 'N’assure pas la géolocalisation continue des personnes', 'N’est ni un contrôle d’accès physique ni un outil de surveillance des employés', 'Registre consultable par les utilisateurs autorisés'],
  usesLabel: 'Cas d’utilisation', usesTitle: 'Une solution adaptée à différents environnements.',
  uses: [
    { kicker: 'Immeubles', name: 'Tours de bureaux', text: 'Gestion quotidienne des présences et soutien aux procédures d’évacuation du bâtiment.' },
    { kicker: 'Industrie', name: 'Sites industriels', text: 'Identification des employés, contracteurs et fournisseurs présents sur le site.' },
    { kicker: 'Institutions', name: 'Organisations multi-usagers', text: 'Une approche structurée de la présence adaptée aux réalités opérationnelles de l’organisation.' },
    { kicker: 'Portefeuilles', name: 'Portefeuilles immobiliers', text: 'Une logique commune pour plusieurs bâtiments ou établissements.' },
  ],
  ecoLabel: 'Plus qu’un registre', ecoTitle: 'Sentinelle s’inscrit dans l’écosystème CORO.',
  ecoLead: 'CORO est conçu pour aider les organisations et les professionnels à structurer leur préparation, leur documentation et leurs outils liés aux mesures d’urgence et à la continuité des activités.',
  ecoStatement: 'Sentinelle ajoute une dimension essentielle : connecter la planification à la réalité du terrain.',
  platform: 'Cette partie de la plateforme', explore: 'Explorer',
  products: [
    { name: 'Résilience opérationnelle', text: 'La présence alimente l’indice de résilience et l’organisation d’urgence. Depuis le registre, un incident peut être déclenché.', href: '/resilience-operationnelle' },
    { name: 'Documents', text: 'Structure les données et les livrables.', href: '/gestion-documentaire' },
    { name: 'Client', text: 'Rend l’information accessible au client.', href: '/portail-client' },
  ],
  resLabel: 'Ressources', resTitle: 'Approfondir la gestion des présences et de l’évacuation.', read: 'Lire l’article',
  articles: [
    { slug: 'comment-faire-decompte-occupants-evacuation', title: 'Décompte des occupants lors d’une évacuation' },
    { slug: 'registre-occupation-batiment-situation-urgence', title: 'Registre d’occupation d’un bâtiment : pourquoi est-il essentiel ?' },
    { slug: 'registre-papier-ou-numerique', title: 'Registre papier ou numérique pour vos occupants' },
    { slug: 'gerer-visiteurs-contracteurs-evacuation', title: 'Visiteurs et contracteurs en évacuation' },
    { slug: 'savoir-si-tout-le-monde-a-evacue-batiment', title: 'Comment vérifier qu’un bâtiment est évacué' },
    { slug: 'registre-occupation-evacuation-informations-a-recueillir', title: 'Registre d’occupation : quelles données recueillir ?' },
    { slug: 'qr-code-registre-visiteurs-enregistrement-batiment', title: 'Registre visiteurs par QR code : comment ça fonctionne ?' },
    { slug: 'controle-acces-vs-registre-occupation-difference', title: 'Contrôle d’accès vs registre d’occupation' },
  ],
  faq: 'FAQ', faqTitle: 'CORO Sentinelle en quelques réponses.',
  faqItems: [
    { q: 'Qu’est-ce qu’un registre numérique de présence?', a: 'Un registre numérique de présence permet d’enregistrer et de consulter les personnes présentes dans un bâtiment ou un établissement. Il peut notamment concerner les employés, visiteurs et contracteurs.' },
    { q: 'Comment CORO Sentinelle fonctionne-t-il?', a: 'L’utilisateur peut accéder à Sentinelle à partir d’un QR code placé à l’entrée du bâtiment. Il s’identifie ensuite au moyen de l’interface prévue par l’organisation afin d’enregistrer sa présence.' },
    { q: 'CORO Sentinelle peut-il être utilisé pendant une évacuation?', a: 'Oui. Le registre de présence peut soutenir le processus de recensement en permettant aux responsables de comparer les personnes enregistrées comme présentes avec celles qui ont été confirmées après l’évacuation.' },
    { q: 'Sentinelle remplace-t-il le plan de mesures d’urgence?', a: 'Non. Sentinelle est un outil opérationnel complémentaire. Il ne remplace ni le plan de mesures d’urgence ni les procédures d’évacuation de l’organisation.' },
    { q: 'Peut-on utiliser Sentinelle pour les visiteurs?', a: 'Oui. Sentinelle peut être utilisé pour différentes catégories d’occupants : employés, visiteurs et contracteurs.' },
    { q: 'Pourquoi connaître les personnes présentes lors d’une urgence?', a: 'Une liste de présence peut soutenir les responsables dans leurs opérations de recensement et contribuer à identifier les personnes dont la situation doit encore être vérifiée après une évacuation.' },
    { q: 'Sentinelle peut-il être utilisé dans plusieurs bâtiments?', a: 'L’approche Sentinelle est conçue pour pouvoir s’intégrer à des organisations possédant un ou plusieurs établissements selon leur configuration.' },
    { q: 'Une application doit-elle être installée sur le téléphone?', a: 'L’expérience d’enregistrement peut être accessible depuis le téléphone de l’utilisateur à partir du QR code, sans imposer une installation traditionnelle avant son arrivée.' },
  ],
  ctaStatement: 'Votre organisation sait-elle réellement qui est présent lorsqu’une urgence survient?',
  ctaSupport: 'Découvrez comment CORO Sentinelle peut intégrer la gestion des présences à votre organisation et soutenir vos procédures d’évacuation.',
} as const;

const english = {
  metaTitle: 'Occupancy register and evacuation accountability',
  description: 'CORO Sentinelle records declared building occupancy and supports evacuation accountability, from entry to the assembly point.',
  label: 'CORO Sentinelle', lines: ['Know who is present.', 'Know who is not yet accounted for.'],
  lead: 'CORO Sentinelle is a digital occupancy register for buildings and organizations. Employees, visitors and contractors check in on arrival, giving authorized staff useful information when every minute counts.',
  demo: 'Request a demonstration', how: 'See how it works', access: 'Access CORO Client',
  problemLabel: 'Presence and safety', problemTitle: 'An occupancy register built for real situations.',
  problemText: 'Knowing who entered a building is not enough. When an alarm occurs, the question becomes: who was registered as present, and who has not yet been accounted for?',
  statement: 'The daily register becomes operational information during an emergency.',
  principlesLabel: 'A simple approach', principlesTitle: 'From arrival to evacuation.',
  principlesLead: 'Sentinelle connects daily check-in with the information an organization needs during an emergency.',
  principles: [
    { title: 'Check in', text: 'People scan the building QR code, identify themselves on their phone and confirm their presence.' },
    { title: 'View registered occupants', text: 'Authorized users can consult the people currently registered as present in one interface.' },
    { title: 'Support accountability', text: 'During an evacuation, the register helps staff account for occupants and follow up on people not yet confirmed.' },
  ],
  entryLabel: 'Entry', entryTitle: 'A temporary QR code. Several arrivals in parallel.',
  entrySteps: [
    { n: 'Step 01', title: 'A QR code at the building entrance', text: 'The QR code refreshes every 30 seconds on Sentinelle displays. Several people can scan and check in simultaneously on their own phones, at multiple entrances to the same building.', items: ['No app installation required', 'A check-in started with a valid QR code can finish within a short window, even after the displayed code changes'] },
    { n: 'Step 02', title: 'Identify and confirm', text: 'Employees identify themselves with their personal PIN or opt to recognize their personal phone for later visits. They check their identity and explicitly confirm arrival or departure. Visitors and contractors use the flow for their category.', items: ['Optional phone recognition that expires and can be revoked', 'Shared devices: no persistent recognition and no identity left on screen after confirmation'] },
  ],
  registerLabel: 'Occupancy register', registerTitle: 'An updated view of registered occupants.',
  registerText: 'Authorized staff can consult the information needed to identify people currently registered as present in the building.',
  registerTypes: [{ name: 'Employees', text: 'Regular staff and building users.' }, { name: 'Visitors', text: 'Clients, guests and occasional visitors.' }, { name: 'Contractors', text: 'External workers and service providers.' }],
  registerNote: 'Registered presence can be viewed in a central interface.',
  evacLabel: 'When an emergency occurs', evacTitle: 'The register takes on a new role.',
  evacText: 'During an evacuation, a count alone is not enough. Staff need to know which people have been accounted for and which still require follow-up.',
  evacItems: ['Support occupant accountability', 'Help evacuation staff', 'Identify people not yet accounted for', 'Bring available information together'],
  seqLabel: 'From the building to the assembly point', seqTitle: 'Continuity of information.',
  seq: [
    { k: '01 — Before', title: 'Presence', text: 'The organization has a list of people registered as present.' },
    { k: '02 — Alarm', title: 'Evacuation', text: 'Occupants leave the building following its procedures.' },
    { k: '03 — Outside', title: 'Accountability', text: 'Staff account for occupants at the assembly point.' },
    { k: '04 — Review', title: 'Follow-up', text: 'The information collected identifies people not yet accounted for.' },
  ],
  assemblyLabel: 'Assembly point', assemblyTitle: 'Move from “how many?” to “who?”.',
  assemblyText: ['The assembly point is a key part of evacuation. CORO Sentinelle helps staff establish the clearest possible picture after occupants leave.', 'Sentinelle supports a named comparison between people registered as present and people accounted for.', 'A person not yet accounted for is someone whose status has not been confirmed during accountability. Sentinelle records declared arrivals, departures and operational statuses; the occupancy register does not continuously track people’s locations.'],
  boundaryLabel: 'What Sentinelle does', boundaryTitle: 'An occupancy register, not a tracking system.',
  boundaryItems: ['Records declared arrival and departure', 'Does not continuously geolocate people', 'Is neither a physical access control system nor an employee surveillance tool', 'The register is available to authorized users'],
  usesLabel: 'Use cases', usesTitle: 'Suited to different environments.',
  uses: [
    { kicker: 'Buildings', name: 'Office towers', text: 'Daily occupancy registration and support for building evacuation procedures.' },
    { kicker: 'Industry', name: 'Industrial sites', text: 'Identify employees, contractors and suppliers registered on site.' },
    { kicker: 'Institutions', name: 'Multi-user organizations', text: 'A structured occupancy approach adapted to the organization’s operations.' },
    { kicker: 'Portfolios', name: 'Property portfolios', text: 'A common approach across several buildings or facilities.' },
  ],
  ecoLabel: 'Beyond the register', ecoTitle: 'Sentinelle is part of CORO.',
  ecoLead: 'CORO helps organizations and professionals structure preparedness, documentation and tools for emergency management and business continuity.',
  ecoStatement: 'Sentinelle connects planning with declared presence on site.', platform: 'This part of the platform', explore: 'Explore',
  products: [
    { name: 'Operational resilience', text: 'Presence informs the resilience index and emergency organization. Authorized users can access incident functions from the register.', href: '/resilience-operationnelle' },
    { name: 'Documents', text: 'Structures information and deliverables.', href: '/gestion-documentaire' },
    { name: 'Client', text: 'Makes authorized information available to clients.', href: '/portail-client' },
  ],
  resLabel: 'Resources', resTitle: 'Learn about occupancy and evacuation.', read: 'Read the article',
  articles: [
    { slug: 'comment-faire-decompte-occupants-evacuation', title: 'Accounting for occupants during an evacuation' },
    { slug: 'registre-occupation-batiment-situation-urgence', title: 'Why a building occupancy register matters' },
    { slug: 'registre-papier-ou-numerique', title: 'Paper or digital occupancy registers' },
    { slug: 'gerer-visiteurs-contracteurs-evacuation', title: 'Visitors and contractors during evacuation' },
    { slug: 'savoir-si-tout-le-monde-a-evacue-batiment', title: 'How to check whether a building has been evacuated' },
    { slug: 'registre-occupation-evacuation-informations-a-recueillir', title: 'What information an occupancy register needs' },
    { slug: 'qr-code-registre-visiteurs-enregistrement-batiment', title: 'How QR visitor registration works' },
    { slug: 'controle-acces-vs-registre-occupation-difference', title: 'Access control and occupancy registers' },
  ],
  faq: 'FAQ', faqTitle: 'Questions about CORO Sentinelle.',
  faqItems: [
    { q: 'What is a digital occupancy register?', a: 'It records and displays people registered as present in a building, including employees, visitors and contractors.' },
    { q: 'How does CORO Sentinelle work?', a: 'People scan a rotating entrance QR code, identify themselves on their phone and confirm arrival or departure. Several people can use the flow at once.' },
    { q: 'Can Sentinelle support evacuation?', a: 'Yes. Authorized staff can compare people registered as present with those accounted for after evacuation.' },
    { q: 'Does Sentinelle replace an emergency plan?', a: 'No. It supports operations and does not replace the organization’s emergency plan or evacuation procedures.' },
    { q: 'Can visitors use Sentinelle?', a: 'Yes. The register supports employees, visitors and contractors.' },
    { q: 'Why record who is present?', a: 'The list helps staff account for occupants and identify people whose status still requires follow-up.' },
    { q: 'Can Sentinelle serve several buildings?', a: 'Yes, according to the organization’s configuration and access permissions.' },
    { q: 'Is an app installation required?', a: 'No. The registration flow opens on the person’s phone from the QR code. Personal phone recognition is optional and can be revoked.' },
  ],
  ctaStatement: 'Does your organization know who is registered as present when an emergency occurs?',
  ctaSupport: 'See how CORO Sentinelle can support occupancy registration and your evacuation procedures.',
} as const;
const translations = { fr: copy, en: english };

const LOGIN = 'https://client.getcoro.io/login';

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const requested = localeFromSearchParams((await searchParams) ?? {});
  const copy = translations[requested];
  return buildPageMetadata({ path: '/sentinelle', locale: requested, title: copy.metaTitle, description: copy.description, image: '/images/sentinelle/coro-sentinelle-registre-presence.webp' });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const copy = translations[l];
  const demo = localizedHref('/#demo', l);
  return (
    <V2Shell locale={l} pathname="/sentinelle">
      <JsonLd value={faqJsonLd(copy.faqItems.map((item) => ({ question: item.q, answer: item.a })))} />

      <EditorialHero id="sentinelle-title" label={copy.label} title={copy.lines} lead={copy.lead}
        photo={{ src: '/website-v2/sentinel/sentinelle-occupancy-security.webp', side: 'start', position: '4% 50%', mobilePosition: '10% 50%', coverage: 52, mobileRatio: '5 / 4' }}
        actions={<><Button href={demo} surface="dark">{copy.demo}</Button><Button href="#fonctionnement" variant="ghost" surface="dark">{copy.how}</Button></>} />

      <PageSection tone="white" labelledBy="sentinelle-problem-title">
        <SplitContent ratio="7-5" align="center"
          text={<EditorialBlock id="sentinelle-problem-title" label={copy.problemLabel} heading={copy.problemTitle}><p>{copy.problemText}</p></EditorialBlock>}
          media={<p className={styles.statement}>{copy.statement}</p>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="sentinelle-principles-title">
        <div className={styles.stack}>
          <EditorialBlock id="sentinelle-principles-title" label={copy.principlesLabel} heading={copy.principlesTitle}><p>{copy.principlesLead}</p></EditorialBlock>
          <ol className={styles.principles} aria-label={copy.principlesTitle}>{copy.principles.map((p) => <li key={p.title}><h3>{p.title}</h3><p>{p.text}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="white" id="fonctionnement" labelledBy="sentinelle-entry-title">
        <SplitContent order="media-text" ratio="4-8" align="start"
          media={<MediaFrame src="/website-v2/sentinel/building-lobby.webp" alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 720px, 100vw" />}
          text={<div className={styles.stack}>
            <EditorialBlock id="sentinelle-entry-title" label={copy.entryLabel} heading={copy.entryTitle} />
            <ol className={styles.steps}>{copy.entrySteps.map((s) => <li key={s.n}><p className={styles.kicker}>{s.n}</p><h3>{s.title}</h3><p>{s.text}</p><ul>{s.items.map((item) => <li key={item}>{item}</li>)}</ul></li>)}</ol>
          </div>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="sentinelle-register-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="sentinelle-register-title" label={copy.registerLabel} heading={copy.registerTitle}><p>{copy.registerText}</p></EditorialBlock>}
          media={<div className={styles.stack}><dl className={styles.types}>{copy.registerTypes.map((t) => <div key={t.name}><dt>{t.name}</dt><dd>{t.text}</dd></div>)}</dl><p className={styles.note}>{copy.registerNote}</p></div>} />
      </PageSection>

      <PageSection tone="white" labelledBy="sentinelle-evac-title">
        <SplitContent ratio="5-7" align="start"
          text={<div className={styles.stack}><EditorialBlock id="sentinelle-evac-title" label={copy.evacLabel} heading={copy.evacTitle}><p>{copy.evacText}</p></EditorialBlock><ul className={styles.plain}>{copy.evacItems.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          media={<MediaFrame src="/website-v2/sentinel/evacuation-stairs.webp" alt="" ratio={1513 / 1039} sizes="(min-width: 68rem) 720px, 100vw" />} />
      </PageSection>

      <PageSection tone="navy" labelledBy="sentinelle-seq-title">
        <div className={styles.stack}>
          <EditorialBlock id="sentinelle-seq-title" label={copy.seqLabel} heading={copy.seqTitle} />
          <ol className={styles.seq}>{copy.seq.map((s) => <li key={s.title}><p className={styles.kicker}>{s.k}</p><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="sentinelle-assembly-title">
        <SplitContent order="media-text" ratio="4-8" align="start"
          media={<MediaFrame src="/website-v2/sentinel/assembly-point.webp" alt="" ratio={1536 / 1024} sizes="(min-width: 68rem) 720px, 100vw" />}
          text={<EditorialBlock id="sentinelle-assembly-title" label={copy.assemblyLabel} heading={copy.assemblyTitle}>{copy.assemblyText.map((t) => <p key={t}>{t}</p>)}</EditorialBlock>} />
      </PageSection>

      <PageSection tone="white" labelledBy="sentinelle-boundary-title">
        <SplitContent ratio="5-7" align="start"
          text={<EditorialBlock id="sentinelle-boundary-title" label={copy.boundaryLabel} heading={copy.boundaryTitle} />}
          media={<ul className={styles.plain}>{copy.boundaryItems.map((item) => <li key={item}>{item}</li>)}</ul>} />
      </PageSection>

      <PageSection tone="soft" labelledBy="sentinelle-uses-title">
        <div className={styles.stack}>
          <EditorialBlock id="sentinelle-uses-title" label={copy.usesLabel} heading={copy.usesTitle} />
          <ul className={styles.uses}>{copy.uses.map((u) => <li key={u.name}><p className={styles.kicker}>{u.kicker}</p><h3>{u.name}</h3><p>{u.text}</p></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="sentinelle-eco-title">
        <div className={styles.stack}>
          <EditorialBlock id="sentinelle-eco-title" label={copy.ecoLabel} heading={copy.ecoTitle}><p>{copy.ecoLead}</p><p className={styles.lead}>{copy.ecoStatement}</p></EditorialBlock>
          <p className={styles.kicker}>{copy.platform}</p>
          <ul className={styles.connect}>
            {copy.products.map((c) => (
              <li key={c.name}><h3>{c.name}</h3><p>{c.text}</p><a href={localizedHref(c.href, l)} aria-label={`${copy.explore} ${c.name}`}>{copy.explore}<span aria-hidden="true"> →</span></a></li>
            ))}
          </ul>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="sentinelle-res-title">
        <div className={styles.stack}>
          <EditorialBlock id="sentinelle-res-title" label={copy.resLabel} heading={copy.resTitle} />
          <ul className={styles.articles}>{copy.articles.map((a) => <li key={a.slug}><a href={localizedHref(`/blog/${a.slug}`, l)}>{a.title}<span aria-hidden="true"> →</span></a></li>)}</ul>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="sentinelle-faq-title">
        <div className={styles.stack}>
          <EditorialBlock id="sentinelle-faq-title" label={copy.faq} heading={copy.faqTitle} />
          <Accordion label={copy.faqTitle} items={copy.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))} />
        </div>
      </PageSection>

      <CTASection id="sentinelle-cta-title" tone="dark" label={copy.label} statement={copy.ctaStatement} support={copy.ctaSupport} primary={{ label: copy.demo, href: demo }} secondary={{ label: copy.access, href: LOGIN }} />
    </V2Shell>
  );
}
