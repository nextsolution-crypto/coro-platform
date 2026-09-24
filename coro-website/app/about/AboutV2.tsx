import type { ReactNode } from 'react';
import { ArrowRight, Building2, Network, ShieldCheck, UsersRound } from 'lucide-react';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { localizedHref, type Locale } from '@/lib/site/locale';
import type { AboutContent } from './content';
import styles from './page.module.css';

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}

export function AboutV2({ locale, content: t }: { locale: Locale; content: AboutContent }) {
  const homeHref = (hash: string) => localizedHref(`/${hash}`, locale);

  return (
    <div className={styles.pageShell}>
      <SiteHeader locale={locale} pathname="/about" />
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="about-title">
          <div className={styles.heroOrb} aria-hidden="true" />
          <Container className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <Eyebrow>{t.hero.eyebrow}</Eyebrow>
              <h1 id="about-title">{t.hero.title}</h1>
              <p>{t.hero.intro}</p>
              <p className={styles.heroDetail}>{t.hero.detail}</p>
              <p className={styles.signature}>{t.hero.signature}</p>
              <div className={styles.actions}>
                <Button href="#about-vision">{t.hero.primary}<ArrowRight aria-hidden="true" size={17} /></Button>
                <Button href={homeHref('#demo')} variant="ghost" className={styles.heroSecondary}>{t.hero.secondary}</Button>
              </div>
            </div>
          </Container>
        </section>

        <Section>
          <Container className={styles.originGrid}>
            <div><Eyebrow>{t.why.eyebrow}</Eyebrow><h2>{t.why.title}</h2></div>
            <div className={styles.prose}>
              {t.why.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <ol className={styles.actionSequence}>{t.why.sequence.map((step) => <li key={step}>{step}</li>)}</ol>
              <aside className={styles.callout}><ShieldCheck aria-hidden="true" size={24} /><p>{t.why.conclusion}</p></aside>
            </div>
          </Container>
        </Section>

        <Section tone="soft">
          <Container>
            <div className={styles.sectionIntroLeft}><Eyebrow>{t.evolution.eyebrow}</Eyebrow><h2>{t.evolution.title}</h2><p>{t.evolution.text}</p></div>
            <ol className={styles.evolutionPath}>{t.evolution.path.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></li>)}</ol>
            <p className={styles.scopeNote}>{t.evolution.note}</p>
          </Container>
        </Section>

        <Section>
          <Container>
            <div className={styles.sectionIntro}><Eyebrow>{t.identity.eyebrow}</Eyebrow><h2>{t.identity.title}</h2></div>
            <div className={styles.identityGrid}>{t.identity.cards.map((card) => <article className={styles.identityCard} key={card.code}><strong className={styles.identityCode}>{card.code}</strong><div><h3>{card.title}</h3><p>{card.text}</p></div></article>)}</div>
            <p className={styles.identityConclusion}>{t.identity.conclusion}</p>
          </Container>
        </Section>

        <Section tone="dark" className={styles.visionSection}>
          <Container id="about-vision" className={styles.visionGrid}>
            <div><Eyebrow>{t.vision.eyebrow}</Eyebrow><h2>{t.vision.title}</h2></div>
            <div><p>{t.vision.text}</p><p>{t.vision.detail}</p></div>
          </Container>
        </Section>

        <Section tone="soft">
          <Container>
            <div className={styles.sectionIntro}><Eyebrow>{t.continuum.eyebrow}</Eyebrow><h2>{t.continuum.title}</h2></div>
            <ol className={styles.continuum}>{t.continuum.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong>{index < t.continuum.steps.length - 1 && <ArrowRight aria-hidden="true" />}</li>)}</ol>
          </Container>
        </Section>

        <Section>
          <Container>
            <div className={styles.sectionIntroLeft}><Eyebrow>{t.data.eyebrow}</Eyebrow><h2>{t.data.title}</h2><p>{t.data.text}</p></div>
            <div className={styles.dataGrid}>{t.data.flows.map(([source, destination]) => <article className={styles.dataFlow} key={source}><strong>{source}</strong><ArrowRight aria-hidden="true" size={18} /><span>{destination}</span></article>)}</div>
          </Container>
        </Section>

        <Section tone="soft">
          <Container>
            <div className={styles.sectionIntro}><Eyebrow>{t.lifecycle.eyebrow}</Eyebrow><h2>{t.lifecycle.title}</h2><p>{t.lifecycle.note}</p></div>
            <div className={styles.lifecycleGrid}>{t.lifecycle.stages.map((stage, index) => <article className={styles.lifecycleCard} key={stage.phase}><span className={styles.step}>0{index + 1}</span><p className={styles.phase}>{stage.phase}</p><h3>{stage.title}</h3><p>{stage.text}</p><ul>{stage.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul></article>)}</div>
          </Container>
        </Section>

        <Section tone="dark">
          <Container className={styles.humanGrid}>
            <div><Eyebrow>{t.human.eyebrow}</Eyebrow><h2>{t.human.title}</h2></div>
            <div><p>{t.human.text}</p><p>{t.human.responsibility}</p><UsersRound className={styles.humanIcon} aria-hidden="true" /></div>
          </Container>
        </Section>

        <Section>
          <Container>
            <div className={styles.sectionIntroLeft}><Eyebrow>{t.network.eyebrow}</Eyebrow><h2>{t.network.title}</h2><p>{t.network.text}</p></div>
            <ol className={styles.networkScale}>{t.network.levels.map((level, index) => <li key={level}>{index === 0 ? <Building2 aria-hidden="true" /> : <Network aria-hidden="true" />}<strong>{level}</strong></li>)}</ol>
            <aside className={styles.networkNote}><Network aria-hidden="true" /><p>{t.network.note}</p></aside>
          </Container>
        </Section>

        <Section tone="soft">
          <Container className={styles.canadaGrid}>
            <div><Eyebrow>{t.canada.eyebrow}</Eyebrow><h2>{t.canada.title}</h2></div>
            <div><p>{t.canada.text}</p><p>{t.canada.caution}</p></div>
          </Container>
        </Section>

        <section className={styles.finalCta} aria-labelledby="about-cta-title">
          <Container><h2 id="about-cta-title">{t.cta.title}</h2><p>{t.cta.text}</p><div className={styles.actions}><Button href={homeHref('#demo')} className={styles.ctaPrimary}>{t.cta.primary}<ArrowRight aria-hidden="true" size={17} /></Button><Button href={homeHref('#features')} variant="ghost" className={styles.ctaSecondary}>{t.cta.secondary}</Button></div></Container>
        </section>
      </main>
      <SiteFooter locale={locale} pathname="/about" />
    </div>
  );
}
