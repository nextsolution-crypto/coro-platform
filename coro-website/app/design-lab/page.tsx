import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { localeFromSearchParams, localizedHref, type Locale } from '@/lib/site/locale';
import { HeroStudyView, HeroSystemZone, heroStudyKeys, type HeroStudyKey } from './HeroSystemZone';
import { PageRhythmZone, RhythmView, rhythmStudyKeys, type RhythmStudyKey } from './RhythmStudies';
import { FlowView, FlowZone, flowViewKeys } from './FlowStudies';
import { OperationalView, OperationalZone, opsViewKeys } from './OperationalStudies';
import { SpatialView, SpatialZone } from './SpatialStudies';
import { SkipLink } from './SkipLink';
import './design-lab-global.css';
import styles from './design-lab.module.css';

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

/** Internal Website V2 laboratory: never indexed, never in the sitemap, never in public navigation. */
export const metadata: Metadata = {
  title: 'Design Lab — Website V2 (internal)',
  description: 'Internal CORO Website V2 design laboratory. Not a public page.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const copy = {
  fr: {
    eyebrow: 'CORO WEBSITE V2 · DESIGN LAB · LAB-06',
    title: 'Fondations et navigation.',
    lead: 'Laboratoire interne de validation du système visuel : jetons cibles, surfaces, typographie, focus, boutons et navigation. Ce n’est pas une page du site.',
    internal: 'Route interne — noindex, hors sitemap, hors navigation publique. Statut : DRAFT.',
    zones: 'Zones', z00: '00 — Fondations', z01: '01 — Navigation', z02: '02 — Héros', z03: '03 — Rythme', z04: '04 — Bâtiment', z05: '05 — Opérationnel', z06: '06 — Continuum',
    primary: 'Action principale', secondary: 'Action secondaire', ghost: 'Texte / discrète', disabled: 'Indisponible',
    palette: 'Palette cible', paletteText: 'Le marine porte l’identité, le bleu structure l’information, le rouge signale l’action. Le rouge n’est jamais une couleur de remplissage.',
    redTitle: 'Rouge : actuel contre cible', redText: 'Le rouge d’action CORO cible est #E51B2A. Les deux rouges de production restent inchangés dans ce lot.',
    redCurrent: 'Actuel — jetons de production', redModules: 'Actuel — modules produit (valeur en dur)', redTarget: 'Cible — rouge signal / action CORO',
    contrast: 'Contraste du texte blanc', contrastNote: 'Le rouge cible reste au-dessus de 4,5:1 avec du texte blanc, mais avec moins de marge que l’actuel. Le rouge en texte sur fond marine est à éviter en petit corps : utiliser le rouge clair.',
    surfaces: 'Surfaces et texte', light: 'Fondation claire', dark: 'Fondation sombre',
    heading: 'Titre principal', body: 'Texte courant, lisible et dense sans être compact. La hiérarchie vient de la taille, du poids et de l’espace.', secondaryText: 'Texte secondaire, métadonnées, libellés d’état.',
    typeTitle: 'Hiérarchie typographique', typeLong: 'Des bâtiments plus sûrs. Des organisations prêtes. Des communautés résilientes.',
    spaceTitle: 'Espacement', states: 'États sémantiques', statesText: 'Chaque état associe une icône, un libellé et une couleur : la couleur seule ne porte jamais l’information.',
    normal: 'Normal', attention: 'Attention', critical: 'Critique', info: 'Information',
    focusTitle: 'Focus visible', focusText: 'Parcourez ces éléments au clavier (Tab). L’anneau est bleu sur fond clair et bleu clair sur fond sombre.',
    ctaTitle: 'Boutons', ctaText: 'Survol, focus clavier, appui et état indisponible sont réels : essayez-les. Aucun état de chargement ici (lots ultérieurs).',
    navText: 'Le composant SiteHeader partagé, montré en contexte clair et sombre. Les fenêtres mobiles sont de vraies pages en cadre : elles utilisent leur propre largeur de fenêtre.',
    navLight: 'Contexte clair (en direct)', navDark: 'Contexte sombre (en direct)', mobileLight: 'Mobile — clair', mobileDark: 'Mobile — sombre',
    keyboard: 'Comportement clavier', keys: [
      'Tab atteint chaque groupe ; Entrée ou Espace ouvre son menu (aria-expanded).',
      'Échap ferme le menu ouvert et remet le focus sur son déclencheur.',
      'Quitter un groupe au clavier le referme : l’ordre de tabulation reste prévisible.',
      'Mobile : le menu prend le focus à l’ouverture, Échap le referme et rend le focus au bouton.',
      'Le survol prévisualise un menu, mais rien n’en dépend.',
      'Le lien FR / EN conserve la page et signale la langue cible.',
    ],
    skipHint: 'Lien d’évitement : appuyez sur Tab dès l’ouverture de la page pour le voir apparaître.',
    depthTitle: 'Hiérarchie de profondeur CORO', depthLead: 'La profondeur vient d’abord de la structure, en dernier de l’ombre. Ne pas tomber par défaut sur « carte + ombre ».',
    depthSteps: [['Surface', 'Contraste de fond : blanc, papier, marine.'], ['Bordure', 'Filet net de 1 px, structure visible.'], ['Média', 'Bâtiment, plan ou capture qui porte le sujet.'], ['Superposition', 'Donnée reliée à un objet réel.'], ['Lumière', 'Éclairage contrôlé, jamais un halo.'], ['Ombre', 'En dernier recours, et discrète.']],
    rhythmTitle: 'Rythme des surfaces', rhythmLead: 'Blanc → surface architecturale → blanc → marine profond. Le changement de fond structure la page ; aucune grille de cartes n’est nécessaire.',
    rhythm: [['SURFACE 0', 'Lecture. Texte, respiration.'], ['SURFACE ARCHITECTURALE', 'Papier de dessin : ton doux, filets fins, cotes. Un cadre, pas une carte.'], ['SURFACE 0', 'Retour au réel.'], ['MARINE 950', 'Immersion, produit, commandement.']],
    roles: [['Titre', 'Fort, compact, éditorial.'], ['Texte', 'Calme, lisible, retenu : la hiérarchie vient de la taille et de l’espace.'], ['Étiquette technique', 'Petite, précise, légèrement espacée.']],
    radiiTitle: 'Rayons par rôle', radii: [['cadre technique', '2–4 px', 'Cadres techniques, planches, filets d’architecture'], ['panneau', '4 px', 'Panneaux et surfaces de contenu — défaut'], ['contrôle', '8 px', 'Boutons, champs, contrôles'], ['image', '10 px', 'Photos et médias d’architecture : coins visibles et contenus seulement'], ['exceptionnel', '16 / 24 px', 'Exceptionnel : grand média ou élément flottant justifié'], ['pill', '999 px', 'Statuts et étiquettes seulement']],
    elevTitle: 'Ombre : dernier recours', elevText: 'Les niveaux 1 et 2 suffisent presque toujours. Les niveaux 3 et 4 sont exceptionnels.', exception: 'exceptionnel',
    frameTitle: 'Aperçu mobile du composant SiteHeader', filler: 'Contenu de démonstration sous l’en-tête.',
  },
  en: {
    eyebrow: 'CORO WEBSITE V2 · DESIGN LAB · LAB-06',
    title: 'Foundations and navigation.',
    lead: 'Internal laboratory validating the visual system: target tokens, surfaces, typography, focus, buttons and navigation. This is not a site page.',
    internal: 'Internal route — noindex, excluded from the sitemap and public navigation. Status: DRAFT.',
    zones: 'Zones', z00: '00 — Foundations', z01: '01 — Navigation', z02: '02 — Heroes', z03: '03 — Rhythm', z04: '04 — Building', z05: '05 — Operational', z06: '06 — Continuum',
    primary: 'Primary action', secondary: 'Secondary action', ghost: 'Text / quiet', disabled: 'Unavailable',
    palette: 'Target palette', paletteText: 'Navy carries identity, blue structures information, red signals action. Red is never a fill colour.',
    redTitle: 'Red: current versus target', redText: 'The target CORO action red is #E51B2A. Both production reds are left unchanged in this lot.',
    redCurrent: 'Current — production tokens', redModules: 'Current — product modules (hard-coded)', redTarget: 'Target — CORO signal / action red',
    contrast: 'White text contrast', contrastNote: 'The target red stays above 4.5:1 with white text, with less headroom than the current one. Red text on navy should be avoided at small sizes: use the light red.',
    surfaces: 'Surfaces and text', light: 'Light foundation', dark: 'Dark foundation',
    heading: 'Main heading', body: 'Body copy, readable and dense without feeling cramped. Hierarchy comes from size, weight and space.', secondaryText: 'Secondary text, metadata, status labels.',
    typeTitle: 'Type hierarchy', typeLong: 'Safer buildings. Prepared organizations. Resilient communities.',
    spaceTitle: 'Spacing', states: 'Semantic states', statesText: 'Each state pairs an icon, a label and a colour: colour alone never carries meaning.',
    normal: 'Normal', attention: 'Attention', critical: 'Critical', info: 'Information',
    focusTitle: 'Visible focus', focusText: 'Tab through these elements. The ring is blue on light surfaces and light blue on dark surfaces.',
    ctaTitle: 'Buttons', ctaText: 'Hover, keyboard focus, pressed and unavailable states are live: try them. No loading state here (later lots).',
    navText: 'The shared SiteHeader shown in light and dark contexts. Mobile windows are real pages in frames: they use their own viewport width.',
    navLight: 'Light context (live)', navDark: 'Dark context (live)', mobileLight: 'Mobile — light', mobileDark: 'Mobile — dark',
    keyboard: 'Keyboard behaviour', keys: [
      'Tab reaches each group; Enter or Space opens its menu (aria-expanded).',
      'Escape closes the open menu and returns focus to its trigger.',
      'Tabbing out of a group closes it: tab order stays predictable.',
      'Mobile: the menu takes focus on open, Escape closes it and returns focus to the toggle.',
      'Hover previews a menu, but nothing depends on it.',
      'The FR / EN link keeps the page and announces the target language.',
    ],
    skipHint: 'Skip link: press Tab as soon as the page opens to see it appear.',
    depthTitle: 'CORO depth hierarchy', depthLead: 'Depth comes from structure first and shadow last. Do not default to “card + shadow”.',
    depthSteps: [['Surface', 'Background contrast: white, paper, navy.'], ['Border', 'A crisp 1 px line; structure you can see.'], ['Media', 'Building, plan or capture carrying the subject.'], ['Overlay', 'Data tied to a real object.'], ['Light', 'Controlled lighting, never a glow.'], ['Shadow', 'Last resort, and discreet.']],
    rhythmTitle: 'Surface rhythm', rhythmLead: 'White → architectural surface → white → deep navy. The change of ground structures the page; no card grid is needed.',
    rhythm: [['SURFACE 0', 'Reading. Text, breathing room.'], ['ARCHITECTURAL SURFACE', 'Drafting paper: soft tone, hairlines, dimensions. A frame, not a card.'], ['SURFACE 0', 'Back to the real world.'], ['NAVY 950', 'Immersion, product, command.']],
    roles: [['Headline', 'Strong, compact, editorial.'], ['Body', 'Calm, readable, restrained: hierarchy comes from size and space.'], ['Technical label', 'Small, precise, slightly spaced.']],
    radiiTitle: 'Radii by role', radii: [['technical frame', '2–4 px', 'Technical frames, drawing sheets, architectural rules'], ['panel', '4 px', 'Panels and content surfaces — default'], ['control', '8 px', 'Buttons, fields, controls'], ['image', '10 px', 'Photos and architectural media: visible, contained corners only'], ['exceptional', '16 / 24 px', 'Exceptional: a large media or a justified floating element'], ['pill', '999 px', 'Statuses and tags only']],
    elevTitle: 'Shadow: last resort', elevText: 'Levels 1 and 2 almost always suffice. Levels 3 and 4 are exceptional.', exception: 'exceptional',
    frameTitle: 'Mobile preview of the SiteHeader component', filler: 'Demonstration content below the header.',
  },
} as const;

