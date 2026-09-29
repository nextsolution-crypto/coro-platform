import Link from 'next/link';
import Image from 'next/image';
import { Building2, ClipboardCheck, Radar, GitBranch, Zap, ShieldCheck, FileCheck2, GraduationCap, RefreshCw, FileText, Users, AlertTriangle, Settings2, Check, Clock, MessageSquare, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { TrustStrip } from '@/components/conversion/TrustStrip';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
import { MediaFrame } from '@/components/page/MediaFrame';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { TechLabel } from '@/components/page/Technical';
import { Button } from '@/components/ui/Button';
import type { HomeContent } from '../content';
import DemoForm from '@/app/DemoForm';
import { HeroVideo } from '../client/HeroVideo';
import type { Locale } from '@/lib/site/locale';
import styles from './sections.module.css';

/** 13-section storyboard (MIG-08A), matching docs/website-v2/05-migration/MIG-08-HOMEPAGE-GATE.md §26. */

export function Hero({ c, locale }: { c: HomeContent; locale: Locale }) {
  return (
    <EditorialHero
      id="home-title"
      label={c.hero.label}
      title={c.hero.title as unknown as string[]}
      lead={c.hero.lead}
      detail={c.hero.detail}
      photo={{ src: '/images/homepage/coro-home-hero-building-dusk.webp', alt: '', side: 'end', priority: true, position: 'center 38%', mobilePosition: 'center 30%', overlays: c.hero.overlays }}
      actions={
        <>
          <Button href={c.hero.primary.href} surface="dark">{c.hero.primary.label}</Button>
          <HeroVideo label={c.hero.watchVideo} lang={locale} />
        </>
      }
    />
  );
}

/**
 * Fragments of operational reality (Section 02). Six real assets — three photographic, three real sanitized CORO
 * product UI — stand in for the six information domains that already exist separately in an organization, arranged
 * as an asymmetric editorial collage (not a card grid) that resolves into the CORO destination statement below.
 * Every domain name is real DOM text (figure caption / cartouche), so the images carry no meaning the text lacks.
 */
const FRAGMENT_ASSETS = [
  { kind: 'photo' as const, src: '/images/homepage/problem-documents.webp', ratio: 1536 / 1024, aspect: '4 / 3', position: '78% 42%', area: 'plans' },
  { kind: 'photo' as const, src: '/images/homepage/procedures.webp', ratio: 1536 / 1024, aspect: '4 / 3', position: '38% 40%', area: 'proc' },
  { kind: 'photo' as const, src: '/images/homepage/problem-people.webp', ratio: 1536 / 1024, aspect: '4 / 3', position: '50% 35%', area: 'pers' },
  { kind: 'technical' as const, src: '/images/homepage/platform-sentinelle.webp', ratio: 1586 / 992, aspect: '4 / 3', area: 'sys' },
  { kind: 'technical' as const, src: '/images/homepage/platform-client-portal.webp', ratio: 1493 / 1054, aspect: '4 / 3', area: 'data' },
  { kind: 'technical' as const, src: '/images/homepage/platform-incident.webp', ratio: 1185 / 1327, aspect: '4 / 3', position: '50% 12%', area: 'inc' },
];

function FragmentCollage({ inputs, destination, note }: { inputs: readonly string[]; destination: string; note: string }) {
  return (
    <div className={styles.fragments}>
      <div className={styles.fragmentGrid}>
        {FRAGMENT_ASSETS.map((asset, i) => (
          <div key={asset.area} className={styles.fragmentTile} data-area={asset.area}>
            {asset.kind === 'photo' ? (
              <MediaFrame src={asset.src} alt="" ratio={asset.ratio} aspect={asset.aspect} position={asset.position} sizes="(min-width: 68rem) 260px, 50vw" overlayLabel={inputs[i]} />
            ) : (
              <MediaFrame kind="technical" src={asset.src} alt="" ratio={asset.ratio} aspect={asset.aspect} position={asset.position} sizes="(min-width: 68rem) 260px, 50vw" cartouche={['CORO', inputs[i], 'Compte démo']} />
            )}
          </div>
        ))}
      </div>
      <div className={styles.fragmentDestination}>
        <span className={styles.fragmentMark}>CO<span>RO</span></span>
        <p className={styles.diagramDestinationNote}>{note}</p>
        <p className={styles.diagramDestinationText}>{destination}</p>
      </div>
    </div>
  );
}

export function Tension({ c }: { c: HomeContent }) {
  return (
    <PageSection tone="white" density="standard" labelledBy="home-tension">
      <SplitContent ratio="4-8" align="center"
        text={<EditorialBlock id="home-tension" label={c.tension.label} heading={c.tension.heading} size="lg"><p>{c.tension.lead}</p></EditorialBlock>}
        media={<FragmentCollage inputs={c.tension.inputs} destination={c.tension.destination} note={c.tension.destinationNote} />} />
    </PageSection>
  );
}

/** One coherent pictogram per continuum stage, keyed by stage id (matches app/home/content.ts). */
const CONTINUUM_ICONS: Record<string, LucideIcon> = {
  connaitre: Building2,
  anticiper: ClipboardCheck,
  detecter: Radar,
  decider: GitBranch,
  agir: Zap,
  proteger: ShieldCheck,
  prouver: FileCheck2,
  apprendre: GraduationCap,
  ameliorer: RefreshCw,
};

/** Which zone (avant/pendant/apres) each stage belongs to, in continuum order. */
const CONTINUUM_ZONES: Record<string, 'avant' | 'pendant' | 'apres'> = {
  connaitre: 'avant',
  anticiper: 'avant',
  detecter: 'pendant',
  decider: 'pendant',
  agir: 'pendant',
  proteger: 'pendant',
  prouver: 'apres',
  apprendre: 'apres',
  ameliorer: 'apres',
};

/**
 * Section 03 — CORO Resilience Continuum. tone="soft" gives the section its own cool-neutral chapter background
 * (with PageSection's built-in top accent rule) so it reads as a new chapter against Section 02's white, without
 * a heavy divider. Primary hierarchy is nine equal editorial cards (Connaître → Améliorer); Avant/Pendant/Après
 * are secondary group labels, each nested directly above its own card row so label/card alignment never depends
 * on cross-grid column spans, at any breakpoint. No connecting spine — card order alone carries the progression.
 */
export function Continuum({ c }: { c: HomeContent }) {
  const zoneStages = c.continuum.zones.map((zone) => ({
    zone,
    stages: c.continuum.stages.filter((s) => CONTINUUM_ZONES[s.id] === zone.key),
  }));
  return (
    <PageSection tone="soft" density="standard" labelledBy="home-continuum">
      <div className={styles.continuumHeader}>
        <div>
          <TechLabel>{c.continuum.label}</TechLabel>
          <h2 id="home-continuum" className={styles.heading}>{c.continuum.heading}</h2>
        </div>
        <div className={styles.continuumHeaderAside}>
          <p className={styles.continuumHeaderLead}>{c.continuum.lead}</p>
          <Link href={c.continuum.link.href} className={styles.continuumLink}>{c.continuum.link.label} →</Link>
        </div>
      </div>

      <div className={styles.continuumZones}>
        {zoneStages.map(({ zone, stages }) => (
          <div key={zone.key} className={styles.continuumZoneLabel} data-zone={zone.key} style={{ gridColumn: `span ${stages.length}` } as CSSProperties} aria-hidden="true"><span>{zone.label}</span></div>
        ))}
        <ol className={styles.continuumStrip} aria-label={c.continuum.heading}>
          {c.continuum.stages.map((stage) => {
            const Icon = CONTINUUM_ICONS[stage.id];
            return (
              <li key={stage.id} className={styles.continuumUnit} data-zone={CONTINUUM_ZONES[stage.id]} data-stage={stage.id}>
                <span className={styles.continuumNode} aria-hidden="true"><Icon size={24} strokeWidth={1.65} /></span>
                <span className={styles.continuumStageName}>{stage.name}</span>
                <span className={styles.continuumStagePhrase}>{stage.phrase}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className={styles.continuumPunchline}>
        {c.continuum.punchlineLead}<br />
        <strong>{c.continuum.punchline}</strong>
      </p>
    </PageSection>
  );
}

/**
 * Building as operational memory (Section 04) — secondary-Hero treatment. The approved editorial illustration
 * (`building-operational-cutaway-v2.webp`, EDITORIAL / MARKETING ILLUSTRATION — not product UI, not a live 3D
 * twin) fills the full section as a background layer, same pattern as EditorialHero's photographic mode: the
 * image's own pale blueprint/negative space on the left leaves room for the editorial copy, with a very light
 * localized gradient (not an opaque panel) for legibility. No floating capability callouts — the illustration's
 * own visual complexity carries that role now; the only other overlay is the Indice CORO panel, positioned in
 * the image's right-side negative space clear of the building's strongest detail. The gauge shows an explicitly
 * labeled demonstration score — never real customer/audit data — per the current-vs-vision discipline established
 * across the rest of the Homepage.
 */
/** One icon + accent color per building annotation, keyed by callout id (visual categorization only — not status/severity). */
const ANNOTATION_META: Record<string, { icon: LucideIcon; color: string }> = {
  plans: { icon: FileText, color: 'var(--coro-v1-blue-700)' },
  occupation: { icon: Users, color: '#1F9D63' },
  equipes: { icon: ShieldCheck, color: '#D97706' },
  systemes: { icon: Settings2, color: 'var(--coro-v1-red-600)' },
  incidents: { icon: AlertTriangle, color: '#7C3AED' },
};

export function Ecosystem({ c }: { c: HomeContent }) {
  return (
    <PageSection tone="ecosystem" density="compact" labelledBy="home-ecosystem" id="ecosysteme">
      <div className={styles.buildingWide}>
        <div className={styles.buildingHero}>
          <Image
            src="/images/homepage/building-operational-cutaway-v2.webp"
            alt={c.ecosystem.imageAlt}
            fill
            sizes="(min-width: 68rem) 1552px, 100vw"
            style={{ objectFit: 'cover' }}
            className={styles.buildingHeroImage}
            loading="lazy"
          />

          <div className={styles.buildingHeroCopy}>
            <TechLabel>{c.ecosystem.label}</TechLabel>
            <h2 id="home-ecosystem" className={styles.buildingHeroHeading}>{c.ecosystem.heading}</h2>
            <p className={styles.buildingHeroLead}>{c.ecosystem.lead}</p>
          </div>

          {c.ecosystem.callouts.map((callout) => {
            const meta = ANNOTATION_META[callout.id];
            const Icon = meta.icon;
            return (
              <div key={callout.id} className={styles.buildingAnnotation} style={{ top: callout.top, left: callout.left, '--accent-color': meta.color } as CSSProperties}>
                <span className={styles.buildingAnnotationIcon} aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
                <span className={styles.buildingAnnotationLabel}>{callout.label}</span>
                <span className={styles.buildingAnnotationText}>{callout.text}</span>
              </div>
            );
          })}

        </div>

        <div className={styles.indicePanel}>
          <p className={styles.indiceTitle}>{c.ecosystem.indice.label}</p>
          <div className={styles.indiceGaugeWrap}>
            <svg className={styles.indiceGauge} viewBox="0 0 120 70" aria-hidden="true">
              <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke="var(--coro-v1-paper-line-strong)" strokeWidth="10" strokeLinecap="round" />
              <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke="url(#indiceGradient)" strokeWidth="10" strokeLinecap="round" strokeDasharray="157.1" strokeDashoffset="34.6" />
              <defs><linearGradient id="indiceGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="var(--coro-v1-navy-900, #0B1F3A)" /><stop offset="50%" stopColor="var(--coro-v1-blue-700)" /><stop offset="100%" stopColor="#1F9D63" /></linearGradient></defs>
            </svg>
            <p className={styles.indiceScore} aria-hidden="true">78<span>/100</span></p>
            <span className={styles.srOnly}>{c.ecosystem.indice.scoreAccessibleText}</span>
          </div>
          <p className={styles.indiceScoreLabel}>{c.ecosystem.indice.scoreLabel}</p>
          <p className={styles.indiceLead}>{c.ecosystem.indice.lead}</p>
          <ul className={styles.indiceChecklist}>
            {c.ecosystem.indice.checklist.map((item) => (
              <li key={item}>
                <span className={styles.indiceCheckIcon} aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                {item}
              </li>
            ))}
          </ul>
          <p className={styles.indiceMaturityNote}>{c.ecosystem.indice.maturityNote}</p>
        </div>
      </div>
    </PageSection>
  );
}

const DOCUMENT_ICON: Record<string, LucideIcon> = {
  PMU: FileText, PSI: AlertTriangle, PCA: RefreshCw, PGC: Users, PRA: Settings2, PUE: Building2,
};

export function Documents({ c }: { c: HomeContent }) {
  return (
    <PageSection tone="ecosystem" density="compact" labelledBy="home-documents">
      <div className={styles.documentSuite}>
        <div className={styles.documentSuiteText}>
          <TechLabel>{c.documents.label}</TechLabel>
          <h2 id="home-documents" className={styles.documentSuiteHeading}>{c.documents.heading}</h2>
          <p className={styles.documentSuiteLead}>{c.documents.lead}</p>
        </div>
        <ul className={styles.documentSuiteGrid}>
          {c.documents.items.map((doc) => {
            const Icon = DOCUMENT_ICON[doc.code];
            const available = 'href' in doc && !!doc.href;
            return (
              <li key={doc.code} className={styles.documentSuiteCard}>
                <span className={styles.documentSuiteIcon} style={{ '--accent-color': doc.color } as CSSProperties} aria-hidden="true"><Icon size={18} strokeWidth={1.8} /></span>
                <span className={styles.documentSuiteCode}>{doc.code}</span>
                <span className={styles.documentSuiteName}>{doc.name}</span>
                <span className={styles.documentSuitePurpose}>{doc.purpose}</span>
                {available ? (
                  <Link href={(doc as { href: string }).href} className={styles.documentSuiteLink}>{c.documents.linkLabel} →</Link>
                ) : (
                  <span className={styles.documentSuitePhase}>{c.documents.phaseLabel}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </PageSection>
  );
}

export function Sentinelle({ c }: { c: HomeContent }) {
  return (
    <PageSection tone="navy" density="compact" labelledBy="home-sentinelle">
      <div className={styles.sentinelleWide}>
        <div className={styles.sentinelleBand}>
          <Image
            src="/website-v2/sentinel/sentinelle-occupancy-security.webp"
            alt={c.sentinelle.imageAlt}
            fill
            sizes="(min-width: 68rem) 1552px, 100vw"
            style={{ objectFit: 'cover', objectPosition: '62% center' }}
            className={styles.sentinelleBandImage}
            loading="lazy"
          />
          <div className={styles.sentinelleScrim} aria-hidden="true" />
        </div>

        <div className={styles.sentinelleAlert} role="note" aria-label="Exemple d'alerte — démonstration">
          <span className={styles.sentinelleAlertTag}>Urgent</span>
          <p className={styles.sentinelleAlertTitle}>Alerte incendie</p>
          <p className={styles.sentinelleAlertMeta}>RDC · 10:31 — Procédures activées</p>
        </div>

        <div className={styles.sentinelleCopy}>
          <TechLabel>{c.sentinelle.label}</TechLabel>
          <h2 id="home-sentinelle" className={styles.sentinelleHeading}>{c.sentinelle.heading}</h2>
          <p className={styles.sentinelleLead}>{c.sentinelle.lead}</p>
          <Button href={c.sentinelle.links[0].href} surface="dark">{c.sentinelle.links[0].label} →</Button>
        </div>

        <ul className={styles.sentinelleSequence}>
          {c.sentinelle.sequence.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
    </PageSection>
  );
}

const LOOP_ICONS: LucideIcon[] = [FileCheck2, GraduationCap, Settings2, RefreshCw];
const LOOP_COLORS = ['#2563EB', '#7C3AED', '#EA580C', '#16A34A'];
const MICRO_ICONS: LucideIcon[] = [FileText, Users, Zap, Radar];
const MICRO_COLORS = ['#C0392B', '#C0392B', '#C0392B', '#C0392B'];

/** Combined Intervention → Improvement section (merges the previous separate Incident and Exercises sections
    into one compact two-panel band, per Mathieu's directive: reduce Homepage length, make the operational
    learning loop explicit, avoid two consecutive full-height 50/50 sections). Reuses both original photos. */
export function InterventionImprovement({ c }: { c: HomeContent }) {
  const ii = c.interventionImprovement;
  return (
    <PageSection tone="navy" density="compact" labelledBy="home-intervention">
      <div className={styles.iiIntro}>
        <TechLabel>{ii.label}</TechLabel>
        <h2 id="home-intervention" className={styles.iiHeading}>{ii.heading}</h2>
      </div>

      <div className={styles.iiGrid}>
        <div className={styles.iiPanel}>
          <Image src="/images/homepage/incident-response.webp" alt={ii.left.imageAlt} fill sizes="(min-width: 68rem) 660px, 100vw" style={{ objectFit: 'cover' }} className={styles.iiPanelImage} loading="lazy" />
          <div className={styles.iiPanelScrimDark} aria-hidden="true" />
          <div className={styles.iiPanelContent}>
            <div className={styles.iiPanelCard}>
              <TechLabel>{ii.left.label}</TechLabel>
              <h3 className={styles.iiPanelHeading}>{ii.left.heading}</h3>
              <p className={styles.iiPanelLead}>{ii.left.lead}</p>
              <ul className={styles.iiMicroRow}>
                {ii.left.markers.map((marker, i) => {
                  const Icon = MICRO_ICONS[i];
                  return (
                    <li key={marker}>
                      <span className={styles.iiMicroIcon} style={{ background: MICRO_COLORS[i] }} aria-hidden="true"><Icon size={13} strokeWidth={2.25} /></span>
                      <span>{marker}</span>
                    </li>
                  );
                })}
              </ul>
              <Link href={ii.left.cta.href} className={styles.iiCtaLink}>{ii.left.cta.label} →</Link>
            </div>
          </div>
        </div>

        <div className={styles.iiPanel}>
          <Image src="/images/homepage/drill-exercise.webp" alt={ii.right.imageAlt} fill sizes="(min-width: 68rem) 660px, 100vw" style={{ objectFit: 'cover' }} className={styles.iiPanelImage} loading="lazy" />
          <div className={styles.iiPanelScrimLight} aria-hidden="true" />
          <div className={styles.iiPanelContent}>
            <div className={styles.iiPanelCard}>
              <TechLabel>{ii.right.label}</TechLabel>
              <h3 className={styles.iiPanelHeading}>{ii.right.heading}</h3>
              <p className={styles.iiPanelLead}>{ii.right.lead}</p>
              <ol className={styles.iiLoop}>
                {ii.right.loop.map((step, i) => {
                  const Icon = LOOP_ICONS[i];
                  return (
                    <li key={step}>
                      <span className={styles.iiLoopIcon} style={{ background: LOOP_COLORS[i] }} aria-hidden="true"><Icon size={13} strokeWidth={2.25} /></span>
                      <span className={styles.iiLoopText}>
                        <span className={styles.iiLoopStep}>{step}</span>
                        <span className={styles.iiLoopDesc}>{ii.right.loopDesc[i]}</span>
                      </span>
                      {i < ii.right.loop.length - 1 && <span className={styles.iiLoopArrow} aria-hidden="true">→</span>}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <p className={styles.iiConnector}>
        {ii.connector.map((step, i) => (
          <span key={step}>{step}{i < ii.connector.length - 1 && <span aria-hidden="true"> → </span>}</span>
        ))}
      </p>
    </PageSection>
  );
}

/**
 * Compact data-driven progression graph (Section — replaces the former photo + two-column "Mesurer la
 * préparation" layout). Built entirely in SVG/DOM: the 52→60→68→78 series and the +50% callout are explicitly
 * illustrative demonstration data (per the same disclosure convention already established for the Ecosystem
 * building section's Indice panel), never real customer figures.
 */
function IndiceGraphCard({ g }: { g: HomeContent['resilience']['graph'] }) {
  const values = g.points.map((p) => p.value);
  const min = 45, max = 80;
  const scaleY = (v: number) => 130 - ((v - min) / (max - min)) * 110;
  const xs = [30, 150, 270, 390];
  const coords = values.map((v, i) => [xs[i], scaleY(v)] as const);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${xs[3]},130 L${xs[0]},130 Z`;
  return (
    <div className={styles.graphCard}>
      <div className={styles.graphCardHead}>
        <p className={styles.graphCardTitle}>{g.cardTitle}</p>
        <span className={styles.graphDemoTag}>{g.demoDisclosure}</span>
      </div>

      <svg className={styles.graphSvg} viewBox="0 0 420 150" role="img" aria-labelledby="indice-graph-desc">
        <desc id="indice-graph-desc">{g.accessibleSummary}</desc>
        <defs>
          <linearGradient id="indiceAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22A06B" stopOpacity="0.32" />
            <stop offset="35%" stopColor="#22A06B" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#22A06B" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#22A06B" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[130, 95, 60, 25].map((y) => <line key={y} x1="20" x2="410" y1={y} y2={y} className={styles.graphGrid} />)}
        <path d={areaPath} fill="url(#indiceAreaGradient)" aria-hidden="true" />
        <path d={linePath} className={styles.graphLine} aria-hidden="true" />
        {coords.map(([x, y], i) => (
          <g key={g.points[i].label} aria-hidden="true">
            <circle cx={x} cy={y} r="4.5" className={styles.graphNode} />
            <text x={x} y={y - 12} textAnchor="middle" className={styles.graphNodeValue}>{g.points[i].value}</text>
            <text x={x} y="145" textAnchor="middle" className={styles.graphAxisLabel}>{g.points[i].label}</text>
          </g>
        ))}
      </svg>
      <span className={styles.srOnly}>{g.accessibleSummary}</span>

      <div className={styles.graphCallout}>
        <p className={styles.graphCalloutValue}>{g.progressionValue}</p>
        <p className={styles.graphCalloutSpan}>{g.progressionSpan}</p>
      </div>

      <ul className={styles.graphIndicators}>
        {g.indicators.map((label, i) => {
          const Icon = [ShieldCheck, FileCheck2, GraduationCap, Settings2][i];
          return <li key={label}><Icon size={14} strokeWidth={2} aria-hidden="true" /><span>{label}</span></li>;
        })}
      </ul>

      <p className={styles.graphMaturityNote}>{g.maturityNote}</p>
    </div>
  );
}

export function Resilience({ c }: { c: HomeContent }) {
  return (
    <PageSection tone="soft" density="compact" labelledBy="home-resilience">
      <SplitContent ratio="5-7" align="start"
        text={<EditorialBlock id="home-resilience" label={c.resilience.label} heading={c.resilience.heading} items={c.resilience.benefits} cta={c.resilience.cta} size="lg"><p>{c.resilience.lead}</p></EditorialBlock>}
        media={<IndiceGraphCard g={c.resilience.graph} />} />
    </PageSection>
  );
}

/** One coherent icon + category color per ecosystem card, keyed by card id (visual categorization only). */
const ECOSYSTEM_META: Record<string, { icon: LucideIcon }> = {
  documents: { icon: FileText },
  sentinelle: { icon: Radar },
  population: { icon: Users },
  incident: { icon: AlertTriangle },
  exercices: { icon: GraduationCap },
  resilience: { icon: RefreshCw },
  client: { icon: Building2 },
};

/**
 * Ecosystem solutions strip (Section — replaces the former two-column "La Plateforme CORO" split with seven
 * compact photographic cards, one per public-facing solution). Each card's photograph is 2026 editorial/marketing
 * imagery (illustrative dashboards, maps and KPIs — not real customer data); the card's own DOM title/description
 * is the sole carrier of product-truth meaning, so images are decorative (alt=""). Exercices has no dedicated
 * public route today, so it renders without a link rather than pointing at an invented URL.
 */
export function EcosystemSolutions({ c }: { c: HomeContent }) {
  return (
    <PageSection tone="navy" density="compact" labelledBy="home-platform" id="plateforme">
      <div className={styles.esHeader}>
        <div>
          <TechLabel>{c.platform.label}</TechLabel>
          <h2 id="home-platform" className={styles.esHeading}>{c.platform.heading}</h2>
        </div>
        <p className={styles.esLead}>{c.platform.lead}</p>
      </div>

      <ul className={styles.esGrid}>
        {c.platform.cards.map((card) => {
          const Icon = ECOSYSTEM_META[card.id].icon;
          const hasHref = 'href' in card && !!card.href;
          const body = (
            <>
              <Image src={`/images/homepage/${card.image}`} alt="" fill sizes="(min-width: 68rem) 220px, 45vw" style={{ objectFit: 'cover' }} className={styles.esCardImage} loading="lazy" />
              <div className={styles.esCardScrim} aria-hidden="true" />
              <div className={styles.esCardContent}>
                <span className={styles.esCardIcon} style={{ background: card.color }} aria-hidden="true"><Icon size={18} strokeWidth={1.8} /></span>
                <span className={styles.esCardTitle}>{card.title}</span>
                <span className={styles.esCardDesc}>{card.desc}</span>
              </div>
              {hasHref && <span className={styles.esCardArrow} aria-hidden="true">→</span>}
            </>
          );
          return (
            <li key={card.id} className={styles.esCard}>
              {hasHref ? <Link href={(card as { href: string }).href} className={styles.esCardLink}>{body}</Link> : <div className={styles.esCardLink} data-static="true">{body}</div>}
            </li>
          );
        })}
      </ul>
    </PageSection>
  );
}

export function Trust({ c }: { c: HomeContent }) {
  return (
    <PageSection tone="soft" density="compact" labelledBy="home-trust">
      <TechLabel>{c.trust.label}</TechLabel>
      <h2 id="home-trust" className={styles.heading}>{c.trust.heading}</h2>
      <p className={styles.lead}>{c.trust.lead}</p>
      <TrustStrip label={c.trust.label} items={c.trust.items} />
    </PageSection>
  );
}

export function Resources({ c }: { c: HomeContent }) {
  return (
    <PageSection tone="white" density="compact" id="ressources">
      <div className={styles.resourcesStrip}>
        <div>
          <TechLabel>{c.resources.label}</TechLabel>
          <h2 id="home-resources" className={styles.resourcesHeading}>{c.resources.heading}</h2>
        </div>
        <div className={styles.resourcesLinks}>
          {c.resources.links.map((link) => <Link key={link.href} href={link.href} className={styles.resourcesLink}>{link.label} <span aria-hidden="true">→</span></Link>)}
        </div>
      </div>
    </PageSection>
  );
}

/**
 * Final panoramic CTA — full-bleed Montreal skyline (real editorial photograph, 2170x725; navy dusk on the left
 * grading to a warm sunset toward the right, skyline lit across the center). Left navy gradient carries the main
 * copy for legibility; right navy gradient carries a short manifesto line; the lit skyline band in the center is
 * kept clear so the photograph itself remains visible. Primary CTA reuses c.hero.primary (→ /#demo, same in-page
 * DemoForm trigger as the Hero's own CTA) — not a new/invented destination.
 */
export function FinalCta({ c }: { c: HomeContent }) {
  return (
    <>
      <section className={styles.panoramicCta} aria-labelledby="home-cta">
        <Image
          src="/images/homepage/coro-home-final-cta-montreal.webp"
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          className={styles.panoramicCtaImage}
          loading="lazy"
        />
        <div className={styles.panoramicCtaScrimLeft} aria-hidden="true" />
        <div className={styles.panoramicCtaScrimRight} aria-hidden="true" />
        <div className={styles.panoramicCtaContent}>
          <TechLabel>{c.ctaFinal.label}</TechLabel>
          <h2 id="home-cta" className={styles.panoramicCtaStatement}>{c.ctaFinal.statement}</h2>
          <p className={styles.panoramicCtaSupport}>{c.ctaFinal.support}</p>
          <div className={styles.panoramicCtaButtons}>
            <Button href={c.hero.primary.href} surface="dark">{c.hero.primary.label} →</Button>
            <Button href={c.ctaFinal.secondary.href} variant="ghost" surface="dark">{c.ctaFinal.secondary.label}</Button>
          </div>
        </div>
        <div className={styles.panoramicCtaManifesto}>
          <div className={styles.panoramicCtaManifestoInner}>
            <span className={styles.panoramicCtaManifestoRule} aria-hidden="true" />
            <p className={styles.panoramicCtaManifestoText}>{c.ctaFinal.manifesto}</p>
          </div>
        </div>
      </section>
    </>
  );
}

const DEMO_VALUE_ICONS: LucideIcon[] = [Clock, FileText, Users, RefreshCw];

/**
 * Demo + proof section — moved ahead of Resources/FinalCta so those two stay the last content before the Footer.
 * Two columns: an editorial value/proof narrative on the left over the approved architectural background, and the
 * existing DemoForm (business logic untouched, see app/DemoForm.tsx) inside a compact premium card on the right.
 * The "proof" area is an intentional honest empty-state — CORO has no approved public testimonials yet — never a
 * fabricated quote, client name/logo, rating or stat.
 */
export function DemoSection({ c, locale }: { c: HomeContent; locale: Locale }) {
  return (
    <PageSection tone="white" density="standard" id="demo">
      <div className={styles.demoBg} aria-hidden="true">
        <Image
          src="/images/homepage/coro-home-demo-proof-background.webp"
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'left bottom' }}
          loading="lazy"
        />
        <div className={styles.demoBgFade} aria-hidden="true" />
      </div>
      <div className={styles.demoGrid}>
        <div className={styles.demoLeft}>
          <TechLabel>{c.demoProof.label}</TechLabel>
          <h2 id="home-demo" className={styles.demoHeadline}>{c.demoProof.headline}</h2>
          <p className={styles.demoIntro}>{c.demoProof.intro}</p>

          <ul className={styles.demoValues}>
            {c.demoProof.values.map((v, i) => {
              const Icon = DEMO_VALUE_ICONS[i];
              return (
                <li key={v.title}>
                  <span className={styles.demoValueIcon} aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
                  <span>
                    <p className={styles.demoValueTitle}>{v.title}</p>
                    <p className={styles.demoValueText}>{v.text}</p>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className={styles.demoDivider} aria-hidden="true" />

          <TechLabel>{c.demoProof.proofLabel}</TechLabel>
          <div className={styles.demoProofCard}>
            <MessageSquare size={20} strokeWidth={1.8} className={styles.demoProofIcon} aria-hidden="true" />
            <p className={styles.demoProofTitle}>{c.demoProof.proofTitle}</p>
            <p className={styles.demoProofBody}>{c.demoProof.proofBody}</p>
          </div>
          <p className={styles.demoContribution}><Users size={15} strokeWidth={1.8} aria-hidden="true" /> {c.demoProof.contribution}</p>
        </div>

        <span className={styles.demoAccent} aria-hidden="true" />

        <div className={styles.demoRight}>
          <div className={styles.demoFormCard}>
            <TechLabel>{c.demoProof.formLabel}</TechLabel>
            <h3 className={styles.demoFormHeading}>{c.demoProof.formHeading}</h3>
            <p className={styles.demoFormSupport}>{c.demoProof.formSupport}</p>
            <DemoForm lang={locale} />
          </div>
        </div>
      </div>
    </PageSection>
  );
}
