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
import { localeFromSearchParams, localizedHref, resolveAvailableLocale } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/**
 * /sentinelle (MIG-03B) — CORO Sentinelle: who is in the building, and who is not yet confirmed after an evacuation.
 * LANGUAGE: FR ONLY. The V1 page was French; ?lang=en only translated the nav link and the pricing block (a partial translation).
 * The page therefore always renders French: canonical FR even with ?lang=en, hreflang fr-CA + x-default only, og:locale fr_CA, lang="fr".
 * PRODUCT TRUTH (audited in coro-backend/src/occupancy and coro-client-portal): check-in / check-out with timestamps (employees, visitors, contractors),
 * personal 4-digit PIN for employees on the kiosk QR page, a short form for visitors and contractors, visitor invitations, the occupancy register
 * with counts by type, evacuation events with an accounted-for / not-yet-confirmed status per person, an evacuation history and PDF report,
 * and "trigger an incident" from the register. NO geolocation code exists in the presence, kiosk, registry or evacuation pages.
 * NOT claimed: registry search and filtering (only the kiosk exit lookup exists), "other occupant categories" (the type is a fixed enum),
 * multi-site occupancy view, real-time wording, ISO / CNPI / CNESST / NFPA / CCOHS compliance, Loi 25 compliance, a retention period,
 * alarm-panel automation, the intervention QR, population alerting (Sentinelle Population is a separate product, MIG-03C), pricing.
 * The V1 pricing block (three plans with prices and unverified claims) is removed and recorded, not migrated.
 * NO PRODUCT SCREENSHOT: every V1 Sentinelle image is a generated marketing scene with invented interfaces, and the only real registry
 * capture is outdated and shows a kiosk token. Body photographs are approved V2 MARKETING ILLUSTRATIONS (decorative). RECAPTURE REQUIRED BEFORE GO-LIVE.
 */
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
  entryLabel: 'Entrée', entryTitle: 'Un QR code à l’entrée. Un PIN pour s’identifier.',
  entrySteps: [
    { n: 'Étape 01', title: 'Un QR code à l’entrée du bâtiment', text: 'Une borne ou une signalisation Sentinelle permet à l’utilisateur de démarrer son enregistrement depuis son propre téléphone.', items: ['Aucune application à installer pour l’utilisateur', 'Accès rapide depuis un téléphone intelligent'] },
    { n: 'Étape 02', title: 'Identification rapide', text: 'Après avoir scanné le QR code, l’employé saisit son PIN personnel à 4 chiffres; les visiteurs et contracteurs s’enregistrent au moyen d’un court formulaire.', items: ['Interface mobile simplifiée', 'Arrivée et départ enregistrés avec l’heure'] },
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

const LOGIN = 'https://client.getcoro.io/login';

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const requested = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/sentinelle', locale: requested, hasEnglish: false, title: copy.metaTitle, description: copy.description, image: '/images/sentinelle/coro-sentinelle-registre-presence.webp' });
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}

export default async function Page({ searchParams }: P) {
  const l = resolveAvailableLocale(localeFromSearchParams((await searchParams) ?? {}), false);
  const demo = localizedHref('/#demo', l);
  return (
    <V2Shell locale={l} pathname="/sentinelle" englishAvailable={false}>
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
          <ul className={styles.articles}>{copy.articles.map((a) => <li key={a.slug}><a href={`/blog/${a.slug}`}>{a.title}<span aria-hidden="true"> →</span></a></li>)}</ul>
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