type Swatch = { name: string; hex: string; token?: string };
const swatch = (s: Swatch): CSSProperties => ({ ['--swatch' as string]: s.hex });

const brand: readonly Swatch[] = [
  { name: 'Navy 950', hex: '#061D35', token: '--coro-v1-navy-950' }, { name: 'Navy 900', hex: '#082B52', token: '--coro-v1-navy-900' },
  { name: 'Blue 700', hex: '#0D4F8B', token: '--coro-v1-blue-700' }, { name: 'Blue 500', hex: '#1A6FB8', token: '--coro-v1-blue-500' },
  { name: 'Red 600', hex: '#E51B2A', token: '--coro-v1-red-600' }, { name: 'Red 700', hex: '#BF1522', token: '--coro-v1-red-700' },
  { name: 'Red 300', hex: '#FF5A66', token: '--coro-v1-red-300' }, { name: 'Surface 2 · paper', hex: '#EEF3F7', token: '--coro-v1-paper' },
];
const reds = (t: (typeof copy)[Locale]): readonly (Swatch & { contrast: string })[] => [
  { name: t.redCurrent, hex: '#C0392B', token: '--coro-red-600', contrast: '5.44:1' },
  { name: t.redModules, hex: '#BD3B31', token: '#BD3B31', contrast: '5.48:1' },
  { name: t.redTarget, hex: '#E51B2A', token: '--coro-v1-red-600', contrast: '4.64:1' },
];
const typeScale = [['display-xl', 'Display XL'], ['display-l', 'Display L'], ['h1', 'H1'], ['h2', 'H2'], ['h3', 'H3'], ['body-l', 'Body L'], ['body', 'Body'], ['small', 'Small'], ['micro', 'Micro']] as const;
const spacing = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 40] as const;
const px = (n: number) => `${n * 4}px`;

