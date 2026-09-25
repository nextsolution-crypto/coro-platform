import { Continuum } from '@/components/flow/Continuum';
import { CTASection } from '@/components/conversion/CTASection';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { FeatureIndex } from '@/components/page/FeatureIndex';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { Button } from '@/components/ui/Button';
import { flowCopy } from '@/app/design-lab/flow-data';
import { localizedHref, type Locale } from '@/lib/site/locale';
import type { AboutContent } from './content';
import styles from './page.module.css';

/**
 * /about content (MIG-01A). Rendered inside the V2 page shell (see page.tsx): this component owns no header, main landmark or footer.
 * Family: editorial / architectural. Sections alternate white, soft and navy; every block comes from the approved library.
 */
function Sequence({ items, label }: { items: readonly string[]; label: string }) {
  return <ol className={styles.sequence} aria-label={label}>{items.map((item) => <li key={item}>{item}</li>)}</ol>;
}

export function AboutV2({ locale, content: t }: { locale: Locale; content: AboutContent }) {
  const demo = localizedHref('/#demo', locale);
  const continuum = flowCopy[locale].continuum;
  return (
    <>
      <PageSection tone="white" density="immersive" labelledBy="about-title">
        <div className={styles.hero}>
          <p className={styles.heroLabel}>{t.hero.eyebrow}</p>
          <h1 id="about-title" className={styles.heroTitle}>{t.hero.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h1>
          <p className={styles.heroLead}>{t.hero.intro}</p>
          <p className={styles.heroDetail}>{t.hero.detail}</p>
          <p className={styles.heroSignature}>{t.hero.signature}</p>
          <div className={styles.actions}>
            <Button href="#about-vision">{t.hero.primary}</Button>
            <Button href={demo} variant="ghost">{t.hero.secondary}</Button>
          </div>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="about-why-title">
        <SplitContent ratio="7-5" text={<EditorialBlock id="about-why-title" label={t.why.eyebrow} heading={t.why.title}>{t.why.paragraphs.map((p) => <p key={p}>{p}</p>)}<p><strong>{t.why.conclusion}</strong></p></EditorialBlock>} media={<Sequence items={t.why.sequence} label={t.why.eyebrow} />} />
      </PageSection>

      <PageSection tone="white" labelledBy="about-evolution-title">
        <SplitContent ratio="7-5" text={<EditorialBlock id="about-evolution-title" label={t.evolution.eyebrow} heading={t.evolution.title}><p>{t.evolution.text}</p><p className={styles.note}>{t.evolution.note}</p></EditorialBlock>} media={<Sequence items={t.evolution.path} label={t.evolution.eyebrow} />} />
      </PageSection>

      <PageSection tone="soft" labelledBy="about-identity-title">
        <div className={styles.stack}>
          <EditorialBlock id="about-identity-title" label={t.identity.eyebrow} heading={t.identity.title} />
          <FeatureIndex label={t.identity.title} items={t.identity.cards.map((card) => ({ title: card.title, meta: card.code, text: card.text }))} />
          <p className={styles.lead}>{t.identity.conclusion}</p>
        </div>
      </PageSection>

      <PageSection tone="navy" density="immersive" labelledBy="about-vision">
        <EditorialBlock id="about-vision" label={t.vision.eyebrow} heading={t.vision.title}><p>{t.vision.text}</p><p>{t.vision.detail}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="white" labelledBy="about-continuum-title">
        <div className={styles.stack}>
          <EditorialBlock id="about-continuum-title" label={t.continuum.eyebrow} heading={t.continuum.title} />
          <Continuum label={continuum.label} phases={continuum.phases} movements={continuum.movements} feedback={continuum.feedback} />
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="about-data-title">
        <SplitContent ratio="7-5" text={<EditorialBlock id="about-data-title" label={t.data.eyebrow} heading={t.data.title}><p>{t.data.text}</p></EditorialBlock>} media={<Sequence items={t.data.flows.map(([source, destination]) => `${source} → ${destination}`)} label={t.data.eyebrow} />} />
      </PageSection>

      <PageSection tone="white" labelledBy="about-lifecycle-title">
        <div className={styles.stack}>
          <EditorialBlock id="about-lifecycle-title" label={t.lifecycle.eyebrow} heading={t.lifecycle.title}><p>{t.lifecycle.note}</p></EditorialBlock>
          <FeatureIndex label={t.lifecycle.title} items={t.lifecycle.stages.map((stage) => ({ title: stage.title, meta: stage.phase, text: `${stage.text} ${stage.capabilities.join(' · ')}` }))} />
        </div>
      </PageSection>

      <PageSection tone="navy" density="immersive" labelledBy="about-human-title">
        <EditorialBlock id="about-human-title" label={t.human.eyebrow} heading={t.human.title}><p>{t.human.text}</p><p>{t.human.responsibility}</p></EditorialBlock>
      </PageSection>

      <PageSection tone="white" labelledBy="about-network-title">
        <SplitContent ratio="7-5" text={<EditorialBlock id="about-network-title" label={t.network.eyebrow} heading={t.network.title}><p>{t.network.text}</p><p className={styles.note}>{t.network.note}</p></EditorialBlock>} media={<Sequence items={t.network.levels} label={t.network.eyebrow} />} />
      </PageSection>

      <PageSection tone="soft" labelledBy="about-canada-title">
        <EditorialBlock id="about-canada-title" label={t.canada.eyebrow} heading={t.canada.title}><p>{t.canada.text}</p><p>{t.canada.caution}</p></EditorialBlock>
      </PageSection>

      <CTASection id="about-cta-title" tone="dark" label={t.hero.eyebrow} statement={t.cta.title} support={t.cta.text} primary={{ label: t.cta.primary, href: demo }} secondary={{ label: t.cta.secondary, href: localizedHref('/#plateforme', locale) }} />
    </>
  );
}