function Band({ tone = 'white', children }: { tone?: 'white' | 'paper'; children: React.ReactNode }) {
  return <div className={styles.band} data-tone={tone}><Container>{children}</Container></div>;
}

function Zone({ id, index, title, children }: { id: string; index: string; title: string; children: React.ReactNode }) {
  return <section id={id} className={styles.zone} aria-labelledby={`${id}-title`}><Container><header className={styles.zoneHead}><span>{index}</span><h2 id={`${id}-title`}>{title}</h2></header></Container>{children}</section>;
}

function Stage({ locale, tone, view }: { locale: Locale; tone: 'light' | 'dark'; view: string }) {
  return (
    <div data-design-lab data-coro-system="v1" className={styles.stage}>
      <SkipLink locale={locale} />
      <SiteHeader locale={locale} pathname={`/design-lab?view=${view}`} tone={tone} />
      <main id="lab-main" className={styles.stageBody} data-tone={tone}><p>{copy[locale].filler}</p></main>
    </div>
  );
}

export default async function DesignLabPage({ searchParams }: Props) {
  const query = (await searchParams) ?? {};
  const locale = localeFromSearchParams(query);
  const view = Array.isArray(query.view) ? query.view[0] : query.view;
  if (view === 'mobile-light' || view === 'mobile-dark') return <Stage locale={locale} tone={view === 'mobile-dark' ? 'dark' : 'light'} view={view} />;
  if (view && (flowViewKeys as readonly string[]).includes(view)) return <FlowView locale={locale} study={view.slice(-1) as 'a' | 'b' | 'c' | 'd'} />;
  if (view === 'spatial') return <SpatialView locale={locale} />;
  if (view && (opsViewKeys as readonly string[]).includes(view)) return <OperationalView locale={locale} study={view.slice(-1) as 'a' | 'b' | 'c' | 'd'} />;
  const rhythmKey = view && (rhythmStudyKeys as readonly string[]).includes(view) ? (view as RhythmStudyKey) : undefined;
  if (rhythmKey) return <RhythmView locale={locale} study={rhythmKey.slice(-1) as 'a' | 'b' | 'c'} />;
  const studyKey = view?.startsWith('hero-') ? (view.slice(5) as HeroStudyKey) : undefined;
  if (studyKey && heroStudyKeys.includes(studyKey)) return <HeroStudyView locale={locale} study={studyKey} />;
  const t = copy[locale];
  const frame = (name: string) => `${localizedHref('/design-lab', locale)}${locale === 'en' ? '&' : '?'}view=${name}`;
  return (
    <div data-design-lab data-coro-system="v1" className={styles.lab}>
      <SkipLink locale={locale} />
      <div data-surface="dark" className={styles.bar}>
        <Container className={styles.barInner}>
          <span className={styles.barMark}>CO<span>RO</span> <em>Design Lab</em></span>
          <nav aria-label={t.zones}><a href="#foundations">{t.z00}</a><a href="#navigation">{t.z01}</a><a href="#heroes">{t.z02}</a><a href="#page-rhythm">{t.z03}</a><a href="#spatial">{t.z04}</a><a href="#operational">{t.z05}</a><a href="#flows">{t.z06}</a><a href="#spatial">{t.z04}</a></nav>
          <a lang={locale === 'fr' ? 'en' : 'fr'} hrefLang={locale === 'fr' ? 'en-CA' : 'fr-CA'} href={locale === 'fr' ? '/design-lab?lang=en' : '/design-lab'} className={styles.barLang} aria-label={locale === 'fr' ? 'View this page in English' : 'Voir cette page en français'}>{locale === 'fr' ? 'EN' : 'FR'}</a>
        </Container>
      </div>
      <main id="lab-main">
        <section data-surface="dark" className={styles.hero}>
          <Container className={styles.heroInner}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p className={styles.lead}>{t.lead}</p>
            <p className={styles.internal}><span aria-hidden="true">■</span> {t.internal}</p>
            <div className={styles.actions}>
              <Button href="#foundations" surface="dark">{t.z00}</Button>
              <Button href="#navigation" variant="secondary" surface="dark">{t.z01}</Button>
            </div>
            <p className={styles.hint}>{t.skipHint}</p>
          </Container>
        </section>

        <Zone id="foundations" index="00" title={t.z00.replace(/^[0-9]+ — /, '')}>
          <Band>
            <div className={styles.block}>
              <h3>{t.palette}</h3><p className={styles.blockLead}>{t.paletteText}</p>
              <ul className={styles.swatches}>{brand.map((s) => <li key={s.name}><span className={styles.chip} style={swatch(s)} /><b>{s.name}</b><code>{s.hex}</code><small>{s.token}</small></li>)}</ul>
            </div>
            <div className={styles.block}>
              <h3>{t.redTitle}</h3><p className={styles.blockLead}>{t.redText}</p>
              <ul className={styles.redCompare}>{reds(t).map((s, i) => (
                <li key={s.hex} data-target={i === 2}>
                  <span className={styles.chip} style={swatch(s)} />
                  <b>{s.name}</b><code>{s.hex}</code>
                  <span className={styles.redButton} style={swatch(s)}>{t.primary}</span>
                  <small>{t.contrast}: {s.contrast}</small>
                </li>
              ))}</ul>
              <p className={styles.note}>{t.contrastNote}</p>
            </div>
          </Band>

          <Band tone="paper">
            <div className={styles.block}>
              <h3>{t.depthTitle}</h3><p className={styles.blockLead}>{t.depthLead}</p>
              <ol className={styles.depth}>{t.depthSteps.map(([name, text], i) => <li key={name} data-rank={i + 1}><span className={styles.label}>{String(i + 1).padStart(2, '0')}</span><b>{name}</b><small>{text}</small></li>)}</ol>
            </div>
            <div className={styles.block}>
              <h3>{t.surfaces}</h3>
              <div className={styles.surfaces}>
                <div className={styles.surfaceLight}><small>{t.light}</small><h4>{t.heading}</h4><p>{t.body}</p><p className={styles.muted}>{t.secondaryText}</p></div>
                <div className={styles.surfaceDark} data-surface="dark"><small>{t.dark}</small><h4>{t.heading}</h4><p>{t.body}</p><p className={styles.muted}>{t.secondaryText}</p></div>
              </div>
            </div>
          </Band>

          <Band>
            <div className={styles.block}>
              <h3>{t.typeTitle}</h3>
              <ul className={styles.roles}>{t.roles.map(([name, text], i) => <li key={name}><span className={styles.label}>{name}</span>{i === 0 ? <p className={styles.roleHead}>{t.typeLong.split('.')[0]}.</p> : i === 1 ? <p className={styles.roleBody}>{text}</p> : <p className={styles.label}>{text}</p>}</li>)}</ul>
              <ul className={styles.typeScale}>{typeScale.map(([key, label]) => <li key={key}><span>{label}<small>--coro-v1-text-{key}</small></span><p className={styles[`t_${key.replace('-', '')}`]}>{key.startsWith('display') || key === 'h1' ? t.typeLong.split('.')[0] + '.' : t.body.split('.')[0] + '.'}</p></li>)}</ul>
              <p className={`${styles.longTitle} ${styles.t_h1}`}>{t.typeLong}</p>
            </div>
            <div className={styles.block}>
              <h3>{t.spaceTitle}</h3>
              <ul className={styles.spacing}>{spacing.map((n) => <li key={n}><code>space-{n}</code><span className={styles.bar4} style={{ inlineSize: `var(--coro-v1-space-${n})` }} /><small>{px(n)}</small></li>)}</ul>
            </div>
          </Band>

          <Band tone="paper">
            <div className={styles.block}>
              <h3>{t.radiiTitle}</h3>
              <ul className={styles.radii}>{t.radii.map(([name, size, role], i) => <li key={name} data-i={i}><span className={styles.radiusSample}>{name === 'image' && <Image src="/website-v2/architecture/building-hero-day.webp" alt="" fill sizes="200px" style={{ objectFit: 'cover', objectPosition: '62% 40%' }} />}</span><b>{name}</b><code>{size}</code><small>{role}</small></li>)}</ul>
            </div>
            <div className={styles.block}>
              <h3>{t.elevTitle}</h3><p className={styles.blockLead}>{t.elevText}</p>
              <ul className={styles.elevation}>{[1, 2, 3, 4].map((n) => <li key={n} data-exception={n > 2} style={{ boxShadow: `var(--coro-v1-shadow-${n})` }}><code>shadow-{n}</code><small>{n > 2 ? t.exception : `level ${n}`}</small></li>)}</ul>
            </div>
            <div className={styles.block}>
              <h3>{t.states}</h3><p className={styles.blockLead}>{t.statesText}</p>
              <ul className={styles.states}>
                <li data-state="success"><span aria-hidden="true">✓</span>{t.normal}</li>
                <li data-state="warning"><span aria-hidden="true">!</span>{t.attention}</li>
                <li data-state="critical"><span aria-hidden="true">▲</span>{t.critical}</li>
                <li data-state="info"><span aria-hidden="true">i</span>{t.info}</li>
              </ul>
            </div>
          </Band>

          <Band>
            <div className={styles.block}>
              <h3>{t.focusTitle}</h3><p className={styles.blockLead}>{t.focusText}</p>
              <div className={styles.focusGrid}>
                <div className={styles.surfaceLight}><a href="#foundations">{t.ghost}</a><button type="button">{t.secondary}</button></div>
                <div className={styles.surfaceDark} data-surface="dark"><a href="#foundations">{t.ghost}</a><button type="button">{t.secondary}</button></div>
              </div>
            </div>
            <div className={styles.block}>
              <h3>{t.ctaTitle}</h3><p className={styles.blockLead}>{t.ctaText}</p>
              <div className={styles.ctaGrid}>
                <div className={styles.surfaceLight}>
                  <Button href="#foundations">{t.primary}</Button><Button href="#foundations" variant="secondary">{t.secondary}</Button><Button href="#foundations" variant="ghost">{t.ghost}</Button><Button href="#foundations" disabled>{t.disabled}</Button>
                </div>
                <div className={styles.surfaceDark} data-surface="dark">
                  <Button href="#foundations" surface="dark">{t.primary}</Button><Button href="#foundations" variant="secondary" surface="dark">{t.secondary}</Button><Button href="#foundations" variant="ghost" surface="dark">{t.ghost}</Button><Button href="#foundations" surface="dark" disabled>{t.disabled}</Button>
                </div>
              </div>
            </div>
          </Band>

          <div className={styles.rhythmWrap}>
            <Container><div className={styles.rhythmHead}><h3>{t.rhythmTitle}</h3><p className={styles.blockLead}>{t.rhythmLead}</p></div></Container>
            <div className={styles.rhythm}>{t.rhythm.map(([name, text], i) => <div key={i} className={styles.rhythmBand} data-tone={['white', 'paper', 'white', 'navy'][i]} data-surface={i === 3 ? 'dark' : undefined}><Container className={styles.rhythmInner}><span className={styles.label}>{String(i + 1).padStart(2, '0')} · {name}</span><p>{text}</p></Container></div>)}</div>
          </div>
        </Zone>

        <Zone id="navigation" index="01" title={t.z01.replace(/^[0-9]+ — /, '')}>
          <Band tone="paper">
            <div className={styles.block}><p className={styles.blockLead}>{t.navText}</p></div>
            <div className={styles.block}>
              <h3>{t.navLight}</h3>
              <div className={styles.stageFrame}><SiteHeader locale={locale} pathname="/design-lab" tone="light" /></div>
            </div>
            <div className={styles.block}>
              <h3>{t.navDark}</h3>
              <div className={`${styles.stageFrame} ${styles.stageFrameDark}`}><SiteHeader locale={locale} pathname="/design-lab" tone="dark" /></div>
            </div>
            <div className={styles.block}>
              <div className={styles.phones}>
                <figure><figcaption className={styles.label}>{t.mobileLight}</figcaption><iframe title={`${t.frameTitle} — ${t.mobileLight}`} src={frame('mobile-light')} loading="lazy" /></figure>
                <figure><figcaption className={styles.label}>{t.mobileDark}</figcaption><iframe title={`${t.frameTitle} — ${t.mobileDark}`} src={frame('mobile-dark')} loading="lazy" /></figure>
              </div>
            </div>
          </Band>
          <Band>
            <div className={styles.block}>
              <h3>{t.keyboard}</h3>
              <ul className={styles.keys}>{t.keys.map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
          </Band>
        </Zone>

        <HeroSystemZone locale={locale} />

        <PageRhythmZone locale={locale} />

        <SpatialZone locale={locale} />

        <OperationalZone locale={locale} />

        <FlowZone locale={locale} />
      </main>
      <footer className={styles.labFooter}><Container>CORO Website V2 · Design Lab · LAB-06 · DRAFT</Container></footer>
    </div>
  );
}
